const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const visitors = db.prepare(`
    SELECT v.*, s.name as student_name, s.student_id as student_code, r.room_number
    FROM visitors v
    JOIN students s ON v.student_id = s.id
    LEFT JOIN rooms r ON s.room_id = r.id
    ORDER BY v.check_in DESC
  `).all();
  res.json({ success: true, data: visitors });
});

router.post('/', (req, res) => {
  const { student_id, visitor_name, visitor_phone, relation, purpose } = req.body;
  const result = db.prepare(`INSERT INTO visitors (student_id, visitor_name, visitor_phone, relation, purpose) VALUES (?, ?, ?, ?, ?)`).run(student_id, visitor_name, visitor_phone, relation, purpose);
  res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/:id/checkout', (req, res) => {
  db.prepare(`UPDATE visitors SET check_out=CURRENT_TIMESTAMP, status='checked-out' WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM visitors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
