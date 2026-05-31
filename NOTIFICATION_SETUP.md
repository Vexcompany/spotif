## XVII — Notification System Setup Guide

### 📋 Quick Overview

Kami sudah mengimplementasikan **Push Notification System** lengkap dengan:
- ✅ Admin Panel untuk mengirim notifikasi custom
- ✅ Service Worker untuk background notifications
- ✅ MongoDB database untuk tracking
- ✅ Clean URLs tanpa /index.html

---

### 🔐 Setup Steps

#### **1. Generate VAPID Keys (Required)**

```bash
# Install web-push CLI
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output akan seperti:
# Public Key: ...
# Private Key: ...
```

Copy kedua key tersebut ke `.env` file Anda.

#### **2. Setup Environment Variables**

**Backend (.env di Verolyz)**
```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spotif

# Web Push
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com

# Admin
ADMIN_TOKEN=your_super_secret_token_here

# Server
NODE_ENV=production
PORT=3000
```

**Frontend (.env di Spotif)**
```bash
REACT_APP_BACKEND_URL=https://your-backend-domain.vercel.app
REACT_APP_NOTIFICATION_API_URL=https://your-backend-domain.vercel.app/api
```

#### **3. Install Dependencies**

**Backend (Verolyz)**
```bash
npm install express cors dotenv mongoose web-push
npm install --save-dev nodemon
```

**Frontend (Spotif)**
- Sudah ada di React project

#### **4. Register Service Worker**

Tambahkan di `public/index.html` atau `App.jsx`:

```html
<!-- Di </head> -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1DB954">

<!-- Di </body> sebelum closing tag -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.error('Service Worker error:', err));
  }
</script>
```

#### **5. Deploy & Test**

**Backend Deploy (Vercel)**
```bash
# Push ke GitHub
git add .
git commit -m "Add notification system"
git push origin main

# Vercel akan auto-deploy
# Verify di: https://your-backend.vercel.app/health
```

**Frontend Deploy**
```bash
# Push ke GitHub
git add .
git commit -m "Add notification UI and routing"
git push origin main

# Vercel akan auto-deploy
# Test di: https://music.pagaska.my.id/home
```

---

### 🎯 Usage Guide

#### **For Users: Enable Notifications**

Users dapat meng-enable notifikasi di settings:

```javascript
// Dalam App.jsx atau settings page
import NotificationSettings from './components/NotificationSettings';

function App() {
  return (
    <div>
      <NotificationSettings />
    </div>
  );
}
```

#### **For Admin: Send Notifications**

1. Akses **https://music.pagaska.my.id/admin**
2. Masukkan Admin Token
3. Tulis judul dan pesan
4. Klik "Kirim ke Semua User"

---

### 📊 API Endpoints

#### **Admin Endpoints (Require Admin Token)**

```bash
# Send notification to all users
POST /api/notifications/send
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "title": "Fitur Baru!",
  "body": "Playlist generator sudah tersedia",
  "icon": "/logo-512x512.png",
  "requireInteraction": false
}

# Get notification history
GET /api/notifications/history?limit=50&skip=0
Authorization: Bearer YOUR_ADMIN_TOKEN

# Delete notification
DELETE /api/notifications/:notificationId
Authorization: Bearer YOUR_ADMIN_TOKEN
```

#### **User Endpoints**

```bash
# Get VAPID public key
GET /api/notifications/public-key

# Subscribe to notifications
POST /api/notifications/subscribe
{
  "subscription": { /* PushSubscription object */ }
}

# Unsubscribe
POST /api/notifications/unsubscribe
{
  "subscription": { /* PushSubscription object */ }
}

# Mark as read
POST /api/notifications/mark-read
{
  "notificationId": "...",
  "userId": "user-id"
}
```

---

### 🛠️ File Structure

**Backend (Verolyz)**
```
verolyz/
├── index.js                    # Main server
├── api/
│   └── notifications.js        # Notification routes
├── models/
│   └── Notification.js         # MongoDB schema
├── .env                        # Environment variables
├── vercel.json                 # Vercel config
└── package.json
```

**Frontend (Spotif)**
```
spotif/
├── public/
│   ├── index.html
│   ├── admin.html              # Admin panel
│   ├── service-worker.js       # Background worker
│   └── manifest.json           # PWA manifest
├── src/
│   ├── components/
│   │   ├── NotificationSettings.jsx
│   │   └── NotificationSettings.css
│   └── services/
│       └── notificationService.js
├── vercel.json                 # URL routing config
└── App.jsx
```

---

### 🔄 Clean URL Setup (No /index.html)

Vercel `vercel.json` sudah konfigurasi untuk:

- ✅ `https://music.pagaska.my.id/home` → `/home.html`
- ✅ `https://music.pagaska.my.id/beranda` → `/beranda.html`
- ✅ `https://music.pagaska.my.id/admin` → `/admin.html`
- ✅ `https://music.pagaska.my.id/` → `/index.html`

Tidak perlu setup tambahan!

---

### 🐛 Troubleshooting

**Problem: Service Worker tidak register**
```javascript
// Pastikan di public folder, bukan src/
// public/service-worker.js (BENAR)
// src/service-worker.js (SALAH)
```

**Problem: Notification tidak terkirim**
```bash
# Check:
1. VAPID keys sudah benar
2. MongoDB connected
3. Admin token benar
4. User sudah subscribe
```

**Problem: Admin token error**
```bash
# Generate baru
# Gunakan: https://www.uuidgenerator.net/
# Atau: openssl rand -hex 32
```

---

### 📝 Example Admin Request (cURL)

```bash
curl -X POST https://your-backend.vercel.app/api/notifications/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎵 Playlist Trending Minggu Ini",
    "body": "Dengarkan lagu-lagu terbaru yang sedang viral",
    "icon": "/logo-512x512.png",
    "requireInteraction": false
  }'
```

---

### 🎨 Customize Admin Panel

Edit `public/admin.html` untuk customize:
- Warna & styling
- Validasi form
- Notifikasi response

---

### 📦 Browser Support

Push Notifications bekerja di:
- ✅ Chrome/Edge 50+
- ✅ Firefox 44+
- ✅ Safari 16+
- ⚠️ Safari 15 dan lebih lama (limited)
- ❌ IE (tidak support)

---

### 🚀 Next Steps

1. ✅ Implementasi notification system ini
2. ⬜ Tambah analytics untuk track notification stats
3. ⬜ Implement scheduling (kirim notif di waktu tertentu)
4. ⬜ Add template system untuk notifikasi berbeda

---

**Made with 🔔 by Vexcompany**
