/**
 * XamCard - Backup & Restore Module (.json)
 */

window.BackupModule = {
  exportBackup() {
    try {
      const cfg = window.DesignerModule ? window.DesignerModule.config : {};
      const activeMode = window.DesignerModule ? window.DesignerModule.activeMode : 'preset';
      const selectedPreset = window.DesignerModule ? window.DesignerModule.selectedPreset : 'minimal';
      const students = window.ExcelModule ? window.ExcelModule.students : [];

      const backupData = {
        app: 'XamCard',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        activeMode,
        selectedPreset,
        config: cfg,
        students: students
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const schoolNameSlug = (cfg.schoolName || 'Sekolah').replace(/[^a-z0-9]/gi, '_');
      const filename = `Backup_XamCard_${schoolNameSlug}_${new Date().toISOString().slice(0,10)}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.Modal.alert(`Berhasil mengekspor cadangan ke file:\n${filename}`, 'Ekspor Berhasil', 'success');
    } catch (err) {
      console.error(err);
      window.Modal.alert('Gagal mengekspor data cadangan proyek!', 'Ekspor Gagal', 'error');
    }
  },

  importBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        if (!backupData || backupData.app !== 'XamCard') {
          window.Modal.alert('File JSON tidak valid atau bukan berasal dari XamCard!', 'File Tidak Valid', 'error');
          return;
        }

        if (backupData.config && window.DesignerModule) {
          window.DesignerModule.config = { ...window.DesignerModule.config, ...backupData.config };
          if (backupData.activeMode) window.DesignerModule.activeMode = backupData.activeMode;
          if (backupData.selectedPreset) window.DesignerModule.selectedPreset = backupData.selectedPreset;
          window.DesignerModule.saveToLocalStorage();
          
          // Re-populate text inputs in Tab 3
          const setInput = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
          };
          setInput('inputSchoolName', backupData.config.schoolName);
          setInput('inputNpsn', backupData.config.npsn);
          setInput('inputExamTitle', backupData.config.examTitle);
          setInput('inputAcademicYear', backupData.config.academicYear);
          setInput('inputHeadmasterName', backupData.config.headmasterName);
          setInput('inputHeadmasterNip', backupData.config.headmasterNip);
          setInput('inputWatermark', backupData.config.watermarkText);

          window.DesignerModule.renderPreview();
        }

        if (backupData.students && window.ExcelModule) {
          window.ExcelModule.students = backupData.students;
          window.ExcelModule.photosMap.clear();
          backupData.students.forEach(s => {
            if (s.photoData) {
              window.ExcelModule.photosMap.set(s.nisn, s.photoData);
              if (s.fotoName) window.ExcelModule.photosMap.set(s.fotoName, s.photoData);
            }
          });
          window.ExcelModule.renderStudentTable();
          window.ExcelModule.updateStats();
          window.ExcelModule._saveToStorage();
        }

        if (window.PrintModule) {
          window.PrintModule.updateStudentCount();
          window.PrintModule.generatePrintPages();
        }

        window.Modal.alert('Berhasil memulihkan seluruh data proyek XamCard dari file cadangan!', 'Pemulihan Berhasil', 'success');
      } catch (err) {
        console.error(err);
        window.Modal.alert('Gagal memulihkan file cadangan! Pastikan format JSON valid.', 'Pemulihan Gagal', 'error');
      }
    };
    reader.readAsText(file);
  }
};
