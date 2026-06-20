// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: state.js
// Purpose: Unified global state management — single source of truth
// ============================================================

// ===== FOOD DATABASE =====
let FOOD_DB = [];

// ===== USER STATE =====
let users = JSON.parse(localStorage.getItem('nutripro_users') || '[]');
let currentUser = JSON.parse(localStorage.getItem('nutripro_currentUser') || 'null');

// ===== DIET STATE =====
let allDietData = JSON.parse(localStorage.getItem('nutripro_allDietData') || '{}');
let selectedDietDate = new Date().toISOString().split('T')[0]; // default today
let dietDateRange = { start: null, end: null }; // for multi-day view
let dietViewMode = 'single'; // 'single' or 'range'
let allFoodsForDiet = [];

// ===== FOOD SELECTION STATE =====
let selectedFoods = [];

// ===== FOOD FILTER STATE =====
let currentCategory = 'all';
let currentDietTag = null;
let activeFodmapFilter = null;
let activeProteinFilter = null;

// ===== SESSION STATE =====
let currentSession = null;

// ===== ADMIN STATE =====
let editingFoodId = null; // null = adding new food
let appModalType = '';
let appModalTarget = '';

// ===== USER-EDITED FOODS =====
let userFoods = JSON.parse(localStorage.getItem('nutripro_userFoods') || '[]');

// ===== HEALTH DATA =====
let healthData = JSON.parse(localStorage.getItem('nutripro_healthData') || '{}');

// ===== ENERGY UNIT PREFERENCE =====
let energyUnit = localStorage.getItem('nutripro_energyUnit') || 'kcal';

// ===== DIET CLIPBOARD =====
let dietClipboard = null;

// ===== AUDIT LOG =====
let auditLog = JSON.parse(localStorage.getItem('nutripro_auditLog') || '[]');

function logAudit(action, userId, details) {
  auditLog.push({
    action: action,
    userId: userId || 'system',
    details: details || '',
    timestamp: Date.now()
  });
  // Keep last 1000 entries
  if (auditLog.length > 1000) auditLog = auditLog.slice(-1000);
  localStorage.setItem('nutripro_auditLog', JSON.stringify(auditLog));
}

// ===== SUPPLEMENT LOG =====
let supplementLog = JSON.parse(localStorage.getItem('nutripro_supplementLog') || '{}');

// ===== UI STATE =====
let siteName = localStorage.getItem('nutripro_siteName') || '';

// ===== PERSISTENCE HELPERS =====
function persistUsers() {
  localStorage.setItem('nutripro_users', JSON.stringify(users));
  localStorage.setItem('nutripro_currentUser', JSON.stringify(currentUser));
}

function persistDietData() {
  localStorage.setItem('nutripro_allDietData', JSON.stringify(allDietData));
}

function persistSiteName() {
  localStorage.setItem('nutripro_siteName', siteName);
}
