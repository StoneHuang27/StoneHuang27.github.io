function toggleAdminSidebar(open) {
  const sb = document.getElementById('adminSidebar');
  const bd = document.getElementById('adminBackdrop');
  if (open) {
    sb.classList.add('open');
    bd.classList.add('show');
    renderAdminSidebar();
  } else {
    sb.classList.remove('open');
    bd.classList.remove('show');
  }
}

function renderAdminSidebar() {
  try {
  const auth = getAuthData();
  // Session duration
  const sel = document.getElementById('sessionDuration');
  if (sel) sel.value = auth.sessionDays !== undefined ? auth.sessionDays : CONFIG.DEFAULT_SESSION_DAYS;
  // Update security question status
  updateSecurityQuestionStatus();

  // Applications
  const apps = (auth.applications || []).filter(a => a.status === 'pending');
  const appCountEl = document.getElementById('appCount');
  if (appCountEl) appCountEl.textContent = apps.length;

  const appListEl = document.getElementById('adminAppList');
  if (appListEl) {
    if (apps.length === 0) {
      appListEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">暂无待处理申请</div>';
    } else {
      appListEl.innerHTML = apps.map(app => {
        const typeText = app.type === 'upgrade' ? '申请晋升常驻用户' : `申请查阅: ${{'calc':'计算工具','diet':'饮食记录','advice':'饮食建议'}[app.target] || app.target}`;
        return `<div class="admin-app-card">
          <div class="app-user">${escapeHtml(app.userName)} <span style="font-size:11px;color:var(--text-dim);">${new Date(app.createdAt).toLocaleString()}</span></div>
          <div class="app-type">${typeText}</div>
          ${app.reason ? `<div class="app-reason">理由: ${escapeHtml(app.reason)}</div>` : ''}
          <input class="admin-reply-input" id="reply_${app.id}" placeholder="回复消息（选填）">
          <div class="app-actions">
            <button class="btn-approve" onclick="approveApp('${app.id}')">同意</button>
            <button class="btn-reject" onclick="rejectApp('${app.id}')">拒绝</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Invite codes
  const codes = (auth.inviteCodes || []).filter(c => !c.used);
  const codeListEl = document.getElementById('inviteCodeList');
  if (codeListEl) {
    if (codes.length === 0) {
      codeListEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">暂无有效邀请码</div>';
    } else {
      codeListEl.innerHTML = codes.map(c => `
        <div class="invite-code-item">
          <code>${c.code}</code>
          <button onclick="copyInviteCode('${c.code}')" title="复制">📋</button>
          <button onclick="deleteInviteCode('${c.code}')" title="删除">✕</button>
        </div>
      `).join('');
    }
  }

  // Resident users
  const users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  const residents = users.filter(u => u.role === 'resident');
  const resListEl = document.getElementById('adminResidentList');
  if (resListEl) {
    if (residents.length === 0) {
      resListEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">暂无常驻用户</div>';
    } else {
      resListEl.innerHTML = residents.map(u => {
        const grants = (auth.userGrants && auth.userGrants[u.id]) || [];
        const grantStr = grants.length > 0 ? grants.map(g => ({calc:'计算',diet:'饮食',advice:'建议'}[g]||g)).join(', ') : '全部';
        const presetTag = !u.passwordHash ? ' <span style="font-size:10px;background:rgba(59,130,246,0.2);color:var(--accent-light);padding:1px 6px;border-radius:8px;">待匹配</span>' : '';
        return `<div class="admin-resident-card">
          <div class="rname">${escapeHtml(u.name)}${presetTag} <span style="font-size:11px;color:var(--text-dim);">${u.gender==='male'?'男':'女'} ${u.age}岁 ${u.weight}kg</span></div>
          <div class="rinfo">权限: ${grantStr} | 注册: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</div>
        </div>`;
      }).join('');
    }
  }
  
  // Food Edit Applications
  const foodApps = (auth.foodEditApps || []).filter(a => a.status === 'pending');
  const foodAppEl = document.getElementById('adminFoodAppList');
  const foodAppCountEl = document.getElementById('foodAppCount');
  if (foodAppCountEl) foodAppCountEl.textContent = foodApps.length;
  if (foodAppEl) {
    if (foodApps.length === 0) {
      foodAppEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">暂无食物修改申请</div>';
    } else {
      foodAppEl.innerHTML = `<div style="margin-bottom:8px;">
        <button class="auth-btn auth-btn-primary" style="width:auto;padding:4px 12px;font-size:11px;" onclick="approveAllFoodEditApps()">✅ 一键审批全部 (${foodApps.length})</button>
      </div>` + foodApps.map(app => {
        const typeText = app.type === 'add' ? '➕ 添加食物' : '✏️ 修改食物';
        const dataPreview = Object.entries(app.data).filter(([k,v]) => k !== 'dietTags' && v && v !== 0 && v !== '' && v !== '-' && k !== 'id').slice(0,6).map(([k,v]) => `${k}:${v}`).join(', ');
        return `<div class="food-edit-app-card">
          <div class="fea-header">
            <span class="fea-user">${escapeHtml(app.userName)} - ${typeText}</span>
            <span class="fea-time">${new Date(app.createdAt).toLocaleString()}</span>
          </div>
          <div class="fea-desc"><strong>${escapeHtml(app.foodName)}</strong><br>${dataPreview}${app.reason ? '<br>说明: '+escapeHtml(app.reason) : ''}</div>
          <div class="fea-actions">
            <button class="btn-approve" onclick="approveFoodEditApp('${app.id}')">同意</button>
            <button class="btn-reject" onclick="rejectFoodEditApp('${app.id}')">拒绝</button>
          </div>
        </div>`;
      }).join('');
    }
  }
  } catch(e) { console.error('renderAdminSidebar error:', e); }
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random()*chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random()*chars.length)];
  const auth = getAuthData();
  if (!auth.inviteCodes) auth.inviteCodes = [];
  auth.inviteCodes.push({ code, createdAt: Date.now(), used: false });
  saveAuthData(auth);
  // Save to Supabase invite_codes table via RPC (bypasses RLS)
  if (CloudSync.initialized && CloudSync.supabase) {
    CloudSync.supabase.rpc('create_invite_code', { p_code: code }).then(({data, error}) => {
      if (error) console.warn('Failed to save invite code to Supabase:', error);
    });
  }
  renderAdminSidebar();
}

function copyInviteCode(code) {
  navigator.clipboard.writeText(code).then(() => alert('邀请码已复制: ' + code));
}

function deleteInviteCode(code) {
  const auth = getAuthData();
  auth.inviteCodes = (auth.inviteCodes || []).filter(c => c.code !== code);
  saveAuthData(auth);
  // Also delete from Supabase invite_codes table via RPC (bypasses RLS)
  if (CloudSync.initialized && CloudSync.supabase) {
    CloudSync.supabase.rpc('delete_invite_code', { p_code: code }).then(({data, error}) => {
      if (error) console.warn('Failed to delete invite code from Supabase:', error);
    });
  }
  renderAdminSidebar();
}

async function approveApp(appId) {
  const auth = getAuthData();
  const app = (auth.applications || []).find(a => a.id === appId);
  if (!app) return;
  app.status = 'approved';
  const replyEl = document.getElementById('reply_' + appId);
  app.adminReply = replyEl ? replyEl.value.trim() : '';
  app.processedAt = Date.now();

  // Grant permission or upgrade
  if (app.type === 'upgrade') {
    // Generate random username and password for the user
    const genUsername = 'user_' + Math.random().toString(36).substring(2, 8);
    const genPassword = Math.random().toString(36).substring(2, 10) + Math.floor(Math.random()*90+10);
    const genPasswordHash = await sha256(genPassword);

    // Store generated credentials in the application for user notification
    app.generatedUsername = genUsername;
    app.generatedPassword = genPassword;

    // Create resident user with generated credentials
    const users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
    const newUser = {
      id: app.userId || Date.now().toString(),
      name: genUsername,
      passwordHash: genPasswordHash,
      role: 'resident',
      gender: 'male', age: 25, height: 170, weight: 65, bodyfat: 15,
      activity: 'moderate', trainingYears: 1, goal: 'maintain',
      grantedPermissions: [],
      createdAt: Date.now(),
      originalGuestId: app.userId
    };
    users.push(newUser);
    localStorage.setItem('nutripro_users', JSON.stringify(users));
    CloudSync.push('users', users);
    window.users = users;

    // Update Supabase: create user record and update application
    if (CloudSync.initialized && CloudSync.supabase) {
      CloudSync.supabase.from('users').insert({
        id: newUser.id, name: genUsername, password_hash: genPasswordHash, role: 'resident',
        gender: 'male', age: 25, height: 170, weight: 65, bodyfat: 15,
        activity: 'moderate', training_years: 1, goal: 'maintain', granted_permissions: []
      }).then(({error}) => {
        if (error) console.warn('Failed to create resident user in Supabase:', error);
      });
      CloudSync.supabase.from('applications').update({
        status: 'approved', admin_reply: app.adminReply, processed_at: new Date().toISOString()
      }).eq('id', appId).then(({error}) => {
        if (error) console.warn('Failed to update application in Supabase:', error);
      });
    }

    // Push updated auth data with generated credentials so user can receive them
    saveAuthData(auth);
    renderAdminSidebar();
    applyPermissions();
    return; // async handling above
  } else if (app.type === 'perm' && app.target) {
    if (!auth.userGrants) auth.userGrants = {};
    if (!auth.userGrants[app.userId]) auth.userGrants[app.userId] = [];
    if (!auth.userGrants[app.userId].includes(app.target)) {
      auth.userGrants[app.userId].push(app.target);
    }
    // Also update Supabase user_permissions table
    if (CloudSync.initialized && CloudSync.supabase) {
      CloudSync.supabase.from('user_permissions').insert({
        user_id: app.userId, module: app.target, granted_by: 'admin'
      }).then(({error}) => {
        if (error) console.warn('Failed to save permission to Supabase:', error);
      });
    }
  }
  saveAuthData(auth);
  // Also update Supabase applications table
  if (CloudSync.initialized && CloudSync.supabase) {
    CloudSync.supabase.from('applications').update({
      status: 'approved', admin_reply: app.adminReply, processed_at: new Date().toISOString()
    }).eq('id', appId).then(({error}) => {
      if (error) console.warn('Failed to update application in Supabase:', error);
    });
  }
  renderAdminSidebar();
  applyPermissions();
}

function rejectApp(appId) {
  const auth = getAuthData();
  const app = (auth.applications || []).find(a => a.id === appId);
  if (!app) return;
  app.status = 'rejected';
  const replyEl = document.getElementById('reply_' + appId);
  app.adminReply = replyEl ? replyEl.value.trim() : '';
  app.processedAt = Date.now();
  saveAuthData(auth);
  renderAdminSidebar();
}

