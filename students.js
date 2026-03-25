const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const students = db.prepare(`
    SELECT s.*, r.room_number FROM students s
    LEFT JOIN rooms r ON s.room_id = r.id
    ORDER BY s.name
  `).all();
  res.json({ success: true, data: students });
});

router.get('/:id', (req, res) => {
  const student = db.prepare(`
    SELECT s.*, r.room_number, r.type as room_type FROM students s
    LEFT JOIN rooms r ON s.room_id = r.id WHERE s.id = ?
  `).get(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const fees = db.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY created_at DESC').all(req.params.id);
  const complaints = db.prepare('SELECT * FROM complaints WHERE student_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ success: true, data: { ...student, fees, complaints } });
});

router.post('/', (req, res) => {
  const { student_id, name, email, phone, course, year, room_id, bed_number, guardian_name, guardian_phone, address, join_date } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO students (student_id, name, email, phone, course, year, room_id, bed_number, guardian_name, guardian_phone, address, join_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(student_id, name, email, phone, course, year, room_id, bed_number, guardian_name, guardian_phone, address, join_date);
    if (room_id) {
      db.prepare('UPDATE rooms SET occupied = occupied + 1 WHERE id = ?').run(room_id);
    }
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  const { name, email, phone, course, year, room_id, bed_number, guardian_name, guardian_phone, address, status } = req.body;
  const current = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (current.room_id !== room_id) {
    if (current.room_id) db.prepare('UPDATE rooms SET occupied = MAX(0, occupied - 1) WHERE id = ?').run(current.room_id);
    if (room_id) db.prepare('UPDATE rooms SET occupied = occupied + 1 WHERE id = ?').run(room_id);
  }
  db.prepare(`UPDATE students SET name=?, email=?, phone=?, course=?, year=?, room_id=?, bed_number=?, guardian_name=?, guardian_phone=?, address=?, status=? WHERE id=?`).run(name, email, phone, course, year, room_id, bed_number, guardian_name, guardian_phone, address, status, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (student && student.room_id) {
    db.prepare('UPDATE rooms SET occupied = MAX(0, occupied - 1) WHERE id = ?').run(student.room_id);
  }
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
