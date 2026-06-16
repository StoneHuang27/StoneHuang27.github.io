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
    return true;
  } catch (e) {
    console.error('Error loading food_db.json:', e);
    FOOD_DB = [];
    return false;
  }
}
