require('dotenv').config();
const axios = require('axios');

// ส่งข้อความแจ้งเตือนแบบ broadcast ไปหาทุกคนที่แอด LINE Official Account นี้เป็นเพื่อน
// ใช้ LINE Messaging API เพราะ LINE Notify ปิดให้บริการไปแล้วตั้งแต่ 31 มี.ค. 2025
async function sendLineBroadcast(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.warn('ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ข้ามการแจ้งเตือน LINE ไปก่อน');
    return false;
  }

  await axios.post(
    'https://api.line.me/v2/bot/message/broadcast',
    { messages: [{ type: 'text', text }] },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return true;
}

module.exports = { sendLineBroadcast };
