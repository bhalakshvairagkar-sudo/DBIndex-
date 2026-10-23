#pragma once
#include <string>
#include <vector>
#include <memory>
#include "models/key_value.hpp"
#include "models/record.hpp"
#include "engine/metrics.hpp"
#include "engine/trace.hpp"
#include "engine/json.hpp"

class IndexInterface {
public:
    virtual ~IndexInterface() = default;

    virtual std::string getName() const = 0;
    virtual void clear() = 0;
    virtual void build(const std::vector<Record>& records, const std::string& fieldName) = 0;
    virtual void insert(const KeyValue& key, const std::string& recordId) = 0;
    virtual void insertWithTrace(const KeyValue& key, const std::string& recordId, TraceCollector* trace) {
        (void)trace;
        insert(key, recordId);
    }
    virtual bool remove(const KeyValue& key, const std::string& recordId) = 0;
    virtual std::vector<std::string> exactMatch(const KeyValue& key, QueryMetrics& metrics, TraceCollector* trace = nullptr) = 0;
    virtual std::vector<std::string> rangeQuery(const KeyValue& lower, const KeyValue& upper, QueryMetrics& metrics, TraceCollector* trace = nullptr) = 0;
    virtual std::vector<std::string> prefixQuery(const std::string& prefix, QueryMetrics& metrics, TraceCollector* trace = nullptr) = 0;
    virtual Json getStructure() const = 0;
    virtual Json getStats() const = 0;
    virtual size_t getMemoryEstimate() const = 0;
};
