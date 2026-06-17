// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: units.js
// Purpose: Food measurement units with gram conversion
// ============================================================

const UNIT_DB = {
  // 常见食物标准单位 → 克
  egg: { unit: '个', grams: 50 },
  apple: { unit: '个', grams: 150 },
  banana: { unit: '个', grams: 120 },
  orange: { unit: '个', grams: 130 },
  tomato: { unit: '个', grams: 100 },
  bowl_rice: { unit: '碗', grams: 150 },
  bowl_soup: { unit: '碗', grams: 200 },
  cup: { unit: '杯', grams: 240 },
  slice_bread: { unit: '片', grams: 30 },
  slice_cheese: { unit: '片', grams: 30 },
  spoon_oil: { unit: '勺', grams: 14 },
  spoon_salt: { unit: '勺', grams: 5 },
  spoon_sauce: { unit: '勺', grams: 15 },
  plate: { unit: '盘', grams: 200 },
  piece_chicken: { unit: '块', grams: 120 },
  piece_fish: { unit: '条', grams: 150 },
  bottle_water: { unit: '瓶', grams: 500 },
  carton_milk: { unit: '盒', grams: 250 },
  handful_nuts: { unit: '把', grams: 30 },
  portion_veg: { unit: '份', grams: 100 }
};

// 按分类推荐默认单位
const CATEGORY_UNITS = {
  grain: ['碗', '克'],
  meat: ['个', '块', '克'],
  seafood: ['条', '克'],
  dairy: ['杯', '盒', '克'],
  egg: ['个', '克'],
  fruit: ['个', '克'],
  veg: ['份', '克'],
  oil: ['勺', '克'],
  nut: ['把', '克'],
  legume: ['克'],
  fungus: ['克'],
  drink: ['杯', '瓶', '克'],
  snack: ['个', '包', '克'],
  tuber: ['个', '克'],
  fastfood: ['份', '个', '克'],
  alcohol: ['杯', '瓶', '克'],
  condiment: ['勺', '克'],
  seasoning: ['克'],
  sugar: ['勺', '克'],
  other: ['克']
};

// 根据食物名称匹配常用单位
function guessUnitByName(name) {
  const n = name.toLowerCase();
  if (n.includes('蛋') || n.includes('egg')) return '个';
  if (n.includes('苹果') || n.includes('apple')) return '个';
  if (n.includes('香蕉') || n.includes('banana')) return '个';
  if (n.includes('米饭') || n.includes('rice')) return '碗';
  if (n.includes('牛奶') || n.includes('milk')) return '杯';
  if (n.includes('面包') || n.includes('bread')) return '片';
  if (n.includes('油') || n.includes('oil')) return '勺';
  if (n.includes('鱼') || n.includes('fish')) return '条';
  if (n.includes('鸡肉') || n.includes('chicken')) return '块';
  if (n.includes('茶') || n.includes('tea')) return '杯';
  return null;
}

// 将单位数量换算为克数
function convertToGrams(amount, unit, foodCategory, foodName) {
  if (unit === '克' || unit === 'g' || !unit) return amount;
  // 先尝试按食物名称匹配
  if (foodName) {
    const guessed = guessUnitByName(foodName);
    if (guessed === unit) {
      // Find the conversion factor
      for (const key in UNIT_DB) {
        if (UNIT_DB[key].unit === unit) {
          return amount * UNIT_DB[key].grams;
        }
      }
    }
  }
  // 按分类匹配
  if (foodCategory && CATEGORY_UNITS[foodCategory]) {
    const units = CATEGORY_UNITS[foodCategory];
    if (units.includes(unit)) {
      for (const key in UNIT_DB) {
        if (UNIT_DB[key].unit === unit) {
          return amount * UNIT_DB[key].grams;
        }
      }
    }
  }
  // 默认：如果单位已知但没找到精确匹配，返回原值
  return amount;
}

// 获取某分类推荐的单位列表
function getUnitsForCategory(category) {
  return CATEGORY_UNITS[category] || ['克'];
}

// 获取分类推荐单位的HTML
function getUnitSelectHTML(name, value, onChange) {
  const units = ['克'];
  // 根据名称推断可能单位
  const guessed = guessUnitByName(name);
  if (guessed && !units.includes(guessed)) units.unshift(guessed);
  // 添加常见单位
  ['个', '碗', '杯', '片', '勺', '条', '块', '瓶', '盒', '把', '份', '包'].forEach(function(u) {
    if (!units.includes(u)) units.push(u);
  });
  let html = '<select onchange="' + onChange + '(this.value)" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:13px;">';
  units.forEach(function(u) {
    html += '<option value="' + u + '"' + (u === value ? ' selected' : '') + '>' + u + '</option>';
  });
  html += '</select>';
  return html;
}
