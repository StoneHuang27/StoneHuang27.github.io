// ===== UPGRADE APPROVED MODAL =====
function showUpgradeApprovedModal(app) {
  // Remove existing modal if any
  const existing = document.getElementById('upgradeApprovedModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'upgradeApprovedModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style="background:var(--card-bg);border-radius:16px;padding:32px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🎉</div>
    <h2 style="color:var(--accent-light);margin-bottom:8px;">申请已通过！</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px;">管理员已批准您的常驻用户申请，以下是您的登录凭据：</p>
    <div style="background:var(--input-bg);border-radius:10px;padding:16px;margin-bottom:20px;text-align:left;">
      <div style="margin-bottom:10px;"><span style="color:var(--text-muted);font-size:12px;">用户名</span><br><code style="font-size:18px;color:var(--accent-light);user-select:all;" id="approvedUsername">${escapeHtml(app.generatedUsername)}</code></div>
      <div><span style="color:var(--text-muted);font-size:12px;">密码</span><br><code style="font-size:18px;color:var(--accent-light);user-select:all;" id="approvedPassword">${escapeHtml(app.generatedPassword)}</code></div>
    </div>
    <p style="color:var(--warning);font-size:12px;margin-bottom:16px;">请立即复制保存！登录后可在用户信息页面修改用户名和密码。</p>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button onclick="copyApprovedCredentials()" style="padding:10px 20px;border-radius:8px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-size:14px;">📋 复制凭据</button>
      <button onclick="showLoginWithCredentials('${escapeHtml(app.generatedUsername)}','${escapeHtml(app.generatedPassword)}')" style="padding:10px 20px;border-radius:8px;border:none;background:var(--success);color:#fff;cursor:pointer;font-size:14px;">🔑 立即登录</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function copyApprovedCredentials() {
  const username = document.getElementById('approvedUsername')?.textContent || '';
  const password = document.getElementById('approvedPassword')?.textContent || '';
  const text = `用户名: ${username}\n密码: ${password}`;
  navigator.clipboard.writeText(text).then(() => {
    showSyncNotification('✅ 凭据已复制到剪贴板');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showSyncNotification('✅ 凭据已复制到剪贴板');
  });
}

function showLoginWithCredentials(username, password) {
  loginWithApprovedCredentials(username, password);
}

async function loginWithApprovedCredentials(username, password) {
  const hash = await sha256(password);
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('verify_user_login', { p_name: username, p_password_hash: hash });
      if (error) throw error;
      if (data && data.success) {
        const auth = getAuthData();
        const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
        const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
        saveSession({ role:'resident', userId:data.user_id, userName:data.name, expiresAt, loginAt: Date.now() });
        currentUser = {
          id: data.user_id, name: data.name, role: data.role,
          gender: data.gender || 'male', age: data.age || 25, height: data.height || 170,
          weight: data.weight || 65, bodyfat: data.bodyfat || 15, activity: data.activity || 'moderate',
          trainingYears: data.training_years || 1, goal: data.goal || 'maintain',
          grantedPermissions: data.granted_permissions || []
        };
        localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
        const modal = document.getElementById('upgradeApprovedModal');
        if (modal) modal.remove();
        enterApp();
        return;
      }
    } catch(e) { console.warn('Login with approved credentials failed:', e); }
  }
  // Fallback: local login
  const users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  const user = users.find(u => u.name === username && u.passwordHash === hash);
  if (user) {
    const auth = getAuthData();
    const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
    const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
    saveSession({ role:'resident', userId:user.id, userName:user.name, expiresAt, loginAt: Date.now() });
    currentUser = user;
    localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
    const modal = document.getElementById('upgradeApprovedModal');
    if (modal) modal.remove();
    enterApp();
  } else {
    alert('登录失败，请手动使用凭据登录');
  }
}

// ===== AUTH SYSTEM =====
const AUTH_KEY = 'nutripro_auth';
const SESSION_KEY = 'nutripro_session';
const DEFAULT_ADMIN_KEY_HASH = '6f0a7e73b4f5e5a8d2c1b3e4f5a6d7c8'; // placeholder, set on first run

// currentSession declared in state.js

function getAuthData() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || {}; } catch { return {}; }
}
function saveAuthData(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  CloudSync.push('auth', data);
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  currentSession = session;
}

// Initialize auth system on first run
function initAuthSystem() {
  let auth = getAuthData();
  if (!auth.adminKeyHash) {
    // Pre-computed SHA256('HS25324*')
    auth.adminKeyHash = '4281d01508ec16626fe3da0fabdb5d487f4950a97f9755532f36c4d14767773b';
    auth.inviteCodes = [];
    auth.applications = [];
    auth.userGrants = {};
    auth.sessionDays = 30;
    saveAuthData(auth);
  }
}

// Check if session is valid
function checkSession() {
  const session = getSession();
  if (!session) return false;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    localStorage.removeItem(SESSION_KEY);
    currentSession = null;
    return false;
  }
  currentSession = session;
  return true;
}

// Get current user role
function getCurrentRole() {
  if (!currentSession) return null;
  return currentSession.role;
}

// Check if current user has permission for a module
function hasPermission(module) {
  const role = getCurrentRole();
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'resident') return true;
  if (role === 'guest') {
    // Check if guest has been granted specific permission
    if (!currentSession.userId) return false;
    const auth = getAuthData();
    const grants = auth.userGrants && auth.userGrants[currentSession.userId];
    return grants && grants.includes(module);
  }
  return false;
}

// Apply permission UI based on current role
function applyPermissions() {
  const role = getCurrentRole();

  // Show/hide admin panel button
  const adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) adminBtn.style.display = role === 'admin' ? '' : 'none';

  // Show/hide add food button
  const addFoodBtn = document.getElementById('addFoodBtn');
  if (addFoodBtn) addFoodBtn.style.display = (role === 'admin' || role === 'resident') ? '' : 'none';

  // Update tab locked states
  document.querySelectorAll('.tab-btn[data-perm]').forEach(btn => {
    const perm = btn.getAttribute('data-perm');
    if (hasPermission(perm)) {
      btn.classList.remove('locked');
    } else {
      btn.classList.add('locked');
    }
  });

  // Update page locked states
  document.querySelectorAll('.page[data-perm-page]').forEach(page => {
    const perm = page.getAttribute('data-perm-page');
    if (hasPermission(perm)) {
      page.classList.remove('perm-locked');
    } else {
      page.classList.add('perm-locked');
    }
  });

  // Update user button
  const userBtn = document.getElementById('userBtn');
  if (userBtn && currentSession) {
    let roleBadge = '';
    if (role === 'admin') roleBadge = '<span class="role-badge admin">管理员</span>';
    else if (role === 'resident') roleBadge = '<span class="role-badge resident">常驻</span>';
    else roleBadge = '<span class="role-badge guest">普通</span>';
    userBtn.innerHTML = `👤 ${escapeHtml(currentSession.userName || '用户')} ${roleBadge}`;
  }
}

// ===== SHOW/HIDE PASSWORD =====
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

// ===== LOGIN FUNCTIONS =====
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  if (tab === 'admin') {
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('authAdmin').style.display = '';
    document.getElementById('authResident').style.display = 'none';
  } else {
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('authAdmin').style.display = 'none';
    document.getElementById('authResident').style.display = '';
  }
}

function toggleResidentRegister(show) {
  document.getElementById('authResidentLogin').style.display = show ? 'none' : '';
  document.getElementById('authResidentRegister').style.display = show ? '' : 'none';
}

async function loginAsAdmin() {
  const key = document.getElementById('adminKeyInput').value.trim();
  const errEl = document.getElementById('adminKeyError');
  if (!key) { errEl.textContent = '请输入管理员密钥'; return; }
  const hash = await sha256(key);
  // Try Supabase backend verification first
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('verify_admin_key', { p_key_hash: hash });
      if (error) throw error;
      if (data && data.success) {
        const auth2 = getAuthData();
        const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
        const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
        saveSession({ role:'admin', userId:'admin', userName:'管理员', expiresAt, loginAt: Date.now() });
        enterApp();
        return;
      } else {
        errEl.textContent = (data && data.error) || '密钥错误，请重新输入';
        return;
      }
    } catch(e) {
      console.warn('Supabase admin verify failed, falling back to local:', e);
    }
  }
  // Fallback to local verification
  const auth = getAuthData();
  if (hash === auth.adminKeyHash) {
    const auth2 = getAuthData();
    const days = auth2.sessionDays !== undefined ? auth2.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
    const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
    saveSession({ role:'admin', userId:'admin', userName:'管理员', expiresAt, loginAt: Date.now() });
    enterApp();
  } else {
    errEl.textContent = '密钥错误，请重新输入';
  }
}

async function loginAsResident() {
  const name = document.getElementById('residentNameInput').value.trim();
  const pwd = document.getElementById('residentPwdInput').value;
  const errEl = document.getElementById('residentLoginError');
  if (!name || !pwd) { errEl.textContent = '请输入用户名和密码'; return; }
  const hash = await sha256(pwd);
  // Try Supabase backend verification first
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('verify_user_login', { p_name: name, p_password_hash: hash });
      if (error) throw error;
      if (data && data.success) {
        const auth = getAuthData();
        const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
        const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
        saveSession({ role:'resident', userId:data.user_id, userName:data.name, expiresAt, loginAt: Date.now() });
        currentUser = {
          id: data.user_id, name: data.name, role: data.role,
          gender: data.gender || 'male', age: data.age || 25, height: data.height || 170,
          weight: data.weight || 65, bodyfat: data.bodyfat || 15, activity: data.activity || 'moderate',
          trainingYears: data.training_years || 1, goal: data.goal || 'maintain',
          grantedPermissions: data.granted_permissions || []
        };
        localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
        enterApp();
        checkQuickUserSelect();
        return;
      } else {
        errEl.textContent = (data && data.error) || '登录失败';
        return;
      }
    } catch(e) {
      console.warn('Supabase login failed, falling back to local:', e);
    }
  }
  // Fallback to local verification
  const users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  const user = users.find(u => u.name === name && u.role === 'resident');
  if (!user) { errEl.textContent = '用户名不存在或非常驻用户'; return; }
  if (hash !== user.passwordHash) { errEl.textContent = '密码错误'; return; }
  const auth = getAuthData();
  const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
  const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
  saveSession({ role:'resident', userId:user.id, userName:user.name, expiresAt, loginAt: Date.now() });
  currentUser = user;
  localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
  enterApp();
  checkQuickUserSelect();
}

async function registerResident() {
  const invite = document.getElementById('regInviteInput').value.trim().toUpperCase();
  const name = document.getElementById('regNameInput').value.trim();
  const pwd = document.getElementById('regPwdInput').value;
  const pwd2 = document.getElementById('regPwd2Input').value;
  const errEl = document.getElementById('regError');

  if (!invite) { errEl.textContent = '请输入邀请码'; return; }
  if (!name) { errEl.textContent = '请设定用户名'; return; }
  if (!pwd || pwd.length < 6) { errEl.textContent = '密码至少6位'; return; }
  if (pwd !== pwd2) { errEl.textContent = '两次密码不一致'; return; }

  const hash = await sha256(pwd);
  // Try Supabase backend registration first
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('register_with_invite', {
        p_invite_code: invite,
        p_name: name,
        p_password_hash: hash
      });
      if (error) throw error;
      if (data && data.success) {
        const auth = getAuthData();
        // Mark invite code as used in local auth data and sync to cloud
        const codes = auth.inviteCodes || [];
        const codeIdx = codes.findIndex(c => c.code === invite && !c.used);
        if (codeIdx !== -1) {
          codes[codeIdx].used = true;
          codes[codeIdx].usedBy = name;
          codes[codeIdx].usedAt = Date.now();
          auth.inviteCodes = codes;
          saveAuthData(auth);
          CloudSync.push('auth', auth);
        }
        const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
        const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
        saveSession({ role:'resident', userId:data.user_id, userName:data.name, expiresAt, loginAt: Date.now() });
        currentUser = {
          id: data.user_id, name: data.name, role: 'resident',
          gender: 'male', age: 25, height: 170, weight: 65,
          bodyfat: 15, activity: 'moderate', trainingYears: 1, goal: 'maintain',
          grantedPermissions: []
        };
        localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
        // Pull updated data from cloud
        await CloudSync.pullAll();
        users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
        enterApp();
        checkQuickUserSelect();
        return;
      } else {
        errEl.textContent = (data && data.error) || '注册失败';
        return;
      }
    } catch(e) {
      console.warn('Supabase register failed, falling back to local:', e);
    }
  }
  // Fallback to local registration
  const auth = getAuthData();
  const codes = auth.inviteCodes || [];
  const codeIdx = codes.findIndex(c => c.code === invite && !c.used);
  if (codeIdx === -1) { errEl.textContent = '邀请码无效或已被使用'; return; }

  const users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  if (users.find(u => u.name === name)) { errEl.textContent = '用户名已存在'; return; }

  const user = {
    id: Date.now().toString(),
    name: name,
    passwordHash: hash,
    role: 'resident',
    gender: 'male', age: 25, height: 170, weight: 65,
    bodyfat: 15, activity: 'moderate', trainingYears: 1, goal: 'maintain',
    grantedPermissions: [],
    createdAt: Date.now()
  };
  users.push(user);

  // Mark invite code as used
  codes[codeIdx].used = true;
  codes[codeIdx].usedBy = name;
  codes[codeIdx].usedAt = Date.now();
  auth.inviteCodes = codes;
  saveAuthData(auth);
  // Update global users array and save with cloud sync
  window.users = users;
  localStorage.setItem('nutripro_users', JSON.stringify(users));
  CloudSync.push('users', users);

  // Auto-login
  const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
  const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
  saveSession({ role:'resident', userId:user.id, userName:user.name, expiresAt, loginAt: Date.now() });
  currentUser = user;
  localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
  enterApp();
  checkQuickUserSelect();
}

function loginAsGuest() {
  const auth = getAuthData();
  const days = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
  const expiresAt = days > 0 ? Date.now() + days * 86400000 : 0;
  saveSession({ role:'guest', userId:'guest_' + Date.now(), userName:'普通用户', expiresAt, loginAt: Date.now() });
  enterApp();
}

function enterApp() {
  document.getElementById('authOverlay').classList.add('hidden');
  applyPermissions();
  if (getCurrentRole() === 'admin') {
    renderAdminSidebar();
  }
  // Show quick user select for residents with matching pre-set users
  if (getCurrentRole() === 'resident' && currentSession) {
    checkQuickUserSelect();
  }
}

// ===== QUICK USER SELECT =====
function checkQuickUserSelect() {
  // If resident just logged in and has a matching user in users list, auto-select
  // Otherwise, if there are pre-set users without passwordHash, show picker
  const allUsers = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  const presetUsers = allUsers.filter(u => u.role === 'resident' && !u.passwordHash);
  
  // If current user already matched, skip
  if (currentSession && currentSession.userId && allUsers.find(u => u.id === currentSession.userId && u.name === currentSession.userName)) {
    currentUser = allUsers.find(u => u.id === currentSession.userId);
    saveUsers();
    return;
  }
  
  // If there are preset users, show selection prompt
  if (presetUsers.length > 0 && currentSession) {
    showQuickUserSelect(presetUsers);
  }
}

function showQuickUserSelect(presetUsers) {
  const listEl = document.getElementById('quickUserList');
  const sectionEl = document.getElementById('authQuickSelect');
  if (!listEl || !sectionEl) return;
  
  listEl.innerHTML = presetUsers.map(u => {
    const genderIcon = u.gender === 'female' ? '👩' : '👨';
    return `<div class="quick-user-card" onclick="selectQuickUser('${escapeHtml(u.id)}')">
      <div class="qu-icon">${genderIcon}</div>
      <div>
        <div class="qu-name">${escapeHtml(u.name)}</div>
        <div class="qu-info">${u.gender==='female'?'女':'男'} · ${u.age}岁 · ${u.weight}kg</div>
      </div>
    </div>`;
  }).join('') + `<div class="quick-user-card" onclick="skipQuickUserSelect()">
    <div class="qu-icon">🚫</div>
      <div><div class="qu-name">以上都不是我</div><div class="qu-info">继续使用当前身份</div></div>
    </div>`;
  
  // Show as a modal overlay instead of auth screen
  showQuickSelectModal(presetUsers);
}

function showQuickSelectModal(presetUsers) {
  // Create a temporary modal for quick user selection
  let modal = document.getElementById('quickSelectModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quickSelectModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="auth-card" style="max-height:80vh;overflow-y:auto;">
    <h1>👤 身份确认</h1>
    <div class="auth-sub">管理员已预设以下用户数据，请选择您的身份</div>
    <div id="quickUserListModal">
      ${presetUsers.map(u => {
        const genderIcon = u.gender === 'female' ? '👩' : '👨';
        return `<div class="quick-user-card" onclick="selectQuickUser('${escapeHtml(u.id)}')">
          <div class="qu-icon">${genderIcon}</div>
          <div>
            <div class="qu-name">${escapeHtml(u.name)}</div>
            <div class="qu-info">${u.gender==='female'?'女':'男'} · ${u.age}岁 · ${u.weight}kg</div>
          </div>
        </div>`;
      }).join('')}
      <div class="quick-user-card" onclick="skipQuickUserSelect()">
        <div class="qu-icon">🚫</div>
        <div><div class="qu-name">以上都不是我</div><div class="qu-info">继续使用当前身份</div></div>
      </div>
    </div>
  </div>`;
  modal.style.display = 'flex';
}

function selectQuickUser(userId) {
  const allUsers = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  const user = allUsers.find(u => u.id === userId);
  if (!user) { skipQuickUserSelect(); return; }
  
  // Link this user to the current session
  if (currentSession) {
    currentSession.userId = user.id;
    currentSession.userName = user.name;
    saveSession(currentSession);
  }
  currentUser = user;
  localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
  
  // Close modal
  const modal = document.getElementById('quickSelectModal');
  if (modal) modal.style.display = 'none';
  
  // Refresh UI
  applyPermissions();
  renderUsers();
  renderUserForm();
  renderDietPage();
  const userBtn = document.getElementById('userBtn');
  if (userBtn && currentSession) {
    let roleBadge = '<span class="role-badge resident">常驻</span>';
    userBtn.innerHTML = `👤 ${escapeHtml(currentSession.userName || '用户')} ${roleBadge}`;
  }
}

function skipQuickUserSelect() {
  const modal = document.getElementById('quickSelectModal');
  if (modal) modal.style.display = 'none';
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  currentSession = null;
  currentUser = null;
  location.reload();
}
