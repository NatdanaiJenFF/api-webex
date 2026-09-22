require('dotenv').config();
const path = require('path');
const express = require('express');
const meetingsRouter = require('./routes/meetings');
const authRouter = require('./routes/auth');
const roomsRouter = require('./routes/rooms');
const roomsDb = require('./roomsDb');

const app = express();
app.use(express.json());

// เสิร์ฟหน้าเว็บฟอร์มสร้างห้องประชุม (public/index.html) — ตั้งให้ rooms.html เป็นหน้าแรก
app.use(express.static(path.join(__dirname, 'public'), { index: 'rooms.html' }));

app.use('/api/meetings', meetingsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/auth', authRouter); // ใช้ตอน setup ครั้งแรกเท่านั้น ควรปิด/ลบก่อนขึ้น production

async function start() {
  await roomsDb.init(); // โหลดฐานข้อมูล sql.js (WebAssembly) ให้เสร็จก่อนเปิดรับ request
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
    console.log(`เปิดหน้าเว็บได้ที่ http://localhost:${process.env.PORT || 3000}`);
  });
}

start();
