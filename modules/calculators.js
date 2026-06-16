// ===== CALCULATORS =====
const CALC_DEFS = [
  {id:'tdee',icon:'🔥',nameKey:'tdee'},
  {id:'bmr',icon:'⚕️',nameKey:'bmr'},
  {id:'ffmi',icon:'💪',nameKey:'ffmi'},
  {id:'deficit',icon:'📉',nameKey:'calorie_deficit'},
  {id:'menstrual',icon:'♀️',nameKey:'menstrual_safe'},
  {id:'muscle',icon:'🏋️',nameKey:'muscle_limit'},
  {id:'tef',icon:'🍽️',nameKey:'tef'},
  {id:'bmi',icon:'📐',nameKey:'bmi'},
  {id:'navy',icon:'📏',nameKey:'bodyfat_navy'},
  {id:'protein',icon:'🥩',nameKey:'protein_need'},
  {id:'water',icon:'💧',nameKey:'water_need'},
  {id:'macro',icon:'📊',nameKey:'macro_ratio'},
];

const FORMULAS = {
  mifflin: {name:'Mifflin-St Jeor',zh:'米费林公式',desc:'目前最推荐的BMR计算公式(2005年发表)',formula:'男: BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 + 5\n女: BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 - 161',ref:'Mifflin MD, et al. Am J Clin Nutr. 1990;51(2):241-247.'},
  harris: {name:'Harris-Benedict (Revised 1984)',zh:'哈里斯-本尼迪克特公式(1984修订)',desc:'最早的BMR公式，1919年首次发表，1984年修订',formula:'男: BMR = 88.362 + 13.397×体重(kg) + 4.799×身高(cm) - 5.677×年龄\n女: BMR = 447.593 + 9.247×体重(kg) + 3.098×身高(cm) - 4.330×年龄',ref:'Roza AM, Shizgal HM. Am J Clin Nutr. 1984;40(1):168-182.'},
  katch: {name:'Katch-McArdle',zh:'卡奇-麦卡德尔公式',desc:'基于瘦体重的公式，已知体脂率时最准确',formula:'BMR = 370 + 21.6 × 瘦体重(kg)\n瘦体重 = 体重 × (1 - 体脂率/100)',ref:'Katch VL, McArdle WD. Nutrition, Weight Control and Exercise. 3rd ed. 1988.'},
  cunningham: {name:'Cunningham',zh:'坎宁安公式',desc:'基于瘦体重的RMR公式，适合运动员',formula:'RMR = 500 + 22 × 瘦体重(kg)\n(1980年版本: RMR = 500 + 21.6 × 瘦体重)',ref:'Cunningham JJ. Am J Clin Nutr. 1980;33(12):2372-2373.'},
  ffmi: {name:'FFMI',zh:'去脂体重指数',desc:'衡量肌肉发达程度的指标',formula:'FFMI = 瘦体重(kg) / 身高(m)²\n归一化FFMI = FFMI + 6.1 × (1.8 - 身高m)\n\n等级(男性):\n16-17: 低于平均\n18-19: 平均\n20-21: 高于平均\n22-23: 优秀\n24-25: 卓越\n26+: 疑似使用增强药物\n\n等级(女性):\n14-15: 低于平均\n16-17: 平均\n18-19: 高于平均\n20-21: 优秀\n22+: 卓越',ref:'Kouri EM, et al. Clin J Sport Med. 1995;5(4):223-226.'},
  lyle: {name:"Lyle McDonald's Model",zh:'Lyle McDonald增肌模型',desc:'自然训练者增肌潜力预测模型',formula:'第1年(初学者): 0.9kg/月 (9-11kg/年)\n第2年(中级): 0.45kg/月 (4.5-5.4kg/年)\n第3年(中高级): 0.23kg/月 (2.3-2.7kg/年)\n第4年+(高级): 0.11kg/月 (0.9-1.4kg/年)\n第5年后: 逐渐趋近于0\n\n总潜力: 约18-23kg纯肌肉(4-5年)\n\n核心规律: 每年增肌量约为前一年的50%',ref:'McDonald L. The Genesis of Muscle Growth. 2012.'},
  aragon: {name:"Alan Aragon's Model",zh:'Alan Aragon增肌模型',desc:'基于体重百分比的增肌潜力模型',formula:'初学者(第1年): 体重×1-1.5%/月\n中级(第2年): 体重×0.5-1%/月\n高级(第3年+): 体重×0.25-0.5%/月',ref:'Aragon A, Schoenfeld BJ. J Int Soc Sports Nutr. 2013;10(1):5.'},
};

function renderCalculators() {
  try {
  const nav = document.getElementById('calcNav');
  nav.innerHTML = CALC_DEFS.map((c,i) => `<div class="calc-nav-item ${i===0?'active':''}" onclick="switchCalc('${c.id}',this)">${c.icon} ${t(c.nameKey)}</div>`).join('');
  switchCalc('tdee', nav.querySelector('.calc-nav-item'));
  } catch(e) { console.error('renderCalculators error:', e); }
}

function switchCalc(id, el) {
  if (el) { document.querySelectorAll('.calc-nav-item').forEach(n=>n.classList.remove('active')); el.classList.add('active'); }
  const main = document.getElementById('calcMain');
  const u = currentUser || {};
  const genderOpts = `<option value="male" ${u.gender==='male'?'selected':''}>${t('male')}</option><option value="female" ${u.gender==='female'?'selected':''}>${t('female')}</option>`;
  const activityOpts = `<option value="sedentary" ${u.activity==='sedentary'?'selected':''}>${t('sedentary')} (1.2)</option><option value="light" ${u.activity==='light'?'selected':''}>${t('light')} (1.375)</option><option value="moderate" ${u.activity==='moderate'?'selected':''}>${t('moderate')} (1.55)</option><option value="heavy" ${u.activity==='heavy'?'selected':''}>${t('heavy')} (1.725)</option><option value="very_heavy" ${u.activity==='very_heavy'?'selected':''}>${t('very_heavy')} (1.9)</option>`;

  const html = {
    tdee: `<div class="calc-card"><h3>🔥 ${t('tdee')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('gender')}</label><select id="tdee_gender">${genderOpts}</select></div>
        <div class="calc-field"><label>${t('age')}</label><input type="number" id="tdee_age" value="${u.age||25}"></div></div>
      <div class="calc-row"><div class="calc-field"><label>${t('height')}</label><input type="number" id="tdee_height" value="${u.height||170}"></div>
        <div class="calc-field"><label>${t('weight')}</label><input type="number" id="tdee_weight" value="${u.weight||65}"></div>
        <div class="calc-field"><label>${t('bodyfat')}</label><input type="number" id="tdee_bodyfat" value="${u.bodyfat||15}" step="0.1"></div></div>
      <div class="calc-row"><div class="calc-field"><label>${t('activity')}</label><select id="tdee_activity">${activityOpts}</select></div></div>
      <button class="btn-primary" onclick="calcTDEE()">${t('save')}</button>
      <div id="tdee_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="showFormula('mifflin')">${t('view_formula')}</button><button class="btn-action" onclick="exportResult('tdee_result')">${t('export_result')}</button></div>
    </div>`,
    bmr: `<div class="calc-card"><h3>⚕️ ${t('bmr')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('gender')}</label><select id="bmr_gender">${genderOpts}</select></div>
        <div class="calc-field"><label>${t('age')}</label><input type="number" id="bmr_age" value="${u.age||25}"></div></div>
      <div class="calc-row"><div class="calc-field"><label>${t('height')}</label><input type="number" id="bmr_height" value="${u.height||170}"></div>
        <div class="calc-field"><label>${t('weight')}</label><input type="number" id="bmr_weight" value="${u.weight||65}"></div>
        <div class="calc-field"><label>${t('bodyfat')}</label><input type="number" id="bmr_bodyfat" value="${u.bodyfat||15}" step="0.1"></div></div>
      <button class="btn-primary" onclick="calcBMR()">${t('save')}</button>
      <div id="bmr_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="showFormula('mifflin')">${t('view_formula')}</button><button class="btn-action" onclick="exportResult('bmr_result')">${t('export_result')}</button></div>
    </div>`,
    ffmi: `<div class="calc-card"><h3>💪 ${t('ffmi')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('height')}</label><input type="number" id="ffmi_height" value="${u.height||170}" step="0.1"></div>
        <div class="calc-field"><label>${t('weight')}</label><input type="number" id="ffmi_weight" value="${u.weight||65}"></div>
        <div class="calc-field"><label>${t('bodyfat')}</label><input type="number" id="ffmi_bodyfat" value="${u.bodyfat||15}" step="0.1"></div></div>
      <button class="btn-primary" onclick="calcFFMI()">${t('save')}</button>
      <div id="ffmi_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="showFormula('ffmi')">${t('view_formula')}</button><button class="btn-action" onclick="exportResult('ffmi_result')">${t('export_result')}</button></div>
    </div>`,
    deficit: `<div class="calc-card"><h3>📉 ${t('calorie_deficit')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('target_loss')}</label><input type="number" id="def_target" value="1" step="0.1"></div>
        <div class="calc-field"><label>${t('daily_deficit')}</label><input type="number" id="def_daily" value="500"></div></div>
      <button class="btn-primary" onclick="calcDeficit()">${t('save')}</button>
      <div id="deficit_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('deficit_result')">${t('export_result')}</button></div>
    </div>`,
    menstrual: `<div class="calc-card"><h3>♀️ ${t('menstrual_safe')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('weight')}</label><input type="number" id="men_weight" value="${u.weight||65}"></div>
        <div class="calc-field"><label>${t('bodyfat')}</label><input type="number" id="men_bodyfat" value="${u.bodyfat||20}" step="0.1"></div></div>
      <button class="btn-primary" onclick="calcMenstrual()">${t('save')}</button>
      <div id="menstrual_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('menstrual_result')">${t('export_result')}</button></div>
    </div>`,
    muscle: `<div class="calc-card"><h3>🏋️ ${t('muscle_limit')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('weight')}</label><input type="number" id="muscle_weight" value="${u.weight||65}"></div>
        <div class="calc-field"><label>${t('training_years')}</label><input type="number" id="muscle_years" value="${u.trainingYears||1}" step="0.5"></div></div>
      <button class="btn-primary" onclick="calcMuscle()">${t('save')}</button>
      <div id="muscle_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="showFormula('lyle')">${t('view_formula')}</button><button class="btn-action" onclick="exportResult('muscle_result')">${t('export_result')}</button></div>
    </div>`,
    tef: `<div class="calc-card"><h3>🍽️ ${t('tef')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('protein_g')}</label><input type="number" id="tef_protein" value="120"></div>
        <div class="calc-field"><label>${t('carbs_g')}</label><input type="number" id="tef_carbs" value="250"></div>
        <div class="calc-field"><label>${t('fat_g')}</label><input type="number" id="tef_fat" value="70"></div></div>
      <button class="btn-primary" onclick="calcTEF()">${t('save')}</button>
      <div id="tef_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('tef_result')">${t('export_result')}</button></div>
    </div>`,
    bmi: `<div class="calc-card"><h3>📐 ${t('bmi')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('height')}</label><input type="number" id="bmi_height" value="${u.height||170}" step="0.1"></div>
        <div class="calc-field"><label>${t('weight')}</label><input type="number" id="bmi_weight" value="${u.weight||65}"></div></div>
      <button class="btn-primary" onclick="calcBMI()">${t('save')}</button>
      <div id="bmi_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('bmi_result')">${t('export_result')}</button></div>
    </div>`,
    navy: `<div class="calc-card"><h3>📏 ${t('bodyfat_navy')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('gender')}</label><select id="navy_gender">${genderOpts}</select></div>
        <div class="calc-field"><label>${t('height')}</label><input type="number" id="navy_height" value="${u.height||170}"></div></div>
      <div class="calc-row"><div class="calc-field"><label>${t('waist_cm')}</label><input type="number" id="navy_waist" value="80" step="0.1"></div>
        <div class="calc-field"><label>${t('neck_cm')}</label><input type="number" id="navy_neck" value="36" step="0.1"></div>
        <div class="calc-field" id="navy_hip_field" style="display:none;"><label>${t('hip_cm')}</label><input type="number" id="navy_hip" value="95" step="0.1"></div></div>
      <button class="btn-primary" onclick="calcNavy()">${t('save')}</button>
      <div id="navy_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('navy_result')">${t('export_result')}</button></div>
    </div>`,
    protein: `<div class="calc-card"><h3>🥩 ${t('protein_need')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('weight')}</label><input type="number" id="prot_weight" value="${u.weight||65}"></div>
        <div class="calc-field"><label>${t('bodyfat')}</label><input type="number" id="prot_bodyfat" value="${u.bodyfat||15}" step="0.1"></div>
        <div class="calc-field"><label>${t('goal')}</label><select id="prot_goal"><option value="cut">${t('cut')}</option><option value="maintain">${t('maintain')}</option><option value="bulk">${t('bulk')}</option></select></div></div>
      <button class="btn-primary" onclick="calcProtein()">${t('save')}</button>
      <div id="protein_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('protein_result')">${t('export_result')}</button></div>
    </div>`,
    water: `<div class="calc-card"><h3>💧 ${t('water_need')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('weight')}</label><input type="number" id="water_weight" value="${u.weight||65}"></div>
        <div class="calc-field"><label>${t('exercise_intensity')}</label><select id="water_intensity"><option value="none">${t('no_exercise')}</option><option value="light">${t('light')}</option><option value="moderate">${t('moderate')}</option><option value="heavy">${t('heavy')}</option></select></div></div>
      <button class="btn-primary" onclick="calcWater()">${t('save')}</button>
      <div id="water_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('water_result')">${t('export_result')}</button></div>
    </div>`,
    macro: `<div class="calc-card"><h3>📊 ${t('macro_ratio')}</h3>
      <div class="calc-row"><div class="calc-field"><label>${t('target_calories')}</label><input type="number" id="macro_cal" value="2000"></div>
        <div class="calc-field"><label>${t('goal')}</label><select id="macro_goal"><option value="cut">${t('cut')}</option><option value="maintain">${t('maintain')}</option><option value="bulk">${t('bulk')}</option></select></div></div>
      <button class="btn-primary" onclick="calcMacro()">${t('save')}</button>
      <div id="macro_result"></div>
      <div class="calc-actions"><button class="btn-action" onclick="exportResult('macro_result')">${t('export_result')}</button></div>
    </div>`,
  };
  main.innerHTML = html[id] || '';
  // Navy body fat - show hip for female
  if (id === 'navy') {
    const g = document.getElementById('navy_gender');
    if (g) {
      g.addEventListener('change', () => {
        document.getElementById('navy_hip_field').style.display = g.value === 'female' ? 'block' : 'none';
      });
      document.getElementById('navy_hip_field').style.display = g.value === 'female' ? 'block' : 'none';
    }
  }
}

// ===== CALCULATOR ENGINES =====
const ACT = {sedentary:1.2,light:1.375,moderate:1.55,heavy:1.725,very_heavy:1.9};
function v(id) { return parseFloat(document.getElementById(id)?.value) || 0; }

function calcTDEE() {
  const g = document.getElementById('tdee_gender').value;
  const age = v('tdee_age'), h = v('tdee_height'), w = v('tdee_weight'), bf = v('tdee_bodyfat');
  const act = ACT[document.getElementById('tdee_activity').value] || 1.55;
  const lbm = w * (1 - bf/100);
  const bmr_mifflin = g==='male' ? 10*w + 6.25*h - 5*age + 5 : 10*w + 6.25*h - 5*age - 161;
  const bmr_katch = 370 + 21.6 * lbm;
  const bmr = bf > 0 ? Math.round((bmr_mifflin + bmr_katch)/2) : Math.round(bmr_mifflin);
  const tdee = Math.round(bmr * act);
  document.getElementById('tdee_result').innerHTML = `<div class="calc-result">
    <h4>${t('calc_results')}</h4>
    <div class="result-item"><span class="result-label">BMR (Mifflin)</span><span class="result-value">${Math.round(bmr_mifflin)} <span class="unit">kcal</span></span></div>
    ${bf>0?`<div class="result-item"><span class="result-label">BMR (Katch-McArdle)</span><span class="result-value">${Math.round(bmr_katch)} <span class="unit">kcal</span></span></div>`:''}
    <div class="result-item"><span class="result-label">BMR ${t('combined')}</span><span class="result-value">${bmr} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">TDEE</span><span class="result-value">${tdee} <span class="unit">kcal</span></span></div>
    <hr style="border-color:var(--border);margin:8px 0;">
    <div class="result-item"><span class="result-label">🎯 ${t('cut_label')} (-20%)</span><span class="result-value" style="color:var(--success);">${Math.round(tdee*0.8)} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">➡️ ${t('maintain_label')}</span><span class="result-value">${tdee} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">💪 ${t('bulk_label')} (+15%)</span><span class="result-value" style="color:var(--accent-light);">${Math.round(tdee*1.15)} <span class="unit">kcal</span></span></div>
  </div>`;
}

function calcBMR() {
  const g = document.getElementById('bmr_gender').value;
  const age = v('bmr_age'), h = v('bmr_height'), w = v('bmr_weight'), bf = v('bmr_bodyfat');
  const lbm = w*(1-bf/100);
  const mifflin = g==='male' ? 10*w+6.25*h-5*age+5 : 10*w+6.25*h-5*age-161;
  const harris = g==='male' ? 88.362+13.397*w+4.799*h-5.677*age : 447.593+9.247*w+3.098*h-4.330*age;
  const katch = bf>0 ? 370+21.6*lbm : null;
  const cun = bf>0 ? 500+22*lbm : null;
  document.getElementById('bmr_result').innerHTML = `<div class="calc-result">
    <h4>${t('bmr_comparison')}</h4>
    <div class="result-item"><span class="result-label">Mifflin-St Jeor ${t('recommended')}</span><span class="result-value">${Math.round(mifflin)} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">Harris-Benedict (1984)</span><span class="result-value">${Math.round(harris)} <span class="unit">kcal</span></span></div>
    ${katch!==null?`<div class="result-item"><span class="result-label">Katch-McArdle ${t('bf_known')}</span><span class="result-value">${Math.round(katch)} <span class="unit">kcal</span></span></div>`:''}
    ${cun!==null?`<div class="result-item"><span class="result-label">Cunningham ${t('athletes')}</span><span class="result-value">${Math.round(cun)} <span class="unit">kcal</span></span></div>`:''}
    <div class="chart-container" style="max-width:500px;margin-top:12px;"><canvas id="bmrChart"></canvas></div>
  </div>`;
  setTimeout(()=>{
    const ctx = document.getElementById('bmrChart');
    if(!ctx)return;
    const data = [Math.round(mifflin),Math.round(harris)];
    const labels = ['Mifflin','Harris-B.'];
    if(katch!==null){data.push(Math.round(katch));labels.push('Katch-M.');}
    if(cun!==null){data.push(Math.round(cun));labels.push('Cunningham');}
    typeof Chart!=='undefined' && new Chart(ctx,{type:'bar',data:{labels,datasets:[{data,backgroundColor:['#3b82f6','#f59e0b','#22c55e','#ef4444']}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#94a3b8'}},x:{ticks:{color:'#94a3b8'}}}}});
  },100);
}

function calcFFMI() {
  const h = v('ffmi_height')/100, w = v('ffmi_weight'), bf = v('ffmi_bodyfat');
  const lbm = w*(1-bf/100);
  const ffmi = lbm/(h*h);
  const normFFMI = ffmi + 6.1*(1.8-h);
  const isMale = !currentUser || currentUser.gender === 'male';
  let grade = '';
  if(isMale) { grade = ffmi<18?'低于平均':ffmi<20?'平均':ffmi<22?'高于平均':ffmi<24?'优秀':ffmi<26?'卓越':'⚠️ 超出自然范围'; }
  else { grade = ffmi<16?'低于平均':ffmi<18?'平均':ffmi<20?'高于平均':ffmi<22?'优秀':'卓越'; }
  document.getElementById('ffmi_result').innerHTML = `<div class="calc-result">
    <h4>${t('ffmi_results')}</h4>
    <div class="result-item"><span class="result-label">${t('lbm')}</span><span class="result-value">${lbm.toFixed(1)} <span class="unit">kg</span></span></div>
    <div class="result-item"><span class="result-label">FFMI</span><span class="result-value">${ffmi.toFixed(1)}</span></div>
    <div class="result-item"><span class="result-label">${t('norm_ffmi')}</span><span class="result-value">${normFFMI.toFixed(1)}</span></div>
    <div class="result-item"><span class="result-label">${t('grade_label')}</span><span class="result-value">${grade}</span></div>
  </div>`;
}

function calcDeficit() {
  const target = v('def_target'), daily = v('def_daily');
  if(daily===0) return;
  const totalKcal = target * 7700;
  const days = Math.ceil(totalKcal / daily);
  const weeks = (days/7).toFixed(1);
  document.getElementById('deficit_result').innerHTML = `<div class="calc-result">
    <h4>${t('deficit_results')}</h4>
    <div class="result-item"><span class="result-label">${t('target_loss_short')}</span><span class="result-value">${target} <span class="unit">kg</span></span></div>
    <div class="result-item"><span class="result-label">${t('total_deficit')}</span><span class="result-value">${totalKcal.toLocaleString()} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">${t('daily_deficit_short')}</span><span class="result-value">${daily} <span class="unit">kcal/天</span></span></div>
    <div class="result-item"><span class="result-label">${t('days_needed')}</span><span class="result-value" style="color:var(--success);">${days} <span class="unit">${t('day_unit')} (${weeks} ${t('week_unit')})</span></span></div>
  </div>`;
}

function calcMenstrual() {
  const w = v('men_weight'), bf = v('men_bodyfat');
  const lbm = w*(1-bf/100);
  const safeLine = Math.round(lbm * 30);
  document.getElementById('menstrual_result').innerHTML = `<div class="calc-result">
    <h4>${t('menstrual_results')}</h4>
    <div class="result-item"><span class="result-label">${t('lbm')}</span><span class="result-value">${lbm.toFixed(1)} <span class="unit">kg</span></span></div>
    <div class="result-item"><span class="result-label">${t('min_safe_cal')}</span><span class="result-value" style="color:${safeLine>0?'var(--danger)':'var(--text)'};">${safeLine} <span class="unit">kcal/天</span></span></div>
    <p style="color:var(--text-muted);font-size:13px;margin-top:8px;">⚠️ ${t('menstrual_warning')}</p>
  </div>`;
}

function calcMuscle() {
  const w = v('muscle_weight'), years = v('muscle_years');
  const lyle = [9.1, 4.5, 2.3, 0.9]; // kg/year
  const totalPotential = 18 + Math.random()*5; // approx 18-23kg
  let accumulated = 0;
  const yearlyData = [];
  for(let y=0; y<Math.min(years,5); y++) {
    const gain = lyle[y] || 0.5;
    accumulated += gain;
    yearlyData.push({year:y+1, gain:gain.toFixed(1), total:accumulated.toFixed(1)});
  }
  const monthlyGain = years <= 1 ? 0.9 : years <= 2 ? 0.45 : years <= 3 ? 0.23 : 0.11;
  document.getElementById('muscle_result').innerHTML = `<div class="calc-result">
    <h4>${t('muscle_gain_prediction')}</h4>
    <div class="result-item"><span class="result-label">${t('monthly_gain')}</span><span class="result-value">${monthlyGain} <span class="unit">kg/月</span></span></div>
    <div class="result-item"><span class="result-label">${t('total_gained')}</span><span class="result-value">${accumulated.toFixed(1)} <span class="unit">kg</span></span></div>
    <table class="nutrient-table" style="margin-top:12px;">
      <tr><th>${t('year_label')}</th><th>${t('yearly_gain')}</th><th>${t('total_label')}</th></tr>
      ${yearlyData.map(d=>`<tr><td>${d.year}</td><td class="val">${d.gain} kg</td><td class="val">${d.total} kg</td></tr>`).join('')}
    </table>
    <p style="color:var(--text-muted);font-size:12px;margin-top:8px;">${t('muscle_model_note')}</p>
  </div>`;
}

function calcTEF() {
  const p = v('tef_protein'), c = v('tef_carbs'), f = v('tef_fat');
  const tef = Math.round(p*4*0.25 + c*4*0.075 + f*9*0.025);
  const totalCal = p*4 + c*4 + f*9;
  document.getElementById('tef_result').innerHTML = `<div class="calc-result">
    <h4>${t('tef_results')}</h4>
    <div class="result-item"><span class="result-label">${t('protein_tef')}</span><span class="result-value">${Math.round(p*4*0.25)} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">${t('carbs_tef')}</span><span class="result-value">${Math.round(c*4*0.075)} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">${t('fat_tef')}</span><span class="result-value">${Math.round(f*9*0.025)} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">${t('total_tef')}</span><span class="result-value">${tef} <span class="unit">kcal</span></span></div>
    <div class="result-item"><span class="result-label">${t('tef_pct')}</span><span class="result-value">${(tef/totalCal*100).toFixed(1)} <span class="unit">%</span></span></div>
  </div>`;
}

function calcBMI() {
  const h = v('bmi_height')/100, w = v('bmi_weight');
  const bmi = w/(h*h);
  let cat = bmi<18.5?'偏瘦':bmi<24?'正常':bmi<28?'超重':'肥胖';
  document.getElementById('bmi_result').innerHTML = `<div class="calc-result">
    <h4>${t('bmi_results')}</h4>
    <div class="result-item"><span class="result-label">BMI</span><span class="result-value">${bmi.toFixed(1)}</span></div>
    <div class="result-item"><span class="result-label">${t('category_label')}</span><span class="result-value">${cat}</span></div>
  </div>`;
}

function calcNavy() {
  const g = document.getElementById('navy_gender').value;
  const h = v('navy_height'), waist = v('navy_waist'), neck = v('navy_neck');
  let bf;
  if(g==='male') bf = 86.010*Math.log10(waist-neck) - 70.041*Math.log10(h) + 36.76;
  else { const hip = v('navy_hip'); bf = 163.205*Math.log10(waist+hip-neck) - 97.684*Math.log10(h) - 78.387; }
  document.getElementById('navy_result').innerHTML = `<div class="calc-result">
    <h4>${t('bodyfat_results')}</h4>
    <div class="result-item"><span class="result-label">${t('bodyfat_label')}</span><span class="result-value">${bf.toFixed(1)} <span class="unit">%</span></span></div>
    <p style="color:var(--text-muted);font-size:12px;margin-top:8px;">⚠️ ${t('navy_method_note')}</p>
  </div>`;
}

function calcProtein() {
  const w = v('prot_weight'), bf = v('prot_bodyfat');
  const goal = document.getElementById('prot_goal').value;
  const lbm = w*(1-bf/100);
  let min, max, unit;
  if(goal==='cut') { min=2.2; max=3.1; unit='g/kg LBM'; }
  else if(goal==='bulk') { min=1.6; max=2.2; unit='g/kg'; }
  else { min=1.6; max=2.2; unit='g/kg'; }
  const base = goal==='cut' ? lbm : w;
  document.getElementById('protein_result').innerHTML = `<div class="calc-result">
    <h4>${t('protein_results')}</h4>
    <div class="result-item"><span class="result-label">${t('min_protein')}</span><span class="result-value">${Math.round(base*min)} <span class="unit">g/天</span></span></div>
    <div class="result-item"><span class="result-label">${t('max_protein')}</span><span class="result-value">${Math.round(base*max)} <span class="unit">g/天</span></span></div>
    <p style="color:var(--text-muted);font-size:12px;margin-top:8px;">${t('protein_recommend')}${min}-${max} ${unit}${t('nsca_suffix')}</p>
  </div>`;
}

function calcWater() {
  const w = v('water_weight');
  const intensity = document.getElementById('water_intensity').value;
  const base = w * 35;
  const extra = intensity==='none' ? 0 : intensity==='light' ? 500 : intensity==='moderate' ? 1000 : 1500;
  const total = base + extra;
  document.getElementById('water_result').innerHTML = `<div class="calc-result">
    <h4>${t('water_results')}</h4>
    <div class="result-item"><span class="result-label">${t('base_water')}</span><span class="result-value">${base} <span class="unit">ml</span></span></div>
    <div class="result-item"><span class="result-label">${t('exercise_extra')}</span><span class="result-value">${extra} <span class="unit">ml</span></span></div>
    <div class="result-item"><span class="result-label">${t('daily_total')}</span><span class="result-value" style="color:var(--accent-light);">${total} <span class="unit">ml</span></span></div>
  </div>`;
}

function calcMacro() {
  const cal = v('macro_cal');
  const goal = document.getElementById('macro_goal').value;
  let pPct,cPct,fPct;
  if(goal==='cut') { pPct=30; cPct=40; fPct=30; }
  else if(goal==='bulk') { pPct=25; cPct=50; fPct=25; }
  else { pPct=25; cPct=45; fPct=30; }
  const pG=Math.round(cal*pPct/100/4), cG=Math.round(cal*cPct/100/4), fG=Math.round(cal*fPct/100/9);
  document.getElementById('macro_result').innerHTML = `<div class="calc-result">
    <h4>${t('macro_results')}</h4>
    <div class="result-item"><span class="result-label">${t('protein_g')} ${pPct}%</span><span class="result-value">${pG} <span class="unit">g</span></span></div>
    <div class="result-item"><span class="result-label">${t('carbs_g')} ${cPct}%</span><span class="result-value">${cG} <span class="unit">g</span></span></div>
    <div class="result-item"><span class="result-label">${t('fat_g')} ${fPct}%</span><span class="result-value">${fG} <span class="unit">g</span></span></div>
    <div class="chart-container" style="max-width:300px;margin-top:12px;"><canvas id="macroChart2"></canvas></div>
  </div>`;
  setTimeout(()=>{
    const ctx = document.getElementById('macroChart2');
    if(ctx) typeof Chart!=='undefined' && new Chart(ctx,{type:'doughnut',data:{labels:['蛋白质','碳水','脂肪'],datasets:[{data:[pPct,cPct,fPct],backgroundColor:['#3b82f6','#22c55e','#f59e0b']}]},options:{responsive:true,plugins:{legend:{labels:{color:'#e2e8f0'}}}}});
  },100);
}

// ===== FORMULA MODAL =====
function showFormula(key) {
  const f = FORMULAS[key];
  if(!f) return;
  document.getElementById('formulaTitle').textContent = f.name + (f.zh ? ` (${f.zh})` : '');
  document.getElementById('formulaBody').innerHTML = `
    <p style="color:var(--text-muted);margin-bottom:12px;">${f.desc}</p>
    <div class="formula-box"><pre style="white-space:pre-wrap;">${f.formula}</pre></div>
    <p class="formula-ref">📖 ${f.ref}</p>
  `;
  document.getElementById('formulaModal').classList.add('show');
}
function closeFormulaModal() { document.getElementById('formulaModal').classList.remove('show'); }

// ===== EXPORT =====
function exportResult(elId) {
  const el = document.getElementById(elId);
  if(!el) return;
  if(typeof html2canvas === 'undefined') { alert('截图库未加载，请稍后重试'); return; }
  html2canvas(el, { backgroundColor: '#0f172a', scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'nutripro-result.png';
    link.href = canvas.toDataURL();
    link.click();
  });
}
