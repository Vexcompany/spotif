/**
 * _lib/db.js
 * Database AUTH Pagaska — digunakan oleh login.html
 * Struktur: Map() untuk server, window.PAGASKA_DB untuk browser
 */

const users = new Map();
const chats = new Map();

const pagaskaGenerations = {
  1: [
    { nama: "Ryan Yazid Hidayat", jabatan: "Ketua Umum" },
    { nama: "Sekar Rutikasari", jabatan: "Wakil Ketua Umum" },
    { nama: "Hudaifa Uli Aibab", jabatan: "Sekretaris" },
    { nama: "Rebyola Putri Yulianti", jabatan: "Bendahara" },
    { nama: "Rehan Raiszaki Muhfroni", jabatan: "Koor GK3" },
    { nama: "Yasir Isa", jabatan: "GK3" },
    { nama: "William Cristian Josepa", jabatan: "GK3" },
    { nama: "Dina Tri Handayani", jabatan: "GK3" },
    { nama: "Marsela Evi Novitasari", jabatan: "GK3" },
    { nama: "Maina Wulansari", jabatan: "Koor Disarda" },
    { nama: "Renata Putri Aurellia", jabatan: "Disarda" },
    { nama: "Dwi Yuliana Saputri", jabatan: "Disarda" },
    { nama: "Denis Putri Yuliana", jabatan: "Disarda" },
    { nama: "Ilham Bekti Pratama", jabatan: "Disarda" },
    { nama: "Nataly Reva Ayu Pradifa", jabatan: "Disarda" },
    { nama: "Amanda Amelia W", jabatan: "Disarda" },
    { nama: "Asiva Rizky Ayustin", jabatan: "Disarda" },
    { nama: "Rizky Aditya", jabatan: "Koor Infokom" },
    { nama: "Nisrina Kirana Alya", jabatan: "Infokom" },
    { nama: "Amanda Fidda Reza Azzahara", jabatan: "Infokom" },
    { nama: "Salma Murni Indianissa", jabatan: "Infokom" },
    { nama: "Zitkanisa Ulina", jabatan: "Infokom" }
  ],
  2: [
    { nama: "Rizky Indra Permana", jabatan: "Ketua Umum" },
    { nama: "Dwi Bella Noviyanti", jabatan: "Wakil Ketua Umum" },
    { nama: "Anastasya Putri Gianto", jabatan: "Sekretaris" },
    { nama: "Khofifah Tabina Azka Listianingtyas", jabatan: "Bendahara" },
    { nama: "Satria Nur Hidayatullah", jabatan: "DTP" },
    { nama: "Reyna Natasya Wahyu Safitri", jabatan: "DTP" },
    { nama: "Ramzy Cahya Fauzan", jabatan: "Koor GK3" },
    { nama: "Sapta Andika Riyanto", jabatan: "GK3" },
    { nama: "Farhan Rizky Devannanda", jabatan: "GK3" },
    { nama: "Keisya Nabila", jabatan: "GK3" },
    { nama: "Tata Regita Juliana Putri", jabatan: "Koor Disarda" },
    { nama: "Amanda Regina Putri Yudithira", jabatan: "Disarda" },
    { nama: "Ailen Listiani", jabatan: "Disarda" },
    { nama: "Lael Rahmadhani", jabatan: "Disarda" },
    { nama: "Dea Alif Purwandini", jabatan: "Disarda" },
    { nama: "Rizky Dava Mahendra", jabatan: "Disarda" },
    { nama: "Alan Pratama", jabatan: "Disarda" },
    { nama: "Yohanes David Adhienarta Putra", jabatan: "Disarda" },
    { nama: "Aditya Dwi Pratama", jabatan: "Disarda" },
    { nama: "Alfarel Belva Falarossy", jabatan: "Disarda" },
    { nama: "Giovanni Adhi Pratama", jabatan: "Koor Infokom" },
    { nama: "Desy Ariana Putri", jabatan: "Infokom" },
    { nama: "Yusilla Anggun Vauli", jabatan: "Infokom" },
    { nama: "Alisya Desvita Putri", jabatan: "Infokom" }
  ],
  3: [
    { nama: "Muhammad Afrizal Nurjananta", jabatan: "Ketua Umum" },
    { nama: "Fatimah Az-Zahra", jabatan: "Wakil Ketua Umum" },
    { nama: "Nazwa Qurroti Aqyuni Hasna", jabatan: "Sekretaris" },
    { nama: "Asyifa Najwa Nabilla Putri", jabatan: "Sekretaris" },
    { nama: "Eva Devi Setyorini", jabatan: "Bendahara" },
    { nama: "Minni Lestari Arti Ningsih", jabatan: "Bendahara" },
    { nama: "Yoga Prasetyo Wibowo", jabatan: "DTP" },
    { nama: "Lelly Anggraini", jabatan: "DTP" },
    { nama: "Fahri Lintang Saputra", jabatan: "Koor GK3" },
    { nama: "Clarinta Jida Valery", jabatan: "GK3" },
    { nama: "Nur Azizah Lailatul Munawaroh", jabatan: "GK3" },
    { nama: "Violetta Ayu Wardani", jabatan: "GK3" },
    { nama: "Aymel Oktavia Fitroh Masyaroh", jabatan: "GK3" },
    { nama: "Suci Rofiqoh", jabatan: "Koor Disarda" },
    { nama: "Nabila Kayyisa Putri", jabatan: "Disarda" },
    { nama: "Rolly Sadion Aryani", jabatan: "Disarda" },
    { nama: "Subhanifa Dwi Yerbatyani", jabatan: "Disarda" },
    { nama: "Mariska Cahya Dwi Maulida", jabatan: "Disarda" },
    { nama: "Jahra Anasula Farianto", jabatan: "Disarda" },
    { nama: "Ella Rahmadani Elliana", jabatan: "Disarda" },
    { nama: "Silvia Nur Ramadhani", jabatan: "Disarda" },
    { nama: "Adly Surya Prasetiyo", jabatan: "Disarda" },
    { nama: "Meysa Desta Maharani", jabatan: "Disarda" },
    { nama: "Richy Yuga Tri Finalya", jabatan: "Koor Infokom" },
    { nama: "Anisa Apriliana Tunggal Dewi", jabatan: "Infokom" },
    { nama: "Bhilqis Tian Zahrotushita", jabatan: "Infokom" },
    { nama: "Az Zahrah Khanza Dewi Kuwais", jabatan: "Infokom" },
    { nama: "Nindia Artita Lestari", jabatan: "Infokom" },
    { nama: "Fahrel Akbar", jabatan: "Infokom" },
    { nama: "Janathan Hafiz Nugroho", jabatan: "Infokom" }
  ],
  4: [
    { nama: "Putri", jabatan: "Anggota", tipe: "gratis" },
    { nama: "Mariska", jabatan: "Anggota", tipe: "gratis" },
    { nama: "Yolanda", jabatan: "Anggota", tipe: "gratis" }
  ]
};

[1, 2, 3].forEach(gen => {
  pagaskaGenerations[gen].forEach((user, idx) => {
    const id = `gen${gen}_${idx}`;
    users.set(id, {
      id,
      nama:      user.nama,
      jabatan:   user.jabatan,
      generasi:  gen,
      tipe:      'jabatan',
      createdAt: new Date().toISOString(),
    });
  });
});

pagaskaGenerations[4].forEach((user, idx) => {
  const id = `gen4_${idx}`;
  users.set(id, {
    id,
    nama:      user.nama,
    jabatan:   user.jabatan,
    generasi:  4,
    tipe:      'gratis',
    createdAt: new Date().toISOString(),
  });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    users,
    chats,
    pagaskaGenerations,

    findUserByCredentials(nama, jabatan, generasi) {
      for (const [, user] of users) {
        if (user.generasi !== parseInt(generasi)) continue;
        if (
          user.nama.toLowerCase()    === nama.toLowerCase() &&
          user.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) return user;
      }
      return null;
    },

    registerUser(nama, jabatan, generasi) {
      const gen = parseInt(generasi);
      for (const [, u] of users) {
        if (
          u.generasi === gen &&
          u.nama.toLowerCase()    === nama.toLowerCase() &&
          u.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) return { ok: false, message: 'Sudah terdaftar' };
      }
      const id = `reg_${Date.now()}`;
      users.set(id, {
        id,
        nama,
        jabatan,
        generasi: gen,
        tipe:     'anggota_baru',
        createdAt: new Date().toISOString(),
      });
      return { ok: true, user: users.get(id) };
    },

    getAllUsers() {
      return [...users.values()];
    },

    saveChat(userId, messages) {
      const userChats = chats.get(userId) || [];
      const session = {
        id:        Date.now().toString(),
        userId,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      userChats.push(session);
      chats.set(userId, userChats);
      return session;
    },

    getUserChats(userId) {
      return chats.get(userId) || [];
    },

    deleteChat(userId, chatId) {
      const filtered = (chats.get(userId) || []).filter(c => c.id !== chatId);
      chats.set(userId, filtered);
      return true;
    },
  };
}

if (typeof window !== 'undefined') {
  window.PAGASKA_DB = {
    pagaskaGenerations,
    _extraUsers: JSON.parse(localStorage.getItem('pgsk_extra_users') || '[]'),

    findUserByCredentials(nama, jabatan, generasi) {
      const gen = parseInt(generasi);
      for (const u of (pagaskaGenerations[gen] || [])) {
        if (
          u.nama.toLowerCase()    === nama.toLowerCase() &&
          u.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) {
          return {
            id:       `gen${gen}_${u.nama.replace(/\s+/g,'_').toLowerCase()}`,
            nama:     u.nama,
            jabatan:  u.jabatan,
            generasi: gen,
            tipe:     u.tipe || 'jabatan',
          };
        }
      }
      for (const u of this._extraUsers) {
        if (
          u.generasi === gen &&
          u.nama.toLowerCase()    === nama.toLowerCase() &&
          u.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) return u;
      }
      return null;
    },

    registerUser(nama, jabatan, generasi) {
      const gen = parseInt(generasi);
      if (this.findUserByCredentials(nama, jabatan, gen)) {
        return { ok: false, message: 'Sudah terdaftar! Langsung masuk saja.' };
      }
      const newUser = {
        id:        `reg_${Date.now()}`,
        nama,
        jabatan,
        generasi:  gen,
        tipe:      'anggota_baru',
        createdAt: new Date().toISOString(),
      };
      this._extraUsers.push(newUser);
      localStorage.setItem('pgsk_extra_users', JSON.stringify(this._extraUsers));
      return { ok: true, user: newUser };
    },

    getAllUsers() {
      const built = [];
      for (const [gen, list] of Object.entries(pagaskaGenerations)) {
        list.forEach((u, i) => built.push({
          id:       `gen${gen}_${i}`,
          nama:     u.nama,
          jabatan:  u.jabatan,
          generasi: parseInt(gen),
          tipe:     u.tipe || 'jabatan',
        }));
      }
      return [...built, ...this._extraUsers];
    },
  };
    }
