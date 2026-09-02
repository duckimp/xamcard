/**
 * XamCard - Custom Modal Utility
 * Menggantikan alert(), confirm() dengan UI yang konsisten
 */

window.Modal = {
  // Inject modal HTML ke DOM sekali saja
  init() {
    if (document.getElementById('xcModalOverlay')) return;

    const html = `
      <div id="xcModalOverlay" style="
        display:none; position:fixed; inset:0;
        background:rgba(15,23,42,0.55); backdrop-filter:blur(4px);
        z-index:9999; align-items:center; justify-content:center; padding:20px;">
        <div id="xcModalBox" style="
          background:white; border-radius:16px; padding:28px 24px;
          width:100%; max-width:360px; text-align:center;
          box-shadow:0 25px 50px rgba(0,0,0,0.25);
          animation: xcPop 0.2s ease;">
          <div id="xcModalIcon" style="
            width:56px; height:56px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            margin:0 auto 14px; font-size:26px;"></div>
          <div id="xcModalTitle" style="
            font-size:17px; font-weight:700; color:#0f172a; margin-bottom:8px;"></div>
          <div id="xcModalMsg" style="
            font-size:14px; color:#64748b; line-height:1.6; margin-bottom:22px;"></div>
          <div id="xcModalBtns" style="display:flex; gap:10px;"></div>
        </div>
      </div>
      <style>
        @keyframes xcPop {
          from { transform:scale(0.88); opacity:0; }
          to   { transform:scale(1);   opacity:1; }
        }
      </style>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  _show(icon, iconBg, title, message, buttons) {
    this.init();
    const overlay = document.getElementById('xcModalOverlay');
    document.getElementById('xcModalIcon').style.background = iconBg;
    document.getElementById('xcModalIcon').textContent = icon;
    document.getElementById('xcModalTitle').textContent = title;
    document.getElementById('xcModalMsg').textContent = message;

    const btns = document.getElementById('xcModalBtns');
    btns.innerHTML = '';
    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.textContent = btn.label;
      el.style.cssText = `
        flex:1; padding:11px; border:none; border-radius:10px;
        font-size:14px; font-weight:700; cursor:pointer;
        background:${btn.primary ? btn.color || '#2563eb' : '#f1f5f9'};
        color:${btn.primary ? 'white' : '#475569'};
        transition:opacity 0.15s;
      `;
      el.onmouseenter = () => el.style.opacity = '0.85';
      el.onmouseleave = () => el.style.opacity = '1';
      el.onclick = () => {
        overlay.style.display = 'none';
        if (btn.onClick) btn.onClick();
      };
      btns.appendChild(el);
    });

    overlay.style.display = 'flex';
  },

  // Alert biasa — hanya OK
  alert(message, title = 'Perhatian', type = 'warning') {
    const icons    = { warning: '⚠️', error: '❌', success: '✅', info: 'ℹ️' };
    const colors   = { warning: '#fef9c3', error: '#fee2e2', success: '#dcfce7', info: '#eff6ff' };
    const btnColors= { warning: '#d97706', error: '#ef4444', success: '#16a34a', info: '#2563eb' };
    return new Promise(resolve => {
      this._show(icons[type]||'⚠️', colors[type]||'#fef9c3', title, message, [
        { label: 'OK', primary: true, color: btnColors[type]||'#2563eb', onClick: resolve }
      ]);
    });
  },

  // Confirm — OK + Cancel, returns Promise<boolean>
  confirm(message, title = 'Konfirmasi', confirmLabel = 'Ya, Hapus', cancelLabel = 'Batal') {
    return new Promise(resolve => {
      this._show('🗑️', '#fee2e2', title, message, [
        { label: cancelLabel,  primary: false, onClick: () => resolve(false) },
        { label: confirmLabel, primary: true,  color: '#ef4444', onClick: () => resolve(true) }
      ]);
    });
  },

  // Success toast-style (auto close)
  success(message) {
    return this.alert(message, 'Berhasil', 'success');
  }
};

// Auto init saat DOM ready
document.addEventListener('DOMContentLoaded', () => window.Modal.init());
