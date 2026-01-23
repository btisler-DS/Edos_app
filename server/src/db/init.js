import 'dotenv/config';
import { initializeSchema, closeDb } from './connection.js';
import { seedDatabase } from './seed.js';

console.log('Initializing EDOS database...');

try {
  initializeSchema();
  seedDatabase();
  console.log('Database initialization complete');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
} finally {
  closeDb();
}
