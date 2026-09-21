const express = require('express');
const axios = require('axios');
const router = express.Router();

// ⚠️ ใช้ "ครั้งเดียว" ตอนติดตั้งระบบ เพื่อขอ refresh token ของบัญชี Webex กลาง
// วิธีใช้:
// 1) เปิด http://localhost:3000/auth/webex ในเบราว์เซอร์
// 2) Login ด้วยบัญชี Webex ที่จะใช้เป็น "host" กลางของระบบ แล้วกด Authorize
// 3) จะ redirect กลับมาที่ /auth/webex/callback และโชว์ refresh token ให้คัดลอก
// 4) เอาไปใส่ใน .env (WEBEX_REFRESH_TOKEN) แล้วลบ/ปิด route นี้ก่อนขึ้น production จริง

router.get('/webex', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.WEBEX_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.WEBEX_REDIRECT_URI,
    scope: 'meeting:schedules_write meeting:schedules_read',
  });
  res.redirect(`https://webexapis.com/v1/authorize?${params.toString()}`);
});

router.get('/webex/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('ไม่พบ code จาก Webex');
  }

  try {
    const response = await axios.post(
      'https://webexapis.com/v1/access_token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.WEBEX_CLIENT_ID,
        client_secret: process.env.WEBEX_CLIENT_SECRET,
        code,
        redirect_uri: process.env.WEBEX_REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    res.send(`
      <h3>คัดลอกค่านี้ไปใส่ใน .env แล้วลบ/ปิด route นี้ทิ้ง</h3>
      <p><b>WEBEX_REFRESH_TOKEN</b> = ${response.data.refresh_token}</p>
      <p style="color:red">อย่าเปิด route นี้ทิ้งไว้บน production เพราะเป็นช่องทางขอ token ใหม่ได้</p>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('ขอ token ไม่สำเร็จ ดู log ใน console');
  }
});

module.exports = router;
