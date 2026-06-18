function updateSessionDuration() {
  const sel = document.getElementById('sessionDuration');
  const auth = getAuthData();
  auth.sessionDays = parseInt(sel.value);
  saveAuthData(auth);
}

// ===== FOOD EDIT SYSTEM =====
// editingFoodId declared in state.js
const ALL_DIET_TAGS = ['low_fodmap','low_carb','high_protein','low_fat','cholesterol_free','vegan','vegetarian','contains_alcohol','gluten_free'];
const DIET_TAG_LABELS = {
  low_fodmap:'低FODMAP', low_carb:'低碳水', high_protein:'高蛋白', low_fat:'低脂',
  cholesterol_free:'零胆固醇', vegan:'纯素', vegetarian:'蛋奶素',
  contains_alcohol:'含酒精', gluten_free:'无麸质'
};
const ALL_CATEGORIES = ['grain','veg','fruit','meat','seafood','dairy','egg','legume','nut','fungus','oil','drink','snack','sugar','condiment','seasoning','tuber','infant','fastfood','alcohol'];
const CAT_LABELS = {
  grain:'谷薯类', veg:'蔬菜类', fruit:'水果类', meat:'畜禽肉类', seafood:'水产类',
  dairy:'乳制品', egg:'蛋类', legume:'豆类', nut:'坚果种子', fungus:'菌藻类',
  oil:'油脂', drink:'饮品', snack:'零食甜饼', sugar:'糖果蜂蜜', condiment:'调味品',
  seasoning:'香料', tuber:'薯类淀粉', infant:'婴幼儿食品', fastfood:'速食食品', alcohol:'含酒精饮料'
};

function openFoodEditModal(foodId) {
  const role = getCurrentRole();
  editingFoodId = foodId || null;
  const f = foodId ? FOOD_DB.find(x=>x.id===foodId) : null;
  const isAdmin = role === 'admin';
  const titleEl = document.getElementById('foodEditTitle');
  
  if (!foodId) {
    titleEl.textContent = '➕ 添加新食物';
  } else {
    titleEl.textContent = isAdmin ? '✏️ 编辑食物' : '📝 申请修改食物';
  }
  
  const body = document.getElementById('foodEditBody');
  const tags = (f && f.dietTags) || [];
  
  body.innerHTML = `
    <div class="food-edit-grid">
      <div class="fe-full"><label>食物名称 *</label><input id="fe_name" value="${f?escapeHtml(f.name):''}"></div>
      <div><label>英文名</label><input id="fe_nameEn" value="${f?escapeHtml(f.nameEn||''):''}"></div>
      <div><label>分类 *</label><select id="fe_category">
        ${ALL_CATEGORIES.map(c=>`<option value="${c}" ${f&&f.category===c?'selected':''}>${CAT_LABELS[c]||c}</option>`).join('')}
      </select></div>
      <div><label>食部(%)</label><input id="fe_edible" type="number" value="${f?f.edible||100:100}"></div>
      <div><label>热量(kcal)</label><input id="fe_energyKCal" type="number" value="${f?f.energyKCal||0:0}"></div>
      <div><label>蛋白质(g)</label><input id="fe_protein" type="number" step="0.1" value="${f?f.protein||0:0}"></div>
      <div><label>脂肪(g)</label><input id="fe_fat" type="number" step="0.1" value="${f?f.fat||0:0}"></div>
      <div><label>碳水化合物(g)</label><input id="fe_CHO" type="number" step="0.1" value="${f?f.CHO||0:0}"></div>
      <div><label>膳食纤维(g)</label><input id="fe_dietaryFiber" type="number" step="0.1" value="${f?f.dietaryFiber||0:0}"></div>
      <div><label>胆固醇(mg)</label><input id="fe_cholesterol" type="number" value="${f?f.cholesterol||0:0}"></div>
      <div><label>钙(mg)</label><input id="fe_Ca" type="number" value="${f?f.Ca||0:0}"></div>
      <div><label>磷(mg)</label><input id="fe_P" type="number" value="${f?f.P||0:0}"></div>
      <div><label>钾(mg)</label><input id="fe_K" type="number" value="${f?f.K||0:0}"></div>
      <div><label>钠(mg)</label><input id="fe_Na" type="number" value="${f?f.Na||0:0}"></div>
      <div><label>镁(mg)</label><input id="fe_Mg" type="number" value="${f?f.Mg||0:0}"></div>
      <div><label>铁(mg)</label><input id="fe_Fe" type="number" step="0.1" value="${f?f.Fe||0:0}"></div>
      <div><label>锌(mg)</label><input id="fe_Zn" type="number" step="0.01" value="${f?f.Zn||0:0}"></div>
      <div><label>硒(μg)</label><input id="fe_Se" type="number" step="0.01" value="${f?f.Se||0:0}"></div>
      <div><label>维生素A(μg)</label><input id="fe_vitaminA" type="number" value="${f?f.vitaminA||0:0}"></div>
      <div><label>维生素B1(mg)</label><input id="fe_thiamin" type="number" step="0.01" value="${f?f.thiamin||0:0}"></div>
      <div><label>维生素B2(mg)</label><input id="fe_riboflavin" type="number" step="0.01" value="${f?f.riboflavin||0:0}"></div>
      <div><label>烟酸(mg)</label><input id="fe_niacin" type="number" step="0.1" value="${f?f.niacin||0:0}"></div>
      <div><label>维生素C(mg)</label><input id="fe_vitaminC" type="number" value="${f?f.vitaminC||0:0}"></div>
      <div><label>维生素E(mg)</label><input id="fe_vitaminETotal" type="number" step="0.01" value="${f?f.vitaminETotal||0:0}"></div>
      <div><label>FODMAP</label><select id="fe_fodmap">
        <option value="low" ${f&&f.fodmap==='low'?'selected':''}>低</option>
        <option value="medium" ${f&&f.fodmap==='medium'?'selected':''}>中</option>
        <option value="high" ${f&&f.fodmap==='high'?'selected':''}>高</option>
      </select></div>
      <div><label>BV</label><input id="fe_bvSolo" type="number" value="${f?f.bvSolo||0:0}"></div>
      <div><label>PDCAAS</label><input id="fe_pdcaas" type="number" step="0.01" value="${f?f.pdcaas||0:0}"></div>
      <div><label>DIAAS</label><input id="fe_diaas" type="number" step="0.01" value="${f?f.diaas||0:0}"></div>
      <div><label>限制氨基酸</label><input id="fe_limitingAA" value="${f?f.limitingAA||'':''}"></div>
      <div class="fe-full"><label>饮食标签</label>
        <div class="food-edit-tags" id="fe_dietTags">
          ${ALL_DIET_TAGS.map(tag=>`<span class="tag-chip ${tags.includes(tag)?'active':''}" onclick="this.classList.toggle('active')">${DIET_TAG_LABELS[tag]||tag}</span>`).join('')}
        </div>
      </div>
      ${!isAdmin ? '<div class="fe-full"><label>修改说明（选填）</label><input id="fe_reason" placeholder="说明修改原因..."></div>' : ''}
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="auth-btn auth-btn-primary" style="width:auto;padding:8px 20px;" onclick="submitFoodEdit()">${isAdmin ? (foodId ? '💾 保存修改' : '➕ 添加食物') : '📤 提交修改申请'}</button>
      <button class="auth-btn auth-btn-secondary" style="width:auto;padding:8px 20px;" onclick="closeFoodEditModal()">取消</button>
    </div>
  `;
  
  document.getElementById('foodEditModalOverlay').classList.add('show');
}

function closeFoodEditModal() {
  document.getElementById('foodEditModalOverlay').classList.remove('show');
}

function getFoodEditData() {
  const tagChips = document.querySelectorAll('#fe_dietTags .tag-chip.active');
  const dietTags = [];
  tagChips.forEach((chip, idx) => {
    if (chip.classList.contains('active')) {
      dietTags.push(ALL_DIET_TAGS[idx]);
    }
  });
  return {
    name: document.getElementById('fe_name').value.trim(),
    nameEn: document.getElementById('fe_nameEn').value.trim(),
    category: document.getElementById('fe_category').value,
    edible: parseFloat(document.getElementById('fe_edible').value) || 100,
    energyKCal: parseFloat(document.getElementById('fe_energyKCal').value) || 0,
    protein: parseFloat(document.getElementById('fe_protein').value) || 0,
    fat: parseFloat(document.getElementById('fe_fat').value) || 0,
    CHO: parseFloat(document.getElementById('fe_CHO').value) || 0,
    dietaryFiber: parseFloat(document.getElementById('fe_dietaryFiber').value) || 0,
    cholesterol: parseFloat(document.getElementById('fe_cholesterol').value) || 0,
    Ca: parseFloat(document.getElementById('fe_Ca').value) || 0,
    P: parseFloat(document.getElementById('fe_P').value) || 0,
    K: parseFloat(document.getElementById('fe_K').value) || 0,
    Na: parseFloat(document.getElementById('fe_Na').value) || 0,
    Mg: parseFloat(document.getElementById('fe_Mg').value) || 0,
    Fe: parseFloat(document.getElementById('fe_Fe').value) || 0,
    Zn: parseFloat(document.getElementById('fe_Zn').value) || 0,
    Se: parseFloat(document.getElementById('fe_Se').value) || 0,
    vitaminA: parseFloat(document.getElementById('fe_vitaminA').value) || 0,
    thiamin: parseFloat(document.getElementById('fe_thiamin').value) || 0,
    riboflavin: parseFloat(document.getElementById('fe_riboflavin').value) || 0,
    niacin: parseFloat(document.getElementById('fe_niacin').value) || 0,
    vitaminC: parseFloat(document.getElementById('fe_vitaminC').value) || 0,
    vitaminETotal: parseFloat(document.getElementById('fe_vitaminETotal').value) || 0,
    fodmap: document.getElementById('fe_fodmap').value,
    bvSolo: parseFloat(document.getElementById('fe_bvSolo').value) || 0,
    pdcaas: parseFloat(document.getElementById('fe_pdcaas').value) || 0,
    diaas: parseFloat(document.getElementById('fe_diaas').value) || 0,
    limitingAA: document.getElementById('fe_limitingAA').value.trim() || '-',
    dietTags: dietTags
  };
}

function submitFoodEdit() {
  const role = getCurrentRole();
  const data = getFoodEditData();
  if (!data.name) { alert('请输入食物名称'); return; }
  
  if (role === 'admin') {
    // Admin: directly apply changes
    if (editingFoodId) {
      // Edit existing
      const idx = FOOD_DB.findIndex(f => f.id === editingFoodId);
      if (idx >= 0) {
        data.id = editingFoodId;
        FOOD_DB[idx] = data;
      }
    } else {
      // Add new
      data.id = 'CF' + Date.now().toString(36).toUpperCase();
      FOOD_DB.push(data);
    }
    // Persist to localStorage (v1.2)
    userFoods.push({
      action: editingFoodId ? 'edit' : 'add',
      foodId: data.id,
      data: data,
      timestamp: Date.now(),
      editorId: currentSession ? currentSession.userId : 'admin'
    });
    localStorage.setItem('nutripro_userFoods', JSON.stringify(userFoods));
    CloudSync.push('userFoods', userFoods);
    closeFoodEditModal();
    closeModal();
    renderFoodSidebar();
    renderFoodGrid();
    alert(editingFoodId ? '食物数据已更新' : '新食物已添加');
  } else {
    // Resident: submit as application
    const auth = getAuthData();
    if (!auth.foodEditApps) auth.foodEditApps = [];
    
    const reasonEl = document.getElementById('fe_reason');
    const reason = reasonEl ? reasonEl.value.trim() : '';
    
    auth.foodEditApps.push({
      id: Date.now().toString(),
      userId: currentSession.userId,
      userName: currentSession.userName || '常驻用户',
      type: editingFoodId ? 'edit' : 'add',
      foodId: editingFoodId || '',
      foodName: data.name,
      data: data,
      reason: reason,
      status: 'pending',
      createdAt: Date.now()
    });
    saveAuthData(auth);
    closeFoodEditModal();
    alert('修改申请已提交，请等待管理员审批');
  }
}

function approveFoodEditApp(appId) {
  const auth = getAuthData();
  const app = (auth.foodEditApps || []).find(a => a.id === appId);
  if (!app) return;
  
  app.status = 'approved';
  app.processedAt = Date.now();
  saveAuthData(auth);
  
  // Apply the food data change
  if (app.type === 'edit' && app.foodId) {
    const idx = FOOD_DB.findIndex(f => f.id === app.foodId);
    if (idx >= 0) {
      app.data.id = app.foodId;
      FOOD_DB[idx] = app.data;
    }
    // Persist to userFoods (v1.2)
    userFoods.push({
      action: 'edit',
      foodId: app.foodId,
      data: app.data,
      timestamp: Date.now(),
      editorId: 'admin'
    });
  } else if (app.type === 'add') {
    app.data.id = 'CF' + Date.now().toString(36).toUpperCase();
    FOOD_DB.push(app.data);
    userFoods.push({
      action: 'add',
      foodId: app.data.id,
      data: app.data,
      timestamp: Date.now(),
      editorId: 'admin'
    });
  }
  localStorage.setItem('nutripro_userFoods', JSON.stringify(userFoods));
  CloudSync.push('userFoods', userFoods);

  renderFoodSidebar();
  renderFoodGrid();
  renderAdminSidebar();
}

function rejectFoodEditApp(appId) {
  const auth = getAuthData();
  const app = (auth.foodEditApps || []).find(a => a.id === appId);
  if (!app) return;
  app.status = 'rejected';
  app.processedAt = Date.now();
  saveAuthData(auth);
  renderAdminSidebar();
}

function approveAllFoodEditApps() {
  const auth = getAuthData();
  const pending = (auth.foodEditApps || []).filter(a => a.status === 'pending');
  if (pending.length === 0) { alert('没有待审批的食物修改申请'); return; }
  if (!confirm(`确定要一键通过全部 ${pending.length} 条申请吗？`)) return;
  
  pending.forEach(app => {
    app.status = 'approved';
    app.processedAt = Date.now();

    if (app.type === 'edit' && app.foodId) {
      const idx = FOOD_DB.findIndex(f => f.id === app.foodId);
      if (idx >= 0) {
        app.data.id = app.foodId;
        FOOD_DB[idx] = app.data;
      }
      userFoods.push({ action: 'edit', foodId: app.foodId, data: app.data, timestamp: Date.now(), editorId: 'admin' });
    } else if (app.type === 'add') {
      app.data.id = 'CF' + Date.now().toString(36).toUpperCase();
      FOOD_DB.push(app.data);
      userFoods.push({ action: 'add', foodId: app.data.id, data: app.data, timestamp: Date.now(), editorId: 'admin' });
    }
  });

  saveAuthData(auth);
  localStorage.setItem('nutripro_userFoods', JSON.stringify(userFoods));
  CloudSync.push('userFoods', userFoods);
  renderFoodSidebar();
  renderFoodGrid();
  renderAdminSidebar();
  alert(`已通过 ${pending.length} 条食物修改申请`);
}

// ===== APPLICATION MODAL =====
// appModalType, appModalTarget declared in state.js

function openAppModal(type, target) {
  appModalType = type;
  appModalTarget = target || '';
  const modal = document.getElementById('appModalOverlay');
  const titleEl = document.getElementById('appModalTitle');
  const permSelect = document.getElementById('appPermSelect');
  const permLabel = document.getElementById('appPermLabel');

  if (type === 'upgrade') {
    titleEl.textContent = '📋 申请成为常驻用户';
    permLabel.style.display = 'none';
    permSelect.style.display = 'none';
  } else {
    titleEl.textContent = '📋 申请查阅权限';
    permLabel.style.display = '';
    permSelect.style.display = '';
    if (target) permSelect.value = target;
  }
  document.getElementById('appReason').value = '';
  modal.classList.add('show');
}

function closeAppModal() {
  document.getElementById('appModalOverlay').classList.remove('show');
}

function submitApplication() {
  if (!currentSession) return;
  const auth = getAuthData();
  if (!auth.applications) auth.applications = [];

  const reason = document.getElementById('appReason').value.trim();
  const target = appModalType === 'perm' ? document.getElementById('appPermSelect').value : '';

  // Check for duplicate pending application
  const dup = auth.applications.find(a =>
    a.userId === currentSession.userId &&
    a.type === appModalType &&
    a.target === (appModalType === 'perm' ? target : '') &&
    a.status === 'pending'
  );
  if (dup) { alert('您已提交过相同申请，请等待管理员处理'); closeAppModal(); return; }

  auth.applications.push({
    id: Date.now().toString(),
    userId: currentSession.userId,
    userName: currentSession.userName || '普通用户',
    type: appModalType,
    target: appModalType === 'perm' ? target : '',
    reason: reason,
    status: 'pending',
    adminReply: '',
    createdAt: Date.now()
  });
  saveAuthData(auth);
  closeAppModal();
  alert('申请已提交，请等待管理员审批');
}

