// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: food-render.js
// Purpose: Page switching, food sidebar, grid, detail, ranking, compare
// ============================================================

function switchToPage(page) {
  try {
  // Permission check
  const permMap = {calc:'calc', diet:'diet', advice:'advice', user:'user'};
  if (permMap[page] && !hasPermission(permMap[page])) {
    // For guests, show the locked page (it has overlay)
    // But don't block navigation - the perm-locked overlay handles it
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById('page-'+page);
  if (target) target.classList.add('active');
  const tabs = document.querySelectorAll('.tab-btn');
  const tabMap = {food:0,calc:1,diet:2,advice:3};
  if (tabMap[page] !== undefined && tabs[tabMap[page]]) tabs[tabMap[page]].classList.add('active');
  if (page === 'user') {
    if (hasPermission('user')) {
      renderUsers();
      renderUserForm();
    }
  }
  if (page === 'calc') renderCalculators();
  if (page === 'diet') renderDietPage();
  } catch(e) { console.error('switchToPage error:', e); }
}

// ===== FOOD RENDERING =====
function renderFoodSidebar() {
  try {
  const cats = [
    {id:'all',key:'cat_all',icon:'📋'},
    {id:'grain',key:'cat_grain',icon:'🌾'},
    {id:'veg',key:'cat_veg',icon:'🥬'},
    {id:'fruit',key:'cat_fruit',icon:'🍎'},
    {id:'meat',key:'cat_meat',icon:'🥩'},
    {id:'seafood',key:'cat_seafood',icon:'🐟'},
    {id:'dairy',key:'cat_dairy',icon:'🥛'},
    {id:'egg',key:'cat_egg',icon:'🥚'},
    {id:'legume',key:'cat_legume',icon:'🫘'},
    {id:'nut',key:'cat_nut',icon:'🥜'},
    {id:'fungus',key:'cat_fungus',icon:'🍄'},
    {id:'oil',key:'cat_oil',icon:'🫒'},
    {id:'drink',key:'cat_drink',icon:'☕'},
    {id:'tuber',key:'cat_tuber',icon:'🥔'},
    {id:'infant',key:'cat_infant',icon:'🍼'},
    {id:'fastfood',key:'cat_fastfood',icon:'🍔'},
    {id:'alcohol',key:'cat_alcohol',icon:'🍺'},
    {id:'supplement',key:'cat_supplement',icon:'💊'},
    {id:'snack',key:'cat_snack',icon:'🍿'},
    {id:'sugar',key:'cat_sugar',icon:'🍬'},
    {id:'condiment',key:'cat_condiment',icon:'🧂'},
    {id:'seasoning',key:'cat_seasoning',icon:'🫙'},
    {id:'other',key:'cat_other',icon:'📦'},
  ];
  const el = document.getElementById('foodSidebar');
  el.innerHTML = cats.map(c => {
    const count = c.id === 'all' ? FOOD_DB.length : FOOD_DB.filter(f=>f.category===c.id).length;
    return `<div class="cat-item ${c.id==='all'?'active':''}" onclick="filterCategory('${c.id}',this)">${c.icon} ${t(c.key)} <span class="count">${count}</span></div>`;
  }).join('');
  } catch(e) { console.error('renderFoodSidebar error:', e); }
}

// currentCategory, currentDietTag declared in state.js

function filterCategory(cat, el) {
  currentCategory = cat;
  document.querySelectorAll('.cat-item').forEach(c=>c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderFoodGrid();
}
function toggleDietTag(tag) {
  currentDietTag = currentDietTag === tag ? null : tag;
  document.querySelectorAll('.food-tag').forEach(t => t.classList.toggle('active', t.getAttribute('onclick').includes("'"+tag+"'") && currentDietTag===tag));
  renderFoodGrid();
}
// toggleFilter is defined in app.js — no-op stub kept for backwards compatibility

function renderFoodGrid() {
  try {
  const search = document.getElementById('foodSearch').value.toLowerCase();
  let foods = FOOD_DB;
  if (currentCategory !== 'all') foods = foods.filter(f => f.category === currentCategory);
  if (search) foods = foods.filter(f => f.name.includes(search) || (f.nameEn||'').toLowerCase().includes(search));
  if (currentDietTag) foods = foods.filter(f => f.dietTags && f.dietTags.includes(currentDietTag));
  if (activeFodmapFilter) foods = foods.filter(f => f.fodmap === activeFodmapFilter);
  if (activeProteinFilter) foods = foods.filter(f => f.bvSolo && parseFloat(f.bvSolo) >= activeProteinFilter);
  const grid = document.getElementById('foodGrid');
  const isGuest = getCurrentRole() === 'guest';
  if (foods.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">🔍</div>'+t('search_food')+'</div>';
    return;
  }
  grid.innerHTML = foods.slice(0, CONFIG.FOOD_GRID_LIMIT).map(f => {
    const isSelected = selectedFoods.includes(f.id);
    const fodmapColor = f.fodmap === 'low' ? '#22c55e' : f.fodmap === 'medium' ? '#f59e0b' : f.fodmap === 'high' ? '#ef4444' : 'transparent';
    const fodmapText = f.fodmap === 'low' ? 'L' : f.fodmap === 'medium' ? 'M' : f.fodmap === 'high' ? 'H' : '';
    if (isGuest) {
      // Guest: show name + fodmap badge + protein quality badge only
      const bvBadge = f.bvSolo ? `<span class="badge badge-blue" style="font-size:10px;">BV:${f.bvSolo}</span>` : '';
      const pdcaasBadge = f.pdcaas ? `<span class="badge badge-green" style="font-size:10px;">PDCAAS:${f.pdcaas}</span>` : '';
      return `<div class="food-card" onclick="showFoodDetail('${f.id}')">
        ${fodmapText ? `<div class="fodmap-badge" style="background:${fodmapColor}">${fodmapText}</div>` : ''}
        <div class="name">${f.name}</div>
        <div class="name-en">${f.nameEn||''}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">
          ${bvBadge}${pdcaasBadge}
          ${f.fodmap ? `<span class="badge badge-yellow" style="font-size:10px;">FODMAP:${f.fodmap==='low'?'低':f.fodmap==='medium'?'中':'高'}</span>` : ''}
        </div>
      </div>`;
    }
    return `<div class="food-card ${isSelected?'selected':''}" onclick="showFoodDetail('${f.id}')">
      <div class="select-check" onclick="event.stopPropagation();toggleFoodSelect('${f.id}',event)">${isSelected?'✓':''}</div>
      ${fodmapText ? `<div class="fodmap-badge" style="background:${fodmapColor}">${fodmapText}</div>` : ''}
      <div class="name">${f.name}</div>
      <div class="name-en">${f.nameEn||''}</div>
      <div class="cal">${formatEnergyValue(f.energyKCal||0)} <span class="cal-unit">${energyUnit==='kj'?'kJ':'kcal'}/100g</span></div>
      <div class="macros">
        <div class="macro"><div class="val">${f.protein||0}g</div>P</div>
        <div class="macro"><div class="val">${f.fat||0}g</div>F</div>
        <div class="macro"><div class="val">${f.CHO||0}g</div>C</div>
      </div>
    </div>`;
  }).join('');
  if (foods.length > CONFIG.FOOD_GRID_LIMIT) grid.innerHTML += `<div style="text-align:center;padding:16px;color:var(--text-muted);">... ${foods.length-CONFIG.FOOD_GRID_LIMIT} ${t('more_foods')}</div>`;
  } catch(e) { console.error('renderFoodGrid error:', e); }
}

function toggleFoodSelect(id, e) {
  if (e && !e.target.closest('.select-check')) {
    // If not clicking the checkbox, open detail
    showFoodDetail(id);
    return;
  }
  const idx = selectedFoods.indexOf(id);
  if (idx >= 0) selectedFoods.splice(idx, 1);
  else if (selectedFoods.length < 10) selectedFoods.push(id);
  updateCompareBar();
  renderFoodGrid();
}

function updateCompareBar() {
  const bar = document.getElementById('compareBar');
  const countEl = document.getElementById('compareCount');
  const itemsEl = document.getElementById('selectedItems');
  const btn = document.getElementById('compareBtn');
  if (selectedFoods.length > 0) {
    bar.style.display = 'flex';
    countEl.textContent = selectedFoods.length;
    itemsEl.innerHTML = selectedFoods.map(id => {
      const f = FOOD_DB.find(x=>x.id===id);
      return `<span class="compare-chip">${f?escapeHtml(f.name):escapeHtml(id)} <span class="remove" onclick="event.stopPropagation();removeCompare('${id}')">✕</span></span>`;
    }).join('');
    btn.disabled = selectedFoods.length < 2;
  } else {
    bar.style.display = 'none';
  }
}
function removeCompare(id) {
  selectedFoods = selectedFoods.filter(x=>x!==id);
  updateCompareBar();
  renderFoodGrid();
}

// ===== FOOD DETAIL MODAL =====
function showFoodDetail(id) {
  try {
  const f = FOOD_DB.find(x=>x.id===id);
  if (!f) return;
  document.getElementById('modalFoodName').textContent = f.name + (f.nameEn ? ` (${f.nameEn})` : '');
  
  // Show edit button for admin or resident
  const editBtn = document.getElementById('foodEditBtn');
  const role = getCurrentRole();
  if (editBtn) {
    if (role === 'admin' || role === 'resident') {
      editBtn.style.display = '';
      editBtn.setAttribute('data-food-id', id);
    } else {
      editBtn.style.display = 'none';
    }
  }
  
  const body = document.getElementById('modalBody');
  const isGuest = role === 'guest' && !hasPermission('food_detail_full');

  // Build attribute groups
  const totalMacro = (parseFloat(f.protein)||0) + (parseFloat(f.fat)||0) + (parseFloat(f.CHO)||0);
  const pPct = totalMacro ? ((parseFloat(f.protein)||0)/totalMacro*100).toFixed(1) : 0;
  const fPct = totalMacro ? ((parseFloat(f.fat)||0)/totalMacro*100).toFixed(1) : 0;
  const cPct = totalMacro ? ((parseFloat(f.CHO)||0)/totalMacro*100).toFixed(1) : 0;

  let html = '';

  // For guest users: show only 附加属性 (FODMAP, BV, PDCAAS, DIAAS, 食部, 胆固醇, 饮食标签, 氨基酸)
  // For resident/admin: show everything

  if (!isGuest) {
    // BASIC - full access
    html += `
    <div class="attr-group">
      <div class="attr-header open" onclick="toggleAttr(this)">
        <span>📊 ${t('basic')}</span><span class="arrow">▼</span>
      </div>
      <div class="attr-content show">
        <table class="nutrient-table">
          <tr><td>热量</td><td class="val">${formatEnergy(f.energyKCal||0)}</td></tr>
          <tr><td>蛋白质</td><td class="val">${f.protein||0} g (${pPct}%)</td></tr>
          <tr><td>脂肪</td><td class="val">${f.fat||0} g (${fPct}%)</td></tr>
          <tr><td>碳水化合物</td><td class="val">${f.CHO||0} g (${cPct}%)</td></tr>
          <tr><td>膳食纤维</td><td class="val">${f.dietaryFiber||0} g</td></tr>
          <tr><td>食部</td><td class="val">${f.edible||100}%</td></tr>
        </table>
        <div class="chart-container"><canvas id="macroChart"></canvas></div>
      </div>
    </div>
    <!-- FAT DETAIL -->
    <div class="attr-group">
      <div class="attr-header" onclick="toggleAttr(this)">
        <span>🧈 ${t('fat_detail')}</span><span class="arrow">▼</span>
      </div>
      <div class="attr-content">
        <table class="nutrient-table">
          <tr><td>饱和脂肪</td><td class="val">${f.satFat||'-'} g</td></tr>
          <tr><td>单不饱和脂肪</td><td class="val">${f.monoFat||'-'} g</td></tr>
          <tr><td>多不饱和脂肪</td><td class="val">${f.polyFat||'-'} g</td></tr>
          <tr><td>胆固醇</td><td class="val">${f.cholesterol||'-'} mg</td></tr>
        </table>
        ${f.satFat ? '<div class="chart-container"><canvas id="fatChart"></canvas></div>' : ''}
      </div>
    </div>
    <!-- MICRONUTRIENTS -->
    <div class="attr-group">
      <div class="attr-header" onclick="toggleAttr(this)">
        <span>💊 ${t('micronutrient')}</span><span class="arrow">▼</span>
      </div>
      <div class="attr-content">
        <h4 style="margin:8px 0 4px;color:var(--accent-light);">维生素</h4>
        <table class="nutrient-table">
          <tr><td>维生素A</td><td class="val">${f.vitaminA||'-'} μg RE</td></tr>
          <tr><td>维生素B1</td><td class="val">${f.thiamin||'-'} mg</td></tr>
          <tr><td>维生素B2</td><td class="val">${f.riboflavin||'-'} mg</td></tr>
          <tr><td>烟酸</td><td class="val">${f.niacin||'-'} mg</td></tr>
          <tr><td>维生素C</td><td class="val">${f.vitaminC||'-'} mg</td></tr>
          <tr><td>维生素E</td><td class="val">${f.vitaminETotal||'-'} mg</td></tr>
        </table>
        <h4 style="margin:12px 0 4px;color:var(--accent-light);">矿物质</h4>
        <table class="nutrient-table">
          <tr><td>钙</td><td class="val">${f.Ca||'-'} mg</td></tr>
          <tr><td>磷</td><td class="val">${f.P||'-'} mg</td></tr>
          <tr><td>钾</td><td class="val">${f.K||'-'} mg</td></tr>
          <tr><td>钠</td><td class="val">${f.Na||'-'} mg</td></tr>
          <tr><td>镁</td><td class="val">${f.Mg||'-'} mg</td></tr>
          <tr><td>铁</td><td class="val">${f.Fe||'-'} mg</td></tr>
          <tr><td>锌</td><td class="val">${f.Zn||'-'} mg</td></tr>
          <tr><td>硒</td><td class="val">${f.Se||'-'} μg</td></tr>
        </table>
      </div>
    </div>`;
  }

  // PROTEIN QUALITY - always visible (附加属性)
  html += `
    <!-- PROTEIN QUALITY -->
    <div class="attr-group">
      <div class="attr-header open" onclick="toggleAttr(this)">
        <span>🧬 ${t('protein_quality')}</span><span class="arrow">▼</span>
      </div>
      <div class="attr-content show">
        <table class="nutrient-table">
          <tr><td>BV (单独食用)</td><td class="val">${f.bvSolo||'-'}</td></tr>
          <tr><td>BV (混合食用)</td><td class="val">${f.bvMixed||'-'}</td></tr>
          <tr><td>PDCAAS</td><td class="val">${f.pdcaas||'-'}</td></tr>
          <tr><td>DIAAS</td><td class="val">${f.diaas||'-'}</td></tr>
          <tr><td>限制性氨基酸</td><td class="val">${f.limitingAA||'-'}</td></tr>
        </table>
        ${f.essentialAAs ? renderAATable(f.essentialAAs) : ''}
      </div>
    </div>
    <!-- FODMAP -->
    <div class="attr-group">
      <div class="attr-header open" onclick="toggleAttr(this)">
        <span>🌿 ${t('fodmap')}</span><span class="arrow">▼</span>
      </div>
      <div class="attr-content show">
        <table class="nutrient-table">
          <tr><td>FODMAP等级</td><td class="val">${f.fodmap==='low'?'🟢 低':f.fodmap==='medium'?'🟡 中':f.fodmap==='high'?'🔴 高':'-'}</td></tr>
        </table>
        ${f.fodmapTypes ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${f.fodmapTypes.map(t=>`<span class="badge badge-blue">${t}</span>`).join('')}</div>` : ''}
      </div>
    </div>
    <!-- EXTRA ATTRS (食部 + 胆固醇 + 饮食标签) -->
    <div class="attr-group">
      <div class="attr-header" onclick="toggleAttr(this)">
        <span>📋 附加属性</span><span class="arrow">▼</span>
      </div>
      <div class="attr-content">
        <table class="nutrient-table">
          <tr><td>食部</td><td class="val">${f.edible||100}%</td></tr>
          <tr><td>胆固醇</td><td class="val">${f.cholesterol||'-'} mg</td></tr>
        </table>
        ${f.dietTags && f.dietTags.length ? `<div style="margin-top:8px;"><span style="color:var(--text-muted);font-size:12px;">饮食标签:</span> <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">${f.dietTags.map(tag=>`<span class="badge badge-green">${tag}</span>`).join('')}</div></div>` : ''}
      </div>
    </div>`;

  body.innerHTML = html;
  document.getElementById('foodModal').classList.add('show');
  // Draw macro pie chart (only if not guest)
  if (!isGuest) {
    setTimeout(() => {
      const ctx = document.getElementById('macroChart');
      if (ctx) typeof Chart!=='undefined' && new Chart(ctx, {type:'doughnut',data:{labels:['蛋白质','脂肪','碳水'],datasets:[{data:[pPct,fPct,cPct],backgroundColor:['#3b82f6','#f59e0b','#22c55e']}]},options:{responsive:true,plugins:{legend:{labels:{color:'#e2e8f0'}}}}});
      if (f.satFat) {
        const fctx = document.getElementById('fatChart');
        if (fctx) typeof Chart!=='undefined' && new Chart(fctx, {type:'bar',data:{labels:['饱和','单不饱和','多不饱和'],datasets:[{data:[f.satFat||0,f.monoFat||0,f.polyFat||0],backgroundColor:['#ef4444','#f59e0b','#3b82f6']}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#94a3b8'}},x:{ticks:{color:'#94a3b8'}}}}});
      }
    }, 100);
  }
  } catch(e) { console.error('showFoodDetail error:', e); }
}
function renderAATable(aas) {
  const aaNames = {His:'组氨酸',Ile:'异亮氨酸',Leu:'亮氨酸',Lys:'赖氨酸',SAA:'含硫AA',AAA:'芳香AA',Thr:'苏氨酸',Trp:'色氨酸',Val:'缬氨酸'};
  return `<h4 style="margin:12px 0 4px;color:var(--accent-light);">必需氨基酸 (mg/g protein)</h4>
    <table class="nutrient-table">
      <tr><th>氨基酸</th><th>含量</th></tr>
      ${Object.entries(aas).map(([k,v])=>`<tr><td>${aaNames[k]||k}</td><td class="val">${v||'-'}</td></tr>`).join('')}
    </table>`;
}
function toggleAttr(el) {
  el.classList.toggle('open');
  const content = el.nextElementSibling;
  content.classList.toggle('show');
}
function closeModal() { document.getElementById('foodModal').classList.remove('show'); }

// ===== RANKING =====
function showRanking(attr) {
  if (getCurrentRole() === 'guest') { alert('此功能需要常驻用户权限'); return; }
  const sorted = [...FOOD_DB].filter(f=>f[attr]!=null && f[attr]!=='-' && f[attr]!=='').sort((a,b) => parseFloat(b[attr])-parseFloat(a[attr]));
  const top100 = sorted.slice(0,100);
  const maxVal = top100.length ? parseFloat(top100[0][attr]) : 1;
  document.getElementById('rankTitle').textContent = t('ranking_prefix') + attr;
  document.getElementById('rankContent').innerHTML = `
    <table class="rank-table">
      <thead><tr><th>#</th><th>${t('name')}</th><th>${attr}</th><th></th></tr></thead>
      <tbody>${top100.map((f,i) => `<tr onclick="showFoodDetail('${f.id}')" style="cursor:pointer;">
        <td class="rank-num">${i+1}</td>
        <td>${f.name}</td>
        <td class="val">${f[attr]}</td>
        <td style="width:30%;"><div class="rank-bar" style="width:${(parseFloat(f[attr])/maxVal*100).toFixed(1)}%"></div></td>
      </tr>`).join('')}</tbody>
    </table>`;
  switchToPage('rank');
}

// ===== COMPARE =====
function showCompare() {
  if (getCurrentRole() === 'guest') { alert('此功能需要常驻用户权限'); return; }
  if (selectedFoods.length < 2) return;
  const foods = selectedFoods.map(id => FOOD_DB.find(f=>f.id===id)).filter(Boolean);
  const attrs = ['energyKCal','protein','fat','CHO','dietaryFiber','Ca','Fe','Zn','K','Na'];
  const attrNames = {energyKCal:'热量('+ (energyUnit==='kj'?'kJ':'kcal') +')',protein:'蛋白质(g)',fat:'脂肪(g)',CHO:'碳水(g)',dietaryFiber:'膳食纤维(g)',Ca:'钙(mg)',Fe:'铁(mg)',Zn:'锌(mg)',K:'钾(mg)',Na:'钠(mg)'};
  const el = document.getElementById('compareContent');
  el.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="nutrient-table" style="min-width:600px;">
        <thead><tr><th>${t('name')}</th>${foods.map(f=>`<th>${f.name}</th>`).join('')}</tr></thead>
        <tbody>${attrs.map(a => {
          const vals = foods.map(f => parseFloat(f[a])||0);
          const bestIdx = vals.indexOf(Math.max(...vals));
          return `<tr><td style="font-weight:500;color:var(--text-muted);background:var(--card);position:sticky;left:0;">${attrNames[a]}</td>${foods.map((f,i) => `<td class="${i===bestIdx?'best':''}" style="text-align:right;">${f[a]||'-'}</td>`).join('')}</tr>`;
        }).join('')}</tbody>
        <tbody><tr><td colspan="${foods.length+1}" style="padding:8px 0;"></td></tr></tbody>
        <tr><td colspan="${foods.length+1}" style="padding:12px 8px 4px;font-weight:600;color:var(--accent-light);font-size:14px;">🧬 ${t('protein_quality')} & FODMAP</td></tr>
        ${['bvSolo','pdcaas','diaas','fodmap','limitingAA'].map(a => {
          const an = {bvSolo:'BV '+t('bv_suffix'),pdcaas:'PDCAAS',diaas:'DIAAS',fodmap:'FODMAP',limitingAA:t('limiting_aa')}[a];
          return `<tr><td style="font-weight:500;color:var(--text-muted);background:var(--card);position:sticky;left:0;">${an}</td>${foods.map(f=>`<td style="text-align:center;">${f[a]||'-'}</td>`).join('')}</tr>`;
        }).join('')}
      </table>
    </div>
    <div class="chart-container" style="max-width:600px;margin-top:20px;"><canvas id="compareChart"></canvas></div>
  `;
  switchToPage('compare');
  setTimeout(() => {
    const ctx = document.getElementById('compareChart');
    if (ctx) typeof Chart!=='undefined' && new Chart(ctx, {type:'radar',data:{labels:['蛋白质','脂肪','碳水','膳食纤维','热量/50'],datasets:foods.map((f,i)=>({label:f.name,data:[parseFloat(f.protein)||0,parseFloat(f.fat)||0,parseFloat(f.CHO)||0,parseFloat(f.dietaryFiber)||0,(parseFloat(f.energyKCal)||0)/50],backgroundColor:`rgba(${59+i*40},${130-i*20},${246},0.2)`,borderColor:`rgba(${59+i*40},${130-i*20},${246},1)`}))},options:{responsive:true,scales:{r:{ticks:{color:'#94a3b8'},grid:{color:'rgba(148,163,184,0.2)'}}},plugins:{legend:{labels:{color:'#e2e8f0'}}}}});
  }, 100);
}
