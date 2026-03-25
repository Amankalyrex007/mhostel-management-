const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/stats', (req, res) => {
  const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM students WHERE status = 'active'`).get();
  const totalRooms = db.prepare(`SELECT COUNT(*) as count FROM rooms`).get();
  const occupiedRooms = db.prepare(`SELECT COUNT(*) as count FROM rooms WHERE occupied > 0`).get();
  const totalBeds = db.prepare(`SELECT SUM(capacity) as total FROM rooms`).get();
  const occupiedBeds = db.prepare(`SELECT SUM(occupied) as total FROM rooms`).get();
  const pendingFees = db.prepare(`SELECT SUM(amount) as total FROM fees WHERE status IN ('pending','overdue')`).get();
  const collectedFees = db.prepare(`SELECT SUM(amount) as total FROM fees WHERE status = 'paid'`).get();
  const openComplaints = db.prepare(`SELECT COUNT(*) as count FROM complaints WHERE status = 'open'`).get();
  const inProgressComplaints = db.prepare(`SELECT COUNT(*) as count FROM complaints WHERE status = 'in-progress'`).get();
  const todayVisitors = db.prepare(`SELECT COUNT(*) as count FROM visitors WHERE DATE(check_in) = DATE('now') AND status = 'checked-in'`).get();
  const notices = db.prepare(`SELECT * FROM notices ORDER BY created_at DESC LIMIT 5`).all();
  const recentFees = db.prepare(`SELECT f.*, s.name as student_name FROM fees f JOIN students s ON f.student_id = s.id ORDER BY f.created_at DESC LIMIT 5`).all();
  const recentComplaints = db.prepare(`SELECT c.*, s.name as student_name FROM complaints c JOIN students s ON c.student_id = s.id ORDER BY c.created_at DESC LIMIT 5`).all();

  res.json({
    success: true,
    data: {
      students: totalStudents.count,
      totalRooms: totalRooms.count,
      occupiedRooms: occupiedRooms.count,
      totalBeds: totalBeds.total || 0,
      occupiedBeds: occupiedBeds.total || 0,
      pendingFees: pendingFees.total || 0,
      collectedFees: collectedFees.total || 0,
      openComplaints: openComplaints.count,
      inProgressComplaints: inProgressComplaints.count,
      todayVisitors: todayVisitors.count,
      notices,
      recentFees,
      recentComplaints
    }
  });
});

module.exports = router;
