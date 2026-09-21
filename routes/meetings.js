const express = require('express');
const router = express.Router();
const { createMeeting, updateMeeting, cancelMeeting } = require('../webexClient');
const { sendLineBroadcast } = require('../lineClient');

// POST /api/meetings
// body: { title, start, end, invitees: ["a@example.com"] }
router.post('/', async (req, res) => {
  const { title, start, end, invitees } = req.body;

  if (!title || !start || !end) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุ title, start, end (รูปแบบ ISO 8601 เช่น 2026-09-25T09:00:00-07:00)',
    });
  }

  try {
    const meeting = await createMeeting({ title, start, end, invitees });

    // TODO: บันทึก meeting.id / meeting.webLink ลงฐานข้อมูลของคุณ
    // ผูกกับผู้ใช้ที่กดสร้าง เพื่อให้เรียกดูย้อนหลังได้

    let lineNotified = false;
    try {
      const message =
        `📅 ห้องประชุมใหม่: ${title}\n` +
        `เวลาเริ่ม: ${meeting.start}\n` +
        `เวลาจบ: ${meeting.end}\n` +
        `ลิงก์เข้าร่วม: ${meeting.webLink}`;
      lineNotified = await sendLineBroadcast(message);
    } catch (lineErr) {
      // ส่ง LINE ไม่สำเร็จ ไม่ควรทำให้ทั้ง request ล้มเหลว แค่ log ไว้
      console.error('ส่งแจ้งเตือน LINE ไม่สำเร็จ:', lineErr.response?.data || lineErr.message);
    }

    return res.status(201).json({
      success: true,
      meetingId: meeting.id,
      webLink: meeting.webLink,
      meetingNumber: meeting.meetingNumber,
      password: meeting.password,
      start: meeting.start,
      end: meeting.end,
      lineNotified,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('สร้างห้องประชุม Webex ไม่สำเร็จ:', detail);
    return res.status(502).json({
      success: false,
      error: 'สร้างห้องประชุมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    });
  }
});

// PUT /api/meetings/:id
// แก้ไขห้องประชุมที่มีอยู่แล้ว (ใช้ body รูปแบบเดียวกับตอนสร้าง)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, start, end, invitees } = req.body;

  if (!title || !start || !end) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุ title, start, end (รูปแบบ ISO 8601)',
    });
  }

  try {
    const meeting = await updateMeeting(id, { title, start, end, invitees });

    let lineNotified = false;
    try {
      const message =
        `🔄 แก้ไขห้องประชุม: ${title}\n` +
        `เวลาเริ่ม: ${meeting.start}\n` +
        `เวลาจบ: ${meeting.end}\n` +
        `ลิงก์เข้าร่วม: ${meeting.webLink}`;
      lineNotified = await sendLineBroadcast(message);
    } catch (lineErr) {
      console.error('ส่งแจ้งเตือน LINE ไม่สำเร็จ:', lineErr.response?.data || lineErr.message);
    }

    return res.json({
      success: true,
      meetingId: meeting.id,
      webLink: meeting.webLink,
      meetingNumber: meeting.meetingNumber,
      password: meeting.password,
      start: meeting.start,
      end: meeting.end,
      lineNotified,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('แก้ไขห้องประชุม Webex ไม่สำเร็จ:', detail);
    return res.status(502).json({
      success: false,
      error: 'แก้ไขห้องประชุมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    });
  }
});

// DELETE /api/meetings/:id
// ยกเลิกห้องประชุม
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const title = req.body && req.body.title;

  try {
    await cancelMeeting(id);

    try {
      await sendLineBroadcast(`❌ ยกเลิกห้องประชุมแล้ว${title ? ': ' + title : ''}`);
    } catch (lineErr) {
      console.error('ส่งแจ้งเตือน LINE ไม่สำเร็จ:', lineErr.response?.data || lineErr.message);
    }

    return res.json({ success: true });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('ยกเลิกห้องประชุม Webex ไม่สำเร็จ:', detail);
    return res.status(502).json({
      success: false,
      error: 'ยกเลิกห้องประชุมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    });
  }
});

module.exports = router;
