const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const complaints = db.prepare(`
    SELECT c.*, s.name as student_name, s.student_id as student_code, r.room_number
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN rooms r ON s.room_id = r.id
    ORDER BY c.created_at DESC
  `).all();
  res.json({ success: true, data: complaints });
});

router.post('/', (req, res) => {
  const { student_id, title, description, category, priority } = req.body;
  const result = db.prepare(`INSERT INTO complaints (student_id, title, description, category, priority) VALUES (?, ?, ?, ?, ?)`).run(student_id, title, description, category, priority || 'medium');
  res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/:id', (req, res) => {
  const { status, assigned_to, resolution, priority } = req.body;
  db.prepare(`UPDATE complaints SET status=?, assigned_to=?, resolution=?, priority=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status, assigned_to, resolution, priority, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
