# ระบบติดตามงานธุรการสอบสวน (Investigation Administrative Task Management System)

ระบบจัดการงานธุรการสอบสวนสำหรับหน่วยงานตำรวจ พัฒนาด้วย Next.js (App Router) + TypeScript + PostgreSQL (Prisma) พร้อม Docker

## คุณสมบัติหลัก

- ระบบ Login พร้อม JWT และ Role-Based Access Control: **Admin / ธุรการ / หัวหน้างาน / ผู้บังคับบัญชา**
- Dashboard สรุปสถานะหนังสือ (การ์ดสถิติ, กราฟรายเดือน, กราฟวงกลม, Top ผู้รับผิดชอบ/หน่วยงาน)
- รับหนังสือใหม่ พร้อมเลขรับอัตโนมัติ, แนบไฟล์ (PDF/Word/Excel/PNG/JPG)
- รายการหนังสือ: ค้นหา, filter, sort, pagination, export Excel/CSV/PDF, เลือกลบหลายรายการ
- หน้ารายละเอียดหนังสือ: Timeline การเปลี่ยนสถานะ (วันที่/เวลา/ผู้ใช้/IP), ไฟล์แนบ, Audit Log, พิมพ์/ดาวน์โหลด PDF
- ระบบค้นหาแบบ Global ทุกฟิลด์
- หน้ารายงาน/สถิติ พร้อมกราฟ Bar/Line/Area และ export
- จัดการผู้ใช้ (Admin เท่านั้น)
- Dark mode, Responsive, ติดตั้งเป็น PWA ได้ (manifest + service worker)
- Audit Log ครบทุกกิจกรรม (Login/Logout/Create/Update/Delete/Export/Status Change)
- Security: JWT, bcrypt password hashing, rate limiting บน login, Zod input validation, Prisma (ป้องกัน SQL Injection โดยธรรมชาติ), httpOnly cookie, SameSite strict

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion, lucide-react
- **Backend**: Next.js API Routes (REST), Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: JWT (httpOnly cookie) + Role-Based Access Control, edge-safe verification via `jose` in middleware
- **Deployment**: Docker, Docker Compose, Nginx (reverse proxy + static file serving for uploads)
- **Export**: ExcelJS (.xlsx), PDFKit (.pdf), CSV

## โครงสร้างโปรเจกต์

```
src/
  app/
    api/                # REST API routes (auth, documents, dashboard, search, users, reports, notifications)
    login/               # หน้า login
    dashboard/           # หน้า dashboard
    documents/           # รายการ, เพิ่ม, รายละเอียดหนังสือ
    search/              # ค้นหา
    reports/             # รายงาน/สถิติ
    users/               # จัดการผู้ใช้
    settings/            # ตั้งค่า
  components/
    ui/                  # UI primitives (button, card, input, badge)
    AppShell.tsx         # Layout หลัก (sidebar, header, dark mode)
  lib/                   # auth, prisma client, validation (zod), audit, utils, rate limit
  middleware.ts          # route protection (JWT verify บน edge runtime)
prisma/
  schema.prisma          # โครงสร้างฐานข้อมูลทั้งหมด
  seed.ts                # ข้อมูลเริ่มต้น (ผู้ใช้ + หน่วยงาน + ตัวอย่างหนังสือ)
nginx/nginx.conf          # reverse proxy config
scripts/backup.sh|restore.sh
Dockerfile
docker-compose.yml
```

## วิธีติดตั้ง (Development)

### ข้อกำหนดเบื้องต้น
- Node.js 20+
- PostgreSQL 16 (หรือใช้ Docker สำหรับฐานข้อมูลอย่างเดียว)

### ขั้นตอน

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตั้งค่า environment
cp .env.example .env
# แก้ไข DATABASE_URL และ JWT_SECRET ในไฟล์ .env
# สร้าง JWT_SECRET ด้วยคำสั่ง: openssl rand -base64 48

# 3. สร้างฐานข้อมูลและรัน migration
npx prisma migrate dev --name init

# 4. Seed ข้อมูลเริ่มต้น (ผู้ใช้ทดสอบ + หน่วยงาน + ตัวอย่างหนังสือ)
npm run prisma:seed

# 5. รันระบบ
npm run dev
```

เปิดเบราว์เซอร์ที่ http://localhost:3000

### บัญชีผู้ใช้เริ่มต้น (จาก seed)

| Username     | Password      | Role         |
|--------------|---------------|--------------|
| admin        | Password123!  | Admin        |
| clerk1       | Password123!  | ธุรการ       |
| supervisor1  | Password123!  | หัวหน้างาน   |
| commander1   | Password123!  | ผู้บังคับบัญชา |

**สำคัญ: เปลี่ยนรหัสผ่านทั้งหมดทันทีก่อนใช้งานจริง**

## วิธี Deploy (Production ด้วย Docker)

```bash
# 1. ตั้งค่า environment
cp .env.example .env
# แก้ไข POSTGRES_PASSWORD และ JWT_SECRET ให้เป็นค่าที่ปลอดภัย

# 2. Build และรันทุก service (app + postgres + nginx)
docker compose up -d --build

# ระบบจะรัน migration และ seed ข้อมูลอัตโนมัติเมื่อ container "app" เริ่มทำงาน
```

- แอปพลิเคชันจะพร้อมใช้งานที่ http://localhost (ผ่าน Nginx พอร์ต 80)
- Next.js server รันภายในที่พอร์ต 3000 (เข้าถึงตรงได้เช่นกัน)
- ไฟล์แนบจะถูกเก็บใน volume `uploads_data` (mount ที่ `/app/public/uploads`)

### การตั้งค่า HTTPS (แนะนำสำหรับ Production จริง)
เพิ่ม TLS certificate (เช่นผ่าน Let's Encrypt / Certbot) และปรับ `nginx/nginx.conf` ให้ listen พอร์ต 443 พร้อม `ssl_certificate` / `ssl_certificate_key`

## วิธี Backup ฐานข้อมูล

```bash
./scripts/backup.sh
```
ไฟล์ backup จะถูกบันทึกที่ `./backups/backup_<database>_<timestamp>.sql.gz`

## วิธี Restore ฐานข้อมูล

```bash
./scripts/restore.sh backups/backup_investigation_tracker_20260101_120000.sql.gz
```

## REST API หลัก

| Method | Endpoint                              | คำอธิบาย                          |
|--------|----------------------------------------|-------------------------------------|
| POST   | /api/auth/login                        | เข้าสู่ระบบ                         |
| POST   | /api/auth/logout                       | ออกจากระบบ                          |
| GET    | /api/auth/me                           | ข้อมูลผู้ใช้ปัจจุบัน                |
| GET    | /api/documents                         | รายการหนังสือ (search/filter/paginate) |
| POST   | /api/documents                         | สร้างหนังสือใหม่                    |
| GET    | /api/documents/:id                     | รายละเอียดหนังสือ                   |
| PUT    | /api/documents/:id                     | แก้ไขหนังสือ                        |
| DELETE | /api/documents/:id                     | ลบหนังสือ                           |
| POST   | /api/documents/bulk-delete              | ลบหลายรายการ                        |
| POST   | /api/documents/:id/status              | เปลี่ยนสถานะ (บันทึก timeline)      |
| POST   | /api/documents/:id/attachments         | อัปโหลดไฟล์แนบ                      |
| GET    | /api/dashboard/stats                   | สถิติสำหรับ Dashboard               |
| GET    | /api/search?q=                         | ค้นหาแบบ Global                     |
| GET    | /api/reports/export?format=excel|pdf|csv | ส่งออกรายงาน                       |
| GET/POST | /api/users                           | จัดการผู้ใช้ (Admin)                |
| GET    | /api/agencies                          | รายชื่อหน่วยงาน                     |
| GET/PATCH | /api/notifications                  | การแจ้งเตือน                       |

ทุก endpoint ตรวจสอบ JWT และสิทธิ์ตาม Role ผ่าน `src/lib/auth.ts` (`hasPermission`)

## หมายเหตุด้านขอบเขตของระบบ

ระบบนี้ครอบคลุมฟังก์ชันหลักทั้งหมดตามที่ระบุและสามารถใช้งานได้จริงด้วยฐานข้อมูล PostgreSQL จริง (ไม่มี mock data)
ส่วนที่ยังเป็นการออกแบบพื้นฐานและแนะนำให้ขยายเพิ่มเติมตามการใช้งานจริง ได้แก่:
- **Swagger/OpenAPI**: แนะนำให้เพิ่ม `next-swagger-doc` หรือแยก NestJS module หากต้องการ interactive API docs แบบเต็มรูปแบบ
- **S3 Storage**: โครงสร้างไฟล์แนบใช้ local disk (`UPLOAD_DIR`) แต่ออกแบบให้ swap เป็น S3 SDK ได้ง่ายโดยแก้เฉพาะ `src/app/api/documents/[id]/attachments/route.ts`
- **Notification แบบ Real-time**: ปัจจุบันคำนวณ due-soon/overdue แบบ on-demand เมื่อเรียก API แนะนำเพิ่ม cron job หรือ WebSocket สำหรับการแจ้งเตือนแบบทันที
- **Rate limiting**: ใช้ in-memory limiter เหมาะกับ single-instance deployment หากขยายเป็น multi-instance แนะนำเปลี่ยนไปใช้ Redis

## License

Internal use for Royal Thai Police administrative operations.
