// =========== STATE ===========
let allStudents = [], allFees = [], allComplaints = [], allVisitors = [], allRooms = [];
let feeFilter = 'all', complaintFilter = 'all';
let dashboardCharts = {};

// =========== INIT ===========
document.addEventListener('DOMContentLoaded', async () => {
  const me = await api('/api/auth/me');
  if (!me.success) { window.location.href = '/'; return; }
  document.getElementById('userName').textContent = me.user.name;
  document.getElementById('userAvatar').textContent = me.user.name[0].toUpperCase();

  // Set today's date for attendance
  document.getElementById('attendanceDate').value = today();
  navigate('dashboard');
});

// =========== NAVIGATION ===========
function navigate(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => { if (n.textContent.toLowerCase().includes(page === 'dashboard' ? 'dashboard' : page.slice(0,4))) n.classList.add('active'); });

  const titles = { dashboard: 'Dashboard', students: 'Students', rooms: 'Rooms & Beds', fees: 'Fee Management', complaints: 'Complaints & Maintenance', visitors: 'Visitor Management', attendance: 'Attendance' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('topbarActions').innerHTML = '';

  loadPage(page);
}

async function loadPage(page) {
  switch(page) {
    case 'dashboard': await loadDashboard(); break;
    case 'students': await loadStudents(); break;
    case 'rooms': await loadRooms(); break;
    case 'fees': await loadFees(); break;
    case 'complaints': await loadComplaints(); break;
    case 'visitors': await loadVisitors(); break;
    case 'attendance': await loadAttendance(); break;
  }
}

// =========== DASHBOARD ===========
async function loadDashboard() {
  const res = await api('/api/dashboard/stats');
  if (!res.success) return;
  const d = res.data;

  const occPct = d.totalBeds ? Math.round((d.occupiedBeds / d.totalBeds) * 100) : 0;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-val" style="color:var(--blue)">${d.students}</div>
      <div class="stat-label">Total Students</div>
      <div class="stat-sub">Active residents</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🏠</div>
      <div class="stat-val" style="color:var(--teal)">${d.occupiedBeds}<span style="font-size:18px;color:var(--mid)">/${d.totalBeds}</span></div>
      <div class="stat-label">Beds Occupied</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${occPct}%;background:${occPct>85?'var(--rust)':occPct>60?'var(--amber)':'var(--green)'}"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-val" style="color:var(--green)">₹${fmtAmt(d.collectedFees)}</div>
      <div class="stat-label">Fees Collected</div>
      <div class="stat-sub" style="color:var(--rust)">₹${fmtAmt(d.pendingFees)} pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🔧</div>
      <div class="stat-val" style="color:${d.openComplaints>0?'var(--rust)':'var(--green)'}">${d.openComplaints}</div>
      <div class="stat-label">Open Complaints</div>
      <div class="stat-sub">${d.inProgressComplaints} in progress</div>
    </div>
  `;

  // Update badge
  if (d.openComplaints > 0) {
    document.getElementById('complaintBadge').textContent = d.openComplaints;
    document.getElementById('complaintBadge').style.display = 'inline';
  }

  // Notice board
  const notices = d.notices || [];
  document.getElementById('noticeBoard').innerHTML = notices.length ? `
    <div class="notice-list">${notices.map(n => `
      <div class="notice-item">
        <div class="notice-title">${n.title}</div>
        <div class="notice-content">${n.content}</div>
        <div class="notice-meta">${fmtDate(n.created_at)} · ${n.category}</div>
      </div>`).join('')}
    </div>` : '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">No notices posted</div></div>';

  // Recent activity
  const recentFees = d.recentFees || [];
  const recentComplaints = d.recentComplaints || [];
  document.getElementById('recentActivity').innerHTML = `
    <table><thead><tr><th>Type</th><th>Details</th><th>Status</th></tr></thead><tbody>
      ${recentFees.map(f => `<tr><td><span class="badge badge-blue">Fee</span></td><td><strong>${f.student_name}</strong><br><span style="font-size:12px;color:var(--mid)">${f.fee_type} — ₹${fmtAmt(f.amount)}</span></td><td>${feeStatusBadge(f.status)}</td></tr>`).join('')}
      ${recentComplaints.map(c => `<tr><td><span class="badge badge-amber">Complaint</span></td><td><strong>${c.student_name}</strong><br><span style="font-size:12px;color:var(--mid)">${c.title}</span></td><td>${complaintStatusBadge(c.status)}</td></tr>`).join('')}
    </tbody></table>`;

  // Fee chart
  if (dashboardCharts.fee) dashboardCharts.fee.destroy();
  dashboardCharts.fee = new Chart(document.getElementById('feeChart'), {
    type: 'doughnut',
    data: {
      labels: ['Collected', 'Pending', 'Overdue'],
      datasets: [{ data: [d.collectedFees, d.pendingFees - (d.overdueFees||0), d.overdueFees||0],
        backgroundColor: ['rgba(74,222,128,0.8)', 'rgba(232,160,32,0.8)', 'rgba(248,113,113,0.8)'],
        borderWidth: 0 }]
    },
    options: { plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 12 } } } }, cutout: '65%' }
  });

  // Complaint chart
  const compRes = await api('/api/complaints');
  if (compRes.success) {
    const cats = {};
    compRes.data.forEach(c => { cats[c.category] = (cats[c.category]||0) + 1; });
    if (dashboardCharts.comp) dashboardCharts.comp.destroy();
    dashboardCharts.comp = new Chart(document.getElementById('complaintChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(cats),
        datasets: [{ data: Object.values(cats), backgroundColor: 'rgba(232,160,32,0.6)', borderRadius: 6 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }
}

// =========== STUDENTS ===========
async function loadStudents() {
  const res = await api('/api/students');
  if (!res.success) return;
  allStudents = res.data;
  renderStudentsTable(allStudents);
}

function renderStudentsTable(students) {
  if (!students.length) {
    document.getElementById('studentsTableWrap').innerHTML = emptyState('👥', 'No students found');
    return;
  }
  document.getElementById('studentsTableWrap').innerHTML = `
    <table><thead><tr>
      <th>Student ID</th><th>Name</th><th>Course</th><th>Year</th><th>Room</th><th>Phone</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>
      ${students.map(s => `<tr>
        <td><span style="font-family:'Syne',sans-serif;font-weight:700;color:var(--amber)">${s.student_id}</span></td>
        <td>
          <div style="font-weight:500">${s.name}</div>
          <div style="font-size:12px;color:var(--mid)">${s.email}</div>
        </td>
        <td>${s.course || '—'}</td>
        <td>${s.year ? `Year ${s.year}` : '—'}</td>
        <td>${s.room_number ? `<span class="badge badge-blue">Room ${s.room_number}</span>` : '<span style="color:var(--mid)">Not assigned</span>'}</td>
        <td>${s.phone || '—'}</td>
        <td>${s.status === 'active' ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editStudent(${s.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id},'${s.name}')">Delete</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function filterStudents(q) {
  const filtered = allStudents.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) || s.student_id.toLowerCase().includes(q.toLowerCase()) || (s.course||'').toLowerCase().includes(q.toLowerCase()));
  renderStudentsTable(filtered);
}

function openAddStudentModal() { showStudentModal(null); }

async function editStudent(id) {
  const res = await api(`/api/students/${id}`);
  if (res.success) showStudentModal(res.data);
}

async function showStudentModal(student) {
  const roomsRes = await api('/api/rooms');
  const rooms = roomsRes.data || [];
  const isEdit = !!student;
  const s = student || {};

  showModal(`${isEdit ? 'Edit' : 'Add'} Student`, `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Student ID *</label>
        <input class="form-input" id="f_sid" placeholder="HMS001" value="${s.student_id||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input class="form-input" id="f_name" placeholder="Full Name" value="${s.name||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Email *</label>
        <input class="form-input" id="f_email" type="email" placeholder="student@edu.in" value="${s.email||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" id="f_phone" placeholder="9876543210" value="${s.phone||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Course</label>
        <input class="form-input" id="f_course" placeholder="B.Tech CSE" value="${s.course||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Year</label>
        <select class="form-select" id="f_year">
          ${[1,2,3,4].map(y=>`<option value="${y}" ${s.year==y?'selected':''}>${y}${['st','nd','rd','th'][y-1]} Year</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Room</label>
        <select class="form-select" id="f_room">
          <option value="">Not Assigned</option>
          ${rooms.map(r => `<option value="${r.id}" ${s.room_id==r.id?'selected':''}>${r.room_number} (${r.type}, ${r.occupied}/${r.capacity})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Bed Number</label>
        <input class="form-input" id="f_bed" type="number" min="1" placeholder="1" value="${s.bed_number||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Guardian Name</label>
        <input class="form-input" id="f_gname" placeholder="Guardian Name" value="${s.guardian_name||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Guardian Phone</label>
        <input class="form-input" id="f_gphone" placeholder="Guardian Phone" value="${s.guardian_phone||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Join Date</label>
        <input class="form-input" id="f_join" type="date" value="${s.join_date||today()}">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="f_status">
          <option value="active" ${!isEdit||s.status=='active'?'selected':''}>Active</option>
          <option value="inactive" ${s.status=='inactive'?'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="form-full form-group">
        <label class="form-label">Address</label>
        <textarea class="form-textarea" id="f_addr" placeholder="Full address...">${s.address||''}</textarea>
      </div>
    </div>
  `, async () => {
    const body = {
      student_id: val('f_sid'), name: val('f_name'), email: val('f_email'),
      phone: val('f_phone'), course: val('f_course'), year: val('f_year'),
      room_id: val('f_room') || null, bed_number: val('f_bed'),
      guardian_name: val('f_gname'), guardian_phone: val('f_gphone'),
      address: val('f_addr'), join_date: val('f_join'), status: val('f_status')
    };
    const url = isEdit ? `/api/students/${s.id}` : '/api/students';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await api(url, method, body);
    if (res.success) { closeModal(); loadStudents(); } else alert(res.message);
  });
}

async function deleteStudent(id, name) {
  if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
  await api(`/api/students/${id}`, 'DELETE');
  loadStudents();
}

// =========== ROOMS ===========
async function loadRooms() {
  const res = await api('/api/rooms');
  if (!res.success) return;
  allRooms = res.data;

  const totalBeds = allRooms.reduce((a, r) => a + r.capacity, 0);
  const occupied = allRooms.reduce((a, r) => a + r.occupied, 0);
  document.getElementById('roomSummary').textContent = `${allRooms.length} Rooms · ${occupied}/${totalBeds} Beds Occupied · ${allRooms.filter(r=>r.occupied===0).length} Available`;

  const floors = [...new Set(allRooms.map(r => r.floor))].sort();
  document.getElementById('roomsGrid').innerHTML = floors.map(floor => `
    <div class="floor-section">
      <div class="floor-label">Floor ${floor}</div>
      <div class="rooms-grid">
        ${allRooms.filter(r => r.floor == floor).map(r => {
          const pct = r.capacity ? (r.occupied / r.capacity) : 0;
          const cls = pct === 0 ? 'available' : pct >= 1 ? 'full' : 'partial';
          const fillCls = pct >= 1 ? 'full' : pct >= 0.5 ? 'med' : '';
          return `
          <div class="room-card ${cls}" onclick="viewRoom(${r.id})">
            <div class="room-num">${r.room_number}</div>
            <div class="room-type">${r.type} · ${r.amenities||'Basic'}</div>
            <div class="room-occ">
              <span>${r.occupied}/${r.capacity} occupied</span>
              <span>${cls === 'available' ? '✅' : cls === 'full' ? '🔴' : '🟡'}</span>
            </div>
            <div class="occ-bar"><div class="occ-fill ${fillCls}" style="width:${Math.round(pct*100)}%"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

async function viewRoom(id) {
  const res = await api(`/api/rooms/${id}`);
  if (!res.success) return;
  const r = res.data;
  showModal(`Room ${r.room_number} Details`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="stat-card" style="padding:16px">
        <div style="font-size:12px;color:var(--mid)">Floor</div>
        <div style="font-size:22px;font-family:'Syne',sans-serif;font-weight:800">Floor ${r.floor}</div>
      </div>
      <div class="stat-card" style="padding:16px">
        <div style="font-size:12px;color:var(--mid)">Type</div>
        <div style="font-size:22px;font-family:'Syne',sans-serif;font-weight:800">${r.type}</div>
      </div>
      <div class="stat-card" style="padding:16px">
        <div style="font-size:12px;color:var(--mid)">Occupancy</div>
        <div style="font-size:22px;font-family:'Syne',sans-serif;font-weight:800">${r.occupied}/${r.capacity}</div>
      </div>
      <div class="stat-card" style="padding:16px">
        <div style="font-size:12px;color:var(--mid)">Amenities</div>
        <div style="font-size:13px;margin-top:4px">${r.amenities || 'Basic'}</div>
      </div>
    </div>
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--mid);margin-bottom:12px">RESIDENTS</div>
    ${r.students && r.students.length ? r.students.map(s => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--ink2);border-radius:6px;margin-bottom:8px">
        <div>
          <div style="font-weight:500">${s.name}</div>
          <div style="font-size:12px;color:var(--mid)">${s.student_id} · Bed ${s.bed_number}</div>
        </div>
        <span class="badge badge-blue">${s.course}</span>
      </div>`).join('') : '<div style="color:var(--mid);font-size:13px;text-align:center;padding:20px">No residents currently</div>'}
  `, null, 'Edit Room', () => openEditRoomModal(r));
}

function openAddRoomModal() { showRoomModal(null); }
function openEditRoomModal(room) { showRoomModal(room); }

function showRoomModal(room) {
  const isEdit = !!room;
  const r = room || {};
  showModal(`${isEdit ? 'Edit' : 'Add'} Room`, `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Room Number *</label>
        <input class="form-input" id="fr_num" placeholder="101" value="${r.room_number||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Floor *</label>
        <input class="form-input" id="fr_floor" type="number" min="1" placeholder="1" value="${r.floor||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Room Type *</label>
        <select class="form-select" id="fr_type">
          ${['Single','Double','Triple','Quad'].map(t=>`<option ${r.type==t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Capacity *</label>
        <input class="form-input" id="fr_cap" type="number" min="1" max="6" placeholder="2" value="${r.capacity||''}">
      </div>
      <div class="form-full form-group">
        <label class="form-label">Amenities</label>
        <input class="form-input" id="fr_amen" placeholder="AC, WiFi, Attached Bath" value="${r.amenities||''}">
      </div>
    </div>
  `, async () => {
    const body = { room_number: val('fr_num'), floor: val('fr_floor'), type: val('fr_type'), capacity: val('fr_cap'), amenities: val('fr_amen'), status: 'available' };
    const url = isEdit ? `/api/rooms/${r.id}` : '/api/rooms';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await api(url, method, body);
    if (res.success) { closeModal(); loadRooms(); } else alert(res.message);
  });
}

// =========== FEES ===========
async function loadFees() {
  const [feesRes, summaryRes] = await Promise.all([api('/api/fees'), api('/api/fees/summary')]);
  if (!feesRes.success) return;
  allFees = feesRes.data;

  if (summaryRes.success) {
    const s = summaryRes.data;
    document.getElementById('feeStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon">💵</div><div class="stat-val" style="color:var(--green)">₹${fmtAmt(s.collected)}</div><div class="stat-label">Collected</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-val" style="color:var(--amber)">₹${fmtAmt(s.pending)}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-val" style="color:var(--rust)">₹${fmtAmt(s.overdue)}</div><div class="stat-label">Overdue</div></div>
    `;
  }
  renderFeesTable();
}

function setFeeFilter(f, el) {
  feeFilter = f;
  document.querySelectorAll('#feeTabs .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderFeesTable();
}

function filterFees(q) {
  const filtered = allFees.filter(f => f.student_name.toLowerCase().includes(q.toLowerCase()) || f.fee_type.toLowerCase().includes(q.toLowerCase()));
  renderFeesTableData(feeFilter === 'all' ? filtered : filtered.filter(f => f.status === feeFilter));
}

function renderFeesTable() {
  const data = feeFilter === 'all' ? allFees : allFees.filter(f => f.status === feeFilter);
  renderFeesTableData(data);
}

function renderFeesTableData(data) {
  if (!data.length) { document.getElementById('feesTableWrap').innerHTML = emptyState('💰', 'No fee records found'); return; }
  document.getElementById('feesTableWrap').innerHTML = `
    <table><thead><tr>
      <th>Student</th><th>Room</th><th>Fee Type</th><th>Month/Year</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>
      ${data.map(f => `<tr>
        <td><div style="font-weight:500">${f.student_name}</div><div style="font-size:12px;color:var(--mid)">${f.student_code}</div></td>
        <td>${f.room_number ? `Room ${f.room_number}` : '—'}</td>
        <td>${f.fee_type}</td>
        <td>${f.month||'—'} ${f.year||''}</td>
        <td><strong>₹${fmtAmt(f.amount)}</strong></td>
        <td style="color:${f.status==='overdue'?'var(--rust)':'inherit'}">${f.due_date||'—'}</td>
        <td>${feeStatusBadge(f.status)}</td>
        <td>
          ${f.status !== 'paid' ? `<button class="btn btn-success btn-sm" onclick="markFeePaid(${f.id})">Mark Paid</button>` : `<span style="font-size:12px;color:var(--green)">✓ ${f.payment_method||''}</span>`}
          <button class="btn btn-danger btn-sm" onclick="deleteFee(${f.id})">✕</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function openAddFeeModal() {
  showModal('Add Fee Record', `
    <div class="form-grid">
      <div class="form-full form-group">
        <label class="form-label">Student *</label>
        <select class="form-select" id="ff_stu">
          <option value="">Select Student</option>
          ${allStudents.map(s => `<option value="${s.id}">${s.name} (${s.student_id})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Fee Type *</label>
        <select class="form-select" id="ff_type">
          ${['Room Rent','Mess Fee','Electricity','Water','Security Deposit','Other'].map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-input" id="ff_amt" type="number" placeholder="8000">
      </div>
      <div class="form-group">
        <label class="form-label">Month</label>
        <select class="form-select" id="ff_month">
          ${['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=>`<option>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Year</label>
        <input class="form-input" id="ff_year" type="number" placeholder="2024" value="${new Date().getFullYear()}">
      </div>
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="ff_due" type="date" value="${today()}">
      </div>
      <div class="form-full form-group">
        <label class="form-label">Remarks</label>
        <input class="form-input" id="ff_rem" placeholder="Optional remarks">
      </div>
    </div>
  `, async () => {
    const body = { student_id: val('ff_stu'), amount: val('ff_amt'), fee_type: val('ff_type'), month: val('ff_month'), year: val('ff_year'), due_date: val('ff_due'), remarks: val('ff_rem') };
    if (!body.student_id || !body.amount) { alert('Please fill required fields'); return; }
    const res = await api('/api/fees', 'POST', body);
    if (res.success) { closeModal(); loadFees(); } else alert(res.message);
  });
}

async function markFeePaid(id) {
  const methods = ['UPI', 'Cash', 'Bank Transfer', 'Cheque', 'DD'];
  const method = prompt(`Payment method?\n${methods.join(', ')}`);
  if (!method) return;
  await api(`/api/fees/${id}/pay`, 'PUT', { payment_method: method });
  loadFees();
}

async function deleteFee(id) {
  if (!confirm('Delete this fee record?')) return;
  await api(`/api/fees/${id}`, 'DELETE');
  loadFees();
}

// =========== COMPLAINTS ===========
async function loadComplaints() {
  const res = await api('/api/complaints');
  if (!res.success) return;
  allComplaints = res.data;
  renderComplaintsTable();
}

function setComplaintFilter(f, el) {
  complaintFilter = f;
  document.querySelectorAll('.filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderComplaintsTable();
}

function renderComplaintsTable() {
  const data = complaintFilter === 'all' ? allComplaints : allComplaints.filter(c => c.status === complaintFilter);
  if (!data.length) { document.getElementById('complaintsTableWrap').innerHTML = emptyState('🔧', 'No complaints found'); return; }
  document.getElementById('complaintsTableWrap').innerHTML = `
    <table><thead><tr>
      <th>Student</th><th>Room</th><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th>
    </tr></thead><tbody>
      ${data.map(c => `<tr>
        <td><div style="font-weight:500">${c.student_name}</div><div style="font-size:12px;color:var(--mid)">${c.student_code}</div></td>
        <td>${c.room_number ? `Room ${c.room_number}` : '—'}</td>
        <td>
          <div style="font-weight:500">${c.title}</div>
          <div style="font-size:12px;color:var(--mid);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.description}</div>
        </td>
        <td><span class="badge badge-blue">${c.category}</span></td>
        <td>${priorityBadge(c.priority)}</td>
        <td>${complaintStatusBadge(c.status)}</td>
        <td style="font-size:12px;color:var(--mid)">${fmtDate(c.created_at)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="resolveComplaint(${c.id})">Update</button>
          <button class="btn btn-danger btn-sm" onclick="deleteComplaint(${c.id})">✕</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function openAddComplaintModal() {
  showModal('New Complaint', `
    <div class="form-grid single">
      <div class="form-group">
        <label class="form-label">Student *</label>
        <select class="form-select" id="fc_stu">
          <option value="">Select Student</option>
          ${allStudents.map(s => `<option value="${s.id}">${s.name} (${s.student_id})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input class="form-input" id="fc_title" placeholder="Brief complaint title">
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="fc_cat">
          ${['Maintenance','Technical','Mess','Housekeeping','Security','Other'].map(c=>`<option>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="fc_pri">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description *</label>
        <textarea class="form-textarea" id="fc_desc" placeholder="Detailed description of the issue..."></textarea>
      </div>
    </div>
  `, async () => {
    const body = { student_id: val('fc_stu'), title: val('fc_title'), description: val('fc_desc'), category: val('fc_cat'), priority: val('fc_pri') };
    if (!body.student_id || !body.title) { alert('Please fill required fields'); return; }
    const res = await api('/api/complaints', 'POST', body);
    if (res.success) { closeModal(); loadComplaints(); } else alert(res.message);
  });
}

function resolveComplaint(id) {
  const c = allComplaints.find(x => x.id === id);
  if (!c) return;
  showModal('Update Complaint', `
    <div class="form-grid single">
      <div style="background:var(--ink2);border-radius:8px;padding:14px;margin-bottom:8px">
        <div style="font-weight:600;margin-bottom:4px">${c.title}</div>
        <div style="font-size:13px;color:var(--mid)">${c.description}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="fu_status">
          <option value="open" ${c.status=='open'?'selected':''}>Open</option>
          <option value="in-progress" ${c.status=='in-progress'?'selected':''}>In Progress</option>
          <option value="resolved" ${c.status=='resolved'?'selected':''}>Resolved</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Assigned To</label>
        <input class="form-input" id="fu_assigned" placeholder="e.g. Maintenance Team" value="${c.assigned_to||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Resolution / Notes</label>
        <textarea class="form-textarea" id="fu_res" placeholder="Describe what was done...">${c.resolution||''}</textarea>
      </div>
    </div>
  `, async () => {
    const body = { status: val('fu_status'), assigned_to: val('fu_assigned'), resolution: val('fu_res'), priority: c.priority };
    await api(`/api/complaints/${id}`, 'PUT', body);
    closeModal(); loadComplaints();
  });
}

async function deleteComplaint(id) {
  if (!confirm('Delete this complaint?')) return;
  await api(`/api/complaints/${id}`, 'DELETE');
  loadComplaints();
}

// =========== VISITORS ===========
async function loadVisitors() {
  const res = await api('/api/visitors');
  if (!res.success) return;
  allVisitors = res.data;
  renderVisitorsTable(allVisitors);
}

function renderVisitorsTable(visitors) {
  if (!visitors.length) { document.getElementById('visitorsTableWrap').innerHTML = emptyState('🚪', 'No visitor records'); return; }
  document.getElementById('visitorsTableWrap').innerHTML = `
    <table><thead><tr>
      <th>Visitor</th><th>Student</th><th>Room</th><th>Relation</th><th>Purpose</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>
      ${visitors.map(v => `<tr>
        <td><div style="font-weight:500">${v.visitor_name}</div><div style="font-size:12px;color:var(--mid)">${v.visitor_phone||'—'}</div></td>
        <td><div>${v.student_name}</div><div style="font-size:12px;color:var(--mid)">${v.student_code}</div></td>
        <td>${v.room_number ? `Room ${v.room_number}` : '—'}</td>
        <td>${v.relation||'—'}</td>
        <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.purpose||'—'}</td>
        <td style="font-size:12px">${fmtDateTime(v.check_in)}</td>
        <td style="font-size:12px">${v.check_out ? fmtDateTime(v.check_out) : '<span style="color:var(--mid)">—</span>'}</td>
        <td>${v.status === 'checked-in' ? '<span class="badge badge-green">In</span>' : '<span class="badge badge-gray">Out</span>'}</td>
        <td>
          ${v.status === 'checked-in' ? `<button class="btn btn-amber btn-sm" style="background:rgba(232,160,32,0.15);color:var(--amber);border:1px solid rgba(232,160,32,0.3)" onclick="checkoutVisitor(${v.id})">Check Out</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteVisitor(${v.id})">✕</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function openAddVisitorModal() {
  showModal('Register Visitor', `
    <div class="form-grid">
      <div class="form-full form-group">
        <label class="form-label">Visiting Student *</label>
        <select class="form-select" id="fv_stu">
          <option value="">Select Student</option>
          ${allStudents.map(s => `<option value="${s.id}">${s.name} (${s.student_id}) — Room ${s.room_number||'N/A'}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Visitor Name *</label>
        <input class="form-input" id="fv_name" placeholder="Visitor's full name">
      </div>
      <div class="form-group">
        <label class="form-label">Visitor Phone</label>
        <input class="form-input" id="fv_phone" placeholder="Phone number">
      </div>
      <div class="form-group">
        <label class="form-label">Relation</label>
        <select class="form-select" id="fv_rel">
          ${['Father','Mother','Sibling','Relative','Friend','Guardian','Other'].map(r=>`<option>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Purpose</label>
        <input class="form-input" id="fv_purpose" placeholder="Reason for visit">
      </div>
    </div>
  `, async () => {
    const body = { student_id: val('fv_stu'), visitor_name: val('fv_name'), visitor_phone: val('fv_phone'), relation: val('fv_rel'), purpose: val('fv_purpose') };
    if (!body.student_id || !body.visitor_name) { alert('Please fill required fields'); return; }
    const res = await api('/api/visitors', 'POST', body);
    if (res.success) { closeModal(); loadVisitors(); } else alert(res.message);
  });
}

async function checkoutVisitor(id) {
  await api(`/api/visitors/${id}/checkout`, 'PUT', {});
  loadVisitors();
}

async function deleteVisitor(id) {
  if (!confirm('Delete this visitor record?')) return;
  await api(`/api/visitors/${id}`, 'DELETE');
  loadVisitors();
}

// =========== ATTENDANCE ===========
async function loadAttendance() {
  const date = document.getElementById('attendanceDate').value || today();
  const studRes = await api('/api/students');
  if (!studRes.success) return;
  const students = studRes.data.filter(s => s.status === 'active');

  const attRes = await api(`/api/attendance?date=${date}`);
  const existingMap = {};
  if (attRes.success) attRes.data.forEach(a => { existingMap[a.student_id] = a; });

  document.getElementById('attendanceInfo').textContent = `${students.length} students`;

  if (!students.length) { document.getElementById('attendanceTableWrap').innerHTML = emptyState('📋', 'No active students'); return; }

  document.getElementById('attendanceTableWrap').innerHTML = `
    <table><thead><tr>
      <th>Student</th><th>Room</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Remarks</th>
    </tr></thead><tbody>
      ${students.map(s => {
        const a = existingMap[s.id] || {};
        return `<tr>
          <td><div style="font-weight:500">${s.name}</div><div style="font-size:12px;color:var(--mid)">${s.student_id}</div></td>
          <td>${s.room_number ? `Room ${s.room_number}` : '—'}</td>
          <td><input type="time" class="form-input" id="att_ci_${s.id}" style="width:120px;padding:6px 10px" value="${a.check_in||''}"></td>
          <td><input type="time" class="form-input" id="att_co_${s.id}" style="width:120px;padding:6px 10px" value="${a.check_out||''}"></td>
          <td>
            <select class="form-select" id="att_st_${s.id}" style="width:120px;padding:6px 10px">
              <option value="present" ${(a.status||'present')==='present'?'selected':''}>Present</option>
              <option value="absent" ${a.status==='absent'?'selected':''}>Absent</option>
              <option value="leave" ${a.status==='leave'?'selected':''}>On Leave</option>
              <option value="late" ${a.status==='late'?'selected':''}>Late</option>
            </select>
          </td>
          <td><input class="form-input" id="att_rm_${s.id}" placeholder="Remarks" value="${a.remarks||''}" style="padding:6px 10px"></td>
        </tr>`;
      }).join('')}
    </tbody></table>`;

  window._attStudents = students;
}

async function saveAttendance() {
  const date = document.getElementById('attendanceDate').value;
  const students = window._attStudents || [];
  const records = students.map(s => ({
    student_id: s.id,
    check_in: document.getElementById(`att_ci_${s.id}`)?.value || null,
    check_out: document.getElementById(`att_co_${s.id}`)?.value || null,
    status: document.getElementById(`att_st_${s.id}`)?.value || 'present',
    remarks: document.getElementById(`att_rm_${s.id}`)?.value || ''
  }));
  const res = await api('/api/attendance/mark', 'POST', { date, records });
  if (res.success) { showToast('✅ Attendance saved successfully!'); } else { alert('Failed to save attendance'); }
}

// =========== MODAL HELPERS ===========
function showModal(title, body, onSave, saveLabel='Save', onSecondary=null, secondaryLabel=null) {
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-title">${title}</div>
    <div id="modalFormContent">${body}</div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      ${onSecondary && secondaryLabel ? `<button class="btn btn-ghost" onclick="window._modalSecondary()">${secondaryLabel}</button>` : ''}
      ${onSave ? `<button class="btn btn-primary" onclick="window._modalSave()">${saveLabel}</button>` : ''}
    </div>`;
  window._modalSave = onSave;
  window._modalSecondary = onSecondary;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
}

// =========== UTILS ===========
async function api(url, method='GET', body=null) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return await res.json();
  } catch(e) { return { success: false, message: e.message }; }
}

function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }

function today() { return new Date().toISOString().split('T')[0]; }

function fmtAmt(n) { return Number(n||0).toLocaleString('en-IN'); }

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }

function fmtDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }); }

function emptyState(icon, msg) { return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-text">${msg}</div></div>`; }

function feeStatusBadge(s) {
  const map = { paid: 'badge-green', pending: 'badge-amber', overdue: 'badge-red' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
}
function complaintStatusBadge(s) {
  const map = { open: 'badge-red', 'in-progress': 'badge-amber', resolved: 'badge-green' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
}
function priorityBadge(p) {
  const map = { high: 'badge-red', medium: 'badge-amber', low: 'badge-green' };
  return `<span class="badge ${map[p]||'badge-gray'}">${p}</span>`;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:32px;right:32px;background:#1e2028;border:1px solid rgba(255,255,255,0.1);color:white;padding:14px 22px;border-radius:8px;font-size:14px;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.4)`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

async function logout() {
  await api('/api/auth/logout', 'POST');
  window.location.href = '/';
}
