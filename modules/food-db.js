// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: food-db.js
// Purpose: Food database loading (FOOD_DB declared in state.js)
// ============================================================

async function loadFoodDB() {
  try {
    const resp = await fetch('food_db.json');
    if (!resp.ok) throw new Error('Failed to load food_db.json');
    FOOD_DB = await resp.json();
    console.log(`Loaded ${FOOD_DB.length} food items`);

    // Merge user-edited/added foods (v1.2 migration)
    const saved = JSON.parse(localStorage.getItem('nutripro_userFoods') || '[]');
    saved.forEach(function(entry) {
      if (entry.action === 'add') {
        const exists = FOOD_DB.find(function(f) { return f.id === entry.foodId; });
        if (!exists) FOOD_DB.push(entry.data);
      } else if (entry.action === 'edit' && entry.foodId) {
        const idx = FOOD_DB.findIndex(function(f) { return f.id === entry.foodId; });
        if (idx >= 0) FOOD_DB[idx] = Object.assign({}, FOOD_DB[idx], entry.data);
      }
    });

    return true;
  } catch (e) {
    console.error('Error loading food_db.json:', e);
    FOOD_DB = [];
    return false;
  }
}
