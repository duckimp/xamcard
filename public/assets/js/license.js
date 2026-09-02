/**
 * XamCard - Licensing & Anti-Piracy Activation Engine
 * Secret Salt Key: XAMCARD_SECRET_2026_SECURE_SALT
 */

const LicenseModule = {
  SECRET_KEY: "XAMCARD_SECRET_2026_SECURE_SALT",

  licenseData: {
    isActivated: false,
    npsn: '',
    schoolName: '',
    licenseKey: '',
    activatedAt: ''
  },

  init() {
    this.loadLicense();
    this.bindEvents();
    this.checkActivationStatus();
  },

  generateKey(npsn, schoolName) {
    const cleanNpsn = String(npsn || '').trim();
    const cleanName = String(schoolName || '').toUpperCase().trim().replace(/\s+/g, ' ');
    if (!cleanNpsn || !cleanName) return '';

    const rawInput = `${cleanNpsn}:${cleanName}:${this.SECRET_KEY}`;

    let hash1 = 5381;
    let hash2 = 0;
    for (let i = 0; i < rawInput.length; i++) {
      const char = rawInput.charCodeAt(i);
      hash1 = ((hash1 << 5) + hash1) ^ char;
      hash2 = ((hash2 << 7) - hash2) + char;
    }

    const hex1 = Math.abs(hash1).toString(16).padStart(8, '0').toUpperCase();
    const hex2 = Math.abs(hash2).toString(16).padStart(8, '0').toUpperCase();
    const combined = (hex1 + hex2).substring(0, 12);

    return `XAM-${combined.substring(0, 4)}-${combined.substring(4, 8)}-${combined.substring(8, 12)}`;
  },

  loadLicense() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('xamcard_license');
        if (saved) {
          this.licenseData = JSON.parse(saved);
        }
      }
    } catch (err) {
      console.warn('Load license warning:', err);
    }
  },

  saveLicense() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('xamcard_license', JSON.stringify(this.licenseData));
      }
    } catch (err) {
      console.warn('Save license warning:', err);
    }
  },

  activate(npsn, schoolName, licenseKey) {
    // Normalize input sebelum validasi — sama persis dengan generateKey
    const cleanNpsn     = String(npsn       || '').trim();
    const cleanName     = String(schoolName || '').toUpperCase().trim().replace(/\s+/g, ' ');
    const expectedKey   = this.generateKey(cleanNpsn, cleanName);
    const inputKey      = String(licenseKey || '').trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanNpsn || !cleanName) {
      return { success: false, message: 'NPSN dan Nama Sekolah tidak boleh kosong!' };
    }

    if (!inputKey || inputKey !== expectedKey) {
      return { success: false, message: 'Kode Lisensi Tidak Valid! Pastikan NPSN dan Nama Sekolah sama persis dengan yang dikirim via WhatsApp.' };
    }

    // Simpan data yang sudah dinormalisasi
    this.licenseData = {
      isActivated: true,
      npsn:        cleanNpsn,
      schoolName:  cleanName,
      licenseKey:  inputKey,
      activatedAt: new Date().toISOString()
    };

    this.saveLicense();

    // Lock School Name and NPSN in DesignerModule
    if (typeof window !== 'undefined' && window.DesignerModule) {
      window.DesignerModule.config.npsn = this.licenseData.npsn;
      window.DesignerModule.config.schoolName = this.licenseData.schoolName;
      window.DesignerModule.config.watermarkText = `Lisensi Resmi: ${this.licenseData.schoolName}`;
      window.DesignerModule.saveToLocalStorage();
      window.DesignerModule.renderPreview();
    }

    this.checkActivationStatus();
    return { success: true, message: 'Aktivasi Berhasil! Lisensi terikat secara permanen untuk sekolah ini.' };
  },

  checkActivationStatus() {
    if (typeof document === 'undefined') return false;

    const badge = document.getElementById('sidebarLicenseBadge');
    const alertBox = document.getElementById('licenseStatusAlert');
    const inputNpsn = document.getElementById('activateNpsn');
    const inputSchool = document.getElementById('activateSchoolName');
    const inputKey = document.getElementById('activateLicenseKey');
    
    // Validate current school settings against active license
    let active = false;
    if (this.licenseData.isActivated && this.licenseData.npsn && this.licenseData.schoolName) {
      const expectedKey = this.generateKey(this.licenseData.npsn, this.licenseData.schoolName);
      if (expectedKey === this.licenseData.licenseKey) {
        active = true;
      }
    }

    if (active) {
      if (inputNpsn && !inputNpsn.value) inputNpsn.value = this.licenseData.npsn;
      if (inputSchool && !inputSchool.value) inputSchool.value = this.licenseData.schoolName;
      if (inputKey && !inputKey.value) inputKey.value = this.licenseData.licenseKey;

      if (typeof window !== 'undefined' && window.DesignerModule) {
        window.DesignerModule.config.npsn = this.licenseData.npsn;
        window.DesignerModule.config.schoolName = this.licenseData.schoolName;
        window.DesignerModule.config.watermarkText = `Lisensi Resmi: ${this.licenseData.schoolName}`;
        window.DesignerModule.renderPreview();
      }
    }

    if (badge) {
      if (active) {
        badge.className = 'badge-license active';
        badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Lisensi Resmi (${this.licenseData.npsn})`;
      } else {
        badge.className = 'badge-license unactivated';
        badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Belum Teraktivasi`;
      }
    }

    if (alertBox) {
      if (active) {
        alertBox.className = 'alert alert-success';
        alertBox.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Aplikasi Teraktivasi Resmi untuk: <strong>${this.licenseData.schoolName}</strong> (NPSN: ${this.licenseData.npsn})</span>`;
      } else {
        alertBox.className = 'alert alert-warning';
        alertBox.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Aplikasi Belum Teraktivasi! Masukkan NPSN, Nama Sekolah, dan Kode Lisensi dari penjual untuk membuka fitur lisensi penuh.</span>`;
      }
    }

    return active;
  },

  bindEvents() {
    if (typeof document === 'undefined') return;
    const btnActivate = document.getElementById('btnSubmitActivation');
    if (btnActivate) {
      btnActivate.addEventListener('click', () => {
        const npsn = document.getElementById('activateNpsn').value;
        const schoolName = document.getElementById('activateSchoolName').value;
        const licenseKey = document.getElementById('activateLicenseKey').value;

        const res = this.activate(npsn, schoolName, licenseKey);
        alert(res.message);
      });
    }
  }
};

if (typeof window !== 'undefined') {
  window.LicenseModule = LicenseModule;
  document.addEventListener('DOMContentLoaded', () => window.LicenseModule.init());
}
if (typeof module !== 'undefined') {
  module.exports = LicenseModule;
}
