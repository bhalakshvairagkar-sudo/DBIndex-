#pragma once
#include "engine/index_interface.hpp"
#include <vector>
#include <memory>
#include <algorithm>

class BTreeIndex : public IndexInterface {
public:
    static const int DEFAULT_ORDER = 4; // Max children M = 4, max keys = 3

    struct Node {
        bool isLeaf;
        int id;
        std::vector<KeyValue> keys;
        std::vector<std::vector<std::string>> recordLists; // For each key, associated records
        std::vector<std::unique_ptr<Node>> children;

        Node(bool leaf, int nodeId) : isLeaf(leaf), id(nodeId) {}
    };

    explicit BTreeIndex(int order = DEFAULT_ORDER)
        : order_(order), root_(nullptr), nextNodeId_(1), totalNodes_(0) {
        if (order_ < 3) order_ = 3;
    }

    std::string getName() const override {
        return "BTree";
    }

    void clear() override {
        root_.reset();
        nextNodeId_ = 1;
        totalNodes_ = 0;
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
        if (!root_) {
            root_ = std::unique_ptr<Node>(new Node(true, nextNodeId_++));
            root_->keys.push_back(key);
            root_->recordLists.push_back({recordId});
            totalNodes_ = 1;
            return;
        }

        // If root is full, tree grows in height
        if (root_->keys.size() >= static_cast<size_t>(order_ - 1)) {
            std::unique_ptr<Node> newRoot(new Node(false, nextNodeId_++));
            totalNodes_++;
            newRoot->children.push_back(std::move(root_));
            splitChild(newRoot.get(), 0);
            root_ = std::move(newRoot);
        }

        insertNonFull(root_.get(), key, recordId);
    }

    void insertWithTrace(const KeyValue& key, const std::string& recordId, TraceCollector* trace) override {
        (void)trace;
        insert(key, recordId);
    }

    bool remove(const KeyValue& key, const std::string& recordId) override {
        if (!root_) return false;
        return removeRecursive(root_.get(), key, recordId);
    }

    std::vector<std::string> exactMatch(const KeyValue& key, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::string targetStr = key.toString();
        if (trace) {
            trace->addStep("start", root_ ? root_->id : -1, -1, "", "", targetStr,
                           "Commencing B-Tree multi-way key search for target " + targetStr + " (Order M=" + std::to_string(order_) + ")",
                           0, 0);
        }
        return searchRecursive(root_.get(), key, metrics, trace);
    }

    std::vector<std::string> rangeQuery(const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        if (trace) {
            trace->addStep("start", root_ ? root_->id : -1, -1, "", "", "[" + lower.toString() + " .. " + upper.toString() + "]",
                           "Initiating B-Tree in-order range query across multi-key subtrees for range [" + lower.toString() + " .. " + upper.toString() + "]",
                           0, 0);
        }
        rangeRecursive(root_.get(), lower, upper, metrics, results, trace);
        if (trace) {
            trace->addStep("complete", -1, -1, "", "", "[" + lower.toString() + " .. " + upper.toString() + "]",
                           "B-Tree range query finished. Returned " + std::to_string(results.size()) + " record(s).",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }
        return results;
    }

    std::vector<std::string> prefixQuery(const std::string& prefix, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        (void)trace;
        prefixRecursive(root_.get(), prefix, metrics, results);
        return results;
    }

    int getHeight() const {
        return calculateHeight(root_.get());
    }

    Json getStructure() const override {
        Json root = Json::makeObject();
        root["type"] = "BTree";
        root["order"] = order_;
        root["height"] = getHeight();
        root["nodeCount"] = static_cast<int>(totalNodes_);
        root["root"] = nodeToJson(root_.get());
        return root;
    }

    Json getStats() const override {
        Json stats = Json::makeObject();
        stats["type"] = "BTree";
        stats["order"] = order_;
        stats["height"] = getHeight();
        stats["nodeCount"] = static_cast<int>(totalNodes_);
        stats["description"] = "Multi-way balanced search tree. Order " + std::to_string(order_) + ". Efficient for block storage & disk IO.";
        return stats;
    }

    size_t getMemoryEstimate() const override {
        return totalNodes_ * (sizeof(Node) + order_ * sizeof(void*)) + sizeof(*this);
    }

private:
    int order_;
    std::unique_ptr<Node> root_;
    int nextNodeId_;
    size_t totalNodes_;

    int calculateHeight(const Node* node) const {
        if (!node) return 0;
        if (node->isLeaf) return 1;
        return 1 + calculateHeight(node->children[0].get());
    }

    void splitChild(Node* parent, int childIdx) {
        Node* fullChild = parent->children[childIdx].get();
        std::unique_ptr<Node> sibling(new Node(fullChild->isLeaf, nextNodeId_++));
        totalNodes_++;

        int mid = (order_ - 1) / 2;
        KeyValue promotedKey = fullChild->keys[mid];
        std::vector<std::string> promotedRecords = fullChild->recordLists[mid];

        for (size_t i = mid + 1; i < fullChild->keys.size(); ++i) {
            sibling->keys.push_back(fullChild->keys[i]);
            sibling->recordLists.push_back(fullChild->recordLists[i]);
        }

        if (!fullChild->isLeaf) {
            for (size_t i = mid + 1; i < fullChild->children.size(); ++i) {
                sibling->children.push_back(std::move(fullChild->children[i]));
            }
            fullChild->children.resize(mid + 1);
        }

        fullChild->keys.resize(mid);
        fullChild->recordLists.resize(mid);

        parent->children.insert(parent->children.begin() + childIdx + 1, std::move(sibling));
        parent->keys.insert(parent->keys.begin() + childIdx, promotedKey);
        parent->recordLists.insert(parent->recordLists.begin() + childIdx, promotedRecords);
    }

    void insertNonFull(Node* node, const KeyValue& key, const std::string& recordId) {
        int i = static_cast<int>(node->keys.size()) - 1;

        if (node->isLeaf) {
            for (size_t k = 0; k < node->keys.size(); ++k) {
                if (node->keys[k] == key) {
                    node->recordLists[k].push_back(recordId);
                    return;
                }
            }
            while (i >= 0 && key < node->keys[i]) {
                i--;
            }
            node->keys.insert(node->keys.begin() + i + 1, key);
            node->recordLists.insert(node->recordLists.begin() + i + 1, {recordId});
        } else {
            for (size_t k = 0; k < node->keys.size(); ++k) {
                if (node->keys[k] == key) {
                    node->recordLists[k].push_back(recordId);
                    return;
                }
            }
            while (i >= 0 && key < node->keys[i]) {
                i--;
            }
            i++;

            if (node->children[i]->keys.size() >= static_cast<size_t>(order_ - 1)) {
                splitChild(node, i);
                if (key > node->keys[i]) {
                    i++;
                } else if (key == node->keys[i]) {
                    node->recordLists[i].push_back(recordId);
                    return;
                }
            }
            insertNonFull(node->children[i].get(), key, recordId);
        }
    }

    std::vector<std::string> searchRecursive(Node* node, const KeyValue& key, QueryMetrics& metrics, TraceCollector* trace) {
        if (!node) return {};
        metrics.nodesVisited++;
        std::string targetStr = key.toString();

        std::string nodeKeysStr = "";
        for (size_t k = 0; k < node->keys.size(); ++k) {
            if (k > 0) nodeKeysStr += ", ";
            nodeKeysStr += node->keys[k].toString();
        }

        if (trace) {
            trace->addStep("visit", node->id, -1, "", "[" + nodeKeysStr + "]", targetStr,
                           "Inspecting B-Tree Node #" + std::to_string(node->id) + " (" + (node->isLeaf ? "Leaf" : "Internal") + ") containing keys [" + nodeKeysStr + "]",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }

        int i = 0;
        int n = static_cast<int>(node->keys.size());
        while (i < n) {
            metrics.keyComparisons++;
            if (key == node->keys[i]) {
                metrics.recordsExamined += node->recordLists[i].size();
                if (trace) {
                    trace->addStep("match", node->id, -1, node->recordLists[i].empty() ? "" : node->recordLists[i][0],
                                   node->keys[i].toString(), targetStr,
                                   "Target key " + targetStr + " MATCHES key at slot #" + std::to_string(i) + " in Node #" + std::to_string(node->id) + "!",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                return node->recordLists[i];
            } else if (key < node->keys[i]) {
                if (trace) {
                    trace->addStep("compare", node->id, -1, "",
                                   node->keys[i].toString(), targetStr,
                                   "Target " + targetStr + " < Node key " + node->keys[i].toString() + ". Routing to child pointer index #" + std::to_string(i) + ".",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                break;
            }
            i++;
        }

        if (node->isLeaf) {
            if (trace) {
                trace->addStep("miss", node->id, -1, "", "[" + nodeKeysStr + "]", targetStr,
                               "Exhausted leaf keys in Node #" + std::to_string(node->id) + ": Key " + targetStr + " not found in B-Tree.",
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
            return {};
        }

        if (trace && i == n) {
            trace->addStep("compare", node->id, -1, "",
                           node->keys.back().toString(), targetStr,
                           "Target " + targetStr + " > last key " + node->keys.back().toString() + ". Routing to rightmost child pointer index #" + std::to_string(i) + ".",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }

        return searchRecursive(node->children[i].get(), key, metrics, trace);
    }

    void rangeRecursive(Node* node, const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics,
                        std::vector<std::string>& results, TraceCollector* trace = nullptr) {
        if (!node) return;
        metrics.nodesVisited++;

        size_t n = node->keys.size();
        for (size_t i = 0; i < n; ++i) {
            if (!node->isLeaf) {
                metrics.keyComparisons++;
                if (lower <= node->keys[i]) {
                    rangeRecursive(node->children[i].get(), lower, upper, metrics, results, trace);
                }
            }

            metrics.keyComparisons += 2;
            if (node->keys[i] >= lower && node->keys[i] <= upper) {
                metrics.recordsExamined += node->recordLists[i].size();
                for (const auto& id : node->recordLists[i]) {
                    results.push_back(id);
                }
                if (trace) {
                    trace->addStep("match", node->id, -1, node->recordLists[i].empty() ? "" : node->recordLists[i][0],
                                   node->keys[i].toString(), "[" + lower.toString() + " .. " + upper.toString() + "]",
                                   "B-Tree Node #" + std::to_string(node->id) + " key " + node->keys[i].toString() + " matches range bounds.",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
            } else if (node->keys[i] > upper) {
                return;
            }
        }

        if (!node->isLeaf) {
            metrics.keyComparisons++;
            if (upper >= node->keys.back()) {
                rangeRecursive(node->children.back().get(), lower, upper, metrics, results, trace);
            }
        }
    }

    void prefixRecursive(Node* node, const std::string& prefix, QueryMetrics& metrics, std::vector<std::string>& results) {
        if (!node) return;
        metrics.nodesVisited++;

        size_t n = node->keys.size();
        for (size_t i = 0; i < n; ++i) {
            if (!node->isLeaf) {
                prefixRecursive(node->children[i].get(), prefix, metrics, results);
            }
            metrics.keyComparisons++;
            std::string s = node->keys[i].toString();
            if (s.rfind(prefix, 0) == 0) {
                metrics.recordsExamined += node->recordLists[i].size();
                for (const auto& id : node->recordLists[i]) {
                    results.push_back(id);
                }
            }
        }
        if (!node->isLeaf) {
            prefixRecursive(node->children.back().get(), prefix, metrics, results);
        }
    }

    bool removeRecursive(Node* node, const KeyValue& key, const std::string& recordId) {
        if (!node) return false;
        for (size_t i = 0; i < node->keys.size(); ++i) {
            if (node->keys[i] == key) {
                auto it = std::find(node->recordLists[i].begin(), node->recordLists[i].end(), recordId);
                if (it != node->recordLists[i].end()) {
                    node->recordLists[i].erase(it);
                    return true;
                }
            }
        }
        if (!node->isLeaf) {
            for (auto& child : node->children) {
                if (removeRecursive(child.get(), key, recordId)) return true;
            }
        }
        return false;
    }

    Json nodeToJson(const Node* node) const {
        if (!node) return Json();
        Json j = Json::makeObject();
        j["id"] = node->id;
        j["isLeaf"] = node->isLeaf;
        Json keysArr = Json::makeArray();
        for (const auto& k : node->keys) {
            keysArr.push_back(k.toString());
        }
        j["keys"] = keysArr;
        j["keyCount"] = static_cast<int>(node->keys.size());

        Json childrenArr = Json::makeArray();
        if (!node->isLeaf) {
            for (const auto& child : node->children) {
                childrenArr.push_back(nodeToJson(child.get()));
            }
        }
        j["children"] = childrenArr;
        return j;
    }
};
