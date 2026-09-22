require('dotenv').config();
const axios = require('axios');

let cachedToken = null;
let tokenExpiresAt = 0;

// ขอ access token ใหม่ด้วย refresh token ของบัญชี Webex กลาง
async function refreshAccessToken() {
  const response = await axios.post(
    'https://webexapis.com/v1/access_token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.WEBEX_CLIENT_ID,
      client_secret: process.env.WEBEX_CLIENT_SECRET,
      refresh_token: process.env.WEBEX_REFRESH_TOKEN,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, expires_in } = response.data;
  cachedToken = access_token;
  // กันขอบเวลา หมดอายุก่อนจริง 60 วินาที เพื่อไม่ให้ชนตอนเรียกใช้
  tokenExpiresAt = Date.now() + (expires_in - 60) * 1000;
  return cachedToken;
}

// คืน token ที่ยังไม่หมดอายุ ถ้าหมดแล้วก็ไป refresh ใหม่อัตโนมัติ
async function getValidAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  return refreshAccessToken();
}

// เรียก Webex REST API เพื่อสร้างห้องประชุมจริง
async function createMeeting({ title, start, end, invitees = [] }) {
  const token = await getValidAccessToken();

  const payload = {
    title,
    start, // ISO 8601 เช่น "2026-09-25T09:00:00-07:00"
    end,
    excludePassword: true, // ไม่ตั้งรหัสผ่านห้องประชุม เพื่อให้ guest กดลิงก์เข้าได้ทันที ไม่ต้องกรอกอะไรเพิ่ม
    enabledJoinBeforeHost: true, // ให้ผู้เข้าร่วมเข้าห้องได้เองโดยไม่ต้องรอ host มากดเริ่มก่อน
    joinBeforeHostMinutes: 10, // เข้าได้ก่อนเวลาเริ่ม 10 นาที
    unlockedMeetingJoinSecurity: 'allowJoin', // คนที่ไม่ได้อยู่ใน invitees ก็เข้าห้องได้ทันที ไม่ต้องรอ host กดรับจาก lobby
  };

  if (invitees.length > 0) {
    payload.invitees = invitees.map((email) => ({ email }));
  }

  const response = await axios.post(
    'https://webexapis.com/v1/meetings',
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

// อัปเดตห้องประชุมที่มีอยู่แล้ว
async function updateMeeting(meetingId, { title, start, end, invitees = [] }) {
  const token = await getValidAccessToken();

  const payload = {
    title,
    start,
    end,
    excludePassword: true,
    enabledJoinBeforeHost: true,
    joinBeforeHostMinutes: 10,
    unlockedMeetingJoinSecurity: 'allowJoin',
  };

  if (invitees.length > 0) {
    payload.invitees = invitees.map((email) => ({ email }));
  }

  const response = await axios.put(
    `https://webexapis.com/v1/meetings/${meetingId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

// ยกเลิกห้องประชุม
async function cancelMeeting(meetingId) {
  const token = await getValidAccessToken();

  await axios.delete(`https://webexapis.com/v1/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return true;
}

module.exports = { createMeeting, updateMeeting, cancelMeeting, getValidAccessToken };
