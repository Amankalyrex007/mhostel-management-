const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'hostel.db'));

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT UNIQUE NOT NULL,
    floor INTEGER NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    occupied INTEGER DEFAULT 0,
    amenities TEXT DEFAULT '',
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    course TEXT,
    year INTEGER,
    room_id INTEGER,
    bed_number INTEGER,
    guardian_name TEXT,
    guardian_phone TEXT,
    address TEXT,
    join_date DATE,
    status TEXT DEFAULT 'active',
    photo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    fee_type TEXT NOT NULL,
    month TEXT,
    year INTEGER,
    status TEXT DEFAULT 'pending',
    paid_date DATETIME,
    due_date DATE,
    payment_method TEXT,
    transaction_id TEXT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    assigned_to TEXT,
    resolution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    relation TEXT,
    purpose TEXT,
    check_in DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out DATETIME,
    approved_by TEXT,
    status TEXT DEFAULT 'checked-in',
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status TEXT DEFAULT 'present',
    remarks TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    posted_by TEXT DEFAULT 'Admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed admin user
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@hostel.edu');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin', 'admin@hostel.edu', hash, 'admin');
}

// Seed rooms
const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
if (roomCount.count === 0) {
  const roomStmt = db.prepare('INSERT INTO rooms (room_number, floor, type, capacity, amenities) VALUES (?, ?, ?, ?, ?)');
  const rooms = [
    ['101', 1, 'Single', 1, 'AC, WiFi, Attached Bath'],
    ['102', 1, 'Double', 2, 'Fan, WiFi'],
    ['103', 1, 'Double', 2, 'Fan, WiFi'],
    ['104', 1, 'Triple', 3, 'Fan, WiFi'],
    ['105', 1, 'Triple', 3, 'Fan, WiFi'],
    ['201', 2, 'Single', 1, 'AC, WiFi, Attached Bath'],
    ['202', 2, 'Double', 2, 'AC, WiFi'],
    ['203', 2, 'Double', 2, 'Fan, WiFi'],
    ['204', 2, 'Triple', 3, 'Fan, WiFi'],
    ['205', 2, 'Triple', 3, 'Fan, WiFi'],
    ['301', 3, 'Single', 1, 'AC, WiFi, Attached Bath'],
    ['302', 3, 'Double', 2, 'AC, WiFi'],
    ['303', 3, 'Double', 2, 'AC, WiFi'],
    ['304', 3, 'Triple', 3, 'Fan, WiFi'],
    ['305', 3, 'Triple', 3, 'Fan, WiFi'],
  ];
  rooms.forEach(r => roomStmt.run(...r));
}

// Seed sample students
const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get();
if (studentCount.count === 0) {
  const stuStmt = db.prepare(`INSERT INTO students (student_id, name, email, phone, course, year, room_id, bed_number, guardian_name, guardian_phone, join_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const updateRoom = db.prepare('UPDATE rooms SET occupied = occupied + 1 WHERE id = ?');
  const students = [
    ['HMS001', 'Arjun Sharma', 'arjun@student.edu', '9876543210', 'B.Tech CSE', 2, 2, 1, 'Ramesh Sharma', '9876543200', '2023-07-01', 'active'],
    ['HMS002', 'Priya Patel', 'priya@student.edu', '9876543211', 'B.Tech ECE', 1, 2, 2, 'Suresh Patel', '9876543201', '2023-07-01', 'active'],
    ['HMS003', 'Rahul Verma', 'rahul@student.edu', '9876543212', 'B.Sc Physics', 3, 3, 1, 'Dinesh Verma', '9876543202', '2022-07-01', 'active'],
    ['HMS004', 'Sneha Kumar', 'sneha@student.edu', '9876543213', 'B.Tech ME', 2, 4, 1, 'Vijay Kumar', '9876543203', '2023-07-01', 'active'],
    ['HMS005', 'Karan Singh', 'karan@student.edu', '9876543214', 'MBA', 1, 5, 1, 'Harpal Singh', '9876543204', '2024-01-01', 'active'],
  ];
  students.forEach(s => {
    stuStmt.run(...s);
    updateRoom.run(s[6]);
  });

  // Seed fees
  const feeStmt = db.prepare(`INSERT INTO fees (student_id, amount, fee_type, month, year, status, due_date, paid_date, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  feeStmt.run(1, 8000, 'Room Rent', 'March', 2024, 'paid', '2024-03-05', '2024-03-03', 'UPI');
  feeStmt.run(1, 2500, 'Mess Fee', 'March', 2024, 'paid', '2024-03-05', '2024-03-03', 'UPI');
  feeStmt.run(2, 8000, 'Room Rent', 'March', 2024, 'pending', '2024-03-05', null, null);
  feeStmt.run(2, 2500, 'Mess Fee', 'March', 2024, 'pending', '2024-03-05', null, null);
  feeStmt.run(3, 7500, 'Room Rent', 'March', 2024, 'paid', '2024-03-05', '2024-03-01', 'Cash');
  feeStmt.run(4, 8000, 'Room Rent', 'March', 2024, 'pending', '2024-03-05', null, null);
  feeStmt.run(5, 10000, 'Room Rent', 'March', 2024, 'overdue', '2024-02-28', null, null);

  // Seed complaints
  const compStmt = db.prepare(`INSERT INTO complaints (student_id, title, description, category, priority, status) VALUES (?, ?, ?, ?, ?, ?)`);
  compStmt.run(1, 'Water leakage in bathroom', 'There is a major water leak from the ceiling in the attached bathroom.', 'Maintenance', 'high', 'open');
  compStmt.run(2, 'WiFi not working', 'WiFi connection drops frequently in Room 102, especially at night.', 'Technical', 'medium', 'in-progress');
  compStmt.run(3, 'Mess food quality', 'Food quality has degraded significantly in the past week.', 'Mess', 'medium', 'resolved');

  // Seed visitors
  const visStmt = db.prepare(`INSERT INTO visitors (student_id, visitor_name, visitor_phone, relation, purpose, check_in, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  visStmt.run(1, 'Ramesh Sharma', '9876543200', 'Father', 'General Visit', new Date().toISOString(), 'checked-in');
  visStmt.run(2, 'Meena Patel', '9876543221', 'Mother', 'Bringing Essentials', new Date(Date.now() - 3600000).toISOString(), 'checked-out');

  // Seed notices
  const noticeStmt = db.prepare(`INSERT INTO notices (title, content, category) VALUES (?, ?, ?)`);
  noticeStmt.run('Fee Payment Reminder', 'Last date for March fee payment is 5th March 2024. Late payment will attract ₹100/day penalty.', 'fee');
  noticeStmt.run('Hostel Day Celebration', 'Annual Hostel Day will be celebrated on 20th March. All residents are requested to participate.', 'event');
  noticeStmt.run('Water Supply Disruption', 'Water supply will be disrupted on 15th March from 9AM-1PM due to tank cleaning.', 'maintenance');
}

module.exports = db;
