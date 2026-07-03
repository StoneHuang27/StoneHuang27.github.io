// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: data-export.js
// Purpose: Local data export (JSON) and import — independent of Supabase
// ============================================================

/**
 * Collect all localStorage keys used by NutriPro and bundle them
 * into a single JSON file with metadata (version, timestamp, app info).
 * Downloads as a .json file automatically.
 */
function exportAllData() {
  if (!confirm(t('export_confirm'))) return;

  var bundle = {
    appName: 'NutriPro',
    appVersion: '1.5.3',
    exportDate: new Date().toISOString(),
    data: {}
  };

  // Collect every nutripro-* key from localStorage
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf('nutripro_') === 0) {
      keys.push(key);
    }
  }

  keys.sort(); // deterministic order
  for (var j = 0; j < keys.length; j++) {
    try {
      var raw = localStorage.getItem(keys[j]);
      bundle.data[keys[j]] = raw ? JSON.parse(raw) : raw;
    } catch (e) {
      // Skip unparseable values (e.g. raw strings)
      bundle.data[keys[j]] = localStorage.getItem(keys[j]);
    }
  }

  // Download as file
  var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var dateStr = new Date().toISOString().slice(0, 10);
  a.download = 'nutripro_backup_' + dateStr + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Notify user
  showSyncNotification(t('export_success'));
}

/**
 * Read a JSON backup file (produced by exportAllData) and restore
 * all keys into localStorage. Optionally merge with existing data
 * by date range selector.
 */
function importLocalData(fileInput) {
  var file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) {
    // Fallback: open a file picker dialog
    fileInput = document.getElementById('importFileInput');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.id = 'importFileInput';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }
    fileInput.onchange = function() {
      if (fileInput.files && fileInput.files[0]) {
        _doImport(fileInput.files[0]);
      }
    };
    fileInput.click();
    return;
  }
  _doImport(file);
}

function _doImport(file) {
  if (!confirm(t('import_confirm'))) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var bundle = JSON.parse(e.target.result);

      // Validate: must have appName and data object
      if (!bundle.appName || bundle.appName !== 'NutriPro' || !bundle.data || typeof bundle.data !== 'object') {
        alert(t('import_error'));
        return;
      }

      var restoredKeys = 0;
      var keys = Object.keys(bundle.data);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = bundle.data[key];
        if (value !== null && typeof value === 'object') {
          localStorage.setItem(key, JSON.stringify(value));
        } else {
          localStorage.setItem(key, String(value || ''));
        }
        restoredKeys++;
      }

      // Reload page to pick up restored data
      showSyncNotification(t('import_success') + ' ' + restoredKeys + ' ' + (currentLang === 'zh' ? '个数据项' : 'keys'));
      setTimeout(function() { location.reload(); }, 1500);
    } catch (err) {
      alert(t('import_error') + ' ' + err.message);
    }
  };
  reader.readAsText(file);
}
