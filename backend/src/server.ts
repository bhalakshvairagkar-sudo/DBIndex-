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

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`DBINDEX SIMULATOR & SQL LABORATORY RUNNING`);
  console.log(`Port: ${PORT}`);
  console.log(`URL:  http://0.0.0.0:${PORT}`);
  console.log(`Health: http://0.0.0.0:${PORT}/api/health`);
  console.log(`====================================================`);
});
