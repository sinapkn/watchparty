# راه‌اندازی Watch Party

این راهنما مراحل نصب و اجرای پروژه Watch Party را به صورت لوکال و همچنین دیپلوی روی Railway توضیح می‌دهد.

<p align="center">
  <a href="./SETUP.md">📦 English Guide</a>
</p>

---

## راه‌اندازی لوکال

### پیش‌نیازها

- Node.js **≥ 20.9.0**
- PostgreSQL (در حال اجرا)

### مراحل

1. **پکیج‌ها را نصب کن:**

```bash
npm install
```

2. **یک فایل `.env` در ریشه پروژه بساز:**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/watchparty"
PORT=3000
```

3. **مایگریشن‌های دیتابیس را اجرا کن:**

```bash
npm run db:migrate
```

4. **سرور توسعه را اجرا کن:**

```bash
npm run dev
```

5. **باز کن:**

```
http://localhost:3000
```

---

## دیپلوی روی Railway

### 1. Fork کردن ریپازیتوری

۱. برو به [github.com/sinapkn/WatchParty](https://github.com/sinapkn/WatchParty)
۲. روی دکمه **Fork** (بالا-راست) کلیک کن تا یک کپی از پروژه توی حساب گیت‌هاب خودت ساخته بشه

### 2. ساخت پروژه در Railway

1. وارد [Railway](https://railway.app) شو.
2. یک پروژه جدید بساز.
3. یک سرویس جدید از **GitHub Repository** اضافه کن.
4. ریپوی فورک شده خودت را انتخاب کن.

### 3. اضافه کردن PostgreSQL

1. داخل همان پروژه Railway روی **New** کلیک کن.
2. گزینه **Database** را انتخاب کن.
3. گزینه **PostgreSQL** را انتخاب کن.
4. صبر کن تا سرویس PostgreSQL اجرا شود.

### 4. تنظیم متغیرهای محیطی (بخش اول — متغیر دیتابیس)

وارد سرویس اصلی اپ در Railway شو و بخش **Variables** را باز کن. این متغیر را اضافه کن:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Railway این مقدار را از سرویس PostgreSQL همان پروژه می‌خواند.

### 5. راه‌اندازی ویس چت (LiveKit Cloud)

برای فعال کردن **ویس چت** در پروژه، از **LiveKit Cloud** استفاده کنید. این سرویس رایگان است و نیازی به کردیت کارت ندارد.

#### قدم اول: ثبت‌نام در LiveKit Cloud

```bash
۱. برو به https://cloud.livekit.io
۲. ثبت‌نام کن با Google یا GitHub (رایگان، بدون کردیت کارت)
۳. بعد از ورود، روی Create Project بزن
۴. اسم پروژه: watchparty
۵. منطقه: نزدیک‌ترین (مثلاً Frankfurt)
۶. Create رو بزن
```

#### قدم دوم: گرفتن API Keys

```bash
۱. از منوی چپ برو به Settings → API Keys
۲. سه مقدار رو کپی کن:

   LIVEKIT_API_KEY     (مثل: sk_abc123...)
   LIVEKIT_API_SECRET   (مثل: xyz456...)
   LIVEKIT_URL          (مثل: wss://xxx.livekit.cloud)
```

#### قدم سوم: تنظیم متغیرها در Railway

به پروژه اصلی Watch Party در Railway برو و در بخش Variables موارد زیر را اضافه کن:

```env
LIVEKIT_API_KEY=sk_abc123...      # از LiveKit Cloud
LIVEKIT_API_SECRET=xyz456...       # از LiveKit Cloud
LIVEKIT_URL=wss://xxx.livekit.cloud  # از LiveKit Cloud
```

> **نکته:** فقط همین ۳ متغیر کافی است. نیازی به اکانت دوم Railway نیست.

### 7. فایل Railway کانفیگ

پروژه فایل `railway.json` دارد که کارهای زیر را انجام می‌دهد:

1. نصب dependencyها
2. اجرای `npm run build`
3. اجرای migrationهای Prisma
4. اجرای اپ با `npm run start`

### 8. اجرای Deploy

داخل سرویس اصلی اپ روی Railway روی **Deploy** یا **Redeploy** کلیک کن.

بعد از موفق شدن deploy، از بخش **Networking** یا **Settings** برای سرویس اپ یک Railway Domain بساز.

---

## دستورات کاربردی

| دستور | توضیح |
|-------|-------|
| `npm run dev` | اجرای سرور توسعه |
| `npm run build` | build گرفتن از پروژه |
| `npm run start` | اجرای نسخه production |
| `npm run db:migrate` | اجرای migrationها |
| `npm run db:push` | push مدل‌ها به دیتابیس |
| `npm run postinstall` | ساخت Prisma Client |
| `npm run lint` | بررسی lint |

---

## متغیرهای محیطی

| متغیر | توضیح | پیش‌فرض |
|-------|-------|---------|
| `DATABASE_URL` | آدرس اتصال PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `PORT` | پورت سرور | `3000` |
| `LIVEKIT_API_KEY` | کلید API برای ویس چت | — |
| `LIVEKIT_API_SECRET` | رمز API برای ویس چت | — |
| `LIVEKIT_URL` | آدرس سرور LiveKit (ویس چت) | `wss://...` |
