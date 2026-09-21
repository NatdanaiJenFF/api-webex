# Webex Meeting Demo

ตัวอย่างระบบสร้างห้องประชุม Webex ผ่าน REST API โดยใช้บัญชี Webex กลาง 1 บัญชีเป็น host ให้ทุกคนในระบบ

## 1. เตรียม App บน Webex Developer

1. ไปที่ https://developer.webex.com สมัคร/ล็อกอิน
2. สร้าง **Integration** ใหม่ (My Webex Apps > Create a New App > Integration)
3. ตั้งค่า Redirect URI ให้ตรงกับ `WEBEX_REDIRECT_URI` ใน `.env` (ตอนพัฒนาใช้ `http://localhost:3000/auth/webex/callback`)
4. เลือก scope: `meeting:schedules_write`, `meeting:schedules_read`
5. จะได้ `Client ID` และ `Client Secret` มา

> หมายเหตุ: ตัวอย่างนี้ใช้ Integration (OAuth มาตรฐาน) เพื่อความง่ายในการทดลอง ถ้าจะขึ้น production จริงจัง แนะนำพิจารณาใช้ **Service App** แทน ซึ่ง Webex ออกแบบมาสำหรับ "แอปเรียก API แทนองค์กร" โดยเฉพาะ (ดูรายละเอียดใน Webex Developer Portal)

## 2. ติดตั้งโปรเจกต์

```bash
npm install
cp .env.example .env
```

แก้ `.env` ใส่ `WEBEX_CLIENT_ID` และ `WEBEX_CLIENT_SECRET` ที่ได้จากขั้นตอนที่ 1

## 3. ขอ refresh token ครั้งแรก (ทำครั้งเดียว)

```bash
npm start
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000/auth/webex` แล้ว login ด้วยบัญชี Webex ที่จะใช้เป็น host กลาง
หลัง authorize จะโชว์ `WEBEX_REFRESH_TOKEN` ให้คัดลอกไปใส่ใน `.env`

**สำคัญ:** หลังได้ refresh token แล้ว ให้ลบหรือปิดการเข้าถึง route `/auth/*` ก่อนขึ้น production เพราะเป็นช่องทางขอ token ใหม่ได้

## 4. เรียก API สร้างห้องประชุม

```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ประชุมทีมขาย",
    "start": "2026-09-25T09:00:00+07:00",
    "end": "2026-09-25T10:00:00+07:00",
    "invitees": ["someone@example.com"]
  }'
```

ตัวอย่างผลลัพธ์ที่ได้กลับมา (เอาไปแสดงในเว็บของคุณได้เลย):

```json
{
  "success": true,
  "meetingId": "...",
  "webLink": "https://yourcompany.webex.com/meet/xxxxx",
  "meetingNumber": "123 456 789",
  "password": "abc123",
  "start": "2026-09-25T09:00:00+07:00",
  "end": "2026-09-25T10:00:00+07:00"
}
```

## 5. จุดที่ต้องเพิ่มเองตามระบบจริง

- บันทึก `meetingId` / `webLink` ลงฐานข้อมูล ผูกกับผู้ใช้ที่กดสร้าง (ดูจุด `TODO` ใน `routes/meetings.js`)
- ใส่ authentication/authorization ของระบบคุณเองก่อนเรียก `/api/meetings` (ตอนนี้ endpoint เปิดกว้าง ยังไม่เช็คว่าใครเป็นคนเรียก)
- ถ้าคาดว่าจะมีห้องประชุมพร้อมกันจำนวนมาก ควรเช็ค license/ข้อจำกัดของแพ็กเกจ Webex ที่ใช้อยู่
