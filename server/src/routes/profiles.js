import { Router } from 'express';
import { ModelProfileService } from '../services/ModelProfileService.js';

const router = Router();

// GET /api/profiles - List all profiles
router.get('/', (req, res) => {
  try {
    const profiles = ModelProfileService.getAll();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/profiles/active - Get active profile
router.get('/active', (req, res) => {
  try {
    const profile = ModelProfileService.getActive();
    if (!profile) {
      return res.status(404).json({ error: 'No active profile' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/profiles/:id - Get profile by ID
router.get('/:id', (req, res) => {
  try {
    const profile = ModelProfileService.getById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profiles - Create new profile
router.post('/', (req, res) => {
  try {
    const { name, provider, model_id, system_prompt, parameters } = req.body;

    if (!name || !provider || !model_id) {
      return res.status(400).json({ error: 'name, provider, and model_id are required' });
    }

    if (!['anthropic', 'openai', 'ollama'].includes(provider)) {
      return res.status(400).json({ error: 'provider must be "anthropic", "openai", or "ollama"' });
    }

    const profile = ModelProfileService.create({ name, provider, model_id, system_prompt, parameters });
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profiles/:id - Update profile
router.put('/:id', (req, res) => {
  try {
    const profile = ModelProfileService.update(req.params.id, req.body);
    res.json(profile);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profiles/:id/activate - Set profile as active
router.post('/:id/activate', (req, res) => {
  try {
    const profile = ModelProfileService.setActive(req.params.id);
    res.json(profile);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/profiles/:id - Delete profile
router.delete('/:id', (req, res) => {
  try {
    ModelProfileService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
