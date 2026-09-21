require('dotenv').config();
const path = require('path');
const express = require('express');
const meetingsRouter = require('./routes/meetings');
const authRouter = require('./routes/auth');

const app = express();
app.use(express.json());

// เสิร์ฟหน้าเว็บฟอร์มสร้างห้องประชุม (public/index.html)
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/meetings', meetingsRouter);
app.use('/auth', authRouter); // ใช้ตอน setup ครั้งแรกเท่านั้น ควรปิด/ลบก่อนขึ้น production

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
  console.log(`เปิดหน้าเว็บได้ที่ http://localhost:${process.env.PORT || 3000}`);
});
