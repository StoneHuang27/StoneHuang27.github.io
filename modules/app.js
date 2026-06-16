// ===== INIT =====

// siteName, activeFodmapFilter, activeProteinFilter declared in state.js
function showSettings() {
  document.getElementById('settingSiteName').value = siteName || 'NutriPro 运动营养数据平台';
  document.getElementById('settingsModal').classList.add('show');
}
function closeSettings() { document.getElementById('settingsModal').classList.remove('show'); }
function saveSettings() {
  siteName = document.getElementById('settingSiteName').value || 'NutriPro 运动营养数据平台';
  localStorage.setItem('nutripro_siteName', siteName);
  applySiteName();
  closeSettings();
}
function applySiteName() {
  var el = document.getElementById('siteNameSpan');
  if (el) el.textContent = siteName || 'NutriPro 运动营养数据平台';
  document.title = (siteName || 'NutriPro 运动营养数据平台') + t('title_suffix');
}
function toggleFilter(type) {
  if (type === 'fodmap') {
    var val = prompt((currentLang==='zh'?'选择FODMAP等级 (high/medium/low):':'Select FODMAP level (high/medium/low):'), activeFodmapFilter||'');
    if (val === '' || val === null) activeFodmapFilter = null;
    else if (['high','medium','low'].includes(val.toLowerCase())) activeFodmapFilter = val.toLowerCase();
    else { alert(currentLang==='zh'?'请输入 high, medium, 或 low':'Please enter high, medium, or low'); return; }
  }
  if (type === 'protein_quality') {
    var val = prompt((currentLang==='zh'?'选择最低BV值 (例如输入 70):':'Enter minimum BV value (e.g. 70):'), activeProteinFilter||'');
    if (val === '' || val === null) activeProteinFilter = null;
    else activeProteinFilter = parseFloat(val) || null;
  }
  renderFoodGrid();
}
function filterDietFoods() {
  var q = (document.getElementById('dietFoodSearch')?.value||'').toLowerCase();
  var dd = document.getElementById('dietFoodDropdown');
  if(!dd) return;
  var filtered = q ? allFoodsForDiet.filter(function(f){ return f.name.toLowerCase().includes(q) || (f.nameEn||'').toLowerCase().includes(q); }).slice(0,50) : allFoodsForDiet.slice(0,30);
  dd.style.display = 'block';
  dd.innerHTML = filtered.map(function(f){ return '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);color:var(--text);" onmousedown="selectDietFood(\'' + f.id + '\',\'' + f.name.replace(/'/g,"\\'") + '\')">' + escapeHtml(f.name) + '</div>'; }).join('') || '<div style="padding:12px;color:var(--text-muted);">'+t('no_match')+'</div>';
}
function selectDietFood(id, name) {
  document.getElementById('dietFoodSelect').value = id;
  document.getElementById('dietFoodSearch').value = name;
  document.getElementById('dietFoodDropdown').style.display = 'none';
}
function init() {
  // Initialize auth system
  initAuthSystem();

  // Migrate legacy diet data (nutripro_dietFoods → per-user per-date)
  try {
    const legacyData = localStorage.getItem('nutripro_dietFoods');
    if (legacyData) {
      const oldFoods = JSON.parse(legacyData);
      if (Array.isArray(oldFoods) && oldFoods.length > 0 && currentUser) {
        const today = new Date().toISOString().split('T')[0];
        if (!allDietData[currentUser.id]) allDietData[currentUser.id] = {};
        allDietData[currentUser.id][today] = oldFoods;
        saveDietData();
        localStorage.removeItem('nutripro_dietFoods');
      }
    }
  } catch(e) { console.warn('Diet migration error:', e); }

  // Load food database (async)
  loadFoodDB().then(() => {
    renderFoodSidebar();
    renderFoodGrid();
    allFoodsForDiet = FOOD_DB.map(function(f){ return {id:f.id, name:f.name, nameEn:f.nameEn||''}; });
  }).catch(() => {
    // If food_db.json fails to load, show a message
    document.getElementById('foodGrid').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div>食物数据库加载失败，请检查网络连接</div>';
  });

  // Initialize Firebase cloud sync (async)
  initCloudSync();

  // Check session
  if (checkSession()) {
    // Valid session, enter app directly
    document.getElementById('authOverlay').classList.add('hidden');
  } else {
    // No valid session, show login
    document.getElementById('authOverlay').classList.remove('hidden');
  }

  // Check if FOOD_DB is populated (data injected below)
  if(FOOD_DB.length === 0) {
    document.getElementById('foodGrid').innerHTML = '<div class="empty-state"><div class="icon">🔄</div>'+t('loading')+'</div>';
  }
  renderFoodSidebar();
  renderFoodGrid();
  applyI18n();
  document.getElementById('langBtn').textContent = currentLang === 'zh' ? 'EN' : '中文';
  // Search
  document.getElementById('foodSearch').addEventListener('input', () => renderFoodGrid());
  // Init first user if none (but only for resident/admin)
  const role = getCurrentRole();
  if(role === 'admin' || role === 'resident') {
    if(users.length === 0) {
      addUser();
    } else if(!currentUser) {
      // For resident, find matching user
      if (role === 'resident' && currentSession) {
        currentUser = users.find(u => u.id === currentSession.userId) || users[0];
      } else {
        currentUser = users[0];
      }
      saveUsers();
    }
  }
  applySiteName();
  if(currentUser) {
    document.getElementById('userBtn').innerHTML = `👤 ${escapeHtml(currentUser.name)}`;
  }
  // Apply permissions after everything is loaded
  if (checkSession()) {
    applyPermissions();
    if (getCurrentRole() === 'admin') {
      renderAdminSidebar();
    }
  }
}

// ===== CLOUD SYNC INIT =====
async function initCloudSync() {
  // Wait for Supabase SDK to load (max 15 seconds — increased from 8s)
  let waited = 0;
  while (!window._supabaseReady && !window._supabaseLoadFailed && waited < 15000) {
    await new Promise(function(r) { setTimeout(r, 200); });
    waited += 200;
  }
  if (!window._supabaseReady) {
    console.warn('CloudSync: Supabase SDK not loaded, cloud sync disabled');
    if (window._supabaseLoadFailed) {
      CloudSync.lastError = 'Supabase SDK 加载失败。请检查网络连接，或点击"重试加载SDK"按钮。';
    } else {
      CloudSync.lastError = 'Supabase SDK 加载超时（15秒）。请检查网络后重试。';
    }
    const indicator = document.getElementById('syncIndicator');
    if (indicator && SUPABASE_CONFIG.url !== 'SUPABASE_URL_PLACEHOLDER') {
      indicator.style.display = 'inline-flex';
      indicator.textContent = '⚠️';
      indicator.title = CloudSync.lastError;
      indicator.style.color = 'var(--warning)';
      indicator.style.cursor = 'pointer';
    }
    return;
  }
  const success = await CloudSync.init();
  if (success) {
    await CloudSync.pullAll();
    users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
    allDietData = JSON.parse(localStorage.getItem('nutripro_allDietData') || '{}');
    if (currentUser) {
      currentUser = users.find(u => u.id === currentUser.id) || currentUser;
      localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
    }
    CloudSync.listen();
    renderUsers();
    renderUserForm();
    if (document.getElementById('userBtn') && currentUser) {
      document.getElementById('userBtn').innerHTML = `👤 ${escapeHtml(currentUser.name)}`;
    }
  } else {
    if (SUPABASE_CONFIG.url !== 'SUPABASE_URL_PLACEHOLDER') {
      const indicator = document.getElementById('syncIndicator');
      if (indicator) {
        indicator.style.display = 'inline-flex';
        indicator.textContent = '⚠️';
        indicator.title = CloudSync.lastError || '云同步未连接';
        indicator.style.color = 'var(--warning)';
        indicator.style.cursor = 'pointer';
      }
      console.warn('CloudSync: Connection failed -', CloudSync.lastError);
    }
  }
}

