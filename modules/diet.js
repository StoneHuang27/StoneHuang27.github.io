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

// NOTE: The canonical saveDietData and getDietFoodsForSelectedDates are defined later
// in this file (after ensureMealStructure) to avoid hoisting issues with meal structure.
// The early definitions below are kept for backward compatibility but will be overwritten.

function getAvailableDietDates() {
  if (!currentUser || !allDietData[currentUser.id]) return [];
  return Object.keys(allDietData[currentUser.id]).sort().reverse();
}

function saveUsers() {
  // Normalize users array: ensure camelCase field names
  const normalized = users.map(function(u) {
    return {
      ...u,
      passwordHash: u.password_hash || u.passwordHash,
      trainingYears: u.training_years || u.trainingYears,
      grantedPermissions: u.granted_permissions || u.grantedPermissions
    };
  });
  users = normalized;
  localStorage.setItem('nutripro_users', JSON.stringify(normalized));
  localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
  CloudSync.push('users', normalized);
}
function addUser() {
  if (!currentUser) { alert('请先选择一个用户'); return; }
  // Only admin can create new users
  if (getCurrentRole() !== 'admin') { alert('只有管理员可以新建用户'); return; }
  const user = {
    id: 'usr_' + Date.now().toString(36),
    name: '新用户', gender: 'male', age: 25, height: 170, weight: 65,
    bodyfat: 15, activity: 'moderate', trainingYears: 1, goal: 'maintain',
    role: 'resident', passwordHash: '', grantedPermissions: [], createdAt: Date.now()
  };
  users.push(user);
  saveUsers();
  // Stay as current user (don't switch to new user)
  renderUsers('', 'all');
  // Refresh the form area for the current user
  renderUserForm();
}
function selectUser(id) {
  currentUser = users.find(u => u.id === id) || null;
  saveUsers();
  renderUsers('', 'all');
  renderUserForm();
  // Refresh diet page for new user
  if (typeof renderDietPage === 'function') renderDietPage();
}
function deleteUser(id) {
  const user = users.find(u => u.id === id);
  if (!user) return;
  if (!confirm(`确定要删除用户「${user.name}」吗？该操作不可恢复，该用户的饮食数据也会被删除。`)) return;
  logAudit('delete_user', currentSession?.userId, `Deleted user ${user.name} (${id})`);
  // Delete user's diet data as well
  if (allDietData[id]) delete allDietData[id];
  saveDietData();
  users = users.filter(u => u.id !== id);
  if (currentUser && currentUser.id === id) currentUser = users[0] || null;
  saveUsers();
  renderUsers('', 'all');
  renderUserForm();
  if (typeof renderDietPage === 'function') renderDietPage();
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
  renderUsers('', 'all');
}
function renderUsers(filter, roleFilter) {
  try {
  const isAdmin = getCurrentRole() === 'admin';
  const container = document.getElementById('userListContainer');
  if (!container) return;

  // Initialize controls once (preserve DOM nodes for IME stability)
  if (!container.querySelector('#userSearch')) {
    let controlsHtml = '';
    if (isAdmin) {
      controlsHtml = `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <input type="text" id="userSearch" placeholder="搜索用户名..." style="flex:1;min-width:150px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;font-size:13px;">
        <select id="userRoleFilter" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;font-size:13px;">
          <option value="all">全部角色</option>
          <option value="admin">管理员</option>
          <option value="resident">常驻</option>
          <option value="guest">普通</option>
        </select>
      </div>`;
    }
    container.innerHTML = controlsHtml + '<div id="userList"></div>';

    // Attach events once (stable references, no IME disruption)
    const searchInput = document.getElementById('userSearch');
    const roleFilter = document.getElementById('userRoleFilter');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        renderUsers(this.value, roleFilter?.value || 'all');
      });
      searchInput.addEventListener('compositionend', function() {
        // Re-trigger after IME composition completes
        renderUsers(this.value, roleFilter?.value || 'all');
      });
    }
    if (roleFilter) {
      roleFilter.addEventListener('change', function() {
        renderUsers(searchInput?.value || '', this.value);
      });
    }
  }

  // Update controls with current filter values (without destroying them)
  const searchInput = document.getElementById('userSearch');
  const roleFilterEl = document.getElementById('userRoleFilter');
  if (searchInput && filter !== undefined) {
    searchInput.value = filter || '';
  }
  if (roleFilterEl && roleFilter !== undefined) {
    roleFilterEl.value = roleFilter || 'all';
  }

  // Compute filtered list
  let filtered = users.filter(u => isAdmin || u.id === (currentUser && currentUser.id));

  // Role filter
  if (roleFilter && roleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === roleFilter);
  }

  // Text search
  if (filter) {
    const q = filter.toLowerCase();
    filtered = filtered.filter(u => u.name.toLowerCase().includes(q));
  }

  // Render only the list (never touches the search input)
  const listEl = document.getElementById('userList');
  if (listEl) {
    listEl.innerHTML = filtered.map(u => {
      const isActive = u.isActive !== false;
      const roleBadge = u.role === 'admin' ? '<span class="role-badge admin">管理员</span>' :
                        u.role === 'resident' ? '<span class="role-badge resident">常驻</span>' :
                        '<span class="role-badge guest">普通</span>';
      const presetTag = (u.role === 'resident' && !u.passwordHash) ? ' <span style="font-size:10px;background:rgba(59,130,246,0.2);color:var(--accent-light);padding:1px 6px;border-radius:8px;">待匹配</span>' : '';
      const inactiveStyle = !isActive ? 'opacity:0.5;' : '';
      return `<div class="user-card ${currentUser && currentUser.id===u.id?'active':''}" onclick="selectUser('${u.id}')" style="${inactiveStyle}">
        <div class="name">${escapeHtml(u.name)} ${roleBadge}${presetTag}</div>
        <div class="info">${t(u.gender==='male'?'male':'female')} | ${u.age}${t('age')} | ${u.weight}kg</div>
        ${isAdmin && u.id !== 'admin' ? `<div style="display:flex;gap:4px;margin-top:4px;">
          <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="event.stopPropagation();toggleUserActive('${u.id}')" title="${isActive?'注销':'恢复'}">${isActive?'🔒 注销':'🔓 恢复'}</button>
          <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="event.stopPropagation();deleteUser('${u.id}')" title="删除">✕ 删除</button>
        </div>` : ''}
      </div>`;
    }).join('');
  }
  } catch(e) { console.error('renderUsers error:', e); }
}

function toggleUserActive(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  user.isActive = (user.isActive === false) ? true : false;
  logAudit(user.isActive ? 'reactivate_user' : 'deactivate_user', currentSession?.userId, `User ${user.name} (${userId}) ${user.isActive ? 'reactivated' : 'deactivated'}`);
  saveUsers();
  const searchVal = document.getElementById('userSearch')?.value || '';
  const roleVal = document.getElementById('userRoleFilter')?.value || 'all';
  renderUsers(searchVal, roleVal);
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
        <div class="calc-field">
          <label>当前密码</label>
          <div style="position:relative;">
            <input id="currentPassword" type="password" placeholder="输入当前密码" style="padding-right:36px;">
            <span onclick="togglePw('currentPassword',this)" style="position:absolute;right:8px;top:26px;cursor:pointer;font-size:16px;" title="显示/隐藏密码">👁️</span>
          </div>
        </div>
      </div>
      <div class="calc-row">
        <div class="calc-field">
          <label>新密码</label>
          <div style="position:relative;">
            <input id="newPassword" type="password" placeholder="输入新密码（留空则不修改）" style="padding-right:36px;">
            <span onclick="togglePw('newPassword',this)" style="position:absolute;right:8px;top:26px;cursor:pointer;font-size:16px;" title="显示/隐藏密码">👁️</span>
          </div>
        </div>
        <div class="calc-field">
          <label>确认新密码</label>
          <div style="position:relative;">
            <input id="confirmPassword" type="password" placeholder="再次输入新密码" style="padding-right:36px;">
            <span onclick="togglePw('confirmPassword',this)" style="position:absolute;right:8px;top:26px;cursor:pointer;font-size:16px;" title="显示/隐藏密码">👁️</span>
          </div>
        </div>
      </div>
      <button class="btn-primary" onclick="changeResidentCredentials()" style="margin-top:8px;">💾 保存凭据修改</button>
      <div id="credChangeMsg" style="margin-top:8px;font-size:13px;"></div>
    </div>` : '';

  el.innerHTML = `<div class="calc-card"><h3>✏️ ${t('user_mgmt')}</h3>
    <form id="userForm" onsubmit="event.preventDefault();saveUserForm();">
      <div class="calc-row">
        <div class="calc-field"><label>${t('name')}</label><input name="name" value="${escapeHtml(u.name)}" ${role==='resident'?'readonly style="background:var(--input-bg);opacity:0.7;"':''}></div>
        <div class="calc-field"><label>${t('gender')}</label><select name="gender"><option value="male" ${u.gender==='male'?'selected':''}>${t('male')}</option><option value="female" ${u.gender==='female'?'selected':''}>${t('female')}</option></select></div>
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
    const allUsers = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
    if (allUsers.find(u => u.name === newUsername && u.id !== currentUser.id)) {
      msgEl.innerHTML = '<span style="color:var(--danger);">该用户名已被使用</span>'; return;
    }
    updates.name = newUsername;
    currentUser.name = newUsername;
  }
  if (newPwd) {
    const newHash = await sha256(newPwd);
    currentUser.passwordHash = newHash;
  }

  // Update Supabase
  if (CloudSync.initialized && CloudSync.supabase && Object.keys(updates).length > 0) {
    CloudSync.supabase.from('users').update(updates).eq('id', currentUser.id).then(({error}) => {
      if (error) { msgEl.innerHTML = '<span style="color:var(--danger);">更新失败: ' + error.message + '</span>'; return; }
    });
  }

  // Update local
  const users2 = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
  const idx = users2.findIndex(u => u.id === currentUser.id);
  if (idx !== -1) {
    if (updates.name) users2[idx].name = updates.name;
    if (updates.passwordHash) users2[idx].passwordHash = updates.passwordHash;
    localStorage.setItem('nutripro_users', JSON.stringify(users2));
    CloudSync.push('users', users2);
    window.users = users2;
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

// ===== DIET LOG (with per-meal support) =====

// Helper: ensure date data has meal structure
function ensureMealStructure(dateData) {
  if (!dateData) return { meals: { 'ungrouped': { name: '未分组', foods: [] } } };
  if (dateData.meals) return dateData;
  // Legacy flat array → wrap in ungrouped meal
  return { meals: { 'ungrouped': { name: '未分组', foods: dateData } } };
}

function getDayMeals(userId, dateStr) {
  if (!userId || !dateStr) return null;
  const dayData = allDietData[userId] && allDietData[userId][dateStr];
  if (!dayData) return null;
  return ensureMealStructure(dayData);
}

function getCurrentUserMeals(dateStr) {
  if (!currentUser || !dateStr) return null;
  return getDayMeals(currentUser.id, dateStr);
}

function getAllFlatFoods(dateStr) {
  const meals = getCurrentUserMeals(dateStr);
  if (!meals) return [];
  let foods = [];
  Object.values(meals.meals).forEach(function(m) {
    foods = foods.concat(m.foods || []);
  });
  return foods;
}

function saveDietData() {
  // Normalize meal structure before saving
  Object.keys(allDietData).forEach(function(uid) {
    Object.keys(allDietData[uid]).forEach(function(date) {
      if (!allDietData[uid][date].meals) {
        allDietData[uid][date] = ensureMealStructure(allDietData[uid][date]);
      }
    });
  });
  localStorage.setItem('nutripro_allDietData', JSON.stringify(allDietData));
  CloudSync.push('diet', allDietData);
}

function getDietFoodsForSelectedDates() {
  if (!currentUser) return [];
  if (dietViewMode === 'single') {
    return getAllFlatFoods(selectedDietDate);
  } else {
    let merged = [];
    let d = new Date(dietDateRange.start);
    let end = new Date(dietDateRange.end);
    while (d <= end) {
      let ds = d.toISOString().split('T')[0];
      merged = merged.concat(getAllFlatFoods(ds));
      d.setDate(d.getDate() + 1);
    }
    return merged;
  }
}

function getAvailableDietDates() {
  if (!currentUser || !allDietData[currentUser.id]) return [];
  return Object.keys(allDietData[currentUser.id]).sort().reverse();
}

// ===== MEAL MANAGEMENT =====
function createMeal(dateStr, mealName) {
  if (!currentUser || !dateStr) return null;
  if (!allDietData[currentUser.id]) allDietData[currentUser.id] = {};
  if (!allDietData[currentUser.id][dateStr]) allDietData[currentUser.id][dateStr] = { meals: {} };
  const meals = ensureMealStructure(allDietData[currentUser.id][dateStr]);
  const mealId = 'meal_' + Date.now().toString(36);
  meals.meals[mealId] = { name: mealName || '新餐次', foods: [] };
  allDietData[currentUser.id][dateStr] = meals;
  saveDietData();
  renderDietFoods();
  return mealId;
}

function deleteMeal(dateStr, mealId) {
  if (!currentUser) return;
  const meals = getCurrentUserMeals(dateStr);
  if (!meals || !meals.meals[mealId]) return;
  delete meals.meals[mealId];
  saveDietData();
  renderDietFoods();
}

function renameMeal(dateStr, mealId, newName) {
  if (!currentUser) return;
  const meals = getCurrentUserMeals(dateStr);
  if (!meals || !meals.meals[mealId]) return;
  meals.meals[mealId].name = newName;
  saveDietData();
  renderDietFoods();
}

function addFoodToMeal(dateStr, mealId, foodEntry) {
  if (!currentUser) return;
  if (!allDietData[currentUser.id]) allDietData[currentUser.id] = {};
  if (!allDietData[currentUser.id][dateStr]) allDietData[currentUser.id][dateStr] = { meals: {} };
  const meals = ensureMealStructure(allDietData[currentUser.id][dateStr]);
  if (!meals.meals[mealId]) return;
  meals.meals[mealId].foods.push(foodEntry);
  allDietData[currentUser.id][dateStr] = meals;
  saveDietData();
  renderDietFoods();
}

function removeFoodFromMeal(dateStr, mealId, foodIndex) {
  if (!currentUser) return;
  const meals = getCurrentUserMeals(dateStr);
  if (!meals || !meals.meals[mealId] || !meals.meals[mealId].foods[foodIndex]) return;
  meals.meals[mealId].foods.splice(foodIndex, 1);
  saveDietData();
  renderDietFoods();
}

function copyDietFood(mealId, foodIndex) {
  const meals = getCurrentUserMeals(selectedDietDate);
  if (!meals || !meals.meals[mealId] || !meals.meals[mealId].foods[foodIndex]) return;
  dietClipboard = { type: 'food', mealId: mealId, foodIndex: foodIndex, foodEntry: meals.meals[mealId].foods[foodIndex] };
  alert(currentLang === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard');
}

function copyMealFoods(mealId) {
  const meals = getCurrentUserMeals(selectedDietDate);
  if (!meals || !meals.meals[mealId]) return;
  dietClipboard = { type: 'meal', mealId: mealId, foods: [].concat(meals.meals[mealId].foods || []) };
  alert(currentLang === 'zh' ? '整餐已复制到剪贴板' : 'Entire meal copied to clipboard');
}

function pasteToCurrentMeal(targetMealId) {
  if (!dietClipboard || !currentUser) return;
  const meals = getCurrentUserMeals(selectedDietDate);
  if (!meals || !meals.meals[targetMealId]) return;

  if (dietClipboard.type === 'food') {
    meals.meals[targetMealId].foods.push(JSON.parse(JSON.stringify(dietClipboard.foodEntry)));
  } else if (dietClipboard.type === 'meal') {
    dietClipboard.foods.forEach(function(f) {
      meals.meals[targetMealId].foods.push(JSON.parse(JSON.stringify(f)));
    });
  }
  allDietData[currentUser.id][selectedDietDate] = meals;
  saveDietData();
  renderDietFoods();
  dietClipboard = null;
}

function pasteToNewMeal() {
  if (!dietClipboard || !currentUser) return;
  if (!allDietData[currentUser.id]) allDietData[currentUser.id] = {};
  if (!allDietData[currentUser.id][selectedDietDate]) allDietData[currentUser.id][selectedDietDate] = { meals: {} };
  const meals = ensureMealStructure(allDietData[currentUser.id][selectedDietDate]);

  const mealId = 'meal_' + Date.now().toString(36);
  const mealName = currentLang === 'zh' ? '新餐次' : 'New Meal';
  meals.meals[mealId] = { name: mealName, foods: [] };

  if (dietClipboard.type === 'food') {
    meals.meals[mealId].foods.push(JSON.parse(JSON.stringify(dietClipboard.foodEntry)));
  } else if (dietClipboard.type === 'meal') {
    dietClipboard.foods.forEach(function(f) {
      meals.meals[mealId].foods.push(JSON.parse(JSON.stringify(f)));
    });
  }
  allDietData[currentUser.id][selectedDietDate] = meals;
  saveDietData();
  renderDietFoods();
  dietClipboard = null;
}

function renderDietFoods() {
  try {
  const el = document.getElementById('dietFoodList');
  if(!el) return;
  const isRange = dietViewMode === 'range';
  if (isRange) {
    // Range view: show meals per day
    let html = '';
    let d = new Date(dietDateRange.start);
    let end = new Date(dietDateRange.end);
    while (d <= end) {
      let ds = d.toISOString().split('T')[0];
      const meals = getCurrentUserMeals(ds);
      if (meals && Object.keys(meals.meals).length > 0) {
        html += `<div style="margin-top:12px;padding:8px 0;border-top:2px solid var(--accent);"><strong style="color:var(--accent-light);">${ds}</strong></div>`;
        Object.keys(meals.meals).forEach(function(mid) {
          const meal = meals.meals[mid];
          meal.foods.forEach(function(item, idx) {
            const f = FOOD_DB.find(function(x){ return x.id === item.foodId; });
            if(!f) return;
            const cal = Math.round(parseFloat(f.energyKCal||0)*item.amount/100);
            const prot = (parseFloat(f.protein||0)*item.amount/100).toFixed(1);
            const fat = (parseFloat(f.fat||0)*item.amount/100).toFixed(1);
            const cho = (parseFloat(f.CHO||0)*item.amount/100).toFixed(1);
            html += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0 4px 16px;border-bottom:1px solid var(--border);font-size:13px;">
              <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.name)}</span>
              <span style="color:var(--text-muted);min-width:30px;">${prot}g</span>
              <span style="color:var(--text-muted);min-width:30px;">${fat}g</span>
              <span style="color:var(--text-muted);min-width:30px;">${cho}g</span>
              <span style="color:var(--accent-light);font-weight:600;min-width:55px;">${formatEnergy(cal)}</span>
              <span style="color:var(--text-muted);min-width:35px;">${item.amount}g</span>
              <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="copyDietFood('${mid}',${idx})" title="复制">📋</button>
              <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="removeFoodFromMeal('${ds}','${mid}',${idx})">✕</button>
            </div>`;
          });
        });
      }
      d.setDate(d.getDate() + 1);
    }
    if (!html) { el.innerHTML = `<p style="color:var(--text-muted);">${t('no_diet_entries')}</p>`; return; }
    el.innerHTML = html;
  } else {
    // Single day view: show per-meal sections
    const meals = getCurrentUserMeals(selectedDietDate);
    if (!meals || Object.keys(meals.meals).length === 0) {
      el.innerHTML = `<p style="color:var(--text-muted);">${t('no_diet_entries')}</p>`;
      return;
    }
    let html = '';
    Object.keys(meals.meals).forEach(function(mid) {
      const meal = meals.meals[mid];
      html += `<div style="margin-top:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
          <strong style="color:var(--accent-light);font-size:14px;">🍽 ${escapeHtml(meal.name)}</strong>
          <div style="display:flex;gap:4px;">
            <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="copyMealFoods('${mid}')" title="复制整餐">📋</button>
            <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="deleteMeal('${selectedDietDate}','${mid}')" title="删除餐次">✕</button>
          </div>
        </div>`;
      meal.foods.forEach(function(item, idx) {
        const f = FOOD_DB.find(function(x){ return x.id === item.foodId; });
        if(!f) return;
        const cal = Math.round(parseFloat(f.energyKCal||0)*item.amount/100);
        const prot = (parseFloat(f.protein||0)*item.amount/100).toFixed(1);
        const fat = (parseFloat(f.fat||0)*item.amount/100).toFixed(1);
        const cho = (parseFloat(f.CHO||0)*item.amount/100).toFixed(1);
        html += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0 4px 16px;border-bottom:1px solid var(--border);font-size:13px;">
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.name)}</span>
          <span style="color:var(--text-muted);min-width:30px;">${prot}g</span>
          <span style="color:var(--text-muted);min-width:30px;">${fat}g</span>
          <span style="color:var(--text-muted);min-width:30px;">${cho}g</span>
          <span style="color:var(--accent-light);font-weight:600;min-width:55px;">${formatEnergy(cal)}</span>
          <span style="color:var(--text-muted);min-width:35px;">${item.amount}g</span>
          <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="copyDietFood('${mid}',${idx})" title="复制">📋</button>
          <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="removeFoodFromMeal('${selectedDietDate}','${mid}',${idx})">✕</button>
        </div>`;
      });
      // Meal subtotal
      const mealCal = meal.foods.reduce(function(s, item) {
        const f = FOOD_DB.find(function(x){ return x.id === item.foodId; });
        return s + (f ? parseFloat(f.energyKCal||0)*item.amount/100 : 0);
      }, 0);
      html += `<div style="padding:4px 16px;font-size:12px;color:var(--text-muted);text-align:right;">小计: ${formatEnergy(Math.round(mealCal))}</div>`;
      html += `</div>`;
    });
    el.innerHTML = html;
  }
  } catch(e) { console.error('renderDietFoods error:', e); }
  // Show/hide paste buttons based on clipboard state
  const pasteBtn = document.getElementById('pasteBtn');
  const pasteNewBtn = document.getElementById('pasteNewBtn');
  if (pasteBtn) pasteBtn.style.display = dietClipboard ? '' : 'none';
  if (pasteNewBtn) pasteNewBtn.style.display = dietClipboard ? '' : 'none';
}

function generateDietSummary() {
  try {
  // Check prerequisites
  if (!FOOD_DB || FOOD_DB.length === 0) {
    document.getElementById('dietSummary').innerHTML = '<div class="calc-card"><p style="color:var(--warning);">⚠️ ' + (currentLang === 'zh' ? '食物数据库尚未加载，请稍后再试' : 'Food database not loaded, please try again') + '</p></div>';
    return;
  }
  const dietFoods = getDietFoodsForSelectedDates();
  if (!dietFoods || dietFoods.length === 0) {
    document.getElementById('dietSummary').innerHTML = '<div class="calc-card"><p style="color:var(--text-muted);">' + (currentLang === 'zh' ? '暂无饮食记录，请先添加食物' : 'No diet entries yet, please add foods first') + '</p></div>';
    return;
  }
  let totalCal = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.energyKCal||0)*d.amount/100 : 0);
  }, 0);
  let totalP = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.protein||0)*d.amount/100 : 0);
  }, 0);
  let totalC = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.CHO||0)*d.amount/100 : 0);
  }, 0);
  let totalF = dietFoods.reduce((s,d) => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return s + (f ? parseFloat(f.fat||0)*d.amount/100 : 0);
  }, 0);

  // Add supplement macros (v1.2)
  const dateStr = dietViewMode === 'range' ? dietDateRange.end : selectedDietDate;
  const suppMacros = getDailySupplementMacros(dateStr);
  totalP += suppMacros.protein;
  totalC += suppMacros.carbs;
  totalF += suppMacros.fat;
  totalCal += suppMacros.calories;
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
    <div class="result-item"><span class="result-label">${t('total_calories')}</span><span class="result-value">${formatEnergy(totalCal)}</span></div>
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
  function drawChart() {
    const canvas = document.getElementById('macroDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (typeof Chart === 'undefined') {
      // Chart.js not loaded — show text-based fallback
      const summaryEl = document.getElementById('dietSummary');
      if (summaryEl) {
        const card = summaryEl.querySelector('.calc-card');
        if (card) {
          card.insertAdjacentHTML('beforeend', '<p style="color:var(--warning);font-size:12px;margin-top:8px;">' + (currentLang === 'zh' ? '⚠️ 图表库加载失败，上方数据已显示' : '⚠️ Chart.js failed to load, data shown above') + '</p>');
        }
      }
      console.warn('Chart.js not available, showing text fallback');
      return;
    }
    try {
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
    } catch(e) {
      console.error('Chart render error:', e);
    }
  }
  // Draw chart immediately (DOM is already updated above)
  setTimeout(drawChart, 10);
  } catch(e) {
    console.error('generateDietSummary error:', e);
    const el = document.getElementById('dietSummary');
    if (el) {
      el.innerHTML = '<div class="calc-card"><p style="color:var(--warning);">⚠️ ' + (currentLang === 'zh' ? '生成摘要时出错: ' + e.message : 'Error generating summary: ' + e.message) + '</p></div>';
    }
  }
}

// ===== DIET PAGE RENDERING =====

function renderDietPage() {
  renderDietDateControls();
  renderDietFoods();
  renderHealthDashboard();
  renderSupplementTracker();
}

function renderDietDateControls() {
  const el = document.getElementById('dietDateControls');
  if (!el) return;

  if (dietViewMode === 'range') {
    renderDietDateRangePicker();
    return;
  }

  const dates = getAvailableDietDates();
  el.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <input type="date" id="dietDatePicker" value="${selectedDietDate}" onchange="onDietDateChange(this.value)" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;font-size:13px;">
      <label style="font-size:13px;color:var(--text-muted);cursor:pointer;">
        <input type="checkbox" onchange="toggleDietViewMode(this.checked)"> 范围模式
      </label>
      ${dates.length > 0 ? `<span style="font-size:12px;color:var(--text-muted);">有记录: ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? ' 等' : ''}</span>` : ''}
    </div>
  `;
}

function renderDietDateRangePicker() {
  const el = document.getElementById('dietDateControls');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <label style="font-size:13px;">开始: <input type="date" id="dietRangeStart" value="${dietDateRange.start}" onchange="dietDateRange.start=this.value;renderDietPage();" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;"></label>
      <span style="color:var(--text-muted);">~</span>
      <label style="font-size:13px;">结束: <input type="date" id="dietRangeEnd" value="${dietDateRange.end}" onchange="dietDateRange.end=this.value;renderDietPage();" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;"></label>
      <button class="btn-action" style="padding:4px 10px;font-size:12px;" onclick="dietViewMode='single';renderDietPage();">单天视图</button>
    </div>
  `;
}

function onDietDateChange(dateStr) {
  selectedDietDate = dateStr;
  renderDietPage();
}

function toggleDietViewMode(range) {
  dietViewMode = range ? 'range' : 'single';
  if (range) {
    // Set default range: last 7 days from selected date
    const end = new Date(selectedDietDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    dietDateRange = { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  renderDietPage();
}

// ===== ADD FOOD TO DIET =====

function addDietFood() {
  if (!currentUser) { alert(currentLang === 'zh' ? '请先选择用户' : 'Please select a user'); return; }
  if (!FOOD_DB || FOOD_DB.length === 0) { alert(currentLang === 'zh' ? '食物数据库尚未加载' : 'Food database not loaded'); return; }
  // Populate meal dropdown
  const meals = getCurrentUserMeals(selectedDietDate);
  const mealSelect = document.getElementById('dietMealSelect');
  if (mealSelect) {
    let mealOptions = '';
    if (meals && meals.meals) {
      Object.keys(meals.meals).forEach(function(mid) {
        mealOptions += '<option value="' + mid + '">' + escapeHtml(meals.meals[mid].name) + '</option>';
      });
    }
    mealOptions += '<option value="ungrouped">' + (currentLang === 'zh' ? '未分组' : 'Ungrouped') + '</option>';
    mealSelect.innerHTML = mealOptions;
  }
  document.getElementById('addDietModal').classList.add('show');
  document.getElementById('dietFoodSearch').value = '';
  document.getElementById('dietFoodSelect').value = '';
  document.getElementById('dietFoodAmount').value = 100;
  filterDietFoods();
}

function confirmAddDietFood() {
  const foodId = document.getElementById('dietFoodSelect').value;
  const amount = parseFloat(document.getElementById('dietFoodAmount').value) || 100;
  const mealId = document.getElementById('dietMealSelect').value;
  if (!foodId) { alert(currentLang === 'zh' ? '请选择食物' : 'Please select a food'); return; }
  const food = FOOD_DB.find(function(f){ return f.id === foodId; });
  if (!food) { alert(currentLang === 'zh' ? '食物不存在' : 'Food not found'); return; }
  addFoodToMeal(selectedDietDate, mealId || 'ungrouped', { foodId: foodId, amount: amount, name: food.name });
  closeAddDietModal();
  renderDietPage();
}

function closeAddDietModal() {
  document.getElementById('addDietModal').classList.remove('show');
}

