// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: diet.js
// Purpose: User management, diet log, summary generation
// ============================================================

// State variables are declared in state.js

// ===== USER MANAGEMENT =====

function getDietKey(userId, dateStr) {
  return userId + '_' + dateStr;
}
function getCurrentUserDiet(dateStr) {
  if (!currentUser) return [];
  if (!allDietData[currentUser.id]) allDietData[currentUser.id] = {};
  return allDietData[currentUser.id][dateStr] || [];
}
function saveDietData() {
  localStorage.setItem('nutripro_allDietData', JSON.stringify(allDietData));
  CloudSync.push('diet', allDietData);
}
function getDietFoodsForSelectedDates() {
  if (!currentUser) return [];
  if (dietViewMode === 'single') {
    return getCurrentUserDiet(selectedDietDate);
  } else {
    // merge all days in range
    let merged = [];
    let d = new Date(dietDateRange.start);
    let end = new Date(dietDateRange.end);
    while (d <= end) {
      let ds = d.toISOString().split('T')[0];
      merged = merged.concat(getCurrentUserDiet(ds));
      d.setDate(d.getDate() + 1);
    }
    return merged;
  }
}
function getAvailableDietDates() {
  if (!currentUser || !allDietData[currentUser.id]) return [];
  return Object.keys(allDietData[currentUser.id]).sort().reverse();
}

function saveUsers() {
  localStorage.setItem('nutripro_users', JSON.stringify(users));
  localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
  CloudSync.push('users', users);
}
function addUser() {
  const user = {
    id: Date.now().toString(),
    name: '新用户', gender: 'male', age: 25, height: 170, weight: 65,
    bodyfat: 15, activity: 'moderate', trainingYears: 1, goal: 'maintain',
    role: 'resident', passwordHash: '', grantedPermissions: [], createdAt: Date.now()
  };
  users.push(user);
  currentUser = user;
  saveUsers();
  renderUsers();
  renderUserForm();
}
function selectUser(id) {
  currentUser = users.find(u => u.id === id) || null;
  saveUsers();
  renderUsers();
  renderUserForm();
  // Refresh diet page for new user
  renderDietPage();
}
function deleteUser(id) {
  // Delete user's diet data as well
  if (allDietData[id]) delete allDietData[id];
  saveDietData();
  users = users.filter(u => u.id !== id);
  if (currentUser && currentUser.id === id) currentUser = users[0] || null;
  saveUsers();
  renderUsers();
  renderUserForm();
  renderDietPage();
}
function saveUserForm() {
  if (!currentUser) return;
  const f = document.getElementById('userForm');
  if (!f) return;
  currentUser.name = f.querySelector('[name="name"]').value;
  currentUser.gender = f.querySelector('[name="gender"]').value;
  currentUser.age = parseFloat(f.querySelector('[name="age"]').value) || 25;
  currentUser.height = parseFloat(f.querySelector('[name="height"]').value) || 170;
  currentUser.weight = parseFloat(f.querySelector('[name="weight"]').value) || 65;
  currentUser.bodyfat = parseFloat(f.querySelector('[name="bodyfat"]').value) || 15;
  currentUser.activity = f.querySelector('[name="activity"]').value;
  currentUser.trainingYears = parseFloat(f.querySelector('[name="trainingYears"]').value) || 1;
  currentUser.goal = f.querySelector('[name="goal"]').value;
  saveUsers();
  renderUsers();
}
function renderUsers() {
  try {
  const el = document.getElementById('userList');
  if (!el) return;
  const isAdmin = getCurrentRole() === 'admin';
  el.innerHTML = users.filter(u => isAdmin || u.id === (currentUser && currentUser.id)).map(u => {
    const roleBadge = u.role === 'admin' ? '<span class="role-badge admin">管理员</span>' :
                      u.role === 'resident' ? '<span class="role-badge resident">常驻</span>' :
                      '<span class="role-badge guest">普通</span>';
    const presetTag = (u.role === 'resident' && !u.passwordHash) ? ' <span style="font-size:10px;background:rgba(59,130,246,0.2);color:var(--accent-light);padding:1px 6px;border-radius:8px;">待匹配</span>' : '';
    return `<div class="user-card ${currentUser && currentUser.id===u.id?'active':''}" onclick="selectUser('${u.id}')">
      <div class="name">${escapeHtml(u.name)} ${roleBadge}${presetTag}</div>
      <div class="info">${t(u.gender==='male'?'male':'female')} | ${u.age}${t('age')} | ${u.weight}kg</div>
      ${isAdmin && u.id !== 'admin' ? `<button class="btn-action" style="float:right;margin-top:-30px;font-size:11px;padding:2px 8px;" onclick="event.stopPropagation();deleteUser('${u.id}')">✕</button>` : ''}
    </div>`;
  }).join('');
  } catch(e) { console.error('renderUsers error:', e); }
}

function renderUserForm() {
  try {
  const el = document.getElementById('userFormArea');
  if (!el) return;
  if (!currentUser) { el.innerHTML = '<div class="empty-state"><div class="icon">👤</div>'+t('add_user')+'</div>'; return; }
  // Resident users can only see their own info
  const role = getCurrentRole();
  if (role === 'resident' && currentUser.id !== (currentSession && currentSession.userId)) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🔒</div>只能查看自己的信息</div>';
    return;
  }
  const u = currentUser;
  // Show change username/password section for resident users
  const credSection = role === 'resident' ? `
    <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:16px;">
      <h4 style="color:var(--accent-light);margin-bottom:12px;">🔐 修改登录凭据</h4>
      <div class="calc-row">
        <div class="calc-field"><label>新用户名</label><input id="newUsername" value="${escapeHtml(u.name)}" placeholder="输入新用户名"></div>
        <div class="calc-field"><label>当前密码</label><input id="currentPassword" type="password" placeholder="输入当前密码"></div>
      </div>
      <div class="calc-row">
        <div class="calc-field"><label>新密码</label><input id="newPassword" type="password" placeholder="输入新密码（留空则不修改）"></div>
        <div class="calc-field"><label>确认新密码</label><input id="confirmPassword" type="password" placeholder="再次输入新密码"></div>
      </div>
      <button class="btn-primary" onclick="changeResidentCredentials()" style="margin-top:8px;">💾 保存凭据修改</button>
      <div id="credChangeMsg" style="margin-top:8px;font-size:13px;"></div>
    </div>` : '';

  el.innerHTML = `<div class="calc-card"><h3>✏️ ${t('user_mgmt')}</h3>
    <form id="userForm" onsubmit="event.preventDefault();saveUserForm();">
      <div class="calc-row">
        <div class="calc-field"><label>${t('name')}</label><input name="name" value="${escapeHtml(u.name)}" ${role==='resident'?'readonly style="background:var(--input-bg);opacity:0.7;"':''}></div>
        <div class="calc-field"><label>${t('gender')}</label><select name="gender" ${role==='resident'?'disabled':''}><option value="male" ${u.gender==='male'?'selected':''}>${t('male')}</option><option value="female" ${u.gender==='female'?'selected':''}>${t('female')}</option></select></div>
      </div>
      <div class="calc-row">
        <div class="calc-field"><label>${t('age')}</label><input name="age" type="number" value="${u.age}"></div>
        <div class="calc-field"><label>${t('height')}</label><input name="height" type="number" value="${u.height}"></div>
        <div class="calc-field"><label>${t('weight')}</label><input name="weight" type="number" value="${u.weight}"></div>
      </div>
      <div class="calc-row">
        <div class="calc-field"><label>${t('bodyfat')}</label><input name="bodyfat" type="number" value="${u.bodyfat}" step="0.1"></div>
        <div class="calc-field"><label>${t('training_years')}</label><input name="trainingYears" type="number" value="${u.trainingYears}"></div>
      </div>
      <div class="calc-row">
        <div class="calc-field"><label>${t('activity')}</label><select name="activity">
          <option value="sedentary" ${u.activity==='sedentary'?'selected':''}>${t('sedentary')}</option>
          <option value="light" ${u.activity==='light'?'selected':''}>${t('light')}</option>
          <option value="moderate" ${u.activity==='moderate'?'selected':''}>${t('moderate')}</option>
          <option value="heavy" ${u.activity==='heavy'?'selected':''}>${t('heavy')}</option>
          <option value="very_heavy" ${u.activity==='very_heavy'?'selected':''}>${t('very_heavy')}</option>
        </select></div>
        <div class="calc-field"><label>${t('goal')}</label><select name="goal">
          <option value="cut" ${u.goal==='cut'?'selected':''}>${t('cut')}</option>
          <option value="maintain" ${u.goal==='maintain'?'selected':''}>${t('maintain')}</option>
          <option value="bulk" ${u.goal==='bulk'?'selected':''}>${t('bulk')}</option>
        </select></div>
      </div>
      <button class="btn-primary" type="submit">${t('save')}</button>
    </form>
    ${credSection}
  </div>`;
  } catch(e) { console.error('renderUserForm error:', e); }
}

async function changeResidentCredentials() {
  if (!currentSession || currentSession.role !== 'resident') return;
  const msgEl = document.getElementById('credChangeMsg');
  const newUsername = document.getElementById('newUsername').value.trim();
  const currentPwd = document.getElementById('currentPassword').value;
  const newPwd = document.getElementById('newPassword').value;
  const confirmPwd = document.getElementById('confirmPassword').value;

  if (!currentPwd) { msgEl.innerHTML = '<span style="color:var(--danger);">请输入当前密码以验证身份</span>'; return; }
  if (!newUsername) { msgEl.innerHTML = '<span style="color:var(--danger);">用户名不能为空</span>'; return; }
  if (newPwd && newPwd !== confirmPwd) { msgEl.innerHTML = '<span style="color:var(--danger);">两次输入的新密码不一致</span>'; return; }
  if (newPwd && newPwd.length < 4) { msgEl.innerHTML = '<span style="color:var(--danger);">新密码长度至少4位</span>'; return; }

  const currentHash = await sha256(currentPwd);

  // Verify current password
  if (CloudSync.initialized && CloudSync.supabase) {
    try {
      const { data, error } = await CloudSync.supabase.rpc('verify_user_login', { p_name: currentUser.name, p_password_hash: currentHash });
      if (error) throw error;
      if (!data || !data.success) { msgEl.innerHTML = '<span style="color:var(--danger);">当前密码错误</span>'; return; }
    } catch(e) {
      // Fallback to local check
      if (currentHash !== currentUser.passwordHash) { msgEl.innerHTML = '<span style="color:var(--danger);">当前密码错误</span>'; return; }
    }
  } else {
    if (currentHash !== currentUser.passwordHash) { msgEl.innerHTML = '<span style="color:var(--danger);">当前密码错误</span>'; return; }
  }

  // Update username and/or password
  const updates = {};
  if (newUsername !== currentUser.name) {
    // Check if username already exists
    const users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
    if (users.find(u => u.name === newUsername && u.id !== currentUser.id)) {
      msgEl.innerHTML = '<span style="color:var(--danger);">该用户名已被使用</span>'; return;
    }
    updates.name = newUsername;
    currentUser.name = newUsername;
  }
  if (newPwd) {
    const newHash = await sha256(newPwd);
    updates.password_hash = newHash;
    currentUser.passwordHash = newHash;
  }

  // Update Supabase
  if (CloudSync.initialized && CloudSync.supabase && Object.keys(updates).length > 0) {
    CloudSync.supabase.from('users').update(updates).eq('id', currentUser.id).then(({error}) => {
      if (error) { msgEl.innerHTML = '<span style="color:var(--danger);">更新失败: ' + error.message + '</span>'; return; }
    });
  }

  // Update local
  const users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx !== -1) {
    if (updates.name) users[idx].name = updates.name;
    if (updates.password_hash) users[idx].passwordHash = updates.password_hash;
    localStorage.setItem('nutripro_users', JSON.stringify(users));
    CloudSync.push('users', users);
    window.users = users;
  }
  localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));

  // Update session
  if (updates.name) {
    currentSession.userName = updates.name;
    localStorage.setItem('nutripro_session', JSON.stringify(currentSession));
  }

  msgEl.innerHTML = '<span style="color:var(--success);">✅ 凭据修改成功！</span>';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  applyPermissions();
  renderUserForm();
}

// ===== DIET LOG =====
function renderDietPage() {
  try {
  allFoodsForDiet = FOOD_DB.map(function(f){ return {id:f.id, name:f.name, nameEn:f.nameEn||''}; });
  updateDietDatePicker();
  renderDietFoods();
  } catch(e) { console.error('renderDietPage error:', e); }
}
function updateDietDatePicker() {
  const container = document.getElementById('dietDateControls');
  if (!container) return;
  const dates = getAvailableDietDates();
  const today = new Date().toISOString().split('T')[0];
  let dateOptions = `<option value="${today}" ${selectedDietDate===today?'selected':''}>${t('today_label')} (${today})</option>`;
  dates.forEach(d => {
    if (d !== today) dateOptions += `<option value="${d}" ${selectedDietDate===d?'selected':''}>${d}</option>`;
  });
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <label style="font-size:13px;color:var(--text-muted);">${t('view_mode')}:</label>
      <select id="dietViewModeSelect" onchange="changeDietViewMode(this.value)" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:13px;">
        <option value="single" ${dietViewMode==='single'?'selected':''}>${t('single_day')}</option>
        <option value="range" ${dietViewMode==='range'?'selected':''}>${t('multi_day_range')}</option>
      </select>
    </div>
    <div id="dietSingleDate" style="display:${dietViewMode==='single'?'flex':'none'};align-items:center;gap:8px;margin-bottom:8px;">
      <label style="font-size:13px;color:var(--text-muted);">${t('select_date')}:</label>
      <input type="date" id="dietDatePicker" value="${selectedDietDate}" onchange="changeDietDate(this.value)" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:13px;">
    </div>
    <div id="dietRangeDate" style="display:${dietViewMode==='range'?'flex':'none'};align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
      <label style="font-size:13px;color:var(--text-muted);">${t('start_date')}:</label>
      <input type="date" id="dietDateStart" value="${dietDateRange.start||today}" onchange="changeDietRange()" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:13px;">
      <label style="font-size:13px;color:var(--text-muted);">${t('end_date')}:</label>
      <input type="date" id="dietDateEnd" value="${dietDateRange.end||today}" onchange="changeDietRange()" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:13px;">
    </div>
    <div style="font-size:12px;color:var(--text-dim);">${t('diet_note_zh')}</div>
  `;
}
function changeDietViewMode(mode) {
  dietViewMode = mode;
  const single = document.getElementById('dietSingleDate');
  const range = document.getElementById('dietRangeDate');
  if (single) single.style.display = mode === 'single' ? 'flex' : 'none';
  if (range) range.style.display = mode === 'range' ? 'flex' : 'none';
  renderDietFoods();
}
function changeDietDate(date) {
  selectedDietDate = date;
  renderDietFoods();
}
function changeDietRange() {
  const start = document.getElementById('dietDateStart')?.value;
  const end = document.getElementById('dietDateEnd')?.value;
  if (start && end) {
    dietDateRange = { start: start, end: end };
    renderDietFoods();
  }
}
function addDietFood() {
  if (!currentUser) { alert(currentLang==='zh'?'请先选择用户档案':'Please select a user profile first'); return; }
  document.getElementById('addDietModal').classList.add('show');
  // Initialize food search list
  allFoodsForDiet = FOOD_DB.map(function(f){ return {id:f.id, name:f.name, nameEn:f.nameEn||''}; });
}
function closeAddDietModal() { document.getElementById('addDietModal').classList.remove('show'); }
function confirmAddDietFood() {
  if (!currentUser) { alert(currentLang==='zh'?'请先选择用户档案':'Please select a user profile first'); return; }
  const id = document.getElementById('dietFoodSelect').value;
  const amount = parseFloat(document.getElementById('dietFoodAmount').value) || 100;
  if (!id) { alert(currentLang==='zh'?'请选择食物':'Please select a food'); return; }
  if (!allDietData[currentUser.id]) allDietData[currentUser.id] = {};
  if (!allDietData[currentUser.id][selectedDietDate]) allDietData[currentUser.id][selectedDietDate] = [];
  allDietData[currentUser.id][selectedDietDate].push({foodId:id, amount:amount});
  saveDietData();
  closeAddDietModal();
  renderDietFoods();
}
function renderDietFoods() {
  try {
  const el = document.getElementById('dietFoodList');
  if(!el) return;
  const dietFoods = getDietFoodsForSelectedDates();
  if(dietFoods.length===0) { el.innerHTML=`<p style="color:var(--text-muted);">${t('no_diet_entries')}</p>`; return; }
  const isRange = dietViewMode === 'range';
  // group by date for range view
  let html = '';
  if (isRange) {
    let d = new Date(dietDateRange.start);
    let end = new Date(dietDateRange.end);
    while (d <= end) {
      let ds = d.toISOString().split('T')[0];
      let dayFoods = getCurrentUserDiet(ds);
      if (dayFoods.length > 0) {
        html += `<div style="margin-top:12px;padding:8px 0;border-top:2px solid var(--accent);"><strong style="color:var(--accent-light);">${ds}</strong></div>`;
        dayFoods.forEach((item, idx) => {
          const f = FOOD_DB.find(x=>x.id===item.foodId);
          if(!f) return;
          const cal = Math.round(parseFloat(f.energyKCal||0)*item.amount/100);
          // find global index for removal
          const gIdx = allDietData[currentUser.id][ds].indexOf(item);
          html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
            <span style="flex:1;">${f.name}</span>
            <span style="color:var(--text-muted);">${item.amount}g</span>
            <span style="color:var(--accent-light);font-weight:600;">${cal} kcal</span>
            <button class="btn-action" style="padding:2px 8px;font-size:11px;" onclick="removeDietFood('${ds}',${gIdx})">✕</button>
          </div>`;
        });
      }
      d.setDate(d.getDate() + 1);
    }
  } else {
    html = dietFoods.map((d,i) => {
      const f = FOOD_DB.find(x=>x.id===d.foodId);
      if(!f) return '';
      const cal = Math.round(parseFloat(f.energyKCal||0)*d.amount/100);
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
        <span style="flex:1;">${f.name}</span>
        <span style="color:var(--text-muted);">${d.amount}g</span>
        <span style="color:var(--accent-light);font-weight:600;">${cal} kcal</span>
        <button class="btn-action" style="padding:2px 8px;font-size:11px;" onclick="removeDietFood('${selectedDietDate}',${i})">✕</button>
      </div>`;
    }).join('');
  }
  el.innerHTML = html;
  } catch(e) { console.error('renderDietFoods error:', e); }
}
function removeDietFood(dateStr, idx) {
  if (!currentUser) return;
  if (allDietData[currentUser.id] && allDietData[currentUser.id][dateStr]) {
    allDietData[currentUser.id][dateStr].splice(idx, 1);
    if (allDietData[currentUser.id][dateStr].length === 0) {
      delete allDietData[currentUser.id][dateStr];
    }
    saveDietData();
    renderDietFoods();
  }
}

function generateDietSummary() {
  try {
  const dietFoods = getDietFoodsForSelectedDates();
  const totalCal = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.energyKCal||0)*d.amount/100 : 0);
  }, 0);
  const totalP = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.protein||0)*d.amount/100 : 0);
  }, 0);
  const totalC = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.CHO||0)*d.amount/100 : 0);
  }, 0);
  const totalF = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.fat||0)*d.amount/100 : 0);
  }, 0);
  // Calculate macro ratios by calories
  const pCal = totalP * 4;
  const cCal = totalC * 4;
  const fCal = totalF * 9;
  const totalMacroCal = pCal + cCal + fCal;
  const pPct = totalMacroCal > 0 ? Math.round(pCal / totalMacroCal * 100) : 0;
  const cPct = totalMacroCal > 0 ? Math.round(cCal / totalMacroCal * 100) : 0;
  const fPct = totalMacroCal > 0 ? 100 - pPct - cPct : 0;

  const dateLabel = dietViewMode === 'range'
    ? `${dietDateRange.start} ~ ${dietDateRange.end}`
    : selectedDietDate;
  const periodText = `${dateLabel}${t('diet_summary_prefix')}${t('diet_summary_suffix')}`;

  document.getElementById('dietSummary').innerHTML = `<div class="calc-card">
    <h3>${periodText}</h3>
    <div class="result-item"><span class="result-label">${t('total_calories')}</span><span class="result-value">${Math.round(totalCal)} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">${t('protein_diet')}</span><span class="result-value">${totalP.toFixed(1)} <span class="unit">g</span></span></div>
    <div class="result-item"><span class="result-label">${t('carbs_diet')}</span><span class="result-value">${totalC.toFixed(1)} <span class="unit">g</span></span></div>
    <div class="result-item"><span class="result-label">${t('fat_diet')}</span><span class="result-value">${totalF.toFixed(1)} <span class="unit">g</span></span></div>
    <div style="margin-top:16px;text-align:center;">
      <h4 style="margin-bottom:8px;">${t('macro_ratio_label')}</h4>
      <div style="position:relative;display:inline-block;width:220px;height:220px;">
        <canvas id="macroDonutChart" width="220" height="220"></canvas>
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:10px;font-size:13px;">
        <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#3b82f6;"></span>${t('carbs_diet')} ${cPct}%</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#f59e0b;"></span>${t('fat_diet')} ${fPct}%</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#22c55e;"></span>${t('protein_diet')} ${pPct}%</span>
      </div>
    </div>
  </div>`;

  // Render donut chart
  setTimeout(function() {
    const canvas = document.getElementById('macroDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (typeof Chart === 'undefined') { console.warn('Chart.js not loaded'); return; }
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [t('carbs_diet'), t('fat_diet'), t('protein_diet')],
        datasets: [{
          data: [cCal, fCal, pCal],
          backgroundColor: ['#3b82f6', '#f59e0b', '#22c55e'],
          borderColor: ['#2563eb', '#d97706', '#16a34a'],
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const total = ctx.dataset.data.reduce((a,b)=>a+b, 0);
                const pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
                const gVal = [totalC, totalF, totalP][ctx.dataIndex];
                return ctx.label + ': ' + gVal.toFixed(1) + 'g (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }, 100);
  } catch(e) { console.error('generateDietSummary error:', e); }
}

