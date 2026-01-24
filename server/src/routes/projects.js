import { Router } from 'express';
import { ProjectService } from '../services/ProjectService.js';

const router = Router();

// GET /api/projects - List all projects
router.get('/', (req, res) => {
  try {
    const projects = ProjectService.getAll();
    const counts = ProjectService.getSessionCounts();

    // Add session count to each project
    const projectsWithCounts = projects.map(p => ({
      ...p,
      sessionCount: counts[p.id] || 0,
    }));

    // Add unassigned count
    const unassignedCount = counts['unassigned'] || 0;

    res.json({
      projects: projectsWithCounts,
      unassignedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', (req, res) => {
  try {
    const project = ProjectService.getById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects - Create new project
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = ProjectService.create({ name: name.trim(), description });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', (req, res) => {
  try {
    const project = ProjectService.update(req.params.id, req.body);
    res.json(project);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', (req, res) => {
  try {
    ProjectService.delete(req.params.id);
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
