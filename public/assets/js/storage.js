/**
 * XamCard - IndexedDB Storage Engine
 * Persistent storage untuk data siswa + foto
 */

window.XamStorage = {
  DB_NAME: 'xamcard_db',
  DB_VERSION: 1,
  STORE_STUDENTS: 'students',
  db: null,

  // Buka / inisialisasi database
  open() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);

      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_STUDENTS)) {
          const store = db.createObjectStore(this.STORE_STUDENTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('nisn',      'nisn',      { unique: false });
          store.createIndex('kelas',     'kelas',     { unique: false });
          store.createIndex('noPeserta', 'noPeserta', { unique: false });
        }
      };

      req.onsuccess  = (e) => { this.db = e.target.result; resolve(this.db); };
      req.onerror    = (e) => reject(e.target.error);
    });
  },

  // Simpan semua siswa (replace semua)
  async saveAllStudents(students) {
    const db    = await this.open();
    const tx    = db.transaction(this.STORE_STUDENTS, 'readwrite');
    const store = tx.objectStore(this.STORE_STUDENTS);

    // Clear semua data lama
    await new Promise((res, rej) => {
      const clear = store.clear();
      clear.onsuccess = res;
      clear.onerror   = rej;
    });

    // Simpan satu per satu
    for (const student of students) {
      await new Promise((res, rej) => {
        const req = store.put({ ...student });
        req.onsuccess = res;
        req.onerror   = rej;
      });
    }

    return new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror    = rej;
    });
  },

  // Load semua siswa
  async loadAllStudents() {
    const db    = await this.open();
    const tx    = db.transaction(this.STORE_STUDENTS, 'readonly');
    const store = tx.objectStore(this.STORE_STUDENTS);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror   = (e) => reject(e.target.error);
    });
  },

  // Hapus semua data siswa
  async clearStudents() {
    const db    = await this.open();
    const tx    = db.transaction(this.STORE_STUDENTS, 'readwrite');
    const store = tx.objectStore(this.STORE_STUDENTS);
    return new Promise((res, rej) => {
      const req = store.clear();
      req.onsuccess = res;
      req.onerror   = rej;
    });
  },

  // Cek ukuran data tersimpan (estimasi)
  async getStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return {
        used:  Math.round(est.usage  / 1024 / 1024 * 100) / 100,
        quota: Math.round(est.quota  / 1024 / 1024 * 100) / 100,
        pct:   Math.round(est.usage  / est.quota * 100)
      };
    }
    return null;
  }
};
