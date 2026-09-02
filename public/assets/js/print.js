/**
 * XamCard - Mass Print Module
 */

window.PrintModule = {
  gridMode: 6, // 4, 6, 8 cards per A4 page
  filterClass: 'all',

  init() {
    this.bindEvents();
    this.updateStudentCount();
  },

  bindEvents() {
    const btnRenderPrint = document.getElementById('btnRenderPrint');
    const btnExecutePrint = document.getElementById('btnExecutePrint');
    const selectGrid = document.getElementById('selectGridMode');
    const selectClass = document.getElementById('selectFilterClass');
    const selectDesign = document.getElementById('selectCardDesign');

    if (btnRenderPrint) {
      btnRenderPrint.addEventListener('click', () => this.generatePrintPages());
    }

    if (btnExecutePrint) {
      btnExecutePrint.addEventListener('click', () => {
        window.print();
      });
    }

    if (selectGrid) {
      selectGrid.addEventListener('change', (e) => {
        this.gridMode = parseInt(e.target.value) || 6;
        this.generatePrintPages();
      });
    }

    if (selectClass) {
      selectClass.addEventListener('change', (e) => {
        this.filterClass = e.target.value;
        this.generatePrintPages();
      });
    }

    if (selectDesign) {
      selectDesign.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!window.DesignerModule) return;
        if (val.startsWith('preset_')) {
          window.DesignerModule.activeMode = 'preset';
          window.DesignerModule.selectedPreset = val.replace('preset_', '');
        } else {
          window.DesignerModule.activeMode = 'custom';
        }
        window.DesignerModule.saveToLocalStorage();
        this.generatePrintPages();
      });
    }
  },

  syncDesignSelector() {
    const selectDesign = document.getElementById('selectCardDesign');
    const selectGrid   = document.getElementById('selectGridMode');
    const gridLabel    = document.getElementById('gridModeLabel'); // optional label
    if (!selectDesign || !window.DesignerModule) return;

    const mode   = window.DesignerModule.activeMode;
    const preset = window.DesignerModule.selectedPreset;

    if (mode === 'custom') {
      selectDesign.value = 'custom';

      // Ambil perPage otomatis dari canvas size yang dipilih user
      const sz = window.DesignerModule.getActiveCanvasSize
        ? window.DesignerModule.getActiveCanvasSize()
        : { perPage: 8, cols: 2, rows: 4 };

      if (selectGrid) {
        selectGrid.value    = String(sz.perPage);
        selectGrid.disabled = true;
        selectGrid.title    = `Mode Custom: ${sz.cols}×${sz.rows} = ${sz.perPage} kartu/lembar (otomatis dari ukuran canvas)`;
        selectGrid.style.opacity = '0.5';
        selectGrid.style.cursor  = 'not-allowed';
      }
      this.gridMode = sz.perPage;
      this.customCols = sz.cols;

    } else {
      selectDesign.value = `preset_${preset}`;

      // Re-enable grid selector untuk mode preset
      if (selectGrid) {
        selectGrid.disabled = false;
        selectGrid.title    = '';
        selectGrid.style.opacity = '1';
        selectGrid.style.cursor  = 'default';
        // Kembalikan gridMode dari nilai selector yang tersimpan
        this.gridMode = parseInt(selectGrid.value) || 6;
      }
    }
  },

  updateStudentCount() {
    const students = window.ExcelModule ? window.ExcelModule.students : [];
    const elCount = document.getElementById('printStudentCount');
    const selectClass = document.getElementById('selectFilterClass');

    if (elCount) elCount.textContent = students.length;

    if (selectClass) {
      const classes = Array.from(new Set(students.map(s => s.kelas).filter(Boolean)));
      selectClass.innerHTML = `<option value="all">Semua Kelas (${students.length} Siswa)</option>` + 
        classes.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  },

  generatePrintPages() {
    const printArea = document.getElementById('printContainerArea');
    if (!printArea) return;

    this.syncDesignSelector();

    let students = window.ExcelModule ? window.ExcelModule.students : [];
    if (this.filterClass !== 'all') {
      students = students.filter(s => s.kelas === this.filterClass);
    }

    if (students.length === 0) {
      printArea.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b;">Tidak ada data siswa untuk dicetak.</div>`;
      return;
    }

    const cfg = window.DesignerModule ? window.DesignerModule.config : {};
    // Fallback: ambil schoolName/npsn dari localStorage jika cfg kosong
    if (!cfg.schoolName) {
      const saved = JSON.parse(localStorage.getItem('xamcard_config') || '{}');
      cfg.schoolName = saved.schoolName || '';
      if (!cfg.npsn) cfg.npsn = saved.npsn || '';
    }
    const mode = window.DesignerModule ? window.DesignerModule.activeMode : 'preset';
    const preset = window.DesignerModule ? window.DesignerModule.selectedPreset : 'minimal';

    printArea.innerHTML = '';
    const cardsPerPage = this.gridMode;
    const totalPages = Math.ceil(students.length / cardsPerPage);

    // Untuk mode custom, ambil dimensi kartu aktual
    let customCardW = null, customCardH = null, customCols = 2;
    if (mode === 'custom' && window.DesignerModule && window.DesignerModule.getActiveCanvasSize) {
      const sz = window.DesignerModule.getActiveCanvasSize();
      customCardW = sz.w; // mm
      customCardH = sz.h; // mm
      customCols  = sz.cols;
    }

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = `print-page grid-${cardsPerPage}`;

      // Untuk mode custom: override grid dengan dimensi aktual kartu
      if (mode === 'custom' && customCardW && customCardH) {
        pageDiv.style.gridTemplateColumns = `repeat(${customCols}, ${customCardW}mm)`;
        const rows = Math.ceil(cardsPerPage / customCols);
        pageDiv.style.gridTemplateRows = `repeat(${rows}, ${customCardH}mm)`;
      }

      const pageStudents = students.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage);

      // Dynamic Card Scaling Tokens based on grid mode
      let photoW = '65px', photoH = '86px';
      let headerPad = '6px 10px', bodyPad = '8px 10px', bodyGap = '10px';
      let schoolFont = '10.5px', examFont = '9px', infoFont = '10px', infoLineHeight = '1.4';
      let qrSize = 48, qrBoxW = '55px';

      if (cardsPerPage === 2) {
        photoW = '110px'; photoH = '146px';
        headerPad = '10px 16px'; bodyPad = '14px 18px'; bodyGap = '16px';
        schoolFont = '13px'; examFont = '11px'; infoFont = '12px'; infoLineHeight = '1.7';
        qrSize = 70; qrBoxW = '80px';
      } else if (cardsPerPage === 8) {
        photoW = '52px'; photoH = '69px';
        headerPad = '4px 8px'; bodyPad = '6px 8px'; bodyGap = '8px';
        schoolFont = '9px'; examFont = '8px'; infoFont = '8.5px'; infoLineHeight = '1.3';
        qrSize = 38; qrBoxW = '44px';
      } else if (cardsPerPage === 10) {
        photoW = '42px'; photoH = '56px';
        headerPad = '3px 6px'; bodyPad = '4px 6px'; bodyGap = '6px';
        schoolFont = '8.5px'; examFont = '7.5px'; infoFont = '7.5px'; infoLineHeight = '1.2';
        qrSize = 32; qrBoxW = '38px';
      } else if (cardsPerPage === 4) {
        photoW = '90px'; photoH = '120px';
        headerPad = '10px 14px'; bodyPad = '14px 16px'; bodyGap = '14px';
        schoolFont = '12px'; examFont = '10px'; infoFont = '11.5px'; infoLineHeight = '1.6';
        qrSize = 60; qrBoxW = '70px';
      }

      pageStudents.forEach((student, sIdx) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `printable-card preset-template-${preset}`;
        const qrId = `qr_code_${pageIdx}_${sIdx}`;

        if (mode === 'preset') {
          cardDiv.style.setProperty('--preset-color', cfg.primaryColor || '#2563eb');
          const logoImg = cfg.logoUrl ? `<img src="${cfg.logoUrl}" style="height: 32px; max-width: 40px; object-fit: contain;">` : '<div style="width:28px; height:28px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11H9z"/></svg></div>';
          const stampImg = cfg.stampUrl ? `<img src="${cfg.stampUrl}" style="height: 36px; max-width: 60px; object-fit: contain;">` : '';
          const photoImg = student.photoData || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'105\' viewBox=\'0 0 80 105\' fill=\'%23cbd5e1\'><rect width=\'80\' height=\'105\' fill=\'%23e2e8f0\'/><text x=\'50%\' y=\'50%\' font-size=\'10\' text-anchor=\'middle\' fill=\'%2364748b\'>FOTO 3x4</text></svg>';

          // =============================================
          // Build card HTML based on preset
          // =============================================
          if (preset === 'modern') {
            // MODERN: Full-color header bar, white body
            const licData = (window.LicenseModule && window.LicenseModule.licenseData && window.LicenseModule.licenseData.isActivated)
              ? window.LicenseModule.licenseData
              : (() => {
                  try {
                    const saved = JSON.parse(localStorage.getItem('xamcard_license') || '{}');
                    return saved.isActivated ? saved : null;
                  } catch(e) { return null; }
                })();
            const schoolDisplay = licData
              ? `${licData.schoolName} - ${licData.npsn}`
              : (cfg.schoolName ? `${cfg.schoolName}${cfg.npsn ? ' - ' + cfg.npsn : ''}` : '');
            const schoolLine = schoolDisplay
              ? `<div style="font-size:${schoolFont}; font-weight:800; text-transform:uppercase; letter-spacing:0.3px; white-space:normal; word-break:break-word;">${schoolDisplay}</div>`
              : '';
            cardDiv.innerHTML = `
              <div style="display:flex; align-items:center; gap:8px; padding:${headerPad}; background:${cfg.primaryColor || '#2563eb'}; color:#fff; flex-shrink:0; min-height:36px; overflow:visible;">
                ${logoImg}
                <div style="flex-grow:1; line-height:1.3; min-width:0;">
                  ${schoolLine}
                  <div style="font-size:${examFont}; font-weight:700; opacity:0.95; margin-top:2px;">${cfg.examTitle || 'KARTU PESERTA UJIAN'}</div>
                  ${cfg.academicYear ? `<div style="font-size:${examFont}; opacity:0.85; margin-top:1px;">${cfg.academicYear}</div>` : ''}
                </div>
              </div>
              <div style="display:flex; padding:${bodyPad}; gap:${bodyGap}; align-items:center; flex-grow:1;">
                <div style="width:${photoW}; height:${photoH}; border-radius:4px; border:2px solid ${cfg.primaryColor || '#2563eb'}; overflow:hidden; background:#f8fafc; flex-shrink:0;">
                  <img src="${photoImg}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex-grow:1; font-size:${infoFont}; line-height:${infoLineHeight}; color:#0f172a;">
                  <div style="background:#eff6ff; color:${cfg.primaryColor || '#2563eb'}; border:1px solid #bfdbfe; padding:2px 6px; border-radius:4px; font-weight:800; font-size:${infoFont}; display:inline-block; margin-bottom:2px;">NO: ${student.noPeserta}</div>
                  <div style="font-size:${parseInt(infoFont)-0.5}px; font-weight:700; color:#64748b; text-transform:uppercase;">NAMA PESERTA</div>
                  <div style="font-weight:800; text-transform:uppercase; color:#0f172a; font-size:${parseInt(infoFont)+0.5}px; line-height:1.2;">${student.nama}</div>
                  <div style="margin-top:2px; display:flex; gap:8px;">
                    <span><strong>NISN:</strong> ${student.nisn}</span>
                    <span><strong>KELAS:</strong> <span style="font-weight:700; color:${cfg.primaryColor || '#2563eb'};">${student.kelas}</span></span>
                  </div>
                  <div><strong>RUANG:</strong> <span style="font-weight:700;">${student.ruang}</span></div>
                </div>
                <div style="width:${qrBoxW}; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center; height:${photoH}; flex-shrink:0;">
                  <div id="${qrId}" style="width:${qrSize+4}px; height:${qrSize+4}px; background:white; padding:2px; border:1.5px solid #cbd5e1; border-radius:4px; display:flex; align-items:center; justify-content:center;"></div>
                  <div style="width:100%; text-align:center; display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:6px; color:#64748b; margin-bottom:1px;">Kepala Sekolah</div>
                    <div style="width:${qrSize}px; height:${Math.round(qrSize * 0.7)}px; display:flex; align-items:center; justify-content:center; position:relative;">
                      ${cfg.stampUrl ? `<img src="${cfg.stampUrl}" style="width:${Math.round(qrSize * 0.7)}px; height:${Math.round(qrSize * 0.7)}px; object-fit:contain; opacity:0.35; position:absolute;">` : `<div style="width:100%; border-bottom:1px solid #94a3b8; margin-top:${Math.round(qrSize * 0.6)}px;"></div>`}
                    </div>
                    <div style="font-weight:800; font-size:${parseInt(infoFont) <= 8.5 ? '6px' : '7px'}; color:#0f172a; text-decoration:underline; line-height:1.3;">${cfg.headmasterName || ''}</div>
                    ${cfg.headmasterNip ? `<div style="font-size:5.5px; color:#64748b; margin-top:1px;">NIP. ${cfg.headmasterNip}</div>` : ''}
                  </div>
                </div>
              </div>
              <div class="card-watermark">[LICENSED] ${cfg.watermarkText || 'XamCard'} - NPSN: ${cfg.npsn || ''}</div>
            `;

          } else if (preset === 'formal') {
            // FORMAL KLASIK: Border hitam tebal, header double-line, formal
            const licDataF = (window.LicenseModule && window.LicenseModule.licenseData.isActivated)
              ? window.LicenseModule.licenseData : null;
            const schoolDisplayF = licDataF
              ? `${licDataF.schoolName} - ${licDataF.npsn}`
              : (cfg.schoolName ? `${cfg.schoolName}${cfg.npsn ? ' - ' + cfg.npsn : ''}` : '—');
            cardDiv.style.border = '2px solid #1e293b';
            cardDiv.style.borderRadius = '2px';
            cardDiv.innerHTML = `
              <div style="border-bottom:3px double #1e293b; padding:${headerPad}; text-align:center; flex-shrink:0; background:#f8fafc;">
                <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
                  ${logoImg}
                  <div style="line-height:1.3;">
                    <div style="font-size:${schoolFont}; font-weight:900; text-transform:uppercase; color:#1e293b; letter-spacing:0.5px;">${schoolDisplayF}</div>
                  </div>
                </div>
                <div style="margin-top:4px; padding-top:3px; border-top:1px solid #1e293b; font-size:${examFont}; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#1e293b;">${cfg.examTitle || 'KARTU PESERTA UJIAN'}</div>
                ${cfg.academicYear ? `<div style="font-size:${parseInt(examFont)-1}px; color:#64748b;">${cfg.academicYear}</div>` : ''}
              </div>
              <div style="display:flex; padding:${bodyPad}; gap:${bodyGap}; align-items:flex-start; flex-grow:1;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex-shrink:0;">
                  <div style="width:${photoW}; height:${photoH}; border:1px solid #1e293b; overflow:hidden; background:#f8fafc;">
                    <img src="${photoImg}" style="width:100%; height:100%; object-fit:cover;">
                  </div>
                  <div style="font-size:6px; color:#475569; text-align:center;">FOTO 3×4</div>
                </div>
                <div style="flex-grow:1; font-size:${infoFont}; line-height:${infoLineHeight}; color:#1e293b;">
                  <div style="border-bottom:1px solid #e2e8f0; padding-bottom:1px; margin-bottom:2px;"><strong>No. Peserta :</strong> <span style="font-weight:900; color:#1e293b;">${student.noPeserta}</span></div>
                  <div><strong>NISN :</strong> ${student.nisn}</div>
                  <div><strong>Nama :</strong> <span style="font-weight:700; text-transform:uppercase;">${student.nama}</span></div>
                  <div><strong>Kelas :</strong> ${student.kelas}</div>
                  <div><strong>Ruang :</strong> ${student.ruang}</div>
                </div>
                <div style="width:${qrBoxW}; display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; flex-shrink:0;">
                  <div id="${qrId}" style="width:${qrSize+4}px; height:${qrSize+4}px; background:white; padding:1px; border:1px solid #1e293b; display:flex; align-items:center; justify-content:center;"></div>
                  <div style="width:100%; text-align:center; display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:6px; color:#475569; margin-bottom:1px;">Kepala Sekolah,</div>
                    <div style="width:${qrSize}px; height:${Math.round(qrSize * 0.7)}px; display:flex; align-items:center; justify-content:center; position:relative;">
                      ${cfg.stampUrl ? `<img src="${cfg.stampUrl}" style="width:${Math.round(qrSize * 0.7)}px; height:${Math.round(qrSize * 0.7)}px; object-fit:contain; opacity:0.35; position:absolute;">` : `<div style="width:100%; border-bottom:1px solid #94a3b8; margin-top:${Math.round(qrSize * 0.6)}px;"></div>`}
                    </div>
                    <div style="font-weight:700; font-size:6px; color:#1e293b; text-decoration:underline; line-height:1.3;">${cfg.headmasterName || ''}</div>
                  </div>
                </div>
              </div>
              <div class="card-watermark">[LICENSED] ${cfg.watermarkText || 'XamCard'} - NPSN: ${cfg.npsn || ''}</div>
            `;

          } else if (preset === 'clean') {
            // CLEAN UI: Accent strip di kiri, rounded, soft shadow, modern-minimal
            const licDataC = (window.LicenseModule && window.LicenseModule.licenseData.isActivated)
              ? window.LicenseModule.licenseData : null;
            const schoolDisplayC = licDataC
              ? `${licDataC.schoolName} - ${licDataC.npsn}`
              : (cfg.schoolName ? `${cfg.schoolName}${cfg.npsn ? ' - ' + cfg.npsn : ''}` : '—');
            cardDiv.style.border = '1px solid #e2e8f0';
            cardDiv.style.borderRadius = '8px';
            cardDiv.style.overflow = 'hidden';
            cardDiv.innerHTML = `
              <div style="display:flex; flex-shrink:0;">
                <div style="width:5px; background:${cfg.primaryColor || '#2563eb'}; flex-shrink:0;"></div>
                <div style="flex-grow:1; padding:${headerPad}; display:flex; align-items:center; gap:8px; background:#ffffff; border-bottom:1px solid #f1f5f9;">
                  ${logoImg}
                  <div style="flex-grow:1; line-height:1.3;">
                    <div style="font-size:${schoolFont}; font-weight:700; color:${cfg.primaryColor || '#2563eb'}; text-transform:uppercase;">${schoolDisplayC}</div>
                    <div style="font-size:${examFont}; font-weight:600; color:#334155;">${cfg.examTitle || 'KARTU PESERTA UJIAN'}</div>
                    ${cfg.academicYear ? `<div style="font-size:${parseInt(examFont)-1}px; color:#94a3b8;">${cfg.academicYear}</div>` : ''}
                  </div>
                  <div style="background:${cfg.primaryColor || '#2563eb'}; color:#fff; font-size:${parseInt(infoFont)+1}px; font-weight:900; padding:3px 7px; border-radius:4px; white-space:nowrap;">${student.noPeserta}</div>
                </div>
              </div>
              <div style="display:flex; padding:${bodyPad}; gap:${bodyGap}; align-items:center; flex-grow:1; background:#fafbfc;">
                <div style="width:${photoW}; height:${photoH}; border-radius:6px; border:1px solid #e2e8f0; overflow:hidden; background:#f1f5f9; flex-shrink:0; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                  <img src="${photoImg}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex-grow:1; font-size:${infoFont}; line-height:${infoLineHeight}; color:#334155;">
                  <div style="color:#64748b; font-size:${parseInt(infoFont)-1}px;">NISN: ${student.nisn}</div>
                  <div style="font-weight:700; font-size:${parseInt(infoFont)+0.5}px; text-transform:uppercase; color:#0f172a;">${student.nama}</div>
                  <div style="color:#475569;">Kelas: ${student.kelas}</div>
                  <div style="color:#475569;">Ruang: <strong>${student.ruang}</strong></div>
                </div>
                <div style="width:${qrBoxW}; display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; flex-shrink:0;">
                  <div id="${qrId}" style="width:${qrSize+4}px; height:${qrSize+4}px; background:white; padding:2px; border:1px solid #e2e8f0; border-radius:6px; display:flex; align-items:center; justify-content:center;"></div>
                  <div style="width:100%; text-align:center; display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:6px; color:#94a3b8; margin-bottom:1px;">Kepala Sekolah</div>
                    <div style="width:${qrSize}px; height:${Math.round(qrSize * 0.7)}px; display:flex; align-items:center; justify-content:center; position:relative;">
                      ${cfg.stampUrl ? `<img src="${cfg.stampUrl}" style="width:${Math.round(qrSize * 0.7)}px; height:${Math.round(qrSize * 0.7)}px; object-fit:contain; opacity:0.35; position:absolute;">` : `<div style="width:100%; border-bottom:1px solid #e2e8f0; margin-top:${Math.round(qrSize * 0.6)}px;"></div>`}
                    </div>
                    <div style="font-weight:700; font-size:6px; color:#475569; text-decoration:underline; line-height:1.3;">${cfg.headmasterName || ''}</div>
                  </div>
                </div>
              </div>
              <div class="card-watermark">[LICENSED] ${cfg.watermarkText || 'XamCard'} - NPSN: ${cfg.npsn || ''}</div>
            `;

          } else {
            // MINIMALIS: Border tipis, header 1 baris, layout ramping
            const licDataM = (window.LicenseModule && window.LicenseModule.licenseData.isActivated)
              ? window.LicenseModule.licenseData : null;
            const schoolDisplayM = licDataM
              ? `${licDataM.schoolName} - ${licDataM.npsn}`
              : (cfg.schoolName ? `${cfg.schoolName}${cfg.npsn ? ' - ' + cfg.npsn : ''}` : '—');
            cardDiv.style.border = '1px solid #cbd5e1';
            cardDiv.innerHTML = `
              <div style="padding:${headerPad}; border-bottom:1px solid ${cfg.primaryColor || '#2563eb'}; display:flex; align-items:center; gap:6px; flex-shrink:0;">
                ${logoImg}
                <div style="flex-grow:1;">
                  <div style="font-size:${schoolFont}; font-weight:700; text-transform:uppercase; color:#0f172a; line-height:1.2;">${schoolDisplayM}</div>
                  <div style="font-size:${examFont}; color:${cfg.primaryColor || '#2563eb'}; font-weight:600;">${cfg.examTitle || 'KARTU PESERTA UJIAN'}${cfg.academicYear ? ' · ' + cfg.academicYear : ''}</div>
                </div>
              </div>
              <div style="display:flex; padding:${bodyPad}; gap:${bodyGap}; align-items:center; flex-grow:1;">
                <div style="width:${photoW}; height:${photoH}; border:1px solid #e2e8f0; overflow:hidden; background:#f8fafc; flex-shrink:0;">
                  <img src="${photoImg}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex-grow:1; font-size:${infoFont}; line-height:${infoLineHeight}; color:#334155;">
                  <div><strong>NO:</strong> <span style="color:${cfg.primaryColor || '#2563eb'}; font-weight:700;">${student.noPeserta}</span></div>
                  <div><strong>NISN:</strong> ${student.nisn}</div>
                  <div><strong>NAMA:</strong> <span style="font-weight:700; text-transform:uppercase;">${student.nama}</span></div>
                  <div><strong>KELAS:</strong> ${student.kelas} &nbsp; <strong>RUANG:</strong> ${student.ruang}</div>
                </div>
                <div style="width:${qrBoxW}; display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; flex-shrink:0;">
                  <div id="${qrId}" style="width:${qrSize+4}px; height:${qrSize+4}px; background:white; padding:2px; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center;"></div>
                  <div style="width:100%; text-align:center; display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:6px; color:#64748b; margin-bottom:1px;">Kepala Sekolah</div>
                    <div style="width:${qrSize}px; height:${Math.round(qrSize * 0.7)}px; display:flex; align-items:center; justify-content:center; position:relative;">
                      ${cfg.stampUrl ? `<img src="${cfg.stampUrl}" style="width:${Math.round(qrSize * 0.7)}px; height:${Math.round(qrSize * 0.7)}px; object-fit:contain; opacity:0.35; position:absolute;">` : `<div style="width:100%; border-bottom:1px solid #e2e8f0; margin-top:${Math.round(qrSize * 0.6)}px;"></div>`}
                    </div>
                    <div style="font-weight:700; font-size:6px; color:#0f172a; text-decoration:underline; line-height:1.3;">${cfg.headmasterName || ''}</div>
                  </div>
                </div>
              </div>
              <div class="card-watermark">[LICENSED] ${cfg.watermarkText || 'XamCard'} - NPSN: ${cfg.npsn || ''}</div>
            `;
          }
        } else {
          // Custom Background + Drag & Drop Overlay Mode
          if (cfg.customBgUrl) {
            cardDiv.style.backgroundImage = `url(${cfg.customBgUrl})`;
            cardDiv.style.backgroundSize = 'cover';
            cardDiv.style.backgroundPosition = 'center';
          }
          // Set dimensi kartu sesuai canvas size yang dipilih
          if (customCardW && customCardH) {
            cardDiv.style.width  = `${customCardW}mm`;
            cardDiv.style.height = `${customCardH}mm`;
          }

          const ov = cfg.overlay || {};
          const photoImg = student.photoData || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'105\' viewBox=\'0 0 80 105\' fill=\'%23cbd5e1\'><rect width=\'80\' height=\'105\' fill=\'%23e2e8f0\' fill-opacity=\'0.6\'/><text x=\'50%\' y=\'50%\' font-size=\'10\' text-anchor=\'middle\' fill=\'%2364748b\'>FOTO 3x4</text></svg>';

          cardDiv.innerHTML = `
            <div style="position:absolute; left:${ov.photo?.x||8}%; top:${ov.photo?.y||25}%; width:${ov.photo?.w||22}%; height:${ov.photo?.h||48}%; border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.6);">
              <img src="${photoImg}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div id="${qrId}" style="position:absolute; left:${ov.qrcode?.x||74}%; top:${ov.qrcode?.y||60}%; width:${ov.qrcode?.w||18}%; height:${ov.qrcode?.h||28}%; background:white; padding:2px; border:1px solid #e2e8f0; border-radius:4px;"></div>
            <div style="position:absolute; left:${ov.noPeserta?.x||34}%; top:${ov.noPeserta?.y||22}%; font-size:${ov.noPeserta?.fontSize||13}px; color:${ov.noPeserta?.color||'#2563eb'}; font-weight:${ov.noPeserta?.fontWeight||'bold'};">${student.noPeserta}</div>
            <div style="position:absolute; left:${ov.nama?.x||34}%; top:${ov.nama?.y||32}%; font-size:${ov.nama?.fontSize||14}px; color:${ov.nama?.color||'#0f172a'}; font-weight:${ov.nama?.fontWeight||'bold'};">${student.nama}</div>
            <div style="position:absolute; left:${ov.nisn?.x||34}%; top:${ov.nisn?.y||44}%; font-size:${ov.nisn?.fontSize||12}px; color:${ov.nisn?.color||'#334155'}; font-weight:${ov.nisn?.fontWeight||'normal'};">NISN: ${student.nisn}</div>
            <div style="position:absolute; left:${ov.kelas?.x||34}%; top:${ov.kelas?.y||56}%; font-size:${ov.kelas?.fontSize||12}px; color:${ov.kelas?.color||'#334155'}; font-weight:${ov.kelas?.fontWeight||'normal'};">Kelas: ${student.kelas}</div>
            <div style="position:absolute; left:${ov.ruang?.x||34}%; top:${ov.ruang?.y||67}%; font-size:${ov.ruang?.fontSize||12}px; color:${ov.ruang?.color||'#334155'}; font-weight:${ov.ruang?.fontWeight||'normal'};">Ruang: ${student.ruang}</div>
            <div class="card-watermark">[LICENSED] ${cfg.watermarkText || 'XamCard'} - NPSN: ${cfg.npsn || ''}</div>
          `;
        }

        pageDiv.appendChild(cardDiv);
      });

      printArea.appendChild(pageDiv);

      // Render QR Codes with dynamic size
      pageStudents.forEach((student, sIdx) => {
        const qrContainer = document.getElementById(`qr_code_${pageIdx}_${sIdx}`);
        if (qrContainer && typeof QRCode !== 'undefined') {
          qrContainer.innerHTML = '';
          new QRCode(qrContainer, {
            text: `${student.noPeserta}|${student.nisn}|${student.nama}`,
            width: qrSize,
            height: qrSize,
            correctLevel: QRCode.CorrectLevel.M
          });
        }
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => window.PrintModule.init());
