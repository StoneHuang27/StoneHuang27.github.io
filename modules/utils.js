// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: utils.js
// Purpose: SHA256 hashing, internationalization (i18n)
// ============================================================

// ===== SHA256 HELPER =====
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ===== I18N =====
const i18n = {
  zh: {
    food_db: "🍎 食物数据库", calc_tools: "🧮 计算工具", diet_log: "📋 饮食记录",
    diet_advice: "💡 饮食建议", user: "用户", search_food: "搜索食物...",
    fodmap_filter: "FODMAP筛选", protein_filter: "蛋白质质量",
    mediterranean: "🫒 地中海饮食", high_protein: "💪 高蛋白",
    low_carb: "🥑 低碳水", low_fodmap: "🌿 低FODMAP",
    selected: "已选", compare: "开始对比", back: "返回",
    food_compare: "食物对比", loading: "加载中...",
    today_diet: "饮食记录", training_log: "训练记录",
    training_type: "训练类型", duration: "时长(分钟)", intensity: "强度",
    sleep_lifestyle: "睡眠与生活", sleep_hours: "睡眠时长(小时)",
    water_intake: "饮水量(ml)", generate_summary: "生成饮食摘要",
    diet_advice_title: "饮食建议", advice_desc: "基于您的饮食记录和用户档案，生成个性化饮食建议。",
    generate_advice: "生成建议", send_to_wb: "📋 发送到WorkBuddy",
    user_mgmt: "用户管理", add_user: "+ 新建用户",
    export_users: "📥 导出数据", import_users: "📤 导入数据",
    add_food: "+ 添加食物", add_food_to_diet: "添加食物到饮食记录",
    select_food: "选择食物", amount_g: "摄入量(克)", confirm: "确认添加",
    name: "姓名", gender: "性别", age: "年龄", height: "身高(cm)",
    weight: "体重(kg)", bodyfat: "体脂率(%)", activity: "活动等级",
    training_years: "训练年限", goal: "目标",
    save: "保存", cancel: "取消", delete: "删除",
    male: "男", female: "女",
    sedentary: "久坐", light: "轻度活动", moderate: "中度活动",
    heavy: "重度活动", very_heavy: "极重活动",
    cut: "减脂", maintain: "维持", bulk: "增肌",
    view_formula: "📐 查看公式", export_result: "📥 导出结果",
    basic: "基础属性", fat_detail: "脂肪细分",
    micronutrient: "微量营养素", protein_quality: "蛋白质质量",
    fodmap: "FODMAP", rank: "排行榜",
    // Calculator names
    tdee: "TDEE计算器", bmr: "BMR计算器", ffmi: "FFMI计算器",
    calorie_deficit: "热量缺口计算器", menstrual_safe: "月经安全线",
    muscle_limit: "增肌上限", tef: "食物热效应(TEF)",
    bmi: "BMI计算器", bodyfat_navy: "体脂率估算(US Navy)",
    protein_need: "蛋白质需求", water_need: "水分需求",
    macro_ratio: "宏量配比计算",
    // Categories
    cat_all: "全部", cat_grain: "谷薯类", cat_veg: "蔬菜类",
    cat_fruit: "水果类", cat_meat: "畜禽肉类", cat_seafood: "水产类",
    cat_dairy: "乳制品", cat_egg: "蛋类", cat_legume: "豆类/豆制品",
    cat_nut: "坚果种子", cat_oil: "油脂", cat_drink: "饮品",
    cat_tuber: "薯类/淀粉", cat_infant: "婴幼儿食品", cat_fastfood: "速食食品", cat_alcohol: "含酒精饮料", cat_supplement: "运动补剂", cat_processed: "加工食品", cat_chinese: "中式特色", cat_seasoning: "调味品", cat_snack: "零食/甜饼", cat_sugar: "糖果/蜂蜜", cat_condiment: "调味品", cat_fungus: "菌藻类", cat_other: "其他", settings: "设置", site_name: "网站名称",
    no_diet_entries: "暂无饮食记录",
    total_calories: "总热量", protein_diet: "蛋白质", carbs_diet: "碳水化合物", fat_diet: "脂肪",
    macro_ratio_label: "宏量营养素比例", diet_summary_prefix: " — ", diet_summary_suffix: "饮食摘要",
    energy_unit: "能量单位", kcal: "千卡(kcal)", kj: "千焦(kJ)", settings_save: "保存设置",
  },
  en: {
    food_db: "🍎 Food Database", calc_tools: "🧮 Calculators", diet_log: "📋 Diet Log",
    diet_advice: "💡 Diet Advice", user: "User", search_food: "Search food...",
    fodmap_filter: "FODMAP Filter", protein_filter: "Protein Quality",
    mediterranean: "🫒 Mediterranean", high_protein: "💪 High Protein",
    low_carb: "🥑 Low Carb", low_fodmap: "🌿 Low FODMAP",
    selected: "Selected", compare: "Compare", back: "Back",
    food_compare: "Food Comparison", loading: "Loading...",
    today_diet: "Diet Log", training_log: "Training Log",
    training_type: "Training Type", duration: "Duration(min)", intensity: "Intensity",
    sleep_lifestyle: "Sleep & Lifestyle", sleep_hours: "Sleep Hours",
    water_intake: "Water Intake(ml)", generate_summary: "Generate Summary",
    diet_advice_title: "Diet Advice", advice_desc: "Generate personalized diet advice based on your records.",
    generate_advice: "Generate Advice", send_to_wb: "📋 Send to WorkBuddy",
    user_mgmt: "User Management", add_user: "+ New User",
    export_users: "📥 Export", import_users: "📤 Import",
    add_food: "+ Add Food", add_food_to_diet: "Add Food to Diet Log",
    select_food: "Select Food", amount_g: "Amount(g)", confirm: "Confirm",
    name: "Name", gender: "Gender", age: "Age", height: "Height(cm)",
    weight: "Weight(kg)", bodyfat: "Body Fat(%)", activity: "Activity Level",
    training_years: "Training Years", goal: "Goal",
    save: "Save", cancel: "Cancel", delete: "Delete",
    male: "Male", female: "Female",
    sedentary: "Sedentary", light: "Light", moderate: "Moderate",
    heavy: "Heavy", very_heavy: "Very Heavy",
    cut: "Cut", maintain: "Maintain", bulk: "Bulk",
    view_formula: "📐 View Formula", export_result: "📥 Export Result",
    basic: "Basic", fat_detail: "Fat Detail",
    micronutrient: "Micronutrients", protein_quality: "Protein Quality",
    fodmap: "FODMAP", rank: "Ranking",
    tdee: "TDEE Calculator", bmr: "BMR Calculator", ffmi: "FFMI Calculator",
    calorie_deficit: "Calorie Deficit", menstrual_safe: "Menstrual Safe Line",
    muscle_limit: "Muscle Gain Limit", tef: "TEF Calculator",
    bmi: "BMI Calculator", bodyfat_navy: "Body Fat (Navy)",
    protein_need: "Protein Needs", water_need: "Water Needs",
    macro_ratio: "Macro Ratio",
    cat_all: "All", cat_grain: "Grains", cat_veg: "Vegetables",
    cat_fruit: "Fruits", cat_meat: "Meat", cat_seafood: "Seafood",
    cat_dairy: "Dairy", cat_egg: "Eggs", cat_legume: "Legumes",
    cat_nut: "Nuts/Seeds", cat_oil: "Oils", cat_drink: "Beverages",
    cat_tuber: "Tubers/Starch", cat_infant: "Infant Food", cat_fastfood: "Fast Food", cat_alcohol: "Alcoholic Drinks", cat_supplement: "Supplements", cat_processed: "Processed", cat_chinese: "Chinese", cat_seasoning: "Seasonings", cat_snack: "Snacks/Pastries", cat_sugar: "Sugar/Honey", cat_condiment: "Condiments", cat_fungus: "Fungi/Algae", cat_other: "Other", settings: "Settings", site_name: "Site Name",
    no_diet_entries: "No diet entries",
    total_calories: "Total Calories", protein_diet: "Protein", carbs_diet: "Carbohydrates", fat_diet: "Fat",
    macro_ratio_label: "Macro Ratio", diet_summary_prefix: " — ", diet_summary_suffix: "Diet Summary",
    energy_unit: "Energy Unit", kcal: "kcal", kj: "kJ", settings_save: "Save Settings",
  }
};
let currentLang = localStorage.getItem('nutripro_lang') || 'zh';

function t(key) { return (i18n[currentLang] && i18n[currentLang][key]) || key; }

function toggleLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('nutripro_lang', currentLang);
  document.getElementById('langBtn').textContent = currentLang === 'zh' ? 'EN' : '中文';
  applyI18n();
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
  });
}

// ===== ENERGY UNIT FORMATTING =====
function formatEnergy(kcal) {
  if (typeof kcal !== 'number') kcal = parseFloat(kcal) || 0;
  if (energyUnit === 'kj') return (kcal * 4.184).toFixed(1) + ' kJ';
  return kcal + ' kcal';
}
function formatEnergyValue(kcal) {
  if (typeof kcal !== 'number') kcal = parseFloat(kcal) || 0;
  if (energyUnit === 'kj') return (kcal * 4.184).toFixed(1);
  return kcal;
}
function toKcal(value) {
  return energyUnit === 'kj' ? value / 4.184 : value;
}
