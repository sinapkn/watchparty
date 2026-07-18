# واچ پارتی

این پروژه یک اپ Next.js برای ساخت اتاق تماشای گروهی است. امکانات اصلی آن شامل ساخت اتاق، چت، هماهنگ‌سازی ویدیو، Socket.IO و Prisma است.

## راه‌اندازی لوکال

اول پکیج‌ها را نصب کن:

```bash
npm install
```

یک فایل `.env` بساز:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/watchparty"
PORT=3000
```

مایگریشن‌های دیتابیس را اجرا کن:

```bash
npm run db:migrate
```

سرور توسعه را اجرا کن:

```bash
npm run dev
```

بعد این آدرس را باز کن:

```text
http://localhost:3000
```

## دیپلوی روی Railway

### 1. آپلود پروژه روی GitHub

مطمئن شو آخرین تغییرات روی ریپوی GitHub push شده‌اند:

```bash
git add .
git commit -m "Update app"
git push
```

فایل `.env` را commit نکن. این فایل داخل `.gitignore` قرار دارد و نباید روی GitHub برود.

### 2. ساخت پروژه در Railway

1. وارد Railway شو.
2. یک پروژه جدید بساز.
3. یک سرویس جدید از GitHub Repository اضافه کن.
4. ریپوی همین پروژه را انتخاب کن.

### 3. اضافه کردن PostgreSQL

1. داخل همان پروژه Railway روی `New` کلیک کن.
2. گزینه `Database` را انتخاب کن.
3. گزینه `PostgreSQL` را انتخاب کن.
4. صبر کن تا سرویس PostgreSQL اجرا شود.

### 4. تنظیم متغیرهای محیطی

وارد سرویس اصلی اپ در Railway شو و بخش `Variables` را باز کن.

این متغیر را اضافه کن:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Railway این مقدار را از سرویس PostgreSQL همان پروژه می‌خواند.

### 5. بررسی تنظیمات Railway

پروژه فایل `railway.json` دارد:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run db:migrate && npm run start",
    "buildCommand": "npm run build",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Railway با این تنظیمات این کارها را انجام می‌دهد:

1. نصب dependencyها
2. اجرای `npm run build`
3. اجرای migrationهای Prisma
4. اجرای اپ با `npm run start`

### 6. اجرای Deploy

داخل سرویس اصلی اپ روی Railway روی `Deploy` یا `Redeploy` کلیک کن.

بعد از موفق شدن deploy، از بخش `Networking` یا `Settings` برای سرویس اپ یک Railway Domain بساز.

## دستورات کاربردی

ساخت Prisma Client:

```bash
npm run postinstall
```

اجرای migrationها:

```bash
npm run db:migrate
```

build گرفتن از پروژه:

```bash
npm run build
```

اجرای نسخه production:

```bash
npm run start
```
