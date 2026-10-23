#pragma once
#include "engine/index_interface.hpp"
#include <algorithm>
#include <memory>
#include <queue>

class BSTIndex : public IndexInterface {
public:
    struct Node {
        KeyValue key;
        std::vector<std::string> recordIds;
        std::unique_ptr<Node> left;
        std::unique_ptr<Node> right;
        int id;

        Node(const KeyValue& k, const std::string& recId, int nodeId)
            : key(k), id(nodeId) {
            recordIds.push_back(recId);
        }
    };

    BSTIndex() : root_(nullptr), nextNodeId_(1), nodeCount_(0) {}

    std::string getName() const override {
        return "BST";
    }

    void clear() override {
        root_.reset();
        nodeCount_ = 0;
        nextNodeId_ = 1;
    }

    void build(const std::vector<Record>& records, const std::string& fieldName) override {
        clear();
        for (const auto& rec : records) {
            if (rec.hasField(fieldName)) {
                insert(rec.getField(fieldName), rec.id);
            }
        }
    }

    void insert(const KeyValue& key, const std::string& recordId) override {
        root_ = insertRecursive(std::move(root_), key, recordId);
    }

    void insertWithTrace(const KeyValue& key, const std::string& recordId, TraceCollector* trace) override {
        root_ = insertTraceRecursive(std::move(root_), key, recordId, trace);
    }

    bool remove(const KeyValue& key, const std::string& recordId) override {
        bool removed = false;
        root_ = removeRecursive(std::move(root_), key, recordId, removed);
        return removed;
    }

    std::vector<std::string> exactMatch(const KeyValue& key, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        std::string targetStr = key.toString();
        if (trace) {
            trace->addStep("start", root_ ? root_->id : -1, -1, "", "", targetStr,
                           "Commencing binary search traversal in BST for target key " + targetStr,
                           0, 0);
        }

        Node* curr = root_.get();
        while (curr != nullptr) {
            metrics.nodesVisited++;
            metrics.keyComparisons++;
            int cNodeId = curr->id;
            std::string nodeKeyStr = curr->key.toString();

            if (key == curr->key) {
                metrics.recordsExamined += curr->recordIds.size();
                if (trace) {
                    trace->addStep("match", cNodeId, -1, curr->recordIds.empty() ? "" : curr->recordIds[0],
                                   nodeKeyStr, targetStr,
                                   "Target key " + targetStr + " MATCHES Node #" + std::to_string(cNodeId) + " key (" + nodeKeyStr + "). Found " + std::to_string(curr->recordIds.size()) + " record(s)!",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                return curr->recordIds;
            } else if (key < curr->key) {
                if (trace) {
                    trace->addStep("traverse", cNodeId, -1, "", nodeKeyStr, targetStr,
                                   "Target " + targetStr + " < Node #" + std::to_string(cNodeId) + " (" + nodeKeyStr + "). Descending into LEFT subtree.",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                curr = curr->left.get();
            } else {
                if (trace) {
                    trace->addStep("traverse", cNodeId, -1, "", nodeKeyStr, targetStr,
                                   "Target " + targetStr + " > Node #" + std::to_string(cNodeId) + " (" + nodeKeyStr + "). Descending into RIGHT subtree.",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                curr = curr->right.get();
            }
        }

        if (trace) {
            trace->addStep("miss", -1, -1, "", "", targetStr,
                           "Reached null branch: Key " + targetStr + " does not exist in this Binary Search Tree.",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }
        return results;
    }

    std::vector<std::string> rangeQuery(const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        if (trace) {
            trace->addStep("start", root_ ? root_->id : -1, -1, "", "", "[" + lower.toString() + " .. " + upper.toString() + "]",
                           "Commencing in-order bounded subtree scan in BST for range [" + lower.toString() + " .. " + upper.toString() + "]",
                           0, 0);
        }
        rangeRecursive(root_.get(), lower, upper, metrics, results, trace);
        if (trace) {
            trace->addStep("complete", -1, -1, "", "", "[" + lower.toString() + " .. " + upper.toString() + "]",
                           "BST range search completed. Collected " + std::to_string(results.size()) + " qualifying records.",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }
        return results;
    }

    std::vector<std::string> prefixQuery(const std::string& prefix, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        prefixRecursive(root_.get(), prefix, metrics, results);
        (void)trace;
        return results;
    }

    int getHeight() const {
        return calculateHeight(root_.get());
    }

    Json getStructure() const override {
        Json root = Json::makeObject();
        root["type"] = "BST";
        root["height"] = getHeight();
        root["nodeCount"] = static_cast<int>(nodeCount_);
        root["root"] = nodeToJson(root_.get(), 0);
        return root;
    }

    Json getStats() const override {
        Json stats = Json::makeObject();
        stats["type"] = "BST";
        stats["height"] = getHeight();
        stats["nodeCount"] = static_cast<int>(nodeCount_);
        stats["description"] = "Binary Search Tree. Average O(log n) lookup, but degenerates to O(n) on sorted inserts.";
        return stats;
    }

    size_t getMemoryEstimate() const override {
        return nodeCount_ * (sizeof(Node) + 32) + sizeof(*this);
    }

private:
    std::unique_ptr<Node> root_;
    int nextNodeId_;
    size_t nodeCount_;

    std::unique_ptr<Node> insertRecursive(std::unique_ptr<Node> node, const KeyValue& key, const std::string& recordId) {
        if (!node) {
            nodeCount_++;
            return std::unique_ptr<Node>(new Node(key, recordId, nextNodeId_++));
        }
        if (key == node->key) {
            node->recordIds.push_back(recordId);
        } else if (key < node->key) {
            node->left = insertRecursive(std::move(node->left), key, recordId);
        } else {
            node->right = insertRecursive(std::move(node->right), key, recordId);
        }
        return node;
    }

    std::unique_ptr<Node> insertTraceRecursive(std::unique_ptr<Node> node, const KeyValue& key, const std::string& recordId, TraceCollector* trace) {
        if (!node) {
            nodeCount_++;
            int createdId = nextNodeId_++;
            if (trace) {
                trace->addStep("insert", createdId, -1, recordId, key.toString(), key.toString(),
                               "Created new Node #" + std::to_string(createdId) + " with key " + key.toString(),
                               0, 0);
            }
            return std::unique_ptr<Node>(new Node(key, recordId, createdId));
        }
        if (key == node->key) {
            node->recordIds.push_back(recordId);
            if (trace) {
                trace->addStep("insert", node->id, -1, recordId, key.toString(), key.toString(),
                               "Appended duplicate record " + recordId + " to existing Node #" + std::to_string(node->id),
                               0, 0);
            }
        } else if (key < node->key) {
            if (trace) {
                trace->addStep("traverse", node->id, -1, "", node->key.toString(), key.toString(),
                               "Insert key " + key.toString() + " < Node #" + std::to_string(node->id) + " (" + node->key.toString() + "). Navigating left.",
                               0, 0);
            }
            node->left = insertTraceRecursive(std::move(node->left), key, recordId, trace);
        } else {
            if (trace) {
                trace->addStep("traverse", node->id, -1, "", node->key.toString(), key.toString(),
                               "Insert key " + key.toString() + " > Node #" + std::to_string(node->id) + " (" + node->key.toString() + "). Navigating right.",
                               0, 0);
            }
            node->right = insertTraceRecursive(std::move(node->right), key, recordId, trace);
        }
        return node;
    }

    std::unique_ptr<Node> removeRecursive(std::unique_ptr<Node> node, const KeyValue& key, const std::string& recordId, bool& removed) {
        if (!node) return nullptr;

        if (key < node->key) {
            node->left = removeRecursive(std::move(node->left), key, recordId, removed);
        } else if (key > node->key) {
            node->right = removeRecursive(std::move(node->right), key, recordId, removed);
        } else {
            auto it = std::find(node->recordIds.begin(), node->recordIds.end(), recordId);
            if (it != node->recordIds.end()) {
                node->recordIds.erase(it);
                removed = true;
            }
            if (node->recordIds.empty()) {
                nodeCount_--;
                if (!node->left) return std::move(node->right);
                if (!node->right) return std::move(node->left);

                Node* succ = node->right.get();
                while (succ->left) {
                    succ = succ->left.get();
                }
                node->key = succ->key;
                node->recordIds = succ->recordIds;
                std::string succId = succ->recordIds.empty() ? "" : succ->recordIds[0];
                node->right = removeRecursive(std::move(node->right), succ->key, succId, removed);
            }
        }
        return node;
    }

    void rangeRecursive(const Node* node, const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics,
                        std::vector<std::string>& results, TraceCollector* trace = nullptr) {
        if (!node) return;
        metrics.nodesVisited++;
        metrics.keyComparisons++;

        if (trace) {
            trace->addStep("visit", node->id, -1, "", node->key.toString(), "[" + lower.toString() + " .. " + upper.toString() + "]",
                           "Inspecting BST Node #" + std::to_string(node->id) + " (Key: " + node->key.toString() + ")",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }

        if (node->key > lower) {
            rangeRecursive(node->left.get(), lower, upper, metrics, results, trace);
        }

        metrics.keyComparisons++;
        if (node->key >= lower && node->key <= upper) {
            metrics.recordsExamined += node->recordIds.size();
            for (const auto& id : node->recordIds) {
                results.push_back(id);
            }
            if (trace) {
                trace->addStep("match", node->id, -1, node->recordIds.empty() ? "" : node->recordIds[0],
                               node->key.toString(), "[" + lower.toString() + " .. " + upper.toString() + "]",
                               "Node #" + std::to_string(node->id) + " key (" + node->key.toString() + ") is within range [" + lower.toString() + " .. " + upper.toString() + "]",
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
        }

        metrics.keyComparisons++;
        if (node->key < upper) {
            rangeRecursive(node->right.get(), lower, upper, metrics, results, trace);
        }
    }

    void prefixRecursive(const Node* node, const std::string& prefix, QueryMetrics& metrics, std::vector<std::string>& results) {
        if (!node) return;
        metrics.nodesVisited++;
        metrics.keyComparisons++;

        prefixRecursive(node->left.get(), prefix, metrics, results);

        std::string s = node->key.toString();
        if (s.rfind(prefix, 0) == 0) {
            metrics.recordsExamined += node->recordIds.size();
            for (const auto& id : node->recordIds) {
                results.push_back(id);
            }
        }

        prefixRecursive(node->right.get(), prefix, metrics, results);
    }

    int calculateHeight(const Node* node) const {
        if (!node) return 0;
        return 1 + std::max(calculateHeight(node->left.get()), calculateHeight(node->right.get()));
    }

    Json nodeToJson(const Node* node, int depth) const {
        if (!node || depth > 8) return Json();
        Json j = Json::makeObject();
        j["id"] = node->id;
        j["key"] = node->key.toString();
        j["recordCount"] = static_cast<int>(node->recordIds.size());
        Json recIds = Json::makeArray();
        for (const auto& id : node->recordIds) {
            recIds.push_back(id);
        }
        j["recordIds"] = recIds;
        j["depth"] = depth;
        j["height"] = calculateHeight(node);

        if (node->left) {
            j["left"] = nodeToJson(node->left.get(), depth + 1);
        } else {
            j["left"] = Json();
        }
        if (node->right) {
            j["right"] = nodeToJson(node->right.get(), depth + 1);
        } else {
            j["right"] = Json();
        }
        return j;
    }
};
