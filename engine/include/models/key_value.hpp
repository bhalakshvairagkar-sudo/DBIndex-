#pragma once
#include <string>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <cmath>

enum class KeyType {
    NUMBER,
    STRING
};

class KeyValue {
public:
    KeyType type;
    double numVal;
    std::string strVal;

    KeyValue() : type(KeyType::NUMBER), numVal(0.0), strVal("") {}
    
    explicit KeyValue(double num) : type(KeyType::NUMBER), numVal(num), strVal("") {}
    
    explicit KeyValue(int num) : type(KeyType::NUMBER), numVal(static_cast<double>(num)), strVal("") {}
    
    explicit KeyValue(const std::string& str) : type(KeyType::STRING), numVal(0.0), strVal(str) {}
    
    explicit KeyValue(const char* str) : type(KeyType::STRING), numVal(0.0), strVal(str ? str : "") {}

    bool isNumber() const { return type == KeyType::NUMBER; }
    bool isString() const { return type == KeyType::STRING; }

    std::string toString() const {
        if (type == KeyType::STRING) {
            return strVal;
        } else {
            // Check if it's an integer
            if (std::floor(numVal) == numVal && !std::isinf(numVal)) {
                return std::to_string(static_cast<long long>(numVal));
            }
            std::ostringstream ss;
            ss << std::fixed << std::setprecision(2) << numVal;
            std::string res = ss.str();
            // Trim trailing zeros after decimal if appropriate
            while (res.size() > 1 && res.back() == '0' && res[res.size() - 2] != '.') {
                res.pop_back();
            }
            return res;
        }
    }

    bool operator==(const KeyValue& other) const {
        if (type != other.type) return false;
        if (type == KeyType::NUMBER) return std::abs(numVal - other.numVal) < 1e-9;
        return strVal == other.strVal;
    }

    bool operator!=(const KeyValue& other) const {
        return !(*this == other);
    }

    bool operator<(const KeyValue& other) const {
        if (type != other.type) {
            return type < other.type;
        }
        if (type == KeyType::NUMBER) {
            return numVal < other.numVal - 1e-9;
        }
        return strVal < other.strVal;
    }

    bool operator<=(const KeyValue& other) const {
        return (*this < other) || (*this == other);
    }

    bool operator>(const KeyValue& other) const {
        return !(*this <= other);
    }

    bool operator>=(const KeyValue& other) const {
        return !(*this < other);
    }

    size_t hash() const {
        if (type == KeyType::NUMBER) {
            return std::hash<double>()(numVal);
        }
        return std::hash<std::string>()(strVal);
    }
};
