import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeSchema } from './db/connection.js';
import { seedDatabase } from './db/seed.js';
import { runMigrations } from './db/migrations.js';
import { startMetadataRefreshJob, stopMetadataRefreshJob } from './jobs/metadataRefresh.js';
import { errorHandler } from './utils/errors.js';
import { requireAuth } from './middleware/auth.js';
import { isOllamaAvailable, listOllamaModels } from './providers/index.js';
import { EmbeddingService } from './services/EmbeddingService.js';

// Routes
import authRouter from './routes/auth.js';
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
import synthesisRouter from './routes/synthesis.js';
import insightsRouter from './routes/insights.js';
import exportRouter from './routes/export.js';
import backupRouter from './routes/backup.js';
import { BackupService } from './services/BackupService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', async (req, res) => {
  const ollamaAvailable = await isOllamaAvailable();
  const embeddingInfo = await EmbeddingService.getProviderInfo();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      ollama: ollamaAvailable,
    },
    embeddings: embeddingInfo,
  });
});

// Ollama models endpoint (public - for setup)
app.get('/api/ollama/models', async (req, res) => {
  try {
    const available = await isOllamaAvailable();
    if (!available) {
      return res.json({ available: false, models: [] });
    }
    const models = await listOllamaModels();
    res.json({ available: true, models });
  } catch (error) {
    res.json({ available: false, models: [], error: error.message });
  }
});

// Protected routes (auth required when enabled)
app.use('/api/profiles', requireAuth, profilesRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/sessions', requireAuth, sessionsRouter);
app.use('/api/sessions', requireAuth, messagesRouter);
app.use('/api/sessions', requireAuth, anchorsRouter);
app.use('/api/upload', requireAuth, uploadRouter);
app.use('/api/similarity', requireAuth, similarityRouter);
app.use('/api/inquiry-links', requireAuth, inquiryLinksRouter);
app.use('/api/import', requireAuth, importRouter);
app.use('/api/search', requireAuth, searchRouter);
app.use('/api/synthesize', requireAuth, synthesisRouter);
app.use('/api/insights', requireAuth, insightsRouter);
app.use('/api/export', requireAuth, exportRouter);
app.use('/api/backup', requireAuth, backupRouter);

// Error handling middleware
app.use(errorHandler);

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

    // Start scheduled backups if enabled
    const backupConfig = BackupService.getConfig();
    if (backupConfig.enabled) {
      BackupService.startScheduledBackups({
        intervalHours: backupConfig.intervalHours,
        keepCount: backupConfig.keepCount,
        compress: backupConfig.compress,
      });
    }

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
