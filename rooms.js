const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY floor, room_number').all();
  res.json({ success: true, data: rooms });
});

router.get('/:id', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  const students = db.prepare('SELECT * FROM students WHERE room_id = ? AND status = "active"').all(req.params.id);
  res.json({ success: true, data: { ...room, students } });
});

router.post('/', (req, res) => {
  const { room_number, floor, type, capacity, amenities } = req.body;
  try {
    const result = db.prepare('INSERT INTO rooms (room_number, floor, type, capacity, amenities) VALUES (?, ?, ?, ?, ?)').run(room_number, floor, type, capacity, amenities || '');
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  const { room_number, floor, type, capacity, amenities, status } = req.body;
  db.prepare('UPDATE rooms SET room_number=?, floor=?, type=?, capacity=?, amenities=?, status=? WHERE id=?').run(room_number, floor, type, capacity, amenities, status, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (room.occupied > 0) return res.status(400).json({ success: false, message: 'Cannot delete occupied room' });
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
