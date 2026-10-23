#pragma once
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <stdexcept>
#include <cctype>
#include <iomanip>
#include <iostream>

enum class JsonType {
    NUL,
    BOOLEAN,
    NUMBER,
    STRING,
    ARRAY,
    OBJECT
};

class Json {
public:
    JsonType type = JsonType::NUL;
    bool bool_val = false;
    double num_val = 0.0;
    std::string str_val = "";
    std::vector<Json> arr_val;
    std::map<std::string, Json> obj_val;

    Json() : type(JsonType::NUL) {}
    Json(std::nullptr_t) : type(JsonType::NUL) {}
    Json(bool b) : type(JsonType::BOOLEAN), bool_val(b) {}
    Json(int n) : type(JsonType::NUMBER), num_val(n) {}
    Json(unsigned int n) : type(JsonType::NUMBER), num_val(n) {}
    Json(long n) : type(JsonType::NUMBER), num_val(static_cast<double>(n)) {}
    Json(unsigned long n) : type(JsonType::NUMBER), num_val(static_cast<double>(n)) {}
    Json(long long n) : type(JsonType::NUMBER), num_val(static_cast<double>(n)) {}
    Json(unsigned long long n) : type(JsonType::NUMBER), num_val(static_cast<double>(n)) {}
    Json(double n) : type(JsonType::NUMBER), num_val(n) {}
    Json(const std::string& s) : type(JsonType::STRING), str_val(s) {}
    Json(const char* s) : type(JsonType::STRING), str_val(s ? s : "") {}
    Json(const std::vector<Json>& arr) : type(JsonType::ARRAY), arr_val(arr) {}
    Json(const std::map<std::string, Json>& obj) : type(JsonType::OBJECT), obj_val(obj) {}

    static Json makeArray() {
        Json j;
        j.type = JsonType::ARRAY;
        return j;
    }

    static Json makeObject() {
        Json j;
        j.type = JsonType::OBJECT;
        return j;
    }

    bool isNull() const { return type == JsonType::NUL; }
    bool isBool() const { return type == JsonType::BOOLEAN; }
    bool isNumber() const { return type == JsonType::NUMBER; }
    bool isString() const { return type == JsonType::STRING; }
    bool isArray() const { return type == JsonType::ARRAY; }
    bool isObject() const { return type == JsonType::OBJECT; }

    bool asBool(bool def = false) const { return isBool() ? bool_val : def; }
    double asDouble(double def = 0.0) const { return isNumber() ? num_val : def; }
    int asInt(int def = 0) const { return isNumber() ? static_cast<int>(num_val) : def; }
    std::string asString(const std::string& def = "") const { return isString() ? str_val : def; }

    bool has(const std::string& key) const {
        return isObject() && obj_val.find(key) != obj_val.end();
    }

    Json& operator[](const std::string& key) {
        if (type != JsonType::OBJECT) {
            type = JsonType::OBJECT;
            obj_val.clear();
        }
        return obj_val[key];
    }

    const Json& operator[](const std::string& key) const {
        static const Json null_val;
        if (!isObject()) return null_val;
        auto it = obj_val.find(key);
        if (it != obj_val.end()) return it->second;
        return null_val;
    }

    Json& operator[](size_t index) {
        if (type != JsonType::ARRAY) {
            type = JsonType::ARRAY;
            arr_val.clear();
        }
        if (index >= arr_val.size()) {
            arr_val.resize(index + 1);
        }
        return arr_val[index];
    }

    const Json& operator[](size_t index) const {
        static const Json null_val;
        if (!isArray() || index >= arr_val.size()) return null_val;
        return arr_val[index];
    }

    void push_back(const Json& val) {
        if (type != JsonType::ARRAY) {
            type = JsonType::ARRAY;
            arr_val.clear();
        }
        arr_val.push_back(val);
    }

    size_t size() const {
        if (isArray()) return arr_val.size();
        if (isObject()) return obj_val.size();
        return 0;
    }

    static std::string escape(const std::string& s) {
        std::ostringstream ss;
        for (char c : s) {
            switch (c) {
                case '"': ss << "\\\""; break;
                case '\\': ss << "\\\\"; break;
                case '\b': ss << "\\b"; break;
                case '\f': ss << "\\f"; break;
                case '\n': ss << "\\n"; break;
                case '\r': ss << "\\r"; break;
                case '\t': ss << "\\t"; break;
                default:
                    if (static_cast<unsigned char>(c) < 0x20) {
                        ss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << (int)(unsigned char)c;
                    } else {
                        ss << c;
                    }
            }
        }
        return ss.str();
    }

    std::string dump() const {
        switch (type) {
            case JsonType::NUL: return "null";
            case JsonType::BOOLEAN: return bool_val ? "true" : "false";
            case JsonType::NUMBER: {
                if (num_val == static_cast<long long>(num_val)) {
                    return std::to_string(static_cast<long long>(num_val));
                }
                std::ostringstream ss;
                ss << std::setprecision(10) << num_val;
                return ss.str();
            }
            case JsonType::STRING: return "\"" + escape(str_val) + "\"";
            case JsonType::ARRAY: {
                std::string res = "[";
                for (size_t i = 0; i < arr_val.size(); ++i) {
                    if (i > 0) res += ",";
                    res += arr_val[i].dump();
                }
                res += "]";
                return res;
            }
            case JsonType::OBJECT: {
                std::string res = "{";
                size_t i = 0;
                for (auto const& kv : obj_val) {
                    if (i > 0) res += ",";
                    res += "\"" + escape(kv.first) + "\":" + kv.second.dump();
                    i++;
                }
                res += "}";
                return res;
            }
        }
        return "null";
    }

    // Basic recursive descent parser
    static Json parse(const std::string& text) {
        size_t idx = 0;
        return parseValue(text, idx);
    }

private:
    static void skipWhitespace(const std::string& text, size_t& idx) {
        while (idx < text.size() && (text[idx] == ' ' || text[idx] == '\t' || text[idx] == '\n' || text[idx] == '\r')) {
            idx++;
        }
    }

    static Json parseValue(const std::string& text, size_t& idx) {
        skipWhitespace(text, idx);
        if (idx >= text.size()) return Json();

        char c = text[idx];
        if (c == '{') return parseObject(text, idx);
        if (c == '[') return parseArray(text, idx);
        if (c == '"') return parseString(text, idx);
        if (c == 't' || c == 'f') return parseBool(text, idx);
        if (c == 'n') return parseNull(text, idx);
        if (c == '-' || std::isdigit(c)) return parseNumber(text, idx);

        return Json();
    }

    static Json parseNull(const std::string& text, size_t& idx) {
        if (text.compare(idx, 4, "null") == 0) {
            idx += 4;
            return Json();
        }
        idx++;
        return Json();
    }

    static Json parseBool(const std::string& text, size_t& idx) {
        if (text.compare(idx, 4, "true") == 0) {
            idx += 4;
            return Json(true);
        }
        if (text.compare(idx, 5, "false") == 0) {
            idx += 5;
            return Json(false);
        }
        idx++;
        return Json(false);
    }

    static Json parseString(const std::string& text, size_t& idx) {
        idx++; // skip open quote
        std::string res;
        while (idx < text.size()) {
            char c = text[idx++];
            if (c == '"') {
                return Json(res);
            }
            if (c == '\\' && idx < text.size()) {
                char esc = text[idx++];
                if (esc == '"') res += '"';
                else if (esc == '\\') res += '\\';
                else if (esc == 'n') res += '\n';
                else if (esc == 't') res += '\t';
                else if (esc == 'r') res += '\r';
                else if (esc == 'b') res += '\b';
                else if (esc == 'f') res += '\f';
                else res += esc;
            } else {
                res += c;
            }
        }
        return Json(res);
    }

    static Json parseNumber(const std::string& text, size_t& idx) {
        size_t start = idx;
        if (text[idx] == '-') idx++;
        while (idx < text.size() && (std::isdigit(text[idx]) || text[idx] == '.' || text[idx] == 'e' || text[idx] == 'E' || text[idx] == '+' || text[idx] == '-')) {
            idx++;
        }
        std::string numStr = text.substr(start, idx - start);
        double val = std::stod(numStr);
        return Json(val);
    }

    static Json parseArray(const std::string& text, size_t& idx) {
        idx++; // skip '['
        Json arr = Json::makeArray();
        skipWhitespace(text, idx);
        if (idx < text.size() && text[idx] == ']') {
            idx++;
            return arr;
        }
        while (idx < text.size()) {
            skipWhitespace(text, idx);
            arr.push_back(parseValue(text, idx));
            skipWhitespace(text, idx);
            if (idx < text.size() && text[idx] == ',') {
                idx++;
            } else if (idx < text.size() && text[idx] == ']') {
                idx++;
                break;
            } else {
                break;
            }
        }
        return arr;
    }

    static Json parseObject(const std::string& text, size_t& idx) {
        idx++; // skip '{'
        Json obj = Json::makeObject();
        skipWhitespace(text, idx);
        if (idx < text.size() && text[idx] == '}') {
            idx++;
            return obj;
        }
        while (idx < text.size()) {
            skipWhitespace(text, idx);
            if (idx >= text.size() || text[idx] != '"') break;
            std::string key = parseString(text, idx).asString();
            skipWhitespace(text, idx);
            if (idx >= text.size() || text[idx] != ':') break;
            idx++; // skip ':'
            skipWhitespace(text, idx);
            Json val = parseValue(text, idx);
            obj[key] = val;
            skipWhitespace(text, idx);
            if (idx < text.size() && text[idx] == ',') {
                idx++;
            } else if (idx < text.size() && text[idx] == '}') {
                idx++;
                break;
            } else {
                break;
            }
        }
        return obj;
    }
};
