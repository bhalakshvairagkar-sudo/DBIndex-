#pragma once
#include <string>
#include <vector>
#include "engine/json.hpp"

struct TraceStep {
    int stepNumber = 0;
    std::string action;        // "visit", "compare", "traverse", "match", "miss", "rotate", "split", "bucket_hash", "chain_step", "leaf_scan"
    int nodeId = -1;
    int bucketIndex = -1;
    std::string recordId = "";
    std::string keyExamined = "";
    std::string targetKey = "";
    std::string explanation = "";
    int comparisonsSoFar = 0;
    int nodesVisitedSoFar = 0;
    std::vector<int> activePath;

    Json toJson() const {
        Json j = Json::makeObject();
        j["stepNumber"] = stepNumber;
        j["action"] = action;
        j["nodeId"] = nodeId;
        j["bucketIndex"] = bucketIndex;
        j["recordId"] = recordId;
        j["keyExamined"] = keyExamined;
        j["targetKey"] = targetKey;
        j["explanation"] = explanation;
        j["comparisonsSoFar"] = comparisonsSoFar;
        j["nodesVisitedSoFar"] = nodesVisitedSoFar;

        Json pathArr = Json::makeArray();
        for (int id : activePath) {
            pathArr.push_back(id);
        }
        j["activePath"] = pathArr;
        return j;
    }
};

class TraceCollector {
public:
    void clear() {
        steps_.clear();
        currentPath_.clear();
    }

    void addStep(const std::string& action, int nodeId, int bucketIdx, const std::string& recId,
                 const std::string& keyExamined, const std::string& targetKey,
                 const std::string& explanation, int comparisons, int nodesVisited) {
        TraceStep step;
        step.stepNumber = static_cast<int>(steps_.size()) + 1;
        step.action = action;
        step.nodeId = nodeId;
        step.bucketIndex = bucketIdx;
        step.recordId = recId;
        step.keyExamined = keyExamined;
        step.targetKey = targetKey;
        step.explanation = explanation;
        step.comparisonsSoFar = comparisons;
        step.nodesVisitedSoFar = nodesVisited;

        if (nodeId != -1) {
            if (currentPath_.empty() || currentPath_.back() != nodeId) {
                currentPath_.push_back(nodeId);
            }
        }
        step.activePath = currentPath_;
        steps_.push_back(step);
    }

    const std::vector<TraceStep>& getSteps() const {
        return steps_;
    }

    Json toJson() const {
        Json arr = Json::makeArray();
        for (const auto& s : steps_) {
            arr.push_back(s.toJson());
        }
        return arr;
    }

private:
    std::vector<TraceStep> steps_;
    std::vector<int> currentPath_;
};
