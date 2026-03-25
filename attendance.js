const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { date } = req.query;
  const query = date
    ? `SELECT a.*, s.name as student_name, s.student_id as student_code, r.room_number FROM attendance a JOIN students s ON a.student_id = s.id LEFT JOIN rooms r ON s.room_id = r.id WHERE a.date = ? ORDER BY s.name`
    : `SELECT a.*, s.name as student_name, s.student_id as student_code, r.room_number FROM attendance a JOIN students s ON a.student_id = s.id LEFT JOIN rooms r ON s.room_id = r.id ORDER BY a.date DESC, s.name`;
  const records = date ? db.prepare(query).all(date) : db.prepare(query).all();
  res.json({ success: true, data: records });
});

router.post('/mark', (req, res) => {
  const { date, records } = req.body; // records: [{student_id, status, check_in, check_out, remarks}]
  const stmt = db.prepare(`INSERT OR REPLACE INTO attendance (student_id, date, check_in, check_out, status, remarks) VALUES (?, ?, ?, ?, ?, ?)`);
  const markAll = db.transaction(() => {
    records.forEach(r => stmt.run(r.student_id, date, r.check_in || null, r.check_out || null, r.status, r.remarks || ''));
  });
  markAll();
  res.json({ success: true });
});

router.get('/summary/:student_id', (req, res) => {
  const present = db.prepare(`SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND status = 'present'`).get(req.params.student_id);
  const absent = db.prepare(`SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND status = 'absent'`).get(req.params.student_id);
  const total = db.prepare(`SELECT COUNT(*) as count FROM attendance WHERE student_id = ?`).get(req.params.student_id);
  res.json({ success: true, data: { present: present.count, absent: absent.count, total: total.count, percentage: total.count ? Math.round((present.count / total.count) * 100) : 0 } });
});

module.exports = router;
