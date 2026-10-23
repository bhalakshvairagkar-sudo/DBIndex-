#pragma once
#include "engine/index_interface.hpp"
#include <algorithm>

class LinearScanIndex : public IndexInterface {
public:
    struct Entry {
        KeyValue key;
        std::string recordId;
    };

    LinearScanIndex() = default;

    std::string getName() const override {
        return "LinearScan";
    }

    void clear() override {
        entries_.clear();
    }

    void build(const std::vector<Record>& records, const std::string& fieldName) override {
        clear();
        for (const auto& rec : records) {
            if (rec.hasField(fieldName)) {
                entries_.push_back({rec.getField(fieldName), rec.id});
            }
        }
    }

    void insert(const KeyValue& key, const std::string& recordId) override {
        entries_.push_back({key, recordId});
    }

    void insertWithTrace(const KeyValue& key, const std::string& recordId, TraceCollector* trace) override {
        entries_.push_back({key, recordId});
        if (trace) {
            trace->addStep("insert", -1, -1, recordId, key.toString(), key.toString(),
                           "Appended new record " + recordId + " with key " + key.toString() + " to end of flat table.",
                           0, 0);
        }
    }

    bool remove(const KeyValue& key, const std::string& recordId) override {
        for (auto it = entries_.begin(); it != entries_.end(); ++it) {
            if (it->recordId == recordId && it->key == key) {
                entries_.erase(it);
                return true;
            }
        }
        return false;
    }

    std::vector<std::string> exactMatch(const KeyValue& key, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        std::string targetStr = key.toString();
        if (trace) {
            trace->addStep("start", -1, -1, "", "", targetStr,
                           "Initiating sequential table scan across " + std::to_string(entries_.size()) + " records for target " + targetStr,
                           0, 0);
        }
        for (size_t i = 0; i < entries_.size(); ++i) {
            const auto& entry = entries_[i];
            metrics.recordsExamined++;
            metrics.keyComparisons++;
            bool match = (entry.key == key);
            if (trace) {
                trace->addStep(match ? "match" : "compare", -1, -1, entry.recordId,
                               entry.key.toString(), targetStr,
                               match ? ("Record #" + std::to_string(i) + " (" + entry.recordId + ") MATCHES key " + targetStr + "!")
                                     : ("Record #" + std::to_string(i) + " (" + entry.key.toString() + ") does not match target. Continuing sequential scan."),
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
            if (match) {
                results.push_back(entry.recordId);
            }
        }
        if (trace) {
            trace->addStep(results.empty() ? "miss" : "complete", -1, -1, "", "", targetStr,
                           results.empty() ? ("Scan finished: Key " + targetStr + " was not found in table.")
                                           : ("Scan finished: Found " + std::to_string(results.size()) + " matching record(s)."),
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }
        return results;
    }

    std::vector<std::string> rangeQuery(const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        std::string rangeStr = "[" + lower.toString() + " .. " + upper.toString() + "]";
        if (trace) {
            trace->addStep("start", -1, -1, "", "", rangeStr,
                           "Scanning entire table sequentially to test boundary range " + rangeStr,
                           0, 0);
        }
        for (size_t i = 0; i < entries_.size(); ++i) {
            const auto& entry = entries_[i];
            metrics.recordsExamined++;
            metrics.keyComparisons += 2;
            bool inRange = (entry.key >= lower && entry.key <= upper);
            if (trace) {
                trace->addStep(inRange ? "match" : "compare", -1, -1, entry.recordId,
                               entry.key.toString(), rangeStr,
                               inRange ? ("Record #" + std::to_string(i) + " key " + entry.key.toString() + " falls WITHIN range " + rangeStr)
                                       : ("Record #" + std::to_string(i) + " key " + entry.key.toString() + " is outside range " + rangeStr),
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
            if (inRange) {
                results.push_back(entry.recordId);
            }
        }
        if (trace) {
            trace->addStep("complete", -1, -1, "", "", rangeStr,
                           "Range scan complete: Found " + std::to_string(results.size()) + " record(s) matching range " + rangeStr,
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }
        return results;
    }

    std::vector<std::string> prefixQuery(const std::string& prefix, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        if (trace) {
            trace->addStep("start", -1, -1, "", "", prefix,
                           "Scanning table sequentially for prefix: \"" + prefix + "\"",
                           0, 0);
        }
        for (size_t i = 0; i < entries_.size(); ++i) {
            const auto& entry = entries_[i];
            metrics.recordsExamined++;
            metrics.keyComparisons++;
            std::string s = entry.key.toString();
            bool match = (s.rfind(prefix, 0) == 0);
            if (trace) {
                trace->addStep(match ? "match" : "compare", -1, -1, entry.recordId,
                               s, prefix,
                               match ? ("Record #" + std::to_string(i) + " \"" + s + "\" matches prefix \"" + prefix + "\"")
                                     : ("Record #" + std::to_string(i) + " \"" + s + "\" does not start with prefix \"" + prefix + "\""),
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
            if (match) {
                results.push_back(entry.recordId);
            }
        }
        return results;
    }

    Json getStructure() const override {
        Json root = Json::makeObject();
        root["type"] = "LinearScan";
        root["count"] = static_cast<int>(entries_.size());
        Json items = Json::makeArray();
        size_t limit = std::min(entries_.size(), size_t(50));
        for (size_t i = 0; i < limit; ++i) {
            Json item = Json::makeObject();
            item["key"] = entries_[i].key.toString();
            item["recordId"] = entries_[i].recordId;
            items.push_back(item);
        }
        root["items"] = items;
        root["truncated"] = entries_.size() > limit;
        return root;
    }

    Json getStats() const override {
        Json stats = Json::makeObject();
        stats["type"] = "LinearScan";
        stats["recordCount"] = static_cast<int>(entries_.size());
        stats["height"] = 0;
        stats["indexed"] = false;
        stats["description"] = "Baseline sequential table scan without index structure. O(n) for all operations.";
        return stats;
    }

    size_t getMemoryEstimate() const override {
        return entries_.size() * sizeof(Entry) + sizeof(*this);
    }

private:
    std::vector<Entry> entries_;
};
