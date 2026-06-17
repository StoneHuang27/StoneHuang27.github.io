// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: supplements.js
// Purpose: Supplement tracking and nutrition calculation
// ============================================================

const SUPPLEMENT_DB = [
  { id: 'supp_whey', name: '乳清蛋白粉', nameEn: 'Whey Protein', servingSize: 30, protein: 24, fat: 1.5, carbs: 3 },
  { id: 'supp_creatine', name: '肌酸', nameEn: 'Creatine Monohydrate', servingSize: 5, protein: 0, fat: 0, carbs: 0 },
  { id: 'supp_bcaa', name: 'BCAA支链氨基酸', nameEn: 'BCAA', servingSize: 5, protein: 0, fat: 0, carbs: 0 },
  { id: 'supp_multivitamin', name: '复合维生素', nameEn: 'Multivitamin', servingSize: 2, protein: 0, fat: 0, carbs: 0 },
  { id: 'supp_fishoil', name: '鱼油', nameEn: 'Fish Oil', servingSize: 1, protein: 0, fat: 1, carbs: 0 },
  { id: 'supp_vitamind', name: '维生素D', nameEn: 'Vitamin D3', servingSize: 1, protein: 0, fat: 0, carbs: 0 },
  { id: 'supp_zinc', name: '锌', nameEn: 'Zinc', servingSize: 1, protein: 0, fat: 0, carbs: 0 },
  { id: 'supp_magnesium', name: '镁', nameEn: 'Magnesium', servingSize: 1, protein: 0, fat: 0, carbs: 0 },
  { id: 'supp_caffeine', name: '咖啡因', nameEn: 'Caffeine', servingSize: 1, protein: 0, fat: 0, carbs: 0 },
  { id: 'supp_casein', name: '酪蛋白', nameEn: 'Casein', servingSize: 35, protein: 28, fat: 1.5, carbs: 3 }
];

// 自定义补剂（用户添加）
function getCustomSupplements() {
  try { return JSON.parse(localStorage.getItem('nutripro_customSupplements') || '[]'); } catch { return []; }
}
function saveCustomSupplements(list) {
  localStorage.setItem('nutripro_customSupplements', JSON.stringify(list));
}

// 记录补剂摄入
function takeSupplement(supplementId, servings) {
  if (!currentUser) return false;
  const dateStr = new Date().toISOString().split('T')[0];
  if (!supplementLog[currentUser.id]) supplementLog[currentUser.id] = {};
  if (!supplementLog[currentUser.id][dateStr]) supplementLog[currentUser.id][dateStr] = [];

  const allSupps = SUPPLEMENT_DB.concat(getCustomSupplements());
  const sup = allSupps.find(function(s) { return s.id === supplementId; });
  if (!sup) return false;

  supplementLog[currentUser.id][dateStr].push({
    supplementId: supplementId,
    name: sup.name,
    servings: servings,
    timestamp: Date.now()
  });

  localStorage.setItem('nutripro_supplementLog', JSON.stringify(supplementLog));
  return true;
}

// 获取当日补剂营养总计
function getDailySupplementMacros(dateStr) {
  if (!currentUser || !supplementLog[currentUser.id] || !supplementLog[currentUser.id][dateStr]) {
    return { protein: 0, fat: 0, carbs: 0, calories: 0 };
  }
  const entries = supplementLog[currentUser.id][dateStr];
  const allSupps = SUPPLEMENT_DB.concat(getCustomSupplements());
  let totalP = 0, totalF = 0, totalC = 0;
  entries.forEach(function(entry) {
    const sup = allSupps.find(function(s) { return s.id === entry.supplementId; });
    if (sup) {
      totalP += (sup.protein || 0) * entry.servings;
      totalF += (sup.fat || 0) * entry.servings;
      totalC += (sup.carbs || 0) * entry.servings;
    }
  });
  // Approximate calories: protein 4kcal/g, fat 9kcal/g, carbs 4kcal/g
  const calories = totalP * 4 + totalF * 9 + totalC * 4;
  return { protein: totalP, fat: totalF, carbs: totalC, calories: calories };
}

// 获取当日补剂列表
function getTodaySupplements() {
  if (!currentUser) return [];
  const dateStr = new Date().toISOString().split('T')[0];
  if (!supplementLog[currentUser.id] || !supplementLog[currentUser.id][dateStr]) return [];
  return supplementLog[currentUser.id][dateStr];
}

// 渲染补剂记录UI
function renderSupplementTracker() {
  const container = document.getElementById('supplementTracker');
  if (!container) return;

  const allSupps = SUPPLEMENT_DB.concat(getCustomSupplements());
  const todayEntries = getTodaySupplements();
  const macros = getDailySupplementMacros(new Date().toISOString().split('T')[0]);

  let entriesHtml = '';
  todayEntries.forEach(function(entry, idx) {
    entriesHtml += `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <span>${escapeHtml(entry.name)} × ${entry.servings}</span>
      <button class="btn-action" style="padding:1px 6px;font-size:10px;" onclick="removeSupplement(${idx})">✕</button>
    </div>`;
  });

  container.innerHTML = `<div class="calc-card">
    <h4>💊 补剂记录 (${new Date().toISOString().split('T')[0]})</h4>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      <select id="supplementSelect" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;font-size:13px;flex:1;min-width:120px;">
        <option value="">选择补剂...</option>
        ${allSupps.map(function(s) { return '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>'; }).join('')}
      </select>
      <input type="number" id="supplementServings" value="1" min="0.5" step="0.5" style="width:60px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:6px;font-size:13px;" placeholder="份数">
      <button class="btn-primary" onclick="recordSupplement()" style="padding:6px 12px;font-size:13px;">添加</button>
    </div>
    <div style="margin-bottom:8px;">${entriesHtml || '<p style="color:var(--text-muted);font-size:13px;">今日暂无补剂记录</p>'}</div>
    <div style="padding-top:8px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted);">
      补剂总计: 蛋白质 ${macros.protein.toFixed(1)}g | 脂肪 ${macros.fat.toFixed(1)}g | 碳水 ${macros.carbs.toFixed(1)}g
    </div>
  </div>`;
}

function recordSupplement() {
  const select = document.getElementById('supplementSelect');
  const servings = parseFloat(document.getElementById('supplementServings').value) || 1;
  if (!select.value) { alert('请选择补剂'); return; }
  takeSupplement(select.value, servings);
  renderSupplementTracker();
}

function removeSupplement(index) {
  if (!currentUser) return;
  const dateStr = new Date().toISOString().split('T')[0];
  if (supplementLog[currentUser.id] && supplementLog[currentUser.id][dateStr]) {
    supplementLog[currentUser.id][dateStr].splice(index, 1);
    localStorage.setItem('nutripro_supplementLog', JSON.stringify(supplementLog));
    renderSupplementTracker();
  }
}
