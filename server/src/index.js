import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeSchema } from './db/connection.js';
import { seedDatabase } from './db/seed.js';
import { runMigrations } from './db/migrations.js';
import { startMetadataRefreshJob, stopMetadataRefreshJob } from './jobs/metadataRefresh.js';

// Routes
import profilesRouter from './routes/profiles.js';
import sessionsRouter from './routes/sessions.js';
import messagesRouter from './routes/messages.js';
import uploadRouter from './routes/upload.js';
import anchorsRouter from './routes/anchors.js';
import projectsRouter from './routes/projects.js';
import similarityRouter from './routes/similarity.js';
import inquiryLinksRouter from './routes/inquiryLinks.js';
import importRouter from './routes/import.js';
import searchRouter from './routes/search.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/profiles', profilesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions', messagesRouter); // Message routes are under /api/sessions/:sessionId/messages
app.use('/api/sessions', anchorsRouter);  // Anchor routes are under /api/sessions/:sessionId/anchors
app.use('/api/upload', uploadRouter);
app.use('/api/similarity', similarityRouter);
app.use('/api/inquiry-links', inquiryLinksRouter);
app.use('/api/import', importRouter);
app.use('/api/search', searchRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
async function start() {
  try {
    // Initialize database
    console.log('Initializing database...');
    initializeSchema();
    runMigrations();
    seedDatabase();

    // Start background jobs
    startMetadataRefreshJob();

    // Start server - bind to all interfaces for LAN access
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`EDOS server running on http://0.0.0.0:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`LAN access: http://<your-ip>:${PORT}`);

      // Log provider availability
      if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
        console.warn('WARNING: No API keys configured. Add keys to .env file.');
      } else {
        if (process.env.ANTHROPIC_API_KEY) console.log('  - Anthropic: configured');
        if (process.env.OPENAI_API_KEY) console.log('  - OpenAI: configured');
      }
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      stopMetadataRefreshJob();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down...');
      stopMetadataRefreshJob();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
