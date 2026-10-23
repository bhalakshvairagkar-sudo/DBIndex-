#pragma once
#include <string>
#include <unordered_map>
#include "models/key_value.hpp"

struct Record {
    std::string id;
    std::unordered_map<std::string, KeyValue> fields;

    Record() = default;
    Record(const std::string& recId) : id(recId) {}

    void setField(const std::string& fieldName, const KeyValue& val) {
        fields[fieldName] = val;
    }

    KeyValue getField(const std::string& fieldName) const {
        auto it = fields.find(fieldName);
        if (it != fields.end()) {
            return it->second;
        }
        return KeyValue("");
    }

    bool hasField(const std::string& fieldName) const {
        return fields.find(fieldName) != fields.end();
    }
};
