#include <iostream>
#include <cassert>
#include <vector>
#include "models/record.hpp"
#include "indexes/linear_scan.hpp"
#include "indexes/bst_index.hpp"
#include "indexes/avl_index.hpp"
#include "indexes/hash_index.hpp"
#include "indexes/btree_index.hpp"
#include "indexes/bplus_tree_index.hpp"

void testLinearScan() {
    std::cout << "Testing LinearScan... ";
    LinearScanIndex idx;
    std::vector<Record> records;
    for (int i = 1; i <= 10; ++i) {
        Record r(std::to_string(i));
        r.setField("cgpa", KeyValue(8.0 + (i * 0.1)));
        records.push_back(r);
    }
    idx.build(records, "cgpa");

    QueryMetrics m;
    auto res = idx.exactMatch(KeyValue(8.5), m);
    assert(res.size() == 1);
    assert(res[0] == "5");
    assert(m.recordsExamined == 10);

    m.reset();
    auto rangeRes = idx.rangeQuery(KeyValue(8.2), KeyValue(8.6), m);
    assert(rangeRes.size() == 5); // 8.2, 8.3, 8.4, 8.5, 8.6
    std::cout << "PASSED\n";
}

void testBST() {
    std::cout << "Testing BST... ";
    BSTIndex idx;
    std::vector<Record> records;
    std::vector<double> vals = {8.5, 7.2, 9.1, 6.5, 7.8, 8.8, 9.5};
    for (size_t i = 0; i < vals.size(); ++i) {
        Record r(std::to_string(i + 1));
        r.setField("cgpa", KeyValue(vals[i]));
        records.push_back(r);
    }
    idx.build(records, "cgpa");

    QueryMetrics m;
    auto res = idx.exactMatch(KeyValue(7.8), m);
    assert(res.size() == 1);
    assert(m.nodesVisited > 0);

    m.reset();
    auto rangeRes = idx.rangeQuery(KeyValue(7.0), KeyValue(8.8), m);
    assert(rangeRes.size() == 4); // 7.2, 7.8, 8.5, 8.8
    std::cout << "PASSED\n";
}

void testAVL() {
    std::cout << "Testing AVL... ";
    AVLIndex idx;
    std::vector<Record> records;
    // Sequential insertions to test auto-balancing rotations
    for (int i = 1; i <= 15; ++i) {
        Record r(std::to_string(i));
        r.setField("cgpa", KeyValue(i * 0.5));
        records.push_back(r);
    }
    idx.build(records, "cgpa");

    assert(idx.getHeight() <= 5); // AVL height on 15 nodes is at most 4 or 5, never 15!

    QueryMetrics m;
    auto res = idx.exactMatch(KeyValue(5.0), m);
    assert(res.size() == 1);
    assert(res[0] == "10");

    m.reset();
    auto rangeRes = idx.rangeQuery(KeyValue(2.0), KeyValue(4.0), m);
    assert(rangeRes.size() == 5); // 2.0, 2.5, 3.0, 3.5, 4.0
    std::cout << "PASSED\n";
}

void testHash() {
    std::cout << "Testing Hash Index... ";
    HashIndex idx(8);
    std::vector<Record> records;
    for (int i = 1; i <= 20; ++i) {
        Record r(std::to_string(i));
        r.setField("branch", KeyValue("Branch_" + std::to_string(i % 5)));
        records.push_back(r);
    }
    idx.build(records, "branch");

    QueryMetrics m;
    auto res = idx.exactMatch(KeyValue("Branch_2"), m);
    assert(res.size() == 4);
    assert(m.nodesVisited == 1); // 1 bucket visited

    std::cout << "PASSED\n";
}

void testBTree() {
    std::cout << "Testing BTree... ";
    BTreeIndex idx(4);
    std::vector<Record> records;
    for (int i = 1; i <= 30; ++i) {
        Record r(std::to_string(i));
        r.setField("cgpa", KeyValue(i * 0.2));
        records.push_back(r);
    }
    idx.build(records, "cgpa");

    QueryMetrics m;
    auto res = idx.exactMatch(KeyValue(3.0), m);
    assert(res.size() == 1);
    assert(res[0] == "15");

    m.reset();
    auto rangeRes = idx.rangeQuery(KeyValue(1.0), KeyValue(2.0), m);
    assert(rangeRes.size() == 6); // 1.0, 1.2, 1.4, 1.6, 1.8, 2.0
    std::cout << "PASSED\n";
}

void testBPlusTree() {
    std::cout << "Testing B+ Tree... ";
    BPlusTreeIndex idx(4);
    std::vector<Record> records;
    for (int i = 1; i <= 25; ++i) {
        Record r(std::to_string(i));
        r.setField("cgpa", KeyValue(i * 0.3));
        records.push_back(r);
    }
    idx.build(records, "cgpa");

    QueryMetrics m;
    auto res = idx.exactMatch(KeyValue(3.0), m);
    assert(res.size() == 1);
    assert(res[0] == "10");

    m.reset();
    auto rangeRes = idx.rangeQuery(KeyValue(1.5), KeyValue(3.3), m);
    assert(rangeRes.size() == 7); // 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.3

    Json structure = idx.getStructure();
    assert(structure.has("leafChain"));
    assert(structure["leafChain"].size() > 0);
    std::cout << "PASSED\n";
}

int main() {
    std::cout << "=============================\n";
    std::cout << "DATABASE INDEXING SIMULATOR\n";
    std::cout << "Engine Unit Tests\n";
    std::cout << "=============================\n";
    testLinearScan();
    testBST();
    testAVL();
    testHash();
    testBTree();
    testBPlusTree();
    std::cout << "\nALL 6 INDEX STRUCTURE TESTS PASSED DETERMINISTICALLY!\n";
    return 0;
}
