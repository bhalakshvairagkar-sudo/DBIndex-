#pragma once
#include <chrono>
#include <cstdint>
#include <string>

struct QueryMetrics {
    uint64_t keyComparisons = 0;
    uint64_t nodesVisited = 0;
    uint64_t recordsExamined = 0;
    double elapsedMicroseconds = 0.0;
    uint64_t memoryEstimateBytes = 0;

    void reset() {
        keyComparisons = 0;
        nodesVisited = 0;
        recordsExamined = 0;
        elapsedMicroseconds = 0.0;
        memoryEstimateBytes = 0;
    }
};

class ScopedTimer {
public:
    explicit ScopedTimer(double& targetMicroseconds)
        : target_(targetMicroseconds),
          start_(std::chrono::high_resolution_clock::now()) {}

    ~ScopedTimer() {
        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double, std::micro> elapsed = end - start_;
        target_ = elapsed.count();
    }

private:
    double& target_;
    std::chrono::time_point<std::chrono::high_resolution_clock> start_;
};
