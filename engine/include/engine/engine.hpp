#pragma once
#include <string>
#include <vector>
#include <memory>
#include <map>
#include <chrono>
#include "models/record.hpp"
#include "engine/index_interface.hpp"
#include "engine/trace.hpp"
#include "indexes/linear_scan.hpp"
#include "indexes/bst_index.hpp"
#include "indexes/avl_index.hpp"
#include "indexes/hash_index.hpp"
#include "indexes/btree_index.hpp"
#include "indexes/bplus_tree_index.hpp"

class Engine {
public:
    Engine() {
        initIndexes();
    }

    void initIndexes() {
        indexes_["LinearScan"] = std::unique_ptr<IndexInterface>(new LinearScanIndex());
        indexes_["BST"] = std::unique_ptr<IndexInterface>(new BSTIndex());
        indexes_["AVL"] = std::unique_ptr<IndexInterface>(new AVLIndex());
        indexes_["Hash"] = std::unique_ptr<IndexInterface>(new HashIndex());
        indexes_["BTree"] = std::unique_ptr<IndexInterface>(new BTreeIndex());
        indexes_["BPlusTree"] = std::unique_ptr<IndexInterface>(new BPlusTreeIndex());
    }

    void loadRecords(const std::vector<Record>& records) {
        records_ = records;
        recordMap_.clear();
        for (const auto& r : records_) {
            recordMap_[r.id] = r;
        }
    }

    Json buildIndex(const std::string& indexType, const std::string& fieldName) {
        auto it = indexes_.find(indexType);
        if (it == indexes_.end()) {
            Json err = Json::makeObject();
            err["status"] = "error";
            err["message"] = "Unknown index type: " + indexType;
            return err;
        }

        indexedField_ = fieldName;
        double elapsedMs = 0.0;
        {
            ScopedTimer timer(elapsedMs);
            it->second->build(records_, fieldName);
        }

        Json res = Json::makeObject();
        res["status"] = "ok";
        res["indexType"] = indexType;
        res["field"] = fieldName;
        res["recordCount"] = static_cast<int>(records_.size());
        res["buildTimeMicroseconds"] = elapsedMs;
        res["stats"] = it->second->getStats();
        res["memoryEstimateBytes"] = static_cast<long long>(it->second->getMemoryEstimate());
        return res;
    }

    Json query(const std::string& indexType, const std::string& op, const KeyValue& keyVal,
               const KeyValue& lower, const KeyValue& upper, const std::string& prefix,
               bool includeTrace = false) {
        auto it = indexes_.find(indexType);
        if (it == indexes_.end()) {
            Json err = Json::makeObject();
            err["status"] = "error";
            err["message"] = "Unknown index type: " + indexType;
            return err;
        }

        QueryMetrics metrics;
        TraceCollector trace;
        std::vector<std::string> matchIds;
        {
            ScopedTimer timer(metrics.elapsedMicroseconds);
            if (op == "exact") {
                matchIds = it->second->exactMatch(keyVal, metrics, includeTrace ? &trace : nullptr);
            } else if (op == "range") {
                matchIds = it->second->rangeQuery(lower, upper, metrics, includeTrace ? &trace : nullptr);
            } else if (op == "prefix") {
                matchIds = it->second->prefixQuery(prefix, metrics, includeTrace ? &trace : nullptr);
            } else {
                Json err = Json::makeObject();
                err["status"] = "error";
                err["message"] = "Unknown operation: " + op;
                return err;
            }
        }
        metrics.memoryEstimateBytes = it->second->getMemoryEstimate();

        Json res = Json::makeObject();
        res["status"] = "ok";
        res["indexType"] = indexType;
        res["operation"] = op;
        res["resultCount"] = static_cast<int>(matchIds.size());

        Json matchesJson = Json::makeArray();
        for (const auto& id : matchIds) {
            auto rIt = recordMap_.find(id);
            if (rIt != recordMap_.end()) {
                Json rObj = Json::makeObject();
                rObj["id"] = rIt->second.id;
                Json fieldsObj = Json::makeObject();
                for (const auto& f : rIt->second.fields) {
                    if (f.second.isNumber()) {
                        fieldsObj[f.first] = f.second.numVal;
                    } else {
                        fieldsObj[f.first] = f.second.strVal;
                    }
                }
                rObj["fields"] = fieldsObj;
                matchesJson.push_back(rObj);
            }
        }
        res["records"] = matchesJson;

        Json mObj = Json::makeObject();
        mObj["keyComparisons"] = static_cast<long long>(metrics.keyComparisons);
        mObj["nodesVisited"] = static_cast<long long>(metrics.nodesVisited);
        mObj["recordsExamined"] = static_cast<long long>(metrics.recordsExamined);
        mObj["elapsedMicroseconds"] = metrics.elapsedMicroseconds;
        mObj["memoryEstimateBytes"] = static_cast<long long>(metrics.memoryEstimateBytes);
        res["metrics"] = mObj;

        // Query execution plan note
        Json plan = Json::makeArray();
        if (indexType == "LinearScan") {
            plan.push_back("Full sequential scan of all records");
            plan.push_back("No index lookup step");
        } else if (indexType == "Hash") {
            if (op == "exact") {
                plan.push_back("Hash key -> bucket index computed in O(1)");
                plan.push_back("Bucket collision chain inspected");
            } else {
                plan.push_back("Full scan across all hash buckets (Hash indexes do not preserve key order)");
            }
        } else if (indexType == "BST" || indexType == "AVL") {
            plan.push_back("Root-to-leaf binary search traversal");
            if (op == "range") {
                plan.push_back("In-order subtree bounding traversal");
            }
        } else if (indexType == "BTree") {
            plan.push_back("Multi-way search tree routing via node keys");
            if (op == "range") {
                plan.push_back("In-order multi-key node subtree traversal");
            }
        } else if (indexType == "BPlusTree") {
            plan.push_back("Multi-way routing through internal separator keys to leaf node");
            if (op == "range") {
                plan.push_back("Direct sequential scan along leaf node linked list pointers (O(1) per leaf)");
            }
        }
        res["executionPlan"] = plan;

        if (includeTrace) {
            res["trace"] = trace.toJson();
        }

        return res;
    }

    Json insertRecord(const std::string& indexType, const KeyValue& keyVal, const std::string& recordId, bool includeTrace = false) {
        auto it = indexes_.find(indexType);
        if (it == indexes_.end()) {
            Json err = Json::makeObject();
            err["status"] = "error";
            err["message"] = "Unknown index type: " + indexType;
            return err;
        }

        TraceCollector trace;
        if (includeTrace) {
            it->second->insertWithTrace(keyVal, recordId, &trace);
        } else {
            it->second->insert(keyVal, recordId);
        }

        Json res = Json::makeObject();
        res["status"] = "ok";
        res["indexType"] = indexType;
        res["operation"] = "insert";
        if (includeTrace) {
            res["trace"] = trace.toJson();
            res["structure"] = it->second->getStructure();
            res["stats"] = it->second->getStats();
        }
        return res;
    }

    Json getStructure(const std::string& indexType) {
        auto it = indexes_.find(indexType);
        if (it == indexes_.end()) {
            Json err = Json::makeObject();
            err["status"] = "error";
            err["message"] = "Unknown index type: " + indexType;
            return err;
        }

        Json res = Json::makeObject();
        res["status"] = "ok";
        res["indexType"] = indexType;
        res["structure"] = it->second->getStructure();
        res["stats"] = it->second->getStats();
        return res;
    }

    Json runBenchmark(const std::string& field, const Json& queries, const std::vector<std::string>& indexTypes, int iterations) {
        if (iterations < 1) iterations = 1;
        Json res = Json::makeObject();
        res["status"] = "ok";
        res["recordCount"] = static_cast<int>(records_.size());
        res["iterations"] = iterations;

        Json benchmarksArr = Json::makeArray();

        for (const auto& type : indexTypes) {
            auto it = indexes_.find(type);
            if (it == indexes_.end()) continue;

            // Rebuild index
            it->second->build(records_, field);

            std::vector<double> latencies;
            uint64_t totalComparisons = 0;
            uint64_t totalNodes = 0;
            uint64_t totalExamined = 0;
            size_t queryCount = queries.size();
            if (queryCount == 0) queryCount = 1;

            for (int iter = 0; iter < iterations; ++iter) {
                for (size_t qIdx = 0; qIdx < queries.size(); ++qIdx) {
                    const Json& q = queries[qIdx];
                    std::string op = q["operation"].asString("exact");
                    KeyValue target(q["value"].isNumber() ? KeyValue(q["value"].asDouble()) : KeyValue(q["value"].asString()));
                    KeyValue lower(q["lowerBound"].isNumber() ? KeyValue(q["lowerBound"].asDouble()) : KeyValue(q["lowerBound"].asString()));
                    KeyValue upper(q["upperBound"].isNumber() ? KeyValue(q["upperBound"].asDouble()) : KeyValue(q["upperBound"].asString()));
                    std::string prefix = q["prefix"].asString();

                    QueryMetrics m;
                    {
                        ScopedTimer timer(m.elapsedMicroseconds);
                        if (op == "exact") {
                            it->second->exactMatch(target, m);
                        } else if (op == "range") {
                            it->second->rangeQuery(lower, upper, m);
                        } else if (op == "prefix") {
                            it->second->prefixQuery(prefix, m);
                        }
                    }
                    latencies.push_back(m.elapsedMicroseconds);
                    totalComparisons += m.keyComparisons;
                    totalNodes += m.nodesVisited;
                    totalExamined += m.recordsExamined;
                }
            }

            std::sort(latencies.begin(), latencies.end());
            double median = latencies.empty() ? 0.0 : latencies[latencies.size() / 2];
            double minTime = latencies.empty() ? 0.0 : latencies.front();
            double maxTime = latencies.empty() ? 0.0 : latencies.back();

            Json bObj = Json::makeObject();
            bObj["indexType"] = type;
            bObj["medianMicroseconds"] = median;
            bObj["minMicroseconds"] = minTime;
            bObj["maxMicroseconds"] = maxTime;
            bObj["avgComparisons"] = static_cast<double>(totalComparisons) / (iterations * queryCount);
            bObj["avgNodesVisited"] = static_cast<double>(totalNodes) / (iterations * queryCount);
            bObj["avgRecordsExamined"] = static_cast<double>(totalExamined) / (iterations * queryCount);
            bObj["memoryEstimateBytes"] = static_cast<long long>(it->second->getMemoryEstimate());

            benchmarksArr.push_back(bObj);
        }

        res["results"] = benchmarksArr;
        return res;
    }

private:
    std::vector<Record> records_;
    std::unordered_map<std::string, Record> recordMap_;
    std::string indexedField_;
    std::map<std::string, std::unique_ptr<IndexInterface>> indexes_;
};
