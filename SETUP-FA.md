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

### 5. راه‌اندازی ویس چت (LiveKit)

برای فعال کردن **ویس چت** در پروژه، نیاز به یک حساب **دوم** در Railway داری. چون هر حساب Railway محدودیت **۵ سرویس** دارد و پروژه Watch Party با PostgreSQL دو سرویس رو اشغال کرده. پس:

#### قدم اول: یک حساب دوم در Railway بساز

```bash
۱. یک ایمیل دیگر (یا اکانت گوگل دیگر) بردار.
۲. برو به https://railway.app و ثبت‌نام کن.
۳. در این حساب جدید یک پروژه بساز.
۴. گزینه New → Template را انتخاب کن.
۵. عبارت LiveKit را جستجو و انتخاب کن. (این کار باعث ایجاد سرویس LiveKit و Redis می‌شود.)
```

#### قدم دوم: دریافت اطلاعات LiveKit

```bash
۱. به پروژه LiveKit در حساب دوم برو.
۲. متغیرهای LIVEKIT_API_KEY و LIVEKIT_API_SECRET را از بخش Variables کپی کن.
۳. از بخش Settings → Networking سرویس LiveKit یک Public Domain دریافت کن
   (مثل: wss://livekit-xyz.up.railway.app).
```

#### قدم سوم: تنظیم متغیرها در حساب اصلی (Watch Party)

به حساب اول (پروژه اصلی Watch Party) برگرد و در بخش Variables موارد زیر را اضافه کن:

```env
# LiveKit (ویس چت)
LIVEKIT_API_KEY=          # مقداری که از حساب دوم کپی کردی
LIVEKIT_API_SECRET=       # مقداری که از حساب دوم کپی کردی
LIVEKIT_URL=wss://livekit-xyz.up.railway.app  # آدرس عمومی LiveKit
```

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
