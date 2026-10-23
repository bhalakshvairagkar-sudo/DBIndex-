import app from './app.js';
import { DatabaseService } from './services/db.js';
import { EngineProcessAdapter } from './engine/process_adapter.js';

const PORT = process.env.PORT || 4000;

// Initialize singletons
DatabaseService.getInstance();
const adapter = EngineProcessAdapter.getInstance();

adapter.ping()
  .then(resp => {
    console.log('[Server] Engine ping successful:', resp);
  })
  .catch(err => {
    console.warn('[Server] Engine ping failed:', err.message);
  });

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`DATABASE INDEXING SIMULATOR BACKEND RUNNING`);
  console.log(`Port: ${PORT}`);
  console.log(`URL:  http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
