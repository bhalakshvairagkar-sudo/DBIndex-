#pragma once
#include "engine/index_interface.hpp"
#include <vector>
#include <list>
#include <cmath>
#include <iostream>

class HashIndex : public IndexInterface {
public:
    struct Entry {
        KeyValue key;
        std::vector<std::string> recordIds;
    };

    explicit HashIndex(size_t bucketCount = 16)
        : numBuckets_(bucketCount), totalEntries_(0), collisionCount_(0) {
        buckets_.resize(numBuckets_);
    }

    std::string getName() const override {
        return "Hash";
    }

    void clear() override {
        for (auto& b : buckets_) {
            b.clear();
        }
        totalEntries_ = 0;
        collisionCount_ = 0;
    }

    void build(const std::vector<Record>& records, const std::string& fieldName) override {
        clear();
        size_t desired = std::max(size_t(16), records.size() / 2);
        numBuckets_ = desired;
        buckets_.assign(numBuckets_, std::list<Entry>());

        for (const auto& rec : records) {
            if (rec.hasField(fieldName)) {
                insert(rec.getField(fieldName), rec.id);
            }
        }
    }

    void insert(const KeyValue& key, const std::string& recordId) override {
        size_t bIdx = getBucketIndex(key);
        auto& chain = buckets_[bIdx];

        if (!chain.empty()) {
            collisionCount_++;
        }

        for (auto& entry : chain) {
            if (entry.key == key) {
                entry.recordIds.push_back(recordId);
                return;
            }
        }

        Entry newEntry;
        newEntry.key = key;
        newEntry.recordIds.push_back(recordId);
        chain.push_back(newEntry);
        totalEntries_++;
    }

    void insertWithTrace(const KeyValue& key, const std::string& recordId, TraceCollector* trace) override {
        size_t bIdx = getBucketIndex(key);
        auto& chain = buckets_[bIdx];
        std::string keyStr = key.toString();

        if (trace) {
            trace->addStep("bucket_hash", -1, static_cast<int>(bIdx), recordId, keyStr, keyStr,
                           "Calculated hash(\"" + keyStr + "\") % " + std::to_string(numBuckets_) + " -> Target Bucket [" + std::to_string(bIdx) + "]",
                           0, 1);
        }

        bool collision = !chain.empty();
        if (collision) {
            collisionCount_++;
            if (trace) {
                trace->addStep("collision", -1, static_cast<int>(bIdx), recordId, keyStr, keyStr,
                               "Bucket [" + std::to_string(bIdx) + "] is already occupied (length: " + std::to_string(chain.size()) + "). Collision detected! Appending to collision chain.",
                               0, 1);
            }
        }

        for (auto& entry : chain) {
            if (entry.key == key) {
                entry.recordIds.push_back(recordId);
                if (trace) {
                    trace->addStep("insert", -1, static_cast<int>(bIdx), recordId, keyStr, keyStr,
                                   "Key \"" + keyStr + "\" already present in bucket [" + std::to_string(bIdx) + "] chain. Appended record " + recordId + ".",
                                   0, 1);
                }
                return;
            }
        }

        Entry newEntry;
        newEntry.key = key;
        newEntry.recordIds.push_back(recordId);
        chain.push_back(newEntry);
        totalEntries_++;

        if (trace) {
            trace->addStep("insert", -1, static_cast<int>(bIdx), recordId, keyStr, keyStr,
                           "Inserted entry key \"" + keyStr + "\" into bucket [" + std::to_string(bIdx) + "]. New chain length: " + std::to_string(chain.size()),
                           0, 1);
        }
    }

    bool remove(const KeyValue& key, const std::string& recordId) override {
        size_t bIdx = getBucketIndex(key);
        auto& chain = buckets_[bIdx];

        for (auto it = chain.begin(); it != chain.end(); ++it) {
            if (it->key == key) {
                auto rIt = std::find(it->recordIds.begin(), it->recordIds.end(), recordId);
                if (rIt != it->recordIds.end()) {
                    it->recordIds.erase(rIt);
                    if (it->recordIds.empty()) {
                        chain.erase(it);
                        totalEntries_--;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    std::vector<std::string> exactMatch(const KeyValue& key, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        metrics.nodesVisited++;
        size_t bIdx = getBucketIndex(key);
        const auto& chain = buckets_[bIdx];
        std::string targetStr = key.toString();

        if (trace) {
            trace->addStep("bucket_hash", -1, static_cast<int>(bIdx), "", "", targetStr,
                           "Hash Function: hash(\"" + targetStr + "\") % " + std::to_string(numBuckets_) + " = Bucket [" + std::to_string(bIdx) + "]. Directly jumping to bucket.",
                           0, static_cast<int>(metrics.nodesVisited));
        }

        if (chain.empty() && trace) {
            trace->addStep("miss", -1, static_cast<int>(bIdx), "", "", targetStr,
                           "Bucket [" + std::to_string(bIdx) + "] is empty. Target key " + targetStr + " does not exist in hash table.",
                           0, static_cast<int>(metrics.nodesVisited));
        }

        int chainPos = 0;
        for (const auto& entry : chain) {
            metrics.keyComparisons++;
            bool match = (entry.key == key);

            if (trace) {
                trace->addStep(match ? "match" : "chain_step", -1, static_cast<int>(bIdx),
                               entry.recordIds.empty() ? "" : entry.recordIds[0],
                               entry.key.toString(), targetStr,
                               match ? ("Chain entry #" + std::to_string(chainPos) + " (Key: \"" + entry.key.toString() + "\") MATCHES target! Found " + std::to_string(entry.recordIds.size()) + " record(s).")
                                     : ("Chain entry #" + std::to_string(chainPos) + " (Key: \"" + entry.key.toString() + "\") != target. Following collision link."),
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }

            if (match) {
                metrics.recordsExamined += entry.recordIds.size();
                return entry.recordIds;
            }
            chainPos++;
        }

        if (trace && !chain.empty()) {
            trace->addStep("miss", -1, static_cast<int>(bIdx), "", "", targetStr,
                           "Exhausted collision chain in bucket [" + std::to_string(bIdx) + "]. Target key not found.",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }

        return results;
    }

    // Range queries are unsupported/inefficient in Hash Indexes
    std::vector<std::string> rangeQuery(const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        std::string rangeStr = "[" + lower.toString() + " .. " + upper.toString() + "]";

        if (trace) {
            trace->addStep("start", -1, -1, "", "", rangeStr,
                           "WARNING: Hash functions destroy key ordering! Cannot route to bounds. Forced to scan all " + std::to_string(numBuckets_) + " buckets (O(N) full scan).",
                           0, 0);
        }

        for (size_t b = 0; b < buckets_.size(); ++b) {
            const auto& chain = buckets_[b];
            metrics.nodesVisited++;

            if (!chain.empty() && trace) {
                trace->addStep("visit", -1, static_cast<int>(b), "", "", rangeStr,
                               "Scanning Hash Bucket [" + std::to_string(b) + "] with " + std::to_string(chain.size()) + " chained element(s).",
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }

            for (const auto& entry : chain) {
                metrics.keyComparisons += 2;
                bool inRange = (entry.key >= lower && entry.key <= upper);
                if (inRange) {
                    metrics.recordsExamined += entry.recordIds.size();
                    for (const auto& id : entry.recordIds) {
                        results.push_back(id);
                    }
                    if (trace) {
                        trace->addStep("match", -1, static_cast<int>(b), entry.recordIds.empty() ? "" : entry.recordIds[0],
                                       entry.key.toString(), rangeStr,
                                       "Key " + entry.key.toString() + " in bucket [" + std::to_string(b) + "] matches range criteria.",
                                       static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                    }
                }
            }
        }

        if (trace) {
            trace->addStep("complete", -1, -1, "", "", rangeStr,
                           "Completed full hash table scan. Found " + std::to_string(results.size()) + " matching records.",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }
        return results;
    }

    std::vector<std::string> prefixQuery(const std::string& prefix, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        (void)trace;
        for (const auto& chain : buckets_) {
            metrics.nodesVisited++;
            for (const auto& entry : chain) {
                metrics.keyComparisons++;
                std::string s = entry.key.toString();
                if (s.rfind(prefix, 0) == 0) {
                    metrics.recordsExamined += entry.recordIds.size();
                    for (const auto& id : entry.recordIds) {
                        results.push_back(id);
                    }
                }
            }
        }
        return results;
    }

    Json getStructure() const override {
        Json root = Json::makeObject();
        root["type"] = "Hash";
        root["bucketCount"] = static_cast<int>(numBuckets_);
        root["totalEntries"] = static_cast<int>(totalEntries_);
        root["collisionCount"] = static_cast<int>(collisionCount_);
        double loadFactor = numBuckets_ > 0 ? (static_cast<double>(totalEntries_) / numBuckets_) : 0.0;
        root["loadFactor"] = loadFactor;

        Json bucketsJson = Json::makeArray();
        for (size_t i = 0; i < numBuckets_; ++i) {
            Json bObj = Json::makeObject();
            bObj["bucketIndex"] = static_cast<int>(i);
            bObj["chainLength"] = static_cast<int>(buckets_[i].size());
            Json entriesJson = Json::makeArray();
            for (const auto& entry : buckets_[i]) {
                Json e = Json::makeObject();
                e["key"] = entry.key.toString();
                e["recordCount"] = static_cast<int>(entry.recordIds.size());
                Json recIds = Json::makeArray();
                for (const auto& rId : entry.recordIds) {
                    recIds.push_back(rId);
                }
                e["recordIds"] = recIds;
                entriesJson.push_back(e);
            }
            bObj["entries"] = entriesJson;
            bucketsJson.push_back(bObj);
        }
        root["buckets"] = bucketsJson;
        return root;
    }

    Json getStats() const override {
        Json stats = Json::makeObject();
        stats["type"] = "Hash";
        stats["bucketCount"] = static_cast<int>(numBuckets_);
        stats["totalEntries"] = static_cast<int>(totalEntries_);
        stats["collisionCount"] = static_cast<int>(collisionCount_);
        stats["loadFactor"] = numBuckets_ > 0 ? (static_cast<double>(totalEntries_) / numBuckets_) : 0.0;
        stats["description"] = "Hash table with separate chaining. O(1) avg exact lookup; fundamentally inefficient for range queries.";
        return stats;
    }

    size_t getMemoryEstimate() const override {
        return numBuckets_ * sizeof(std::list<Entry>) + totalEntries_ * (sizeof(Entry) + 32) + sizeof(*this);
    }

private:
    size_t numBuckets_;
    size_t totalEntries_;
    size_t collisionCount_;
    std::vector<std::list<Entry>> buckets_;

    size_t getBucketIndex(const KeyValue& key) const {
        if (numBuckets_ == 0) return 0;
        return key.hash() % numBuckets_;
    }
};
