# 🎵 Spotif - Spotify Music Exploration Platform

> A modern, interactive web application for discovering and exploring Spotify music with a beautiful and intuitive user interface.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-3178c6?logo=vercel&style=flat-square)](https://spotif-mocha.vercel.app)
[![Repository](https://img.shields.io/badge/Repository-GitHub-000000?logo=github&style=flat-square)](https://github.com/Vexcompany/spotif)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## ✨ Features

- 🎶 **Search Spotify Music** - Cari lagu, artis, dan album favorit Anda dengan mudah
- 📊 **Music Exploration** - Jelajahi berbagai genre dan playlist yang tersedia
- 🎨 **Modern UI/UX** - Desain antarmuka yang sleek dan responsif
- ⚡ **Fast Performance** - Loading cepat dengan optimasi performa
- 📱 **Mobile Friendly** - Bekerja sempurna di semua ukuran layar
- 🔍 **Advanced Search** - Filter dan sort hasil pencarian sesuai preferensi

---

## 🚀 Tech Stack

| Teknologi | Deskripsi |
|-----------|-----------|
| **JavaScript** | 51.2% - Logic dan interaktivitas aplikasi |
| **HTML** | 48.8% - Struktur dan markup halaman |
| **CSS** | Styling dan responsive design |
| **Vercel** | Deployment platform |

---

## 📋 Prerequisites

Sebelum memulai, pastikan Anda sudah memiliki:

- Node.js (v14 atau lebih tinggi)
- npm atau yarn
- Akun GitHub
- (Optional) Spotify Developer Account untuk API integration

---

## 🔧 Installation

### 1. Clone Repository
```bash
git clone https://github.com/Vexcompany/spotif.git
cd spotif
```

### 2. Install Dependencies
```bash
npm install
# atau
yarn install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env.local
```

Isi variabel environment yang diperlukan (Spotify API keys, dll)

### 4. Start Development Server
```bash
npm start
# atau
yarn dev
```

Aplikasi akan berjalan di `http://localhost:3000`

---

## 📚 Usage

### Pencarian Musik
1. Buka aplikasi di browser
2. Gunakan search bar untuk mencari lagu, artis, atau album
3. Klik hasil pencarian untuk melihat detail lebih lanjut
4. Dengarkan preview lagu (jika tersedia)

### Navigasi
- **Home** - Tampilan utama dengan rekomendasi
- **Search** - Pencarian musik yang comprehensive
- **Favorites** - Simpan lagu favorit Anda
- **Playlists** - Kelola playlist Anda

---

## 🏗️ Project Structure

```
spotif/
├── public/              # File statis
├── src/
│   ├── components/      # React/Web components
│   ├── pages/          # Halaman aplikasi
│   ├── styles/         # CSS files
│   ├── utils/          # Helper functions
│   ├── api/            # API integrations
│   └── App.js          # Entry point aplikasi
├── package.json        # Dependencies
└── README.md          # Dokumentasi
```

---

## 🔌 API Integration

Aplikasi ini terintegrasi dengan **Spotify Web API** untuk:
- Pencarian lagu, artis, dan album
- Mendapatkan detail musik
- Memutar preview audio

> **Catatan:** Pastikan Spotify API credentials sudah dikonfigurasi di `.env` file

---

## 🤝 Contributing

Kontribusi sangat diterima! Berikut langkah-langkahnya:

1. **Fork** repository ini
2. Buat branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan Anda (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka **Pull Request**

### Panduan Kontribusi
- Pastikan code mengikuti style guide yang ada
- Tambahkan test untuk fitur baru
- Update dokumentasi jika diperlukan
- Buat PR dengan deskripsi yang jelas

---

## 🐛 Bug Reports & Issues

Menemukan bug? Silakan buat issue di repository ini dengan:
- Deskripsi bug yang detail
- Steps untuk reproduce
- Expected vs actual behavior
- Screenshot atau video (jika perlu)

[Report a Bug](https://github.com/Vexcompany/spotif/issues/new)

---

## 📝 Roadmap

- [ ] Integrasi Spotify OAuth login
- [ ] Fitur playlist creation & management
- [ ] Dark mode theme
- [ ] Offline mode
- [ ] Mobile app (React Native)
- [ ] Social sharing features
- [ ] Recommendations engine
- [ ] Analytics dashboard

---

## 📄 License

Proyek ini dilisensikan di bawah **MIT License** - lihat file [LICENSE](LICENSE) untuk detailnya.

---

## 👥 Author

**Vexcompany**
- GitHub: [@Vexcompany](https://github.com/Vexcompany)
- Repository: [spotif](https://github.com/Vexcompany/spotif)

---

## 🎯 Support

Jika Anda menemukan proyek ini bermanfaat:
- ⭐ Beri bintang di GitHub
- 🔔 Watch repository untuk update terbaru
- 💬 Share dengan komunitas

---

## 📞 Contact & Questions

Punya pertanyaan atau saran? Silakan:
- Buka [Discussion](https://github.com/Vexcompany/spotif/discussions)
- Buat [Issue](https://github.com/Vexcompany/spotif/issues)
- DM di GitHub

---

## 🙏 Acknowledgments

- Spotify Web API documentation
- Contributors dan community members
- Inspirasi dari music streaming platforms

---

**Made with ❤️ by Vexcompany**

[⬆ Back to top](#-spotif---spotify-music-exploration-platform)
