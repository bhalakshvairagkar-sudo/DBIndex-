#pragma once
#include "engine/index_interface.hpp"
#include <algorithm>
#include <memory>

class AVLIndex : public IndexInterface {
public:
    struct Node {
        KeyValue key;
        std::vector<std::string> recordIds;
        std::unique_ptr<Node> left;
        std::unique_ptr<Node> right;
        int height;
        int id;

        Node(const KeyValue& k, const std::string& recId, int nodeId)
            : key(k), height(1), id(nodeId) {
            recordIds.push_back(recId);
        }
    };

    AVLIndex() : root_(nullptr), nextNodeId_(1), nodeCount_(0), totalRotations_(0) {}

    std::string getName() const override {
        return "AVL";
    }

    void clear() override {
        root_.reset();
        nodeCount_ = 0;
        nextNodeId_ = 1;
        totalRotations_ = 0;
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
                           "Initiating AVL search traversal for target key " + targetStr + " (guaranteed O(log n) tree depth)",
                           0, 0);
        }

        Node* curr = root_.get();
        while (curr != nullptr) {
            metrics.nodesVisited++;
            metrics.keyComparisons++;
            int cId = curr->id;
            std::string cKey = curr->key.toString();
            int bf = getBalanceFactor(curr);

            if (key == curr->key) {
                metrics.recordsExamined += curr->recordIds.size();
                if (trace) {
                    trace->addStep("match", cId, -1, curr->recordIds.empty() ? "" : curr->recordIds[0],
                                   cKey, targetStr,
                                   "Target key " + targetStr + " MATCHES AVL Node #" + std::to_string(cId) + " (Key: " + cKey + ", Balance: " + std::to_string(bf) + "). Found " + std::to_string(curr->recordIds.size()) + " record(s)!",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                return curr->recordIds;
            } else if (key < curr->key) {
                if (trace) {
                    trace->addStep("traverse", cId, -1, "", cKey, targetStr,
                                   "Target " + targetStr + " < Node #" + std::to_string(cId) + " (" + cKey + "). Balance factor: " + std::to_string(bf) + ". Descending into LEFT subtree.",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                curr = curr->left.get();
            } else {
                if (trace) {
                    trace->addStep("traverse", cId, -1, "", cKey, targetStr,
                                   "Target " + targetStr + " > Node #" + std::to_string(cId) + " (" + cKey + "). Balance factor: " + std::to_string(bf) + ". Descending into RIGHT subtree.",
                                   static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
                }
                curr = curr->right.get();
            }
        }

        if (trace) {
            trace->addStep("miss", -1, -1, "", "", targetStr,
                           "Reached null leaf: Key " + targetStr + " was not found in AVL tree.",
                           static_cast<int>(metrics.keyComparisons), static_cast<int>(metrics.nodesVisited));
        }
        return results;
    }

    std::vector<std::string> rangeQuery(const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics, TraceCollector* trace = nullptr) override {
        std::vector<std::string> results;
        if (trace) {
            trace->addStep("start", root_ ? root_->id : -1, -1, "", "", "[" + lower.toString() + " .. " + upper.toString() + "]",
                           "Initiating AVL in-order bounded subtree scan for range [" + lower.toString() + " .. " + upper.toString() + "]",
                           0, 0);
        }
        rangeRecursive(root_.get(), lower, upper, metrics, results, trace);
        if (trace) {
            trace->addStep("complete", -1, -1, "", "", "[" + lower.toString() + " .. " + upper.toString() + "]",
                           "AVL range search complete. Total qualifying records gathered: " + std::to_string(results.size()),
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
        return nodeHeight(root_.get());
    }

    Json getStructure() const override {
        Json root = Json::makeObject();
        root["type"] = "AVL";
        root["height"] = getHeight();
        root["nodeCount"] = static_cast<int>(nodeCount_);
        root["totalRotations"] = totalRotations_;
        root["root"] = nodeToJson(root_.get(), 0);
        return root;
    }

    Json getStats() const override {
        Json stats = Json::makeObject();
        stats["type"] = "AVL";
        stats["height"] = getHeight();
        stats["nodeCount"] = static_cast<int>(nodeCount_);
        stats["totalRotations"] = totalRotations_;
        stats["description"] = "Self-balancing binary search tree. Guaranteed O(log n) height via rotations.";
        return stats;
    }

    size_t getMemoryEstimate() const override {
        return nodeCount_ * (sizeof(Node) + 32) + sizeof(*this);
    }

private:
    std::unique_ptr<Node> root_;
    int nextNodeId_;
    size_t nodeCount_;
    int totalRotations_;

    int nodeHeight(const Node* node) const {
        return node ? node->height : 0;
    }

    int getBalanceFactor(const Node* node) const {
        return node ? (nodeHeight(node->left.get()) - nodeHeight(node->right.get())) : 0;
    }

    void updateHeight(Node* node) {
        if (node) {
            node->height = 1 + std::max(nodeHeight(node->left.get()), nodeHeight(node->right.get()));
        }
    }

    std::unique_ptr<Node> rotateRight(std::unique_ptr<Node> y) {
        totalRotations_++;
        std::unique_ptr<Node> x = std::move(y->left);
        std::unique_ptr<Node> t2 = std::move(x->right);

        y->left = std::move(t2);
        updateHeight(y.get());

        x->right = std::move(y);
        updateHeight(x.get());

        return x;
    }

    std::unique_ptr<Node> rotateLeft(std::unique_ptr<Node> x) {
        totalRotations_++;
        std::unique_ptr<Node> y = std::move(x->right);
        std::unique_ptr<Node> t2 = std::move(y->left);

        x->right = std::move(t2);
        updateHeight(x.get());

        y->left = std::move(x);
        updateHeight(y.get());

        return y;
    }

    std::unique_ptr<Node> insertRecursive(std::unique_ptr<Node> node, const KeyValue& key, const std::string& recordId) {
        if (!node) {
            nodeCount_++;
            return std::unique_ptr<Node>(new Node(key, recordId, nextNodeId_++));
        }

        if (key == node->key) {
            node->recordIds.push_back(recordId);
            return node;
        } else if (key < node->key) {
            node->left = insertRecursive(std::move(node->left), key, recordId);
        } else {
            node->right = insertRecursive(std::move(node->right), key, recordId);
        }

        updateHeight(node.get());
        int balance = getBalanceFactor(node.get());

        // LL Case
        if (balance > 1 && key < node->left->key) {
            return rotateRight(std::move(node));
        }
        // RR Case
        if (balance < -1 && key > node->right->key) {
            return rotateLeft(std::move(node));
        }
        // LR Case
        if (balance > 1 && key > node->left->key) {
            node->left = rotateLeft(std::move(node->left));
            return rotateRight(std::move(node));
        }
        // RL Case
        if (balance < -1 && key < node->right->key) {
            node->right = rotateRight(std::move(node->right));
            return rotateLeft(std::move(node));
        }

        return node;
    }

    std::unique_ptr<Node> insertTraceRecursive(std::unique_ptr<Node> node, const KeyValue& key, const std::string& recordId, TraceCollector* trace) {
        if (!node) {
            nodeCount_++;
            int createdId = nextNodeId_++;
            if (trace) {
                trace->addStep("insert", createdId, -1, recordId, key.toString(), key.toString(),
                               "Created new AVL Node #" + std::to_string(createdId) + " (Key: " + key.toString() + ", Initial Height: 1)",
                               0, 0);
            }
            return std::unique_ptr<Node>(new Node(key, recordId, createdId));
        }

        if (key == node->key) {
            node->recordIds.push_back(recordId);
            if (trace) {
                trace->addStep("insert", node->id, -1, recordId, key.toString(), key.toString(),
                               "Appended duplicate record " + recordId + " to existing AVL Node #" + std::to_string(node->id),
                               0, 0);
            }
            return node;
        } else if (key < node->key) {
            if (trace) {
                trace->addStep("traverse", node->id, -1, "", node->key.toString(), key.toString(),
                               "Insert key " + key.toString() + " < Node #" + std::to_string(node->id) + " (" + node->key.toString() + "). Traversing left.",
                               0, 0);
            }
            node->left = insertTraceRecursive(std::move(node->left), key, recordId, trace);
        } else {
            if (trace) {
                trace->addStep("traverse", node->id, -1, "", node->key.toString(), key.toString(),
                               "Insert key " + key.toString() + " > Node #" + std::to_string(node->id) + " (" + node->key.toString() + "). Traversing right.",
                               0, 0);
            }
            node->right = insertTraceRecursive(std::move(node->right), key, recordId, trace);
        }

        updateHeight(node.get());
        int balance = getBalanceFactor(node.get());

        // LL Case
        if (balance > 1 && key < node->left->key) {
            if (trace) {
                trace->addStep("rotate", node->id, -1, "", node->key.toString(), key.toString(),
                               "AVL Invariant Violated at Node #" + std::to_string(node->id) + " (Balance: +" + std::to_string(balance) + "). Executing Single Right Rotation (LL Case) to restore balance.",
                               0, 0);
            }
            return rotateRight(std::move(node));
        }
        // RR Case
        if (balance < -1 && key > node->right->key) {
            if (trace) {
                trace->addStep("rotate", node->id, -1, "", node->key.toString(), key.toString(),
                               "AVL Invariant Violated at Node #" + std::to_string(node->id) + " (Balance: " + std::to_string(balance) + "). Executing Single Left Rotation (RR Case) to restore balance.",
                               0, 0);
            }
            return rotateLeft(std::move(node));
        }
        // LR Case
        if (balance > 1 && key > node->left->key) {
            if (trace) {
                trace->addStep("rotate", node->id, -1, "", node->key.toString(), key.toString(),
                               "AVL Invariant Violated at Node #" + std::to_string(node->id) + " (Balance: +" + std::to_string(balance) + "). Executing Double Left-Right Rotation (LR Case).",
                               0, 0);
            }
            node->left = rotateLeft(std::move(node->left));
            return rotateRight(std::move(node));
        }
        // RL Case
        if (balance < -1 && key < node->right->key) {
            if (trace) {
                trace->addStep("rotate", node->id, -1, "", node->key.toString(), key.toString(),
                               "AVL Invariant Violated at Node #" + std::to_string(node->id) + " (Balance: " + std::to_string(balance) + "). Executing Double Right-Left Rotation (RL Case).",
                               0, 0);
            }
            node->right = rotateRight(std::move(node->right));
            return rotateLeft(std::move(node));
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

        if (!node) return nullptr;

        updateHeight(node.get());
        int balance = getBalanceFactor(node.get());

        if (balance > 1 && getBalanceFactor(node->left.get()) >= 0) {
            return rotateRight(std::move(node));
        }
        if (balance > 1 && getBalanceFactor(node->left.get()) < 0) {
            node->left = rotateLeft(std::move(node->left));
            return rotateRight(std::move(node));
        }
        if (balance < -1 && getBalanceFactor(node->right.get()) <= 0) {
            return rotateLeft(std::move(node));
        }
        if (balance < -1 && getBalanceFactor(node->right.get()) > 0) {
            node->right = rotateRight(std::move(node->right));
            return rotateLeft(std::move(node));
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
                           "Inspecting AVL Node #" + std::to_string(node->id) + " (Key: " + node->key.toString() + ", Balance: " + std::to_string(getBalanceFactor(node)) + ")",
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
                               "Node #" + std::to_string(node->id) + " key (" + node->key.toString() + ") is within requested range [" + lower.toString() + " .. " + upper.toString() + "]",
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
        j["height"] = node->height;
        j["balanceFactor"] = getBalanceFactor(node);

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
