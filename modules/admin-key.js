// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: admin-key.js
// Purpose: Admin key management, security questions, export/import
// ============================================================

// ===== ADMIN KEY MANAGEMENT =====
function showChangeKeyModal() {
  const existing = document.getElementById('changeKeyModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'changeKeyModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style="background:var(--card-bg);border-radius:16px;padding:32px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
    <h3 style="color:var(--accent-light);margin-bottom:16px;">🔑 修改管理员密钥</h3>
    <div style="margin-bottom:12px;"><label style="font-size:13px;color:var(--text-muted);">当前密钥</label><input type="password" id="oldKeyInput" class="auth-input" placeholder="输入当前密钥" style="width:100%;"></div>
    <div style="margin-bottom:12px;"><label style="font-size:13px;color:var(--text-muted);">新密钥</label><input type="password" id="newKeyInput" class="auth-input" placeholder="输入新密钥" style="width:100%;"></div>
    <div style="margin-bottom:16px;"><label style="font-size:13px;color:var(--text-muted);">确认新密钥</label><input type="password" id="confirmKeyInput" class="auth-input" placeholder="再次输入新密钥" style="width:100%;"></div>
    <div id="changeKeyMsg" style="margin-bottom:12px;font-size:13px;"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button onclick="document.getElementById('changeKeyModal').remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);cursor:pointer;">取消</button>
      <button onclick="changeAdminKey()" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;cursor:pointer;">确认修改</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

async function changeAdminKey() {
  const oldKey = document.getElementById('oldKeyInput').value.trim();
  const newKey = document.getElementById('newKeyInput').value.trim();
  const confirmKey = document.getElementById('confirmKeyInput').value.trim();
  const msgEl = document.getElementById('changeKeyMsg');

  if (!oldKey || !newKey || !confirmKey) { msgEl.innerHTML = '<span style="color:var(--danger);">请填写所有字段</span>'; return; }
  if (newKey !== confirmKey) { msgEl.innerHTML = '<span style="color:var(--danger);">两次输入的新密钥不一致</span>'; return; }
  if (newKey.length < 4) { msgEl.innerHTML = '<span style="color:var(--danger);">新密钥长度至少4位</span>'; return; }

  const oldHash = await sha256(oldKey);
  const newHash = await sha256(newKey);

  // Verify old key via Supabase RPC
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('change_admin_key', { p_old_key_hash: oldHash, p_new_key_hash: newHash });
      if (error) throw error;
      if (data && data.success) {
        const auth = getAuthData();
        auth.adminKeyHash = newHash;
        saveAuthData(auth);
        msgEl.innerHTML = '<span style="color:var(--success);">✅ 密钥修改成功！请使用新密钥登录。</span>';
        setTimeout(() => { document.getElementById('changeKeyModal')?.remove(); }, 2000);
        return;
      } else {
        msgEl.innerHTML = '<span style="color:var(--danger);">' + ((data && data.error) || '当前密钥错误') + '</span>';
        return;
      }
    } catch(e) {
      console.warn('Supabase change key failed, falling back to local:', e);
    }
  }
  // Local fallback
  const auth = getAuthData();
  if (oldHash === auth.adminKeyHash) {
    auth.adminKeyHash = newHash;
    saveAuthData(auth);
    msgEl.innerHTML = '<span style="color:var(--success);">✅ 密钥修改成功！请使用新密钥登录。</span>';
    setTimeout(() => { document.getElementById('changeKeyModal')?.remove(); }, 2000);
  } else {
    msgEl.innerHTML = '<span style="color:var(--danger);">当前密钥错误</span>';
  }
}

function showSecurityQuestionModal() {
  const existing = document.getElementById('securityQuestionModal');
  if (existing) existing.remove();
  const auth = getAuthData();
  const currentQuestion = auth.securityQuestion || '';
  const modal = document.createElement('div');
  modal.id = 'securityQuestionModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style="background:var(--card-bg);border-radius:16px;padding:32px;max-width:460px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
    <h3 style="color:var(--accent-light);margin-bottom:16px;">🛡️ 设置安全问题</h3>
    <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">忘记密钥时可通过回答安全问题找回。${currentQuestion ? '当前已设置安全问题："' + escapeHtml(currentQuestion) + '"' : '尚未设置安全问题，建议立即设置。'}</p>
    <div style="margin-bottom:12px;"><label style="font-size:13px;color:var(--text-muted);">安全问题</label><input id="secQuestion" class="auth-input" placeholder="例如：您的出生城市是？" value="${currentQuestion}" style="width:100%;"></div>
    <div style="margin-bottom:12px;"><label style="font-size:13px;color:var(--text-muted);">答案</label><input id="secAnswer" class="auth-input" placeholder="输入安全问题的答案" style="width:100%;"></div>
    <div style="margin-bottom:12px;"><label style="font-size:13px;color:var(--text-muted);">确认答案</label><input id="secAnswerConfirm" class="auth-input" placeholder="再次输入答案" style="width:100%;"></div>
    <div style="margin-bottom:16px;"><label style="font-size:13px;color:var(--text-muted);">当前密钥（验证身份）</label><input type="password" id="secCurrentKey" class="auth-input" placeholder="输入当前管理员密钥" style="width:100%;"></div>
    <div id="secQuestionMsg" style="margin-bottom:12px;font-size:13px;"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button onclick="document.getElementById('securityQuestionModal').remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);cursor:pointer;">取消</button>
      <button onclick="saveSecurityQuestion()" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;cursor:pointer;">保存</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

async function saveSecurityQuestion() {
  const question = document.getElementById('secQuestion').value.trim();
  const answer = document.getElementById('secAnswer').value.trim();
  const answerConfirm = document.getElementById('secAnswerConfirm').value.trim();
  const currentKey = document.getElementById('secCurrentKey').value.trim();
  const msgEl = document.getElementById('secQuestionMsg');

  if (!question || !answer || !answerConfirm || !currentKey) { msgEl.innerHTML = '<span style="color:var(--danger);">请填写所有字段</span>'; return; }
  if (answer !== answerConfirm) { msgEl.innerHTML = '<span style="color:var(--danger);">两次输入的答案不一致</span>'; return; }

  const currentKeyHash = await sha256(currentKey);
  const answerHash = await sha256(answer);

  // Verify current key
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('verify_admin_key', { p_key_hash: currentKeyHash });
      if (error) throw error;
      if (!data || !data.success) { msgEl.innerHTML = '<span style="color:var(--danger);">当前密钥错误</span>'; return; }
      // Save to Supabase admin_config
      await CloudSync.supabase.from('admin_config').upsert({
        key: 'security', value: { question: question, answer_hash: answerHash }
      });
    } catch(e) {
      // Fallback to local
      const auth = getAuthData();
      if (currentKeyHash !== auth.adminKeyHash) { msgEl.innerHTML = '<span style="color:var(--danger);">当前密钥错误</span>'; return; }
    }
  } else {
    const auth = getAuthData();
    if (currentKeyHash !== auth.adminKeyHash) { msgEl.innerHTML = '<span style="color:var(--danger);">当前密钥错误</span>'; return; }
  }

  // Save locally
  const auth = getAuthData();
  auth.securityQuestion = question;
  auth.securityAnswerHash = answerHash;
  saveAuthData(auth);

  msgEl.innerHTML = '<span style="color:var(--success);">✅ 安全问题设置成功！</span>';
  updateSecurityQuestionStatus();
  setTimeout(() => { document.getElementById('securityQuestionModal')?.remove(); }, 1500);
}

function updateSecurityQuestionStatus() {
  const el = document.getElementById('securityQuestionStatus');
  if (!el) return;
  const auth = getAuthData();
  if (auth.securityQuestion) {
    el.innerHTML = '<span style="color:var(--success);">✅ 已设置安全问题："' + escapeHtml(auth.securityQuestion) + '"</span>';
  } else {
    el.innerHTML = '<span style="color:var(--warning);">⚠️ 尚未设置安全问题，建议立即设置以便找回密钥</span>';
  }
}

function showForgotKeyModal() {
  const existing = document.getElementById('forgotKeyModal');
  if (existing) existing.remove();

  // Check if security question is set (try Supabase first, then local)
  const modal = document.createElement('div');
  modal.id = 'forgotKeyModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style="background:var(--card-bg);border-radius:16px;padding:32px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
    <h3 style="color:var(--accent-light);margin-bottom:16px;">🔑 找回管理员密钥</h3>
    <div id="forgotKeyStep1">
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">正在检查安全问题设置...</p>
    </div>
  </div>`;
  document.body.appendChild(modal);

  // Load security question from Supabase or local
  loadSecurityQuestionForReset();
}

async function loadSecurityQuestionForReset() {
  const stepEl = document.getElementById('forgotKeyStep1');
  let question = '';
  let answerHash = '';

  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.from('admin_config').select('value').eq('key', 'security').single();
      if (data && data.value) {
        question = data.value.question || '';
        answerHash = data.value.answer_hash || '';
      }
    } catch(e) { /* fallback to local */ }
  }

  if (!question) {
    const auth = getAuthData();
    question = auth.securityQuestion || '';
    answerHash = auth.securityAnswerHash || '';
  }

  if (!question) {
    stepEl.innerHTML = '<p style="color:var(--danger);">未设置安全问题，无法通过此方式找回密钥。请联系系统管理员。</p><button onclick="document.getElementById(\'forgotKeyModal\').remove()" style="margin-top:12px;padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;cursor:pointer;">返回</button>';
    return;
  }

  stepEl.innerHTML = `
    <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">请回答以下安全问题以验证身份：</p>
    <div style="background:var(--input-bg);border-radius:8px;padding:12px;margin-bottom:16px;font-weight:bold;color:var(--accent-light);">${question}</div>
    <div style="margin-bottom:12px;"><input id="forgotAnswer" class="auth-input" placeholder="输入安全问题的答案" style="width:100%;"></div>
    <div style="margin-bottom:12px;"><label style="font-size:13px;color:var(--text-muted);">新密钥</label><input type="password" id="forgotNewKey" class="auth-input" placeholder="输入新密钥" style="width:100%;"></div>
    <div style="margin-bottom:16px;"><label style="font-size:13px;color:var(--text-muted);">确认新密钥</label><input type="password" id="forgotConfirmKey" class="auth-input" placeholder="再次输入新密钥" style="width:100%;"></div>
    <div id="forgotKeyMsg" style="margin-bottom:12px;font-size:13px;"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button onclick="document.getElementById('forgotKeyModal').remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);cursor:pointer;">取消</button>
      <button onclick="resetKeyViaQuestion('${answerHash}')" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;cursor:pointer;">重置密钥</button>
    </div>`;
}

async function resetKeyViaQuestion(expectedAnswerHash) {
  const answer = document.getElementById('forgotAnswer').value.trim();
  const newKey = document.getElementById('forgotNewKey').value.trim();
  const confirmKey = document.getElementById('forgotConfirmKey').value.trim();
  const msgEl = document.getElementById('forgotKeyMsg');

  if (!answer || !newKey || !confirmKey) { msgEl.innerHTML = '<span style="color:var(--danger);">请填写所有字段</span>'; return; }
  if (newKey !== confirmKey) { msgEl.innerHTML = '<span style="color:var(--danger);">两次输入的新密钥不一致</span>'; return; }
  if (newKey.length < 4) { msgEl.innerHTML = '<span style="color:var(--danger);">新密钥长度至少4位</span>'; return; }

  const answerHash = await sha256(answer);
  if (answerHash !== expectedAnswerHash) { msgEl.innerHTML = '<span style="color:var(--danger);">安全问题答案错误</span>'; return; }

  const newKeyHash = await sha256(newKey);

  // Update via Supabase RPC
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('reset_admin_key_via_question', {
        p_answer_hash: answerHash, p_new_key_hash: newKeyHash
      });
      if (error) throw error;
      if (data && data.success) {
        const auth = getAuthData();
        auth.adminKeyHash = newKeyHash;
        saveAuthData(auth);
        msgEl.innerHTML = '<span style="color:var(--success);">✅ 密钥重置成功！请使用新密钥登录。</span>';
        setTimeout(() => { document.getElementById('forgotKeyModal')?.remove(); }, 2000);
        return;
      } else {
        msgEl.innerHTML = '<span style="color:var(--danger);">' + ((data && data.error) || '验证失败') + '</span>';
        return;
      }
    } catch(e) {
      console.warn('Supabase reset key failed, falling back to local:', e);
    }
  }

  // Local fallback — verify answer hash against locally stored value
  const auth = getAuthData();
  if (auth.securityAnswerHash && answerHash !== auth.securityAnswerHash) {
    msgEl.innerHTML = '<span style="color:var(--danger);">安全问题答案错误</span>';
    return;
  }
  auth.adminKeyHash = newKeyHash;
  saveAuthData(auth);
  msgEl.innerHTML = '<span style="color:var(--success);">✅ 密钥重置成功！请使用新密钥登录。</span>';
  setTimeout(() => { document.getElementById('forgotKeyModal')?.remove(); }, 2000);
}

function exportUsers() {
  const blob = new Blob([JSON.stringify({users,currentUser,allDietData},null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='nutripro_data.json'; a.click();
}
function importUsers(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.users) users = data.users;
      if (data.currentUser) currentUser = data.currentUser;
      if (data.allDietData) { allDietData = data.allDietData; saveDietData(); }
      else if (data.dietFoods) {
        // Legacy import: migrate old global dietFoods to current user's today
        if (currentUser) {
          const today = new Date().toISOString().split('T')[0];
          if (!allDietData[currentUser.id]) allDietData[currentUser.id] = {};
          allDietData[currentUser.id][today] = data.dietFoods;
          saveDietData();
        }
      }
      saveUsers(); renderUsers(); renderUserForm();
    } catch(err) { alert('Import failed: '+err.message); }
  };
  reader.readAsText(file);
}

