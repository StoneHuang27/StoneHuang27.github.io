// ===== CLOUD SYNC MODULE (Supabase — China accessible) =====
const CloudSync = {
  supabase: null,
  initialized: false,
  syncing: false,
  channel: null,
  pollTimer: null,
  lastError: null,

  async init() {
    const savedConfig = localStorage.getItem('nutripro_supabaseConfig');
    const config = savedConfig ? JSON.parse(savedConfig) : SUPABASE_CONFIG;
    if (!config || !config.url || config.url === 'SUPABASE_URL_PLACEHOLDER') {
      this.lastError = '请先配置 Supabase 连接信息';
      return false;
    }
    if (!config.anonKey || config.anonKey === 'SUPABASE_ANON_KEY_PLACEHOLDER') {
      this.lastError = '缺少 Supabase Anon Key';
      return false;
    }
    try {
      // Wait for Supabase SDK if not yet loaded (up to 10 seconds)
      if (typeof supabase === 'undefined' || !supabase.createClient) {
        var _waited = 0;
        while ((typeof supabase === 'undefined' || !supabase.createClient) && !window._supabaseLoadFailed && _waited < CONFIG.SDK_TIMEOUT_MS) {
          await new Promise(function(r) { setTimeout(r, 200); });
          _waited += 200;
        }
      }
      if (typeof supabase === 'undefined' || !supabase.createClient) {
        this.lastError = 'Supabase SDK 未加载（网络问题或CDN不可达）。可点击"重试加载SDK"按钮重试。';
        return false;
      }
      this.supabase = supabase.createClient(config.url, config.anonKey);
      // Test connection — read admin_config
      const { data, error } = await this.supabase.from('admin_config').select('key').limit(1);
      if (error) {
        this.lastError = '数据库连接失败: ' + error.message;
        this.updateIndicator('error');
        return false;
      }
      this.initialized = true;
      this.lastError = null;
      this.updateIndicator('connected');
      console.log('CloudSync: Supabase connected');
      return true;
    } catch(e) {
      console.error('CloudSync init error:', e);
      this.lastError = '初始化错误: ' + e.message;
      this.updateIndicator('error');
      return false;
    }
  },

  // Push data to Supabase sync_data table
  async push(key, data) {
    if (!this.initialized || !this.supabase) return;
    try {
      const { error } = await this.supabase
        .from('sync_data')
        .upsert({ key: key, data: JSON.parse(JSON.stringify(data)), updated_at: new Date().toISOString() });
      if (error) console.error('CloudSync push error:', key, error);
    } catch(e) {
      console.error('CloudSync push error:', key, e);
    }
  },

  // Pull data from Supabase sync_data table
  async pull(key) {
    if (!this.initialized || !this.supabase) return null;
    try {
      const { data, error } = await this.supabase
        .from('sync_data')
        .select('data')
        .eq('key', key)
        .single();
      if (error || !data) return null;
      return data.data;
    } catch(e) {
      console.error('CloudSync pull error:', key, e);
      return null;
    }
  },

  // Pull all shared data from Supabase and update localStorage
  async pullAll() {
    if (!this.initialized || !this.supabase) return;
    this.syncing = true;
    this.updateIndicator('syncing');
    try {
      const keys = ['auth', 'users', 'diet'];
      for (const key of keys) {
        const cloudData = await this.pull(key);
        if (cloudData !== null) {
          switch(key) {
            case 'auth':
              localStorage.setItem('nutripro_auth', JSON.stringify(cloudData));
              break;
            case 'users':
              // Normalize snake_case (from Supabase DB) to camelCase (app format)
              const normalizedUsers = cloudData.map(function(u) {
                return {
                  ...u,
                  passwordHash: u.password_hash || u.passwordHash,
                  trainingYears: u.training_years || u.trainingYears,
                  grantedPermissions: u.granted_permissions || u.grantedPermissions
                };
              });
              localStorage.setItem('nutripro_users', JSON.stringify(normalizedUsers));
              break;
            case 'diet':
              localStorage.setItem('nutripro_allDietData', JSON.stringify(cloudData));
              break;
          }
        }
      }
      console.log('CloudSync: All data pulled from cloud');
    } catch(e) {
      console.error('CloudSync pullAll error:', e);
    }
    this.syncing = false;
    this.updateIndicator('connected');
  },

  // Set up real-time subscription via Supabase Realtime
  listen() {
    if (!this.initialized || !this.supabase) return;
    // Clean up old channel
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    const self = this;
    this.channel = this.supabase
      .channel('nutripro-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sync_data' },
        (payload) => {
          if (self.syncing) return;
          const key = payload.new?.key;
          if (!key) return;
          const cloudData = payload.new?.data;
          console.log('CloudSync: Received update for', key);
          switch(key) {
            case 'auth':
              localStorage.setItem('nutripro_auth', JSON.stringify(cloudData));
              try {
                const newApps = (cloudData.applications || []).filter(a => a.status === 'pending');
                const oldAuth = getAuthData();
                const oldAppCount = (oldAuth.applications || []).filter(a => a.status === 'pending').length;
                if (newApps.length > oldAppCount) {
                  showSyncNotification('📩 收到新的用户申请，请前往管理面板处理');
                }
                // Check if current user's upgrade application was approved
                if (currentSession && currentSession.role === 'guest') {
                  const myApprovedApp = (cloudData.applications || []).find(a =>
                    a.userId === currentSession.userId &&
                    a.type === 'upgrade' &&
                    a.status === 'approved' &&
                    a.generatedUsername &&
                    !a._notified
                  );
                  if (myApprovedApp) {
                    myApprovedApp._notified = true;
                    showUpgradeApprovedModal(myApprovedApp);
                  }
                }
                renderAdminSidebar();
              } catch(e) { console.error('Auth sync error:', e); }
              break;
            case 'users':
              // Normalize snake_case → camelCase
              const normUsers = cloudData.map(function(u) {
                return {
                  ...u,
                  passwordHash: u.password_hash || u.passwordHash,
                  trainingYears: u.training_years || u.trainingYears,
                  grantedPermissions: u.granted_permissions || u.grantedPermissions
                };
              });
              localStorage.setItem('nutripro_users', JSON.stringify(normUsers));
              users = normUsers;
              if (currentUser) {
                currentUser = users.find(u => u.id === currentUser.id) || currentUser;
                localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
              }
              renderUsers();
              renderUserForm();
              break;
            case 'diet':
              localStorage.setItem('nutripro_allDietData', JSON.stringify(cloudData));
              allDietData = cloudData;
              renderDietFoods();
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('CloudSync: Realtime subscribed');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('CloudSync: Realtime error', status);
          self.updateIndicator('error');
          self.lastError = '实时同步断开，将使用轮询模式';
          showSyncNotification('⚠️ 实时同步断开，切换到轮询模式');
        }
      });

    // Periodic polling as fallback (every 30s)
    if (self.pollTimer) clearInterval(self.pollTimer);
    self.pollTimer = setInterval(async () => {
      if (!self.initialized || self.syncing) return;
      try {
        await self.pullAll();
        const newUsers = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
        const newDiet = JSON.parse(localStorage.getItem('nutripro_allDietData') || '{}');
        if (JSON.stringify(newUsers) !== JSON.stringify(users)) {
          users = newUsers;
          if (currentUser) currentUser = users.find(u => u.id === currentUser.id) || currentUser;
          renderUsers();
          renderUserForm();
        }
        if (JSON.stringify(newDiet) !== JSON.stringify(allDietData)) {
          allDietData = newDiet;
          renderDietFoods();
        }
        const auth = getAuthData();
        const appCountEl = document.getElementById('appCount');
        const pendingCount = (auth.applications || []).filter(a => a.status === 'pending').length;
        if (appCountEl && parseInt(appCountEl.textContent) !== pendingCount) {
          renderAdminSidebar();
          if (pendingCount > parseInt(appCountEl.textContent || '0')) {
            showSyncNotification('📩 收到新的用户申请');
          }
        }
      } catch(e) { /* silently fail */ }
    }, CONFIG.POLL_INTERVAL_MS);
  },

  // Update sync status indicator
  updateIndicator(status) {
    const el = document.getElementById('syncIndicator');
    if (!el) return;
    el.style.display = 'inline-flex';
    switch(status) {
      case 'connected':
        el.textContent = '☁️';
        el.title = '云同步已连接 (Supabase)';
        el.style.color = 'var(--success)';
        break;
      case 'syncing':
        el.textContent = '🔄';
        el.title = '正在同步...';
        el.style.color = 'var(--warning)';
        break;
      case 'error':
        el.textContent = '⚠️';
        el.title = '云同步出错';
        el.style.color = 'var(--danger)';
        break;
      case 'offline':
        el.textContent = '📴';
        el.title = '云同步离线';
        el.style.color = 'var(--text-dim)';
        break;
    }
  },

  // Disconnect and clean up
  disconnect() {
    if (this.channel && this.supabase) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.initialized = false;
    this.supabase = null;
    this.lastError = null;
    localStorage.removeItem('nutripro_supabaseConfig');
    const el = document.getElementById('syncIndicator');
    if (el) el.style.display = 'none';
  }
};

// Supabase config UI functions
function openFirebaseConfig() {
  const modal = document.getElementById('firebaseConfigModal');
  modal.classList.add('show');
  const savedConfig = localStorage.getItem('nutripro_supabaseConfig');
  if (savedConfig) {
    document.getElementById('firebaseConfigInput').value = JSON.stringify(JSON.parse(savedConfig), null, 2);
    document.getElementById('firebaseStatus').innerHTML = '<span style="color:var(--success);">✅ 已配置，当前状态: ' + (CloudSync.initialized ? '已连接' : '未连接') + '</span>';
  } else if (SUPABASE_CONFIG.url !== 'SUPABASE_URL_PLACEHOLDER') {
    document.getElementById('firebaseConfigInput').value = JSON.stringify(SUPABASE_CONFIG, null, 2);
    document.getElementById('firebaseStatus').innerHTML = '<span style="color:var(--warning);">⚠️ 使用默认配置，尚未连接。点击「保存并连接」。</span>';
  } else {
    document.getElementById('firebaseStatus').innerHTML = '<span style="color:var(--text-muted);">未配置云同步。请输入 Supabase 项目 URL 和 Anon Key。</span>';
  }
  // Show SDK status
  updateSdkStatus();
}
function updateSdkStatus() {
  var btn = document.getElementById('retrySdkBtn');
  var statusEl = document.getElementById('firebaseStatus');
  if (!btn || !statusEl) return;
  if (window._supabaseReady) {
    btn.style.display = 'none';
    // Don't overwrite existing status message if it already shows success/error
  } else if (window._supabaseLoadFailed) {
    btn.style.display = 'inline-flex';
    // Append SDK warning to existing status
    var current = statusEl.innerHTML;
    if (current.indexOf('SDK') === -1 && current.indexOf('sdk') === -1) {
      statusEl.innerHTML = current + '<br><span style="color:var(--warning);margin-top:4px;display:inline-block;">⚠️ Supabase SDK 未加载（所有CDN源均失败），云同步功能不可用。点击"重试加载 SDK"按钮重试。</span>';
    }
  } else {
    btn.style.display = 'inline-flex';
  }
}
function closeFirebaseConfig() {
  document.getElementById('firebaseConfigModal').classList.remove('show');
}

// Parse Supabase config (JSON with url and anonKey)
function parseFirebaseConfig(input) {
  let str = input.trim().replace(/;\s*$/, '');
  str = str.replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '');
  try { return JSON.parse(str); } catch(e) {}
  let fixed = str.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');
  fixed = fixed.replace(/'/g, '"');
  try { return JSON.parse(fixed); } catch(e2) {}
  try {
    const obj = (new Function('return (' + input + ')'))();
    if (obj && typeof obj === 'object' && (obj.url || obj.anonKey)) return obj;
  } catch(e3) {}
  throw new Error('无法解析配置。请粘贴 Supabase 项目设置中的 URL 和 Anon Key。');
}

async function saveFirebaseConfig() {
  const input = document.getElementById('firebaseConfigInput').value.trim();
  const statusEl = document.getElementById('firebaseStatus');
  if (!input) {
    statusEl.innerHTML = '<span style="color:var(--danger);">❌ 请输入 Supabase 配置</span>';
    return;
  }
  try {
    const config = parseFirebaseConfig(input);
    if (!config.url || !config.anonKey) {
      throw new Error('缺少必要字段 (url, anonKey)');
    }
    CloudSync.disconnect();
    localStorage.setItem('nutripro_supabaseConfig', JSON.stringify(config));
    // Update runtime config
    SUPABASE_CONFIG.url = config.url;
    SUPABASE_CONFIG.anonKey = config.anonKey;
    statusEl.innerHTML = '<span style="color:var(--warning);">⏳ 正在连接...</span>';
    // Wait for SDK if needed before init
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      statusEl.innerHTML = '<span style="color:var(--warning);">⏳ 等待 SDK 加载...</span>';
      var _sw = 0;
      while ((typeof supabase === 'undefined' || !supabase.createClient) && !window._supabaseLoadFailed && _sw < CONFIG.SDK_RETRY_TIMEOUT_MS) {
        await new Promise(function(r) { setTimeout(r, 200); });
        _sw += 200;
      }
    }
    const success = await CloudSync.init();
    if (success) {
      await CloudSync.pullAll();
      CloudSync.listen();
      // Push current local data if cloud is empty
      const cloudAuth = await CloudSync.pull('auth');
      if (!cloudAuth) {
        await CloudSync.push('auth', JSON.parse(localStorage.getItem('nutripro_auth') || '{}'));
        await CloudSync.push('users', JSON.parse(localStorage.getItem('nutripro_users') || '[]'));
        await CloudSync.push('diet', JSON.parse(localStorage.getItem('nutripro_allDietData') || '{}'));
      }
      statusEl.innerHTML = '<span style="color:var(--success);">✅ Supabase 云同步已连接！数据将自动同步到所有设备。</span>';
      users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
      allDietData = JSON.parse(localStorage.getItem('nutripro_allDietData') || '{}');
      renderUsers();
      renderUserForm();
    } else {
      statusEl.innerHTML = '<span style="color:var(--danger);">❌ 连接失败: ' + (CloudSync.lastError || '未知错误') + '</span>';
    }
  } catch(e) {
    statusEl.innerHTML = '<span style="color:var(--danger);">❌ 配置解析错误: ' + e.message + '</span>';
  }
}
async function testFirebaseConnection() {
  const input = document.getElementById('firebaseConfigInput').value.trim();
  const statusEl = document.getElementById('firebaseStatus');
  if (!input) {
    statusEl.innerHTML = '<span style="color:var(--danger);">❌ 请先输入配置</span>';
    return;
  }
  // Wait for Supabase SDK to be ready (up to 15 seconds)
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    statusEl.innerHTML = '<span style="color:var(--warning);">⏳ 等待 SDK 加载...</span>';
    var waited = 0;
    while ((typeof supabase === 'undefined' || !supabase.createClient) && !window._supabaseLoadFailed && waited < 15000) {
      await new Promise(function(r) { setTimeout(r, 300); });
      waited += 300;
    }
  }
  try {
    const config = parseFirebaseConfig(input);
    if (!config.url || !config.anonKey) throw new Error('缺少必要字段 (url, anonKey)');
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      // SDK still not loaded — offer retry
      statusEl.innerHTML = '<span style="color:var(--danger);">❌ 连接失败: Supabase SDK 未加载。<button onclick="retrySupabaseSDK();testFirebaseConnection();" style="background:var(--accent);border:none;color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;margin-left:8px;font-size:12px;">点击重试加载</button></span>';
      return;
    }
    const testClient = supabase.createClient(config.url, config.anonKey);
    const { data, error } = await testClient.from('admin_config').select('key').limit(1);
    if (error) throw error;
    statusEl.innerHTML = '<span style="color:var(--success);">✅ 连接测试成功！Supabase 可读写。</span>';
  } catch(e) {
    let msg = e.message || '未知错误';
    statusEl.innerHTML = '<span style="color:var(--danger);">❌ 连接失败: ' + msg + '</span>';
  }
}
function disconnectFirebase() {
  if (confirm('确定要断开云同步吗？本地数据不受影响，但数据将不再同步到云端。')) {
    CloudSync.disconnect();
    document.getElementById('firebaseStatus').innerHTML = '<span style="color:var(--warning);">⚠️ 云同步已断开</span>';
  }
}

// ===== SYNC NOTIFICATION =====
function handleSyncIndicatorClick() {
  if (CloudSync.initialized) {
    // Manual sync: pull latest data from cloud
    showSyncNotification('🔄 正在同步数据...');
    CloudSync.pullAll().then(() => {
      // Refresh in-memory data
      users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
      allDietData = JSON.parse(localStorage.getItem('nutripro_allDietData') || '{}');
      if (currentUser) {
        currentUser = users.find(u => u.id === currentUser.id) || currentUser;
      }
      renderUsers();
      renderUserForm();
      renderAdminSidebar();
      renderDietFoods();
      showSyncNotification('✅ 数据同步完成');
      CloudSync.updateIndicator('connected');
    }).catch(e => {
      showSyncNotification('❌ 同步失败: ' + e.message);
    });
  } else {
    openFirebaseConfig();
  }
}

function showSyncNotification(message) {
  // Remove existing notification if any
  const existing = document.getElementById('syncNotification');
  if (existing) existing.remove();
  // Create floating notification
  const notif = document.createElement('div');
  notif.id = 'syncNotification';
  notif.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:var(--accent);color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;animation:slideDown 0.3s ease;max-width:360px;';
  notif.textContent = message;
  notif.onclick = function() { notif.remove(); };
  document.body.appendChild(notif);
  // Auto-dismiss after 8 seconds
  setTimeout(function() {
    if (notif.parentNode) notif.remove();
  }, CONFIG.NOTIFICATION_TIMEOUT_MS);
}