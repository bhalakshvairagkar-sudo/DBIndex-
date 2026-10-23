import http from 'http';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path,
        method,
        headers: postData
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          : {}
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, json: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, text: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('DBINDEX INTEGRATION & END-TO-END TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Health
  await test('API & Engine Health Check', async () => {
    const res = await makeRequest('/api/health');
    if (res.statusCode !== 200 || res.json.status !== 'ok') {
      throw new Error('Health check returned non-200 or status not ok');
    }
    if (res.json.mysql.status !== 'connected') {
      throw new Error(`MySQL status is ${res.json.mysql.status}`);
    }
    if (res.json.engine.status !== 'running') {
      throw new Error(`C++ Engine status is ${res.json.engine.status}`);
    }
  });

  // 2. SQL Execution
  await test('Execute Real MySQL Query (SELECT)', async () => {
    const res = await makeRequest('/api/sql/execute', 'POST', {
      sql: "SELECT id, name, department, cgpa FROM students WHERE department = 'CSE' LIMIT 5;",
      database: 'my_database'
    });
    if (res.statusCode !== 200 || !res.json.results || res.json.results.length === 0) {
      throw new Error('Failed to execute SELECT statement');
    }
    const result = res.json.results[0];
    if (result.rows.length === 0) throw new Error('Query returned 0 rows');
  });

  // 3. MySQL EXPLAIN
  await test('MySQL EXPLAIN & EXPLAIN ANALYZE', async () => {
    const res = await makeRequest('/api/sql/explain', 'POST', {
      sql: "SELECT id, name, department, cgpa FROM students WHERE department = 'CSE' ORDER BY cgpa DESC;",
      database: 'my_database'
    });
    if (res.statusCode !== 200 || !res.json.jsonPlan) {
      throw new Error('EXPLAIN plan not returned');
    }
  });

  // 4. Performance Compare
  await test('Before-and-After Performance Comparison', async () => {
    const res = await makeRequest('/api/performance/compare', 'POST', {
      sql: "SELECT id, name, department, cgpa FROM students WHERE department = 'CSE' ORDER BY cgpa DESC;",
      database: 'my_database',
      table: 'students',
      indexName: 'idx_department, idx_department_cgpa',
      runs: 3
    });
    if (res.statusCode !== 200 || !res.json.withoutIndex || !res.json.withIndex) {
      throw new Error('Performance comparison payload malformed');
    }
    if (res.json.withoutIndex.rowsExamined < res.json.withIndex.rowsExamined) {
      throw new Error('Without index examined fewer rows than with index');
    }
  });

  // 5. Database Schema Reflection
  await test('Database & Table Schemas Reflection', async () => {
    const dbs = await makeRequest('/api/mysql/databases');
    if (!dbs.json.databases.includes('my_database')) {
      throw new Error('my_database not found in databases list');
    }
    const tables = await makeRequest('/api/mysql/databases/my_database/tables');
    if (!tables.json.tables.find(t => t.name === 'students')) {
      throw new Error('students table not found in my_database');
    }
  });

  // 6. C++ Simulation Trace
  await test('C++ Native Simulation Trace Generation', async () => {
    const res = await makeRequest('/api/simulate', 'POST', {
      datasetId: 'students',
      indexType: 'AVL',
      operation: 'exact',
      field: 'cgpa',
      value: 8.5
    });
    if (res.statusCode !== 200 || !res.json.trace) {
      throw new Error('C++ simulation trace not returned');
    }
  });

  console.log('====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
