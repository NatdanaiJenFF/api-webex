const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, 'data', 'meeting_room.db');

let db = null;

// ต้องเรียก init() ครั้งเดียวตอน server เริ่มทำงาน ก่อนใช้ฟังก์ชันอื่นในไฟล์นี้
// (sql.js โหลด WebAssembly แบบ async แต่หลังจากนั้นทุกคำสั่งเป็น sync ตามปกติ)
async function init() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
  db = new SQL.Database(fileBuffer);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    room_name TEXT NOT NULL,
    booker_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    equipments TEXT,
    status TEXT NOT NULL DEFAULT 'รอยืนยัน',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // เพิ่มคอลัมน์สำหรับเก็บข้อมูล Webex ถ้ายังไม่มี (ไม่กระทบข้อมูลเดิม)
  const tableInfo = db.exec('PRAGMA table_info(bookings)');
  const existingColumns = tableInfo.length ? tableInfo[0].values.map((row) => row[1]) : [];
  const webexColumns = { webex_meeting_id: 'TEXT', webex_link: 'TEXT', webex_password: 'TEXT' };
  for (const [col, type] of Object.entries(webexColumns)) {
    if (!existingColumns.includes(col)) {
      db.run(`ALTER TABLE bookings ADD COLUMN ${col} ${type}`);
    }
  }

  persist();
}

// sql.js เก็บฐานข้อมูลไว้ในหน่วยความจำ ต้อง export แล้วเขียนลงไฟล์เองทุกครั้งที่มีการแก้ไข
function persist() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}

const ROOM_COLORS = {
  ศรีสง่า: '#0d6efd',
  กาสะลอง: '#198754',
  ตะวันฉาย: '#fd7e14',
  'ออนไลน์ (Webex)': '#5A4FCF',
};

function toCalendarEvents() {
  const rows = queryAll('SELECT * FROM bookings');
  return rows.map((row) => {
    let color = ROOM_COLORS[row.room_name] || '#6c757d';
    if (row.status === 'รอยืนยัน') color = '#ffc107';

    return {
      id: row.id,
      title: `[${row.status}] ${row.title}`,
      start: row.start_time,
      end: row.end_time,
      backgroundColor: color,
      borderColor: color,
      textColor: row.status === 'รอยืนยัน' ? '#000000' : '#ffffff',
      extendedProps: {
        raw_title: row.title,
        room: row.room_name,
        booker: row.booker_name,
        equipments: row.equipments,
        status: row.status,
        start_raw: row.start_time,
        end_raw: row.end_time,
        webexLink: row.webex_link || null,
        webexPassword: row.webex_password || null,
      },
    };
  });
}

function getBooking(id) {
  return queryOne('SELECT * FROM bookings WHERE id = ?', [id]);
}

function createBooking({ title, room_name, booker_name, start_time, end_time, equipments, status }) {
  const equipmentsText = equipments && equipments.length ? equipments.join(', ') : 'ไม่มี';
  db.run(
    `INSERT INTO bookings (title, room_name, booker_name, start_time, end_time, equipments, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, room_name, booker_name, start_time, end_time, equipmentsText, status || 'รอยืนยัน']
  );
  const { id } = queryOne('SELECT last_insert_rowid() AS id');
  persist();
  return getBooking(id);
}

function getBookingByWebexMeetingId(meetingId) {
  return queryOne('SELECT * FROM bookings WHERE webex_meeting_id = ?', [meetingId]);
}

function updateBooking(id, { title, room_name, booker_name, start_time, end_time, equipments }) {
  const equipmentsText = equipments && equipments.length ? equipments.join(', ') : 'ไม่มี';
  db.run(
    `UPDATE bookings SET title=?, room_name=?, booker_name=?, start_time=?, end_time=?, equipments=? WHERE id=?`,
    [title, room_name, booker_name, start_time, end_time, equipmentsText, id]
  );
  persist();
  return getBooking(id);
}

function setWebexInfo(id, { meetingId, link, password }) {
  db.run(
    `UPDATE bookings SET webex_meeting_id=?, webex_link=?, webex_password=? WHERE id=?`,
    [meetingId || null, link || null, password || null, id]
  );
  persist();
  return getBooking(id);
}

function confirmBooking(id) {
  db.run(`UPDATE bookings SET status = 'ยืนยันแล้ว' WHERE id = ?`, [id]);
  persist();
  return getBooking(id);
}

function deleteBooking(id) {
  const booking = getBooking(id);
  db.run('DELETE FROM bookings WHERE id = ?', [id]);
  persist();
  return booking;
}

module.exports = {
  init,
  toCalendarEvents,
  getBooking,
  getBookingByWebexMeetingId,
  createBooking,
  updateBooking,
  setWebexInfo,
  confirmBooking,
  deleteBooking,
};
