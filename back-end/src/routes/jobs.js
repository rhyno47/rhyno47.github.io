const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const { authenticate } = require('../middleware/auth');

// GET /api/jobs - list public jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(100);
    res.json(jobs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/jobs - create a job (protected)
router.post('/', authenticate, [
  body('title').notEmpty().withMessage('Title required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { title, company, location, description, contact } = req.body;
    const job = new Job({ title, company, location, description, contact, postedBy: req.user.id });
    await job.save();
    res.json(job);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
