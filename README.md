# 🏨 HMS — College Hostel Management System

A full-stack web application built with **HTML, CSS, JavaScript, Node.js, Express, and SQLite**.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd hostel-mgmt
npm install
```

### 2. Start the Server
```bash
node server.js
```
Or for auto-restart during development:
```bash
npm run dev
```

### 3. Open in Browser
Navigate to: **http://localhost:3000**

---

## 🔐 Default Login
| Field    | Value                |
|----------|----------------------|
| Email    | admin@hostel.edu     |
| Password | admin123             |

---

## 📦 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript     |
| Backend    | Node.js + Express.js                |
| Database   | SQLite via `better-sqlite3`         |
| Auth       | express-session + bcryptjs          |
| Charts     | Chart.js                            |

---

## 🗂️ Project Structure

```
hostel-mgmt/
├── server.js              # Main Express server
├── database.js            # SQLite setup + seed data
├── package.json
├── routes/
│   ├── auth.js            # Login / Logout / Session
│   ├── rooms.js           # Room CRUD
│   ├── students.js        # Student CRUD
│   ├── fees.js            # Fee management
│   ├── complaints.js      # Complaints CRUD
│   ├── visitors.js        # Visitor log
│   ├── attendance.js      # Daily attendance
│   └── dashboard.js       # Stats & summary
├── public/
│   ├── index.html         # Login page
│   ├── dashboard.html     # Main app
│   └── js/
│       └── app.js         # Frontend logic
└── data/
    └── hostel.db          # SQLite database (auto-created)
```

---

## ✅ Modules

### 1. 📊 Dashboard
- Key stats: students, beds, fees, complaints
- Fee collection chart (doughnut)
- Complaints by category (bar chart)
- Notice board
- Recent activity feed

### 2. 👥 Student Management
- Add / Edit / Delete students
- Room & bed assignment
- Guardian contact info
- Status tracking (Active/Inactive)

### 3. 🏠 Room & Bed Allocation
- Visual floor-wise room grid
- Color-coded: Available (green) / Partial (amber) / Full (red)
- Occupancy progress bars
- Room details with current residents

### 4. 💰 Fee Management
- Multiple fee types: Room Rent, Mess, Electricity, etc.
- Status: Paid / Pending / Overdue
- Mark payment with method (UPI, Cash, etc.)
- Summary stats with totals

### 5. 🔧 Complaints & Maintenance
- Category-wise complaints (Maintenance, Technical, Mess, etc.)
- Priority levels: High / Medium / Low
- Status tracking: Open → In Progress → Resolved
- Assignment and resolution notes

### 6. 🚪 Visitor Management
- Register visitors with student association
- Check-in/Check-out tracking
- Relation and purpose logging

### 7. 📋 Attendance
- Date-wise attendance marking
- Per-student: Check-in time, Check-out time, Status, Remarks
- Status options: Present / Absent / On Leave / Late
- Bulk save for entire day

---

## 🔧 API Endpoints

| Method | Endpoint                      | Description             |
|--------|-------------------------------|-------------------------|
| POST   | /api/auth/login               | Admin login             |
| GET    | /api/dashboard/stats          | Dashboard summary       |
| GET    | /api/students                 | List all students       |
| POST   | /api/students                 | Add student             |
| PUT    | /api/students/:id             | Update student          |
| DELETE | /api/students/:id             | Delete student          |
| GET    | /api/rooms                    | List all rooms          |
| POST   | /api/rooms                    | Add room                |
| GET    | /api/fees                     | List all fees           |
| POST   | /api/fees                     | Add fee record          |
| PUT    | /api/fees/:id/pay             | Mark fee as paid        |
| GET    | /api/complaints               | List complaints         |
| POST   | /api/complaints               | Add complaint           |
| PUT    | /api/complaints/:id           | Update complaint status |
| GET    | /api/visitors                 | Visitor log             |
| POST   | /api/visitors                 | Register visitor        |
| PUT    | /api/visitors/:id/checkout    | Check out visitor       |
| POST   | /api/attendance/mark          | Save attendance         |

---

## 💡 Future Enhancements
- Student portal login (role-based)
- Email/SMS fee reminders
- PDF receipt generation
- Monthly reports export (Excel/PDF)
- Mess menu management
- Leave application module
- Mobile-responsive sidebar

---

*Built for academic/college project purposes — HMS v1.0*
