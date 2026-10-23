#include <iostream>
#include <string>
#include "engine/engine.hpp"
#include "engine/json.hpp"

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    Engine engine;
    std::cerr << "[Engine] C++ Indexing Engine initialized and ready." << std::endl;

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        try {
            Json req = Json::parse(line);
            std::string cmd = req["command"].asString();

            if (cmd == "ping") {
                Json resp = Json::makeObject();
                resp["status"] = "pong";
                resp["version"] = "1.1.0";
                std::cout << resp.dump() << "\n" << std::flush;
            } else if (cmd == "loadRecords") {
                std::vector<Record> records;
                const Json& recsJson = req["records"];
                for (size_t i = 0; i < recsJson.size(); ++i) {
                    const Json& r = recsJson[i];
                    Record rec(r["id"].asString());
                    const Json& fields = r["fields"];
                    if (fields.isObject()) {
                        for (const auto& kv : fields.obj_val) {
                            if (kv.second.isNumber()) {
                                rec.setField(kv.first, KeyValue(kv.second.asDouble()));
                            } else {
                                rec.setField(kv.first, KeyValue(kv.second.asString()));
                            }
                        }
                    }
                    records.push_back(rec);
                }
                engine.loadRecords(records);
                Json resp = Json::makeObject();
                resp["status"] = "ok";
                resp["recordCount"] = static_cast<int>(records.size());
                std::cout << resp.dump() << "\n" << std::flush;
            } else if (cmd == "build") {
                std::string idxType = req["indexType"].asString("AVL");
                std::string field = req["field"].asString("cgpa");
                Json resp = engine.buildIndex(idxType, field);
                std::cout << resp.dump() << "\n" << std::flush;
            } else if (cmd == "query") {
                std::string idxType = req["indexType"].asString("AVL");
                std::string op = req["operation"].asString("exact");
                KeyValue val(req["value"].isNumber() ? KeyValue(req["value"].asDouble()) : KeyValue(req["value"].asString()));
                KeyValue lower(req["lowerBound"].isNumber() ? KeyValue(req["lowerBound"].asDouble()) : KeyValue(req["lowerBound"].asString()));
                KeyValue upper(req["upperBound"].isNumber() ? KeyValue(req["upperBound"].asDouble()) : KeyValue(req["upperBound"].asString()));
                std::string prefix = req["prefix"].asString();
                bool includeTrace = req["includeTrace"].asBool(false);

                Json resp = engine.query(idxType, op, val, lower, upper, prefix, includeTrace);
                std::cout << resp.dump() << "\n" << std::flush;
            } else if (cmd == "simulate") {
                std::string idxType = req["indexType"].asString("AVL");
                std::string op = req["operation"].asString("exact");
                KeyValue val(req["value"].isNumber() ? KeyValue(req["value"].asDouble()) : KeyValue(req["value"].asString()));
                KeyValue lower(req["lowerBound"].isNumber() ? KeyValue(req["lowerBound"].asDouble()) : KeyValue(req["lowerBound"].asString()));
                KeyValue upper(req["upperBound"].isNumber() ? KeyValue(req["upperBound"].asDouble()) : KeyValue(req["upperBound"].asString()));
                std::string prefix = req["prefix"].asString();
                std::string recId = req["recordId"].asString("SIM_REC");

                if (op == "insert") {
                    Json resp = engine.insertRecord(idxType, val, recId, true);
                    std::cout << resp.dump() << "\n" << std::flush;
                } else {
                    Json resp = engine.query(idxType, op, val, lower, upper, prefix, true);
                    std::cout << resp.dump() << "\n" << std::flush;
                }
            } else if (cmd == "getStructure") {
                std::string idxType = req["indexType"].asString("AVL");
                Json resp = engine.getStructure(idxType);
                std::cout << resp.dump() << "\n" << std::flush;
            } else if (cmd == "benchmark") {
                std::string field = req["field"].asString("cgpa");
                int iters = req["iterations"].asInt(5);
                const Json& queries = req["queries"];
                std::vector<std::string> indexTypes;
                const Json& idxTypesJson = req["indexTypes"];
                if (idxTypesJson.isArray()) {
                    for (size_t i = 0; i < idxTypesJson.size(); ++i) {
                        indexTypes.push_back(idxTypesJson[i].asString());
                    }
                } else {
                    indexTypes = {"LinearScan", "BST", "AVL", "Hash", "BTree", "BPlusTree"};
                }

                Json resp = engine.runBenchmark(field, queries, indexTypes, iters);
                std::cout << resp.dump() << "\n" << std::flush;
            } else if (cmd == "exit") {
                std::cerr << "[Engine] Exiting." << std::endl;
                break;
            } else {
                Json err = Json::makeObject();
                err["status"] = "error";
                err["message"] = "Unknown command: " + cmd;
                std::cout << err.dump() << "\n" << std::flush;
            }
        } catch (const std::exception& e) {
            std::cerr << "[Engine Error] " << e.what() << std::endl;
            Json err = Json::makeObject();
            err["status"] = "error";
            err["message"] = e.what();
            std::cout << err.dump() << "\n" << std::flush;
        }
    }

    return 0;
}
