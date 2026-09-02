/**
 * XamCard - Designer Module (Dual Mode: Preset Templates + Custom Drag & Drop Overlay)
 */

window.DesignerModule = {
  activeMode: 'preset',
  selectedPreset: 'minimal',

  // Canvas size presets untuk mode custom (dalam mm)
  CANVAS_SIZES: {
    'id_landscape':  { label: 'ID Card Landscape (85.6×53.9mm)', w: 85.6, h: 53.9, cols: 2, rows: 4, perPage: 8 },
    'id_portrait':   { label: 'ID Card Portrait (53.9×85.6mm)',  w: 53.9, h: 85.6, cols: 3, rows: 3, perPage: 9 },
    'lanyard':       { label: 'Lanyard/Tali (54×86mm)',           w: 54,   h: 86,   cols: 3, rows: 3, perPage: 9 },
    'a7_landscape':  { label: 'A7 Landscape (105×74mm)',          w: 105,  h: 74,   cols: 1, rows: 4, perPage: 4 },
    'a7_portrait':   { label: 'A7 Portrait (74×105mm)',           w: 74,   h: 105,  cols: 2, rows: 2, perPage: 4 },
    'custom':        { label: 'Custom...', w: 85.6, h: 53.9, cols: 2, rows: 4, perPage: 8 }
  },

  config: {
    schoolName: 'SMA NEGERI 1 INDONESIA',
    npsn: '10801234',
    examTitle: 'KARTU PESERTA UTS / UAS',
    academicYear: 'TAHUN PELAJARAN 2026/2027',
    headmasterName: 'Dr. H. M. Supriyadi, M.Pd',
    headmasterNip: '19780512 200501 1 004',
    primaryColor: '#2563eb',
    logoUrl: '',
    stampUrl: '',
    customBgUrl: '',
    watermarkText: 'Dicetak Resmi via XamCard',
    canvasSizeKey: 'id_landscape', // key dari CANVAS_SIZES
    canvasCustomW: 85.6,
    canvasCustomH: 53.9,

    overlay: {
      photo:      { x: 8,  y: 25, w: 22, h: 48, fontSize: 12, color: '#000000', align: 'center' },
      qrcode:     { x: 74, y: 60, w: 18, h: 28, fontSize: 12, color: '#000000', align: 'center' },
      nama:       { x: 34, y: 32, fontSize: 14, color: '#0f172a', fontWeight: 'bold' },
      nisn:       { x: 34, y: 44, fontSize: 12, color: '#334155', fontWeight: 'normal' },
      noPeserta:  { x: 34, y: 22, fontSize: 13, color: '#2563eb', fontWeight: 'bold' },
      kelas:      { x: 34, y: 56, fontSize: 12, color: '#334155', fontWeight: 'normal' },
      ruang:      { x: 34, y: 67, fontSize: 12, color: '#334155', fontWeight: 'normal' },
      stempel:    { x: 60, y: 62, w: 20, h: 25 }
    }
  },

  // Default khusus Mode 2 — dipakai saat reset desain custom
  DEFAULT_CUSTOM_CONFIG: {
    customBgUrl: '',
    canvasSizeKey: 'id_landscape',
    canvasCustomW: 85.6,
    canvasCustomH: 53.9,
    overlay: {
      photo:      { x: 8,  y: 25, w: 22, h: 48, fontSize: 12, color: '#000000', align: 'center' },
      qrcode:     { x: 74, y: 60, w: 18, h: 28, fontSize: 12, color: '#000000', align: 'center' },
      nama:       { x: 34, y: 32, fontSize: 14, color: '#0f172a', fontWeight: 'bold' },
      nisn:       { x: 34, y: 44, fontSize: 12, color: '#334155', fontWeight: 'normal' },
      noPeserta:  { x: 34, y: 22, fontSize: 13, color: '#2563eb', fontWeight: 'bold' },
      kelas:      { x: 34, y: 56, fontSize: 12, color: '#334155', fontWeight: 'normal' },
      ruang:      { x: 34, y: 67, fontSize: 12, color: '#334155', fontWeight: 'normal' },
      stempel:    { x: 60, y: 62, w: 20, h: 25 }
    }
  },

  selectedElementKey: null,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  elemInitialX: 0,
  elemInitialY: 0,
  showGrid: true,
  snapToGrid: true,
  gridSize: 5, // % snap interval

  // Screen preview design canvas (px) — print uses mm in print.css
  PREVIEW_PRESET_WIDTH: 600,
  PREVIEW_PRESET_HEIGHT: 378,
  PX_PER_MM: 96 / 25.4,
  _previewResizeObserver: null,

  init() {
    this.loadFromLocalStorage();
    this.bindEvents();
    this.setupPreviewScaleObserver();
    this.renderPreview();
  },

  bindEvents() {
    // Mode Switcher Buttons
    const btnModePreset = document.getElementById('btnModePreset');
    const btnModeCustom = document.getElementById('btnModeCustom');

    if (btnModePreset) {
      btnModePreset.addEventListener('click', () => this.switchMode('preset'));
    }
    if (btnModeCustom) {
      btnModeCustom.addEventListener('click', () => this.switchMode('custom'));
    }

    // Input listeners for text settings
    const bindInput = (id, key) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = this.config[key] || '';
        el.addEventListener('input', (e) => {
          this.config[key] = e.target.value;
          this.saveToLocalStorage();
          this.renderPreview();
        });
      }
    };

    bindInput('inputSchoolName', 'schoolName');
    bindInput('inputNpsn', 'npsn');
    bindInput('inputExamTitle', 'examTitle');
    bindInput('inputAcademicYear', 'academicYear');
    bindInput('inputHeadmasterName', 'headmasterName');
    bindInput('inputHeadmasterNip', 'headmasterNip');
    bindInput('inputWatermark', 'watermarkText');

    // Primary Color Picker
    const colorPicker = document.getElementById('inputPrimaryColor');
    if (colorPicker) {
      colorPicker.value = this.config.primaryColor;
      colorPicker.addEventListener('input', (e) => {
        this.config.primaryColor = e.target.value;
        this.saveToLocalStorage();
        this.renderPreview();
      });
    }

    // File Uploads (Logo, Stamp, Custom Canvas Background)
    this.bindImageUpload('inputLogoFile', 'logoUrl');
    this.bindImageUpload('inputStampFile', 'stampUrl');
    this.bindImageUpload('inputCustomBgFile', 'customBgUrl');

    const btnResetCustom = document.getElementById('btnResetCustomDesign');
    if (btnResetCustom) {
      btnResetCustom.addEventListener('click', () => this.resetCustomDesign());
    }

    // Preset Selection Cards
    document.querySelectorAll('.preset-card-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.preset-card-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.selectedPreset = opt.dataset.preset;
        this.renderPreview();
      });
    });

    // Property panel inputs for selected overlay element
    const fontPropInput = document.getElementById('overlayFontSize');
    if (fontPropInput) {
      fontPropInput.addEventListener('input', (e) => {
        if (this.selectedElementKey && this.config.overlay[this.selectedElementKey]) {
          this.config.overlay[this.selectedElementKey].fontSize = parseInt(e.target.value) || 12;
          this.saveToLocalStorage();
          this.renderPreview();
        }
      });
    }

    const fontColorInput = document.getElementById('overlayFontColor');
    if (fontColorInput) {
      fontColorInput.addEventListener('input', (e) => {
        if (this.selectedElementKey && this.config.overlay[this.selectedElementKey]) {
          this.config.overlay[this.selectedElementKey].color = e.target.value;
          this.saveToLocalStorage();
          this.renderPreview();
        }
      });
    }
  },

  bindImageUpload(inputId, configKey) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validasi hanya gambar
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      const validExts = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
      if (!validTypes.includes(file.type) && !validExts.test(file.name)) {
        window.Modal.alert(`File "${file.name}" bukan file gambar!\nGunakan format JPG, PNG, atau WebP.`, 'File Tidak Valid', 'error');
        input.value = '';
        return;
      }

      // Max dimensions & quality per image type
      const imageProfiles = {
        logoUrl:    { maxW: 200, maxH: 200, quality: 0.85 },
        stampUrl:   { maxW: 300, maxH: 300, quality: 0.80 },
        customBgUrl:{ maxW: 1200, maxH: 800, quality: 0.75 }
      };
      const profile = imageProfiles[configKey] || { maxW: 400, maxH: 400, quality: 0.80 };

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          // Hitung dimensi proporsional
          let { width, height } = img;
          const ratio = Math.min(profile.maxW / width, profile.maxH / height, 1);
          const targetW = Math.round(width * ratio);
          const targetH = Math.round(height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width  = targetW;
          canvas.height = targetH;

          const ctx = canvas.getContext('2d');
          // Background transparan untuk logo/stempel (PNG source)
          ctx.clearRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Export ke WebP, fallback ke PNG jika browser tidak support
          const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
          const mimeType   = supportsWebP ? 'image/webp' : 'image/png';
          const quality    = supportsWebP ? profile.quality : undefined;
          const dataUrl    = canvas.toDataURL(mimeType, quality);

          // Tampilkan info ukuran di console (dev feedback)
          const originalKb = Math.round(file.size / 1024);
          const compressedKb = Math.round((dataUrl.length * 3) / 4 / 1024);
          console.info(`[XamCard] ${configKey}: ${originalKb}KB → ${compressedKb}KB (${targetW}×${targetH} ${supportsWebP ? 'WebP' : 'PNG'})`);

          this.config[configKey] = dataUrl;
          this.saveToLocalStorage();
          this.renderPreview();

          // Reset input agar bisa upload ulang file yang sama
          input.value = '';
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  switchMode(mode) {
    this.activeMode = mode;
    const btnPreset = document.getElementById('btnModePreset');
    const btnCustom = document.getElementById('btnModeCustom');
    const panelPreset = document.getElementById('panelPresetControls');
    const panelCustom = document.getElementById('panelCustomControls');

    if (mode === 'preset') {
      if (btnPreset) btnPreset.classList.add('active');
      if (btnCustom) btnCustom.classList.remove('active');
      if (panelPreset) panelPreset.style.display = 'block';
      if (panelCustom) panelCustom.style.display = 'none';
      // Sembunyikan grid toolbar
      const bar = document.getElementById('gridToggleBar');
      if (bar) bar.style.display = 'none';
    } else {
      if (btnPreset) btnPreset.classList.remove('active');
      if (btnCustom) btnCustom.classList.add('active');
      if (panelPreset) panelPreset.style.display = 'none';
      if (panelCustom) panelCustom.style.display = 'block';
      this._renderGridBar();
    }
    this.renderPreview();
  },

  _renderGridBar() {
    const wrapper = document.querySelector('.designer-canvas-wrapper');
    if (!wrapper) return;

    let bar = document.getElementById('gridToggleBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'gridToggleBar';
      bar.className = 'grid-toggle-bar';
      wrapper.insertBefore(bar, wrapper.firstChild);
    }

    bar.style.display = 'flex';
    const sizeKey = this.config.canvasSizeKey || 'id_landscape';
    const isCustom = sizeKey === 'custom';
    const sizes = this.CANVAS_SIZES;
    const cur   = sizes[sizeKey];

    bar.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      <select id="selectCanvasSize" style="padding:2px 8px; border:1px solid #e2e8f0; border-radius:5px; font-size:12px; color:#334155; font-weight:500;">
        ${Object.entries(sizes).map(([k,v]) => `<option value="${k}" ${k===sizeKey?'selected':''}>${v.label}</option>`).join('')}
      </select>
      ${isCustom ? `
        <input id="inputCanvasW" type="number" min="30" max="210" value="${this.config.canvasCustomW||85.6}" style="width:60px; padding:2px 6px; border:1px solid #e2e8f0; border-radius:4px; font-size:12px;" title="Lebar (mm)">
        <span style="font-size:11px; color:#94a3b8;">×</span>
        <input id="inputCanvasH" type="number" min="30" max="297" value="${this.config.canvasCustomH||53.9}" style="width:60px; padding:2px 6px; border:1px solid #e2e8f0; border-radius:4px; font-size:12px;" title="Tinggi (mm)">
        <span style="font-size:11px; color:#64748b;">mm</span>
      ` : `<span style="font-size:11px; color:#64748b;">${cur.w}×${cur.h}mm · <strong>${cur.perPage} kartu/lembar</strong></span>`}
      <label style="margin-left:8px;">
        <input type="checkbox" id="chkShowGrid" ${this.showGrid?'checked':''}> Grid
      </label>
      <label style="margin-left:6px;">
        <input type="checkbox" id="chkSnapGrid" ${this.snapToGrid?'checked':''}> Snap
      </label>
      <select id="selectGridSize" style="margin-left:6px; padding:2px 6px; border:1px solid #e2e8f0; border-radius:4px; font-size:11.5px; color:#475569;">
        <option value="5"  ${this.gridSize===5?'selected':''}>5%</option>
        <option value="10" ${this.gridSize===10?'selected':''}>10%</option>
        <option value="25" ${this.gridSize===25?'selected':''}>25%</option>
      </select>
      <span class="snap-indicator" id="snapIndicator">⊹ snapped</span>
    `;

    document.getElementById('selectCanvasSize').addEventListener('change', (e) => {
      this.config.canvasSizeKey = e.target.value;
      this.saveToLocalStorage();
      this._renderGridBar();
      this.renderPreview();
    });

    if (isCustom) {
      document.getElementById('inputCanvasW').addEventListener('change', (e) => {
        this.config.canvasCustomW = parseFloat(e.target.value) || 85.6;
        this.saveToLocalStorage();
        this.renderPreview();
      });
      document.getElementById('inputCanvasH').addEventListener('change', (e) => {
        this.config.canvasCustomH = parseFloat(e.target.value) || 53.9;
        this.saveToLocalStorage();
        this.renderPreview();
      });
    }

    document.getElementById('chkShowGrid').addEventListener('change', (e) => {
      this.showGrid = e.target.checked;
      this.renderPreview();
    });
    document.getElementById('chkSnapGrid').addEventListener('change', (e) => {
      this.snapToGrid = e.target.checked;
    });
    document.getElementById('selectGridSize').addEventListener('change', (e) => {
      this.gridSize = parseInt(e.target.value);
      this.renderPreview();
    });
  },

  // Ambil dimensi canvas aktif dalam mm
  getActiveCanvasSize() {
    const key = this.config.canvasSizeKey || 'id_landscape';
    if (key === 'custom') {
      const w = this.config.canvasCustomW || 85.6;
      const h = this.config.canvasCustomH || 53.9;
      // Hitung cols/rows/perPage berdasarkan A4 usable (192×277mm) dengan gap 3mm
      const cols = Math.floor((192 + 3) / (w + 3));
      const rows = Math.floor((277 + 3) / (h + 3));
      return { w, h, cols: Math.max(1,cols), rows: Math.max(1,rows), perPage: Math.max(1,cols*rows) };
    }
    return this.CANVAS_SIZES[key] || this.CANVAS_SIZES['id_landscape'];
  },

  _clearCustomCanvasStyles(canvas) {
    canvas.style.removeProperty('width');
    canvas.style.removeProperty('height');
    canvas.style.removeProperty('background-image');
    canvas.style.removeProperty('background-size');
    canvas.style.removeProperty('background-position');
    canvas.style.removeProperty('background-color');
  },

  _applyPresetCanvasStyles(canvas) {
    this._clearCustomCanvasStyles(canvas);
    canvas.className = `card-canvas preset-template-${this.selectedPreset}`;
    canvas.style.setProperty('--preset-color', this.config.primaryColor);
  },

  getPreviewDesignSize() {
    if (this.activeMode === 'custom') {
      const sz = this.getActiveCanvasSize();
      return {
        width: Math.round(sz.w * this.PX_PER_MM),
        height: Math.round(sz.h * this.PX_PER_MM)
      };
    }
    return { width: this.PREVIEW_PRESET_WIDTH, height: this.PREVIEW_PRESET_HEIGHT };
  },

  updatePreviewScale() {
    const viewport = document.getElementById('cardPreviewViewport');
    const scaleEl = document.getElementById('cardPreviewScale');
    if (!viewport || !scaleEl) return;

    const design = this.getPreviewDesignSize();
    const available = Math.max(viewport.clientWidth - 16, 200);
    const scale = Math.min(1, available / design.width);

    scaleEl.style.width = `${design.width}px`;
    scaleEl.style.height = `${design.height}px`;
    scaleEl.style.transform = `scale(${scale})`;
    viewport.style.minHeight = `${Math.ceil(design.height * scale) + 16}px`;
  },

  setupPreviewScaleObserver() {
    const viewport = document.getElementById('cardPreviewViewport');
    if (!viewport) return;

    if (typeof ResizeObserver !== 'undefined') {
      if (this._previewResizeObserver) this._previewResizeObserver.disconnect();
      this._previewResizeObserver = new ResizeObserver(() => this.updatePreviewScale());
      this._previewResizeObserver.observe(viewport);
    }

    window.addEventListener('resize', () => this.updatePreviewScale());
  },

  renderPreview() {
    const canvas = document.getElementById('cardCanvasPreview');
    if (!canvas) return;

    const sampleStudent = (window.ExcelModule && window.ExcelModule.students.length > 0)
      ? window.ExcelModule.students[0]
      : { noPeserta: 'UJ-2026-001', nisn: '0081234501', nama: 'Ahmad Rizky Pratama', kelas: 'XII MIPA 1', ruang: 'Ruang 01', photoData: '' };

    canvas.innerHTML = '';

    // Terapkan transform scale setelah render (DPI-safe untuk WebView2)
    requestAnimationFrame(() => this.updatePreviewScale());

    if (this.activeMode === 'preset') {
      this._applyPresetCanvasStyles(canvas);

      const logoImg = this.config.logoUrl ? `<img src="${this.config.logoUrl}" style="height: 44px; max-width: 50px; object-fit: contain;">` : '<div style="width:40px; height:40px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11H9z"/></svg></div>';
      const stampImg = this.config.stampUrl ? `<img src="${this.config.stampUrl}" style="height: 50px; max-width: 90px; object-fit: contain;">` : '';
      const photoImg = sampleStudent.photoData || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'90\' height=\'120\' viewBox=\'0 0 90 120\' fill=\'%23cbd5e1\'><rect width=\'90\' height=\'120\' fill=\'%23e2e8f0\'/><text x=\'50%\' y=\'50%\' font-size=\'11\' text-anchor=\'middle\' fill=\'%2364748b\'>FOTO 3x4</text></svg>';

      if (this.selectedPreset === 'modern') {
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
          : (this.config.schoolName ? `${this.config.schoolName}${this.config.npsn ? ' - ' + this.config.npsn : ''}` : '<em style="opacity:0.7;font-style:italic;">Belum Teraktivasi</em>');

        canvas.innerHTML = `
          <!-- Header Modern: Full-color background -->
          <div style="display:flex; align-items:center; gap:14px; padding:14px 20px; background:${this.config.primaryColor}; color:#ffffff; flex-shrink:0; min-height:60px; overflow:visible;">
            ${logoImg}
            <div style="flex-grow:1; line-height:1.3; min-width:0;">
              <div style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.4px; white-space:normal; word-break:break-word;">${schoolDisplay}</div>
              <div style="font-size:11px; font-weight:700; opacity:0.95; margin-top:2px;">${this.config.examTitle}</div>
              <div style="font-size:9.5px; opacity:0.85; margin-top:1px;">${this.config.academicYear}</div>
            </div>
          </div>

          <!-- Body Content -->
          <div style="display:flex; padding:18px 20px; gap:20px; flex-grow:1; align-items:center;">
            <!-- Foto Siswa -->
            <div style="width:126px; height:168px; border-radius:8px; border:2px solid ${this.config.primaryColor}; overflow:hidden; background:#f8fafc; flex-shrink:0; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <img src="${photoImg}" style="width:100%; height:100%; object-fit:cover;">
            </div>

            <!-- Data Siswa -->
            <div style="flex-grow:1; display:flex; flex-direction:column; justify-content:center; gap:8px; color:#1e293b;">
              <div style="background:#eff6ff; color:${this.config.primaryColor}; border:1px solid #bfdbfe; padding:4px 10px; border-radius:6px; font-weight:800; font-size:13px; width:fit-content; letter-spacing:0.3px;">
                NO: ${sampleStudent.noPeserta}
              </div>
              <div>
                <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">NAMA PESERTA</div>
                <div style="font-size:16px; font-weight:800; color:#0f172a; text-transform:uppercase; line-height:1.2;">${sampleStudent.nama}</div>
              </div>
              <div style="display:flex; gap:16px; font-size:12.5px; color:#334155;">
                <div><strong>NISN:</strong> ${sampleStudent.nisn}</div>
                <div><strong>KELAS:</strong> <span style="font-weight:700; color:${this.config.primaryColor};">${sampleStudent.kelas}</span></div>
              </div>
              <div style="font-size:12.5px; color:#334155;">
                <strong>RUANG UJIAN:</strong> <span style="font-weight:700;">${sampleStudent.ruang}</span>
              </div>
            </div>

            <!-- QR Code & Signature -->
            <div style="width:110px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center; height:168px; flex-shrink:0;">
              <div id="previewQrContainer" style="width:80px; height:80px; background:#ffffff; border:1.5px solid #cbd5e1; padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
              </div>
              <div style="width:100%; text-align:center; display:flex; flex-direction:column; align-items:center; gap:0;">
                <div style="font-size:8.5px; color:#64748b; margin-bottom:2px;">Kepala Sekolah</div>
                <div style="width:72px; height:44px; display:flex; align-items:center; justify-content:center; position:relative;">
                  ${stampImg ? `<img src="${this.config.stampUrl}" style="width:44px; height:44px; object-fit:contain; opacity:0.4; position:absolute;">` : '<div style="width:100%; border-bottom:1px solid #94a3b8; margin-top:38px;"></div>'}
                </div>
                <div style="font-weight:800; font-size:9.5px; color:#0f172a; text-decoration:underline; line-height:1.3;">${this.config.headmasterName}</div>
                <div style="font-size:8px; color:#64748b; margin-top:1px;">NIP. ${this.config.headmasterNip}</div>
              </div>
            </div>
          </div>

          <!-- Watermark Footer -->
          <div class="card-watermark">
            [LICENSED] ${this.config.watermarkText} - NPSN: ${this.config.npsn}
          </div>
        `;
      } else {
        const licData = (window.LicenseModule && window.LicenseModule.licenseData.isActivated)
          ? window.LicenseModule.licenseData
          : null;
        const schoolDisplay = licData
          ? `${licData.schoolName} - ${licData.npsn}`
          : (this.config.schoolName ? `${this.config.schoolName}${this.config.npsn ? ' - ' + this.config.npsn : ''}` : '<em style="opacity:0.7;">Belum Teraktivasi</em>');

        canvas.innerHTML = `
          <!-- Header (Non-Modern) -->
          <div style="display:flex; align-items:center; gap:14px; padding:14px 20px; border-bottom: 2.5px solid ${this.config.primaryColor}; background:transparent; color:#0f172a; flex-shrink:0;">
            ${logoImg}
            <div style="flex-grow:1; line-height:1.25;">
              <div style="font-size:15px; font-weight:800; text-transform:uppercase; letter-spacing:0.4px;">${schoolDisplay}</div>
              <div style="font-size:11.5px; font-weight:600; opacity:0.95; margin-top:3px;">${this.config.examTitle}</div>
              <div style="font-size:10px; opacity:0.85; margin-top:1px;">${this.config.academicYear}</div>
            </div>
          </div>

          <!-- Body Content -->
          <div style="display:flex; padding:18px 20px; gap:20px; flex-grow:1; align-items:center;">
            <div style="width:126px; height:168px; border-radius:8px; border:2px solid #cbd5e1; overflow:hidden; background:#f8fafc; flex-shrink:0; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <img src="${photoImg}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="flex-grow:1; display:flex; flex-direction:column; justify-content:center; gap:8px; color:#1e293b;">
              <div style="background:#eff6ff; color:${this.config.primaryColor}; border:1px solid #bfdbfe; padding:4px 10px; border-radius:6px; font-weight:800; font-size:13px; width:fit-content; letter-spacing:0.3px;">
                NO: ${sampleStudent.noPeserta}
              </div>
              <div>
                <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">NAMA PESERTA</div>
                <div style="font-size:16px; font-weight:800; color:#0f172a; text-transform:uppercase; line-height:1.2;">${sampleStudent.nama}</div>
              </div>
              <div style="display:flex; gap:16px; font-size:12.5px; color:#334155;">
                <div><strong>NISN:</strong> ${sampleStudent.nisn}</div>
                <div><strong>KELAS:</strong> <span style="font-weight:700; color:${this.config.primaryColor};">${sampleStudent.kelas}</span></div>
              </div>
              <div style="font-size:12.5px; color:#334155;">
                <strong>RUANG UJIAN:</strong> <span style="font-weight:700;">${sampleStudent.ruang}</span>
              </div>
            </div>
            <div style="width:110px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center; height:168px; flex-shrink:0;">
              <div id="previewQrContainer" style="width:80px; height:80px; background:#ffffff; border:1.5px solid #cbd5e1; padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
              </div>
              <div style="width:100%; text-align:center; display:flex; flex-direction:column; align-items:center; gap:0;">
                <div style="font-size:8.5px; color:#64748b; margin-bottom:2px;">Kepala Sekolah</div>
                <div style="width:72px; height:44px; display:flex; align-items:center; justify-content:center; position:relative;">
                  ${stampImg ? `<img src="${this.config.stampUrl}" style="width:44px; height:44px; object-fit:contain; opacity:0.4; position:absolute;">` : '<div style="width:100%; border-bottom:1px solid #94a3b8; margin-top:38px;"></div>'}
                </div>
                <div style="font-weight:800; font-size:9.5px; color:#0f172a; text-decoration:underline; line-height:1.3;">${this.config.headmasterName}</div>
                <div style="font-size:8px; color:#64748b; margin-top:1px;">NIP. ${this.config.headmasterNip}</div>
              </div>
            </div>
          </div>

          <!-- Watermark Footer Proteksi Lisensi -->
          <div class="card-watermark">
            [LICENSED] ${this.config.watermarkText} - NPSN: ${this.config.npsn}
          </div>
        `;
      }
    } else {
      // Custom Background + Drag & Drop Overlay Mode
      const sz = this.getActiveCanvasSize();
      const canvasW = Math.round(sz.w * this.PX_PER_MM);
      const canvasH = Math.round(sz.h * this.PX_PER_MM);

      canvas.className = 'card-canvas';
      canvas.style.width  = `${canvasW}px`;
      canvas.style.height = `${canvasH}px`;
      if (this.showGrid) canvas.classList.add('show-grid', 'show-grid-labels');

      if (this.config.customBgUrl) {
        canvas.style.backgroundImage = `url(${this.config.customBgUrl})`;
        canvas.style.backgroundSize = 'cover';
        canvas.style.backgroundPosition = 'center';
      } else {
        canvas.style.backgroundImage = 'none';
        canvas.style.backgroundColor = '#ffffff';
      }

      const ov = this.config.overlay;
      canvas.innerHTML = `
        <div class="drag-element element-photo ${this.selectedElementKey==='photo'?'selected':''}" data-key="photo" style="left:${ov.photo.x}%; top:${ov.photo.y}%; width:${ov.photo.w}%; height:${ov.photo.h}%;">
          <span style="font-size:10px; font-weight:700;">{FOTO 3x4}</span>
        </div>
        <div class="drag-element element-qrcode ${this.selectedElementKey==='qrcode'?'selected':''}" data-key="qrcode" style="left:${ov.qrcode.x}%; top:${ov.qrcode.y}%; width:${ov.qrcode.w}%; height:${ov.qrcode.h}%;">
          <span style="font-size:9px; font-weight:700;">{QR_CODE}</span>
        </div>
        <div class="drag-element ${this.selectedElementKey==='noPeserta'?'selected':''}" data-key="noPeserta" style="left:${ov.noPeserta.x}%; top:${ov.noPeserta.y}%; font-size:${ov.noPeserta.fontSize}px; color:${ov.noPeserta.color}; font-weight:${ov.noPeserta.fontWeight};">
          ${sampleStudent.noPeserta}
        </div>
        <div class="drag-element ${this.selectedElementKey==='nama'?'selected':''}" data-key="nama" style="left:${ov.nama.x}%; top:${ov.nama.y}%; font-size:${ov.nama.fontSize}px; color:${ov.nama.color}; font-weight:${ov.nama.fontWeight};">
          ${sampleStudent.nama}
        </div>
        <div class="drag-element ${this.selectedElementKey==='nisn'?'selected':''}" data-key="nisn" style="left:${ov.nisn.x}%; top:${ov.nisn.y}%; font-size:${ov.nisn.fontSize}px; color:${ov.nisn.color}; font-weight:${ov.nisn.fontWeight};">
          NISN: ${sampleStudent.nisn}
        </div>
        <div class="drag-element ${this.selectedElementKey==='kelas'?'selected':''}" data-key="kelas" style="left:${ov.kelas.x}%; top:${ov.kelas.y}%; font-size:${ov.kelas.fontSize}px; color:${ov.kelas.color}; font-weight:${ov.kelas.fontWeight};">
          Kelas: ${sampleStudent.kelas}
        </div>
        <div class="drag-element ${this.selectedElementKey==='ruang'?'selected':''}" data-key="ruang" style="left:${ov.ruang.x}%; top:${ov.ruang.y}%; font-size:${ov.ruang.fontSize}px; color:${ov.ruang.color}; font-weight:${ov.ruang.fontWeight};">
          Ruang: ${sampleStudent.ruang}
        </div>
        <div class="card-watermark">
          [LICENSED] ${this.config.watermarkText} - NPSN: ${this.config.npsn}
        </div>
      `;
      this.attachDragEvents(canvas);
    }

    this.updatePreviewScale();
  },

  attachDragEvents(canvas) {
    const dragElements = canvas.querySelectorAll('.drag-element');
    
    dragElements.forEach(elem => {
      elem.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectedElementKey = elem.dataset.key;
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        const rect = canvas.getBoundingClientRect();
        const elemRect = elem.getBoundingClientRect();
        this.elemInitialX = ((elemRect.left - rect.left) / rect.width) * 100;
        this.elemInitialY = ((elemRect.top - rect.top) / rect.height) * 100;

        // Highlight selected
        dragElements.forEach(el => el.classList.remove('selected'));
        elem.classList.add('selected');

        // Update Property Editor UI
        const fontProp = document.getElementById('overlayFontSize');
        const colorProp = document.getElementById('overlayFontColor');
        if (fontProp && this.config.overlay[this.selectedElementKey]) {
          fontProp.value = this.config.overlay[this.selectedElementKey].fontSize || 12;
        }
        if (colorProp && this.config.overlay[this.selectedElementKey]) {
          colorProp.value = this.config.overlay[this.selectedElementKey].color || '#000000';
        }
      });
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || !this.selectedElementKey) return;
      const rect = canvas.getBoundingClientRect();
      const deltaX = ((e.clientX - this.dragStartX) / rect.width) * 100;
      const deltaY = ((e.clientY - this.dragStartY) / rect.height) * 100;

      let newX = Math.max(0, Math.min(90, this.elemInitialX + deltaX));
      let newY = Math.max(0, Math.min(90, this.elemInitialY + deltaY));

      // Snap to grid
      let snapped = false;
      if (this.snapToGrid && this.gridSize) {
        const snapX = Math.round(newX / this.gridSize) * this.gridSize;
        const snapY = Math.round(newY / this.gridSize) * this.gridSize;
        const threshold = this.gridSize * 0.4;
        if (Math.abs(newX - snapX) < threshold) { newX = snapX; snapped = true; }
        if (Math.abs(newY - snapY) < threshold) { newY = snapY; snapped = true; }
      }

      // Flash snap indicator
      const indicator = document.getElementById('snapIndicator');
      if (indicator) {
        indicator.classList.toggle('visible', snapped);
      }

      this.config.overlay[this.selectedElementKey].x = Math.round(newX);
      this.config.overlay[this.selectedElementKey].y = Math.round(newY);

      const activeElem = canvas.querySelector(`.drag-element[data-key="${this.selectedElementKey}"]`);
      if (activeElem) {
        activeElem.style.left = `${Math.round(newX)}%`;
        activeElem.style.top  = `${Math.round(newY)}%`;
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.saveToLocalStorage();
      }
    });
  },

  saveToLocalStorage() {
    try {
      localStorage.setItem('xamcard_config', JSON.stringify(this.config));
    } catch (err) {
      console.warn('LocalStorage save warning:', err);
    }
  },

  async resetCustomDesign() {
    const ok = await window.Modal.confirm(
      'Background custom, posisi overlay, dan ukuran canvas akan dihapus dan dikembalikan ke pengaturan awal. Logo & stempel tidak terpengaruh.',
      'Reset Desain Custom?',
      'Ya, Reset',
      'Batal'
    );
    if (!ok) return;

    const defaults = this.DEFAULT_CUSTOM_CONFIG;
    this.config.customBgUrl = defaults.customBgUrl;
    this.config.canvasSizeKey = defaults.canvasSizeKey;
    this.config.canvasCustomW = defaults.canvasCustomW;
    this.config.canvasCustomH = defaults.canvasCustomH;
    this.config.overlay = JSON.parse(JSON.stringify(defaults.overlay));

    this.selectedElementKey = null;
    this.showGrid = true;
    this.snapToGrid = true;
    this.gridSize = 5;

    const bgInput = document.getElementById('inputCustomBgFile');
    if (bgInput) bgInput.value = '';

    const fontProp = document.getElementById('overlayFontSize');
    const colorProp = document.getElementById('overlayFontColor');
    if (fontProp) fontProp.value = 12;
    if (colorProp) colorProp.value = '#000000';

    this.saveToLocalStorage();
    if (this.activeMode === 'custom') this._renderGridBar();
    this.renderPreview();
    if (window.PrintModule) window.PrintModule.generatePrintPages();

    window.Modal.success('Desain custom berhasil direset ke pengaturan awal.');
  },

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('xamcard_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      }
    } catch (err) {
      console.warn('LocalStorage load warning:', err);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => window.DesignerModule.init());
