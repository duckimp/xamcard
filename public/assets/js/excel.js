/**
 * XamCard - Excel Import & Data Management Module
 */

window.ExcelModule = {
  students: [],
  photosMap: new Map(), // key: NISN or filename -> val: base64 data URL
  searchQuery: '',
  filterClass: 'all',
  filterPhoto: 'all',

  init() {
    this.bindEvents();
    this.loadSampleData();
  },

  bindEvents() {
    const excelFileInput = document.getElementById('excelFileInput');
    const dropzone = document.getElementById('excelDropzone');
    const btnDummy = document.getElementById('btnDownloadDummy');
    const photoFileInput = document.getElementById('photoFileInput');
    const photoZipInput = document.getElementById('photoZipInput');

    const searchInput = document.getElementById('inputSearchStudent');
    const filterClassSelect = document.getElementById('selectFilterTableClass');
    const filterPhotoSelect = document.getElementById('selectFilterTablePhoto');

    if (excelFileInput) {
      excelFileInput.addEventListener('change', (e) => this.handleExcelFile(e.target.files[0]));
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (!file) return;

        // Tolak file bukan Excel saat di-drop
        const validExts = /\.(xlsx|xls|csv)$/i;
        const validTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv'
        ];
        if (!validExts.test(file.name) && !validTypes.includes(file.type)) {
          alert(`File "${file.name}" bukan file Excel!\nGunakan format .xlsx atau .xls`);
          return;
        }

        this.handleExcelFile(file);
      });
    }

    if (btnDummy) {
      btnDummy.addEventListener('click', () => this.downloadDummyExcel());
    }

    if (photoFileInput) {
      photoFileInput.addEventListener('change', (e) => this.handleBatchPhotos(e.target.files));
    }

    if (photoZipInput) {
      photoZipInput.addEventListener('change', (e) => this.handleZipPhotos(e.target.files[0]));
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderStudentTable();
      });
    }

    if (filterClassSelect) {
      filterClassSelect.addEventListener('change', (e) => {
        this.filterClass = e.target.value;
        this.renderStudentTable();
      });
    }

    if (filterPhotoSelect) {
      filterPhotoSelect.addEventListener('change', (e) => {
        this.filterPhoto = e.target.value;
        this.renderStudentTable();
      });
    }
  },

  handleExcelFile(file) {
    if (!file) return;

    // Validasi tipe file - hanya terima .xlsx, .xls, .csv
    const validExts = /\.(xlsx|xls|csv)$/i;
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!validExts.test(file.name) && !validTypes.includes(file.type)) {
      alert('Format file tidak valid! Gunakan file .xlsx atau .xls dari Excel.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          alert('File Excel kosong atau format tidak sesuai!');
          return;
        }

        this.processExcelData(jsonData);
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel! Pastikan format file .xlsx atau .xls valid.');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  processExcelData(rows) {
    this.students = rows.map((row, index) => {
      // Flexible Header Mapping
      const getVal = (possibleKeys) => {
        for (let key of possibleKeys) {
          const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
          if (matchedKey && row[matchedKey] !== undefined) return String(row[matchedKey]).trim();
        }
        return '';
      };

      const nisn = getVal(['nisn', 'nis', 'no_induk', 'id_siswa']) || `100${index + 1}`;
      const nama = getVal(['nama', 'nama_siswa', 'nama_lengkap', 'name']) || `Siswa ${index + 1}`;
      const kelas = getVal(['kelas', 'rombel', 'tingkat', 'class']) || 'X';
      const ruang = getVal(['ruang', 'ruangan', 'room', 'no_ruang']) || 'R-01';
      const noPeserta = getVal(['no_peserta', 'nopes', 'nomor_peserta', 'username']) || `UJ-2026-${String(index + 1).padStart(3, '0')}`;
      const fotoName = getVal(['foto', 'file_foto', 'gambar', 'photo']) || `${nisn}.jpg`;

      return {
        id: index + 1,
        nisn,
        nama,
        kelas,
        ruang,
        noPeserta,
        fotoName,
        photoData: this.photosMap.get(nisn) || this.photosMap.get(fotoName) || ''
      };
    });

    this.updateStats();
    this.renderStudentTable();
    if (window.PrintModule) window.PrintModule.updateStudentCount();
    
    // Notification
    const alertBox = document.getElementById('excelStatusAlert');
    if (alertBox) {
      alertBox.className = 'alert alert-success';
      alertBox.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Berhasil mengimpor <strong>${this.students.length}</strong> data siswa dari Excel!</span>`;
      alertBox.style.display = 'flex';
    }
  },

  renderStudentTable() {
    const tbody = document.getElementById('studentTableBody');
    const elCount = document.getElementById('studentTableCount');
    if (!tbody) return;

    let filtered = this.students.filter(s => {
      // Search filter across Nama, NISN, No. Peserta
      if (this.searchQuery) {
        const q = this.searchQuery;
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchNisn = s.nisn.toLowerCase().includes(q);
        const matchNoPeserta = s.noPeserta.toLowerCase().includes(q);
        if (!matchNama && !matchNisn && !matchNoPeserta) return false;
      }

      // Class filter
      if (this.filterClass !== 'all' && s.kelas !== this.filterClass) {
        return false;
      }

      // Photo filter
      if (this.filterPhoto === 'with_photo' && !s.photoData) return false;
      if (this.filterPhoto === 'no_photo' && !!s.photoData) return false;

      return true;
    });

    if (elCount) {
      elCount.textContent = `Menampilkan ${filtered.length} dari ${this.students.length} siswa`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada data siswa yang cocok dengan pencarian / filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const photoSrc = s.photoData || 'assets/images/default-avatar.svg';
      return `
        <tr>
          <td><img src="${photoSrc}" class="photo-thumb" alt="Foto ${s.nama}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'36\' height=\'48\' viewBox=\'0 0 36 48\' fill=\'%23cbd5e1\'><rect width=\'36\' height=\'48\' fill=\'%23e2e8f0\'/><text x=\'50%\' y=\'55%\' font-size=\'10\' text-anchor=\'middle\' fill=\'%2364748b\'>FOTO</text></svg>'"></td>
          <td><strong>${s.noPeserta}</strong></td>
          <td>${s.nisn}</td>
          <td><strong>${s.nama}</strong></td>
          <td><span class="badge" style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-weight:600;">${s.kelas}</span></td>
          <td>${s.ruang}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="ExcelModule.editStudent(${s.id})" title="Edit Data">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="ExcelModule.deleteStudent(${s.id})" title="Hapus Data">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  updateStats() {
    const elTotal = document.getElementById('statTotalStudents');
    const elWithPhoto = document.getElementById('statWithPhoto');
    const selectClass = document.getElementById('selectFilterTableClass');

    if (elTotal) elTotal.textContent = this.students.length;
    if (elWithPhoto) {
      const count = this.students.filter(s => !!s.photoData).length;
      elWithPhoto.textContent = count;
    }

    if (selectClass) {
      const classes = Array.from(new Set(this.students.map(s => s.kelas).filter(Boolean)));
      selectClass.innerHTML = `<option value="all">Semua Kelas (${this.students.length})</option>` + 
        classes.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  },

  handleBatchPhotos(files) {
    if (!files || files.length === 0) return;

    // Filter hanya file gambar yang valid
    const imageFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const validExts = /\.(jpg|jpeg|png|webp|gif)$/i;
      return validTypes.includes(file.type) || validExts.test(file.name);
    });

    if (imageFiles.length === 0) {
      alert('Tidak ada file gambar yang valid! Pastikan file berformat JPG, PNG, atau WebP.');
      return;
    }

    if (imageFiles.length < files.length) {
      console.warn(`[XamCard] ${files.length - imageFiles.length} file non-gambar dilewati.`);
    }

    let loadedCount = 0;
    imageFiles.forEach(file => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          // Compress & convert ke WebP via Canvas
          const maxW = 300, maxH = 400;
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
          const base64 = canvas.toDataURL(supportsWebP ? 'image/webp' : 'image/jpeg', 0.82);

          const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          this.photosMap.set(file.name, base64);
          this.photosMap.set(fileNameWithoutExt, base64);

          this.students.forEach(s => {
            if (s.nisn === fileNameWithoutExt || s.fotoName === file.name || s.fotoName === fileNameWithoutExt) {
              s.photoData = base64;
            }
          });

          loadedCount++;
          if (loadedCount === imageFiles.length) {
            this.renderStudentTable();
            this.updateStats();
            alert(`Berhasil memuat ${loadedCount} foto siswa!`);
          }
        };
        img.onerror = () => {
          loadedCount++;
          console.warn(`[XamCard] File bukan gambar valid: ${file.name}`);
          if (loadedCount === imageFiles.length) {
            this.renderStudentTable();
            this.updateStats();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  handleZipPhotos(zipFile) {
    if (!zipFile) return;

    // Validasi harus file ZIP
    const validZipExts = /\.(zip)$/i;
    const validZipTypes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
    if (!validZipExts.test(zipFile.name) && !validZipTypes.includes(zipFile.type)) {
      alert(`File "${zipFile.name}" bukan file ZIP!\nGunakan file .zip berisi foto siswa.`);
      return;
    }

    if (typeof JSZip === 'undefined') {
      alert('Library JSZip tidak tersedia!');
      return;
    }

    JSZip.loadAsync(zipFile).then(zip => {
      let imagePromises = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(jpg|jpeg|png|webp)$/i.test(zipEntry.name)) {
          const fileName = zipEntry.name.split('/').pop();
          const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));

          const promise = zipEntry.async('uint8array').then(uint8Data => {
            return new Promise((resolve) => {
              // Buat blob dari data ZIP, lalu compress via Canvas
              const ext = fileName.split('.').pop().toLowerCase();
              const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
              const blob = new Blob([uint8Data], { type: mime });
              const blobUrl = URL.createObjectURL(blob);

              const img = new Image();
              img.onload = () => {
                const maxW = 300, maxH = 400;
                const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.width * ratio);
                canvas.height = Math.round(img.height * ratio);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
                const dataUrl = canvas.toDataURL(supportsWebP ? 'image/webp' : 'image/jpeg', 0.82);

                URL.revokeObjectURL(blobUrl);

                this.photosMap.set(fileName, dataUrl);
                this.photosMap.set(fileNameWithoutExt, dataUrl);

                this.students.forEach(s => {
                  if (s.nisn === fileNameWithoutExt || s.fotoName === fileName || s.fotoName === fileNameWithoutExt) {
                    s.photoData = dataUrl;
                  }
                });
                resolve();
              };
              img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(); };
              img.src = blobUrl;
            });
          });
          imagePromises.push(promise);
        }
      });

      if (imagePromises.length === 0) {
        alert('Tidak ada foto valid di dalam ZIP!\nPastikan ZIP berisi file .jpg, .jpeg, .png, atau .webp');
        return;
      }

      Promise.all(imagePromises).then(() => {
        this.renderStudentTable();
        this.updateStats();
        alert(`Berhasil mengekstrak & mengkompresi ${imagePromises.length} foto dari file ZIP!`);
      });
    }).catch(err => {
      console.error(err);
      alert('Gagal membaca file ZIP! Pastikan file tidak rusak dan berformat .zip');
    });
  },

  downloadDummyExcel() {
    const dummyData = [
      { NO_PESERTA: 'UJ-2026-001', NISN: '0081234501', NAMA: 'Ahmad Rizky Pratama', KELAS: 'XII MIPA 1', RUANG: 'Ruang 01' },
      { NO_PESERTA: 'UJ-2026-002', NISN: '0081234502', NAMA: 'Siti Nurhaliza', KELAS: 'XII MIPA 1', RUANG: 'Ruang 01' },
      { NO_PESERTA: 'UJ-2026-003', NISN: '0081234503', NAMA: 'Budi Santoso', KELAS: 'XII MIPA 1', RUANG: 'Ruang 01' },
      { NO_PESERTA: 'UJ-2026-004', NISN: '0081234504', NAMA: 'Dewi Lestari', KELAS: 'XII IPS 1', RUANG: 'Ruang 02' },
      { NO_PESERTA: 'UJ-2026-005', NISN: '0081234505', NAMA: 'Eko Prasetyo', KELAS: 'XII IPS 1', RUANG: 'Ruang 02' },
      { NO_PESERTA: 'UJ-2026-006', NISN: '0081234506', NAMA: 'Fani Fitriani', KELAS: 'XII IPS 2', RUANG: 'Ruang 03' },
      { NO_PESERTA: 'UJ-2026-007', NISN: '0081234507', NAMA: 'Gilang Ramadhan', KELAS: 'XII IPS 2', RUANG: 'Ruang 03' },
      { NO_PESERTA: 'UJ-2026-008', NISN: '0081234508', NAMA: 'Hana Maria', KELAS: 'XII IPS 2', RUANG: 'Ruang 03' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DataSiswa');
    XLSX.writeFile(workbook, 'Template_Data_Siswa_XamCard.xlsx');
  },

  loadSampleData() {
    // Default 4 dummy items if none uploaded
    const sample = [
      { id: 1, noPeserta: 'UJ-2026-001', nisn: '0081234501', nama: 'Ahmad Rizky Pratama', kelas: 'XII MIPA 1', ruang: 'Ruang 01', fotoName: '0081234501.jpg', photoData: '' },
      { id: 2, noPeserta: 'UJ-2026-002', nisn: '0081234502', nama: 'Siti Nurhaliza', kelas: 'XII MIPA 1', ruang: 'Ruang 01', fotoName: '0081234502.jpg', photoData: '' },
      { id: 3, noPeserta: 'UJ-2026-003', nisn: '0081234503', nama: 'Budi Santoso', kelas: 'XII MIPA 2', ruang: 'Ruang 02', fotoName: '0081234503.jpg', photoData: '' },
      { id: 4, noPeserta: 'UJ-2026-004', nisn: '0081234504', nama: 'Dewi Lestari', kelas: 'XII IPS 1', ruang: 'Ruang 03', fotoName: '0081234504.jpg', photoData: '' }
    ];
    this.students = sample;
    this.renderStudentTable();
    this.updateStats();
  },

  editStudent(id) {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editNoPeserta').value = student.noPeserta || '';
    document.getElementById('editNisn').value = student.nisn || '';
    document.getElementById('editNama').value = student.nama || '';
    document.getElementById('editKelas').value = student.kelas || '';
    document.getElementById('editRuang').value = student.ruang || '';

    const modal = document.getElementById('editStudentModal');
    if (modal) modal.style.display = 'flex';
  },

  closeEditModal() {
    const modal = document.getElementById('editStudentModal');
    if (modal) modal.style.display = 'none';
  },

  saveStudentEdit() {
    const id = parseInt(document.getElementById('editStudentId').value);
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    student.noPeserta = document.getElementById('editNoPeserta').value.trim();
    student.nisn = document.getElementById('editNisn').value.trim();
    student.nama = document.getElementById('editNama').value.trim();
    student.kelas = document.getElementById('editKelas').value.trim();
    student.ruang = document.getElementById('editRuang').value.trim();

    this.renderStudentTable();
    this.updateStats();
    if (window.DesignerModule) window.DesignerModule.renderPreview();
    if (window.PrintModule) window.PrintModule.updateStudentCount();

    this.closeEditModal();
  },

  deleteStudent(id) {
    if (confirm('Hapus siswa ini?')) {
      this.students = this.students.filter(s => s.id !== id);
      this.renderStudentTable();
      this.updateStats();
      if (window.DesignerModule) window.DesignerModule.renderPreview();
      if (window.PrintModule) window.PrintModule.updateStudentCount();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => window.ExcelModule.init());
