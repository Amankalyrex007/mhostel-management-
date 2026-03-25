const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const fees = db.prepare(`
    SELECT f.*, s.name as student_name, s.student_id as student_code, r.room_number
    FROM fees f
    JOIN students s ON f.student_id = s.id
    LEFT JOIN rooms r ON s.room_id = r.id
    ORDER BY f.created_at DESC
  `).all();
  res.json({ success: true, data: fees });
});

router.get('/summary', (req, res) => {
  const total = db.prepare('SELECT SUM(amount) as total FROM fees').get();
  const collected = db.prepare('SELECT SUM(amount) as total FROM fees WHERE status = "paid"').get();
  const pending = db.prepare('SELECT SUM(amount) as total FROM fees WHERE status = "pending"').get();
  const overdue = db.prepare('SELECT SUM(amount) as total FROM fees WHERE status = "overdue"').get();
  res.json({ success: true, data: { total: total.total || 0, collected: collected.total || 0, pending: pending.total || 0, overdue: overdue.total || 0 } });
});

router.post('/', (req, res) => {
  const { student_id, amount, fee_type, month, year, due_date, remarks } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO fees (student_id, amount, fee_type, month, year, due_date, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(student_id, amount, fee_type, month, year, due_date, remarks);
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

router.put('/:id/pay', (req, res) => {
  const { payment_method, transaction_id } = req.body;
  db.prepare(`UPDATE fees SET status='paid', paid_date=CURRENT_TIMESTAMP, payment_method=?, transaction_id=? WHERE id=?`).run(payment_method, transaction_id || '', req.params.id);
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const { amount, fee_type, month, year, status, due_date, payment_method, remarks } = req.body;
  db.prepare(`UPDATE fees SET amount=?, fee_type=?, month=?, year=?, status=?, due_date=?, payment_method=?, remarks=? WHERE id=?`).run(amount, fee_type, month, year, status, due_date, payment_method, remarks, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM fees WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
