#pragma once
#include "engine/index_interface.hpp"
#include <vector>
#include <memory>
#include <algorithm>

class BPlusTreeIndex : public IndexInterface {
public:
    static const int DEFAULT_ORDER = 4; // Max keys per node = order - 1

    struct Node {
        bool isLeaf;
        int id;
        std::vector<KeyValue> keys;
        // If leaf:
        std::vector<std::vector<std::string>> recordLists;
        Node* nextLeaf = nullptr;
        // If internal:
        std::vector<std::unique_ptr<Node>> children;

        Node(bool leaf, int nodeId) : isLeaf(leaf), id(nodeId), nextLeaf(nullptr) {}
    };

    explicit BPlusTreeIndex(int order = DEFAULT_ORDER)
        : order_(order), root_(nullptr), headLeaf_(nullptr), nextNodeId_(1), totalNodes_(0) {
        if (order_ < 3) order_ = 3;
    }

    std::string getName() const override {
        return "BPlusTree";
    }

    void clear() override {
        root_.reset();
        headLeaf_ = nullptr;
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
            headLeaf_ = root_.get();
            root_->keys.push_back(key);
            root_->recordLists.push_back({recordId});
            totalNodes_ = 1;
            return;
        }

        KeyValue promotedKey;
        std::unique_ptr<Node> newSibling = insertInternal(root_.get(), key, recordId, promotedKey);

        if (newSibling) {
            std::unique_ptr<Node> newRoot(new Node(false, nextNodeId_++));
            totalNodes_++;
            newRoot->keys.push_back(promotedKey);
            newRoot->children.push_back(std::move(root_));
            newRoot->children.push_back(std::move(newSibling));
            root_ = std::move(newRoot);
        }
    }

    void insertWithTrace(const KeyValue& key, const std::string& recordId, TraceCollector* trace) override {
        (void)trace;
        insert(key, recordId);
    }

    bool remove(const KeyValue& key, const std::string& recordId) override {
        if (!root_) return false;
        Node* leaf = findLeaf(root_.get(), key);
        if (!leaf) return false;

        for (size_t i = 0; i < leaf->keys.size(); ++i) {
            if (leaf->keys[i] == key) {
                auto it = std::find(leaf->recordLists[i].begin(), leaf->recordLists[i].end(), recordId);
                if (it != leaf->recordLists[i].end()) {
                    leaf->recordLists[i].erase(it);
                    return true;
                }
            }
        }
        return false;
    }

    std::vector<std::string> exactMatch(const KeyValue& key, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        if (!root_) return results;
        std::string targetStr = key.toString();

        if (trace) {
            trace->addStep("start", root_->id, -1, "", "", targetStr,
                           "Initiating B+ Tree lookup for target " + targetStr + ". Internal nodes route traffic; data is stored only in leaves.",
                           0, 0);
        }

        Node* curr = root_.get();
        while (!curr->isLeaf) {
            metrics.nodesVisited++;
            std::string keysList = "";
            for (size_t k = 0; k < curr->keys.size(); ++k) {
                if (k > 0) keysList += ", ";
                keysList += curr->keys[k].toString();
            }

            size_t i = 0;
            while (i < curr->keys.size()) {
                metrics.keyComparisons++;
                if (key < curr->keys[i]) {
                    break;
                }
                i++;
            }

            if (trace) {
                trace->addStep("traverse", curr->id, -1, "", "[" + keysList + "]", targetStr,
                               "Inspecting Internal Router Node #" + std::to_string(curr->id) + " with keys [" + keysList + "]. Routing to child branch #" + std::to_string(i) + ".",
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
            curr = curr->children[i].get();
        }

        // We are at leaf node
        metrics.nodesVisited++;
        std::string leafKeysList = "";
        for (size_t k = 0; k < curr->keys.size(); ++k) {
            if (k > 0) leafKeysList += ", ";
            leafKeysList += curr->keys[k].toString();
        }

        if (trace) {
            trace->addStep("visit", curr->id, -1, "", "[" + leafKeysList + "]", targetStr,
                           "Reached Leaf Node #" + std::to_string(curr->id) + " with keys [" + leafKeysList + "]. Searching for target key.",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }

        for (size_t i = 0; i < curr->keys.size(); ++i) {
            metrics.keyComparisons++;
            if (curr->keys[i] == key) {
                metrics.recordsExamined += curr->recordLists[i].size();
                if (trace) {
                    trace->addStep("match", curr->id, -1, curr->recordLists[i].empty() ? "" : curr->recordLists[i][0],
                                   curr->keys[i].toString(), targetStr,
                                   "Target key " + targetStr + " MATCHES Leaf Node #" + std::to_string(curr->id) + "! Found " + std::to_string(curr->recordLists[i].size()) + " record(s).",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                return curr->recordLists[i];
            }
        }

        if (trace) {
            trace->addStep("miss", curr->id, -1, "", "[" + leafKeysList + "]", targetStr,
                           "Leaf Node #" + std::to_string(curr->id) + " does not contain key " + targetStr + ".",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }

        return results;
    }

    // Range Query in B+ Tree: O(log n) to find start leaf, then O(k) linked-leaf scan!
    std::vector<std::string> rangeQuery(const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        if (!root_) return results;
        std::string rangeStr = "[" + lower.toString() + " .. " + upper.toString() + "]";

        if (trace) {
            trace->addStep("start", root_->id, -1, "", "", rangeStr,
                           "Initiating B+ Tree Range Query for range " + rangeStr + ". Step 1: Binary routing down to starting leaf node.",
                           0, 0);
        }

        // 1. Descend to the first leaf node that could contain 'lower'
        Node* curr = root_.get();
        while (!curr->isLeaf) {
            metrics.nodesVisited++;
            size_t i = 0;
            while (i < curr->keys.size()) {
                metrics.keyComparisons++;
                if (lower < curr->keys[i]) {
                    break;
                }
                i++;
            }
            if (trace) {
                trace->addStep("traverse", curr->id, -1, "", "", rangeStr,
                               "Internal router node #" + std::to_string(curr->id) + " directs lower bound " + lower.toString() + " to child branch #" + std::to_string(i),
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
            curr = curr->children[i].get();
        }

        if (trace) {
            trace->addStep("visit", curr->id, -1, "", "", rangeStr,
                           "Step 2: Found starting Leaf Node #" + std::to_string(curr->id) + ". Now scanning sequentially across doubly linked leaf chain in O(1) time per leaf!",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }

        // 2. Scan sequentially across linked leaf nodes using 'nextLeaf' pointer!
        while (curr != nullptr) {
            metrics.nodesVisited++;
            bool reachedBeyondUpper = false;

            for (size_t i = 0; i < curr->keys.size(); ++i) {
                metrics.keyComparisons += 2;
                if (curr->keys[i] >= lower && curr->keys[i] <= upper) {
                    metrics.recordsExamined += curr->recordLists[i].size();
                    for (const auto& id : curr->recordLists[i]) {
                        results.push_back(id);
                    }
                    if (trace) {
                        trace->addStep("match", curr->id, -1, curr->recordLists[i].empty() ? "" : curr->recordLists[i][0],
                                       curr->keys[i].toString(), rangeStr,
                                       "Leaf #" + std::to_string(curr->id) + " key (" + curr->keys[i].toString() + ") is within range " + rangeStr,
                                       static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                    }
                } else if (curr->keys[i] > upper) {
                    reachedBeyondUpper = true;
                    if (trace) {
                        trace->addStep("complete", curr->id, -1, "", curr->keys[i].toString(), rangeStr,
                                       "Key " + curr->keys[i].toString() + " exceeds upper bound " + upper.toString() + ". Sequential leaf scan terminates early!",
                                       static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                    }
                    break;
                }
            }

            if (reachedBeyondUpper) break;

            if (curr->nextLeaf && trace) {
                trace->addStep("leaf_scan", curr->nextLeaf->id, -1, "", "", rangeStr,
                               "Following nextLeaf pointer: Leaf #" + std::to_string(curr->id) + " ──▶ Leaf #" + std::to_string(curr->nextLeaf->id),
                               static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
            }
            curr = curr->nextLeaf;
        }

        return results;
    }

    std::vector<std::string> prefixQuery(const std::string& prefix, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        (void)trace;
        if (!root_) return results;

        Node* curr = headLeaf_;
        while (curr != nullptr) {
            metrics.nodesVisited++;
            for (size_t i = 0; i < curr->keys.size(); ++i) {
                metrics.keyComparisons++;
                std::string s = curr->keys[i].toString();
                if (s.rfind(prefix, 0) == 0) {
                    metrics.recordsExamined += curr->recordLists[i].size();
                    for (const auto& id : curr->recordLists[i]) {
                        results.push_back(id);
                    }
                }
            }
            curr = curr->nextLeaf;
        }
        return results;
    }

    int getHeight() const {
        return calculateHeight(root_.get());
    }

    Json getStructure() const override {
        Json root = Json::makeObject();
        root["type"] = "BPlusTree";
        root["order"] = order_;
        root["height"] = getHeight();
        root["nodeCount"] = static_cast<int>(totalNodes_);
        root["root"] = nodeToJson(root_.get());

        // Also output the leaf chain for visual representation of leaf links
        Json leafChain = Json::makeArray();
        Node* l = headLeaf_;
        while (l != nullptr) {
            Json lj = Json::makeObject();
            lj["nodeId"] = l->id;
            Json keysArr = Json::makeArray();
            for (const auto& k : l->keys) {
                keysArr.push_back(k.toString());
            }
            lj["keys"] = keysArr;
            lj["nextLeafId"] = l->nextLeaf ? l->nextLeaf->id : -1;
            leafChain.push_back(lj);
            l = l->nextLeaf;
        }
        root["leafChain"] = leafChain;

        return root;
    }

    Json getStats() const override {
        Json stats = Json::makeObject();
        stats["type"] = "BPlusTree";
        stats["order"] = order_;
        stats["height"] = getHeight();
        stats["nodeCount"] = static_cast<int>(totalNodes_);
        stats["description"] = "B+ Tree. Internal routing nodes + linked leaf nodes. The gold standard for database indexes and sequential range scans.";
        return stats;
    }

    size_t getMemoryEstimate() const override {
        return totalNodes_ * (sizeof(Node) + order_ * sizeof(void*)) + sizeof(*this);
    }

private:
    int order_;
    std::unique_ptr<Node> root_;
    Node* headLeaf_;
    int nextNodeId_;
    size_t totalNodes_;

    int calculateHeight(const Node* node) const {
        if (!node) return 0;
        if (node->isLeaf) return 1;
        return 1 + calculateHeight(node->children[0].get());
    }

    Node* findLeaf(Node* node, const KeyValue& key) {
        if (!node) return nullptr;
        if (node->isLeaf) return node;

        size_t i = 0;
        while (i < node->keys.size() && key >= node->keys[i]) {
            i++;
        }
        return findLeaf(node->children[i].get(), key);
    }

    std::unique_ptr<Node> insertInternal(Node* node, const KeyValue& key, const std::string& recordId, KeyValue& promotedKey) {
        if (node->isLeaf) {
            for (size_t i = 0; i < node->keys.size(); ++i) {
                if (node->keys[i] == key) {
                    node->recordLists[i].push_back(recordId);
                    return nullptr;
                }
            }

            size_t idx = 0;
            while (idx < node->keys.size() && node->keys[idx] < key) {
                idx++;
            }
            node->keys.insert(node->keys.begin() + idx, key);
            node->recordLists.insert(node->recordLists.begin() + idx, {recordId});

            if (node->keys.size() >= static_cast<size_t>(order_)) {
                std::unique_ptr<Node> sibling(new Node(true, nextNodeId_++));
                totalNodes_++;

                size_t mid = node->keys.size() / 2;
                promotedKey = node->keys[mid];

                for (size_t i = mid; i < node->keys.size(); ++i) {
                    sibling->keys.push_back(node->keys[i]);
                    sibling->recordLists.push_back(node->recordLists[i]);
                }

                node->keys.resize(mid);
                node->recordLists.resize(mid);

                sibling->nextLeaf = node->nextLeaf;
                node->nextLeaf = sibling.get();

                return sibling;
            }
            return nullptr;
        } else {
            size_t idx = 0;
            while (idx < node->keys.size() && key >= node->keys[idx]) {
                idx++;
            }

            KeyValue childPromotedKey;
            std::unique_ptr<Node> newSibling = insertInternal(node->children[idx].get(), key, recordId, childPromotedKey);

            if (newSibling) {
                node->keys.insert(node->keys.begin() + idx, childPromotedKey);
                node->children.insert(node->children.begin() + idx + 1, std::move(newSibling));

                if (node->keys.size() >= static_cast<size_t>(order_)) {
                    std::unique_ptr<Node> sibling(new Node(false, nextNodeId_++));
                    totalNodes_++;

                    size_t mid = node->keys.size() / 2;
                    promotedKey = node->keys[mid];

                    for (size_t i = mid + 1; i < node->keys.size(); ++i) {
                        sibling->keys.push_back(node->keys[i]);
                    }
                    for (size_t i = mid + 1; i < node->children.size(); ++i) {
                        sibling->children.push_back(std::move(node->children[i]));
                    }

                    node->keys.resize(mid);
                    node->children.resize(mid + 1);

                    return sibling;
                }
            }
            return nullptr;
        }
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

        if (node->isLeaf) {
            j["nextLeafId"] = node->nextLeaf ? node->nextLeaf->id : -1;
        } else {
            Json childrenArr = Json::makeArray();
            for (const auto& child : node->children) {
                childrenArr.push_back(nodeToJson(child.get()));
            }
            j["children"] = childrenArr;
        }
        return j;
    }
};
