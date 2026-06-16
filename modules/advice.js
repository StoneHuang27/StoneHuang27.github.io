// ===== ADVICE =====
function generateAdvice() {
  if(!currentUser) { alert(currentLang==='zh'?'请先创建用户档案':'Please create a user profile first'); return; }
  const u = currentUser;
  const lbm = u.weight*(1-u.bodyfat/100);
  const safeCal = Math.round(lbm*30);
  const bmr = u.gender==='male' ? 10*u.weight+6.25*u.height-5*u.age+5 : 10*u.weight+6.25*u.height-5*u.age-161;
  const tdee = Math.round(bmr*(ACT[u.activity]||1.55));
  const proteinMin = Math.round((u.goal==='cut'?lbm:u.weight)*1.6);
  const proteinMax = Math.round((u.goal==='cut'?lbm:u.weight)*2.2);
  const water = u.weight*35 + (u.activity==='heavy'?1500:u.activity==='moderate'?1000:500);
  let advice = '';
  if(u.goal==='cut') {
    advice = `<h3>${t('cut_diet_advice')}</h3>
    <p>根据您的档案（${u.name}，${u.weight}kg，体脂${u.bodyfat}%），以下是针对性建议：</p>
    <p><strong>🎯 热量目标</strong>：建议每日摄入 <span style="color:var(--success)">${Math.round(tdee*0.8)} kcal</span>（TDEE ${tdee} 的80%），每日热量缺口约 ${Math.round(tdee*0.2)} kcal。</p>
    <p><strong>🥩 蛋白质</strong>：${proteinMin}-${proteinMax}g/天（${(u.goal==='cut'?lbm:u.weight).toFixed(0)}kg × 1.6-2.2g/kg）。推荐食物：鸡胸肉、鸡蛋、希腊酸奶、乳清蛋白。</p>
    <p><strong>💧 水分</strong>：每日至少 ${water}ml。</p>
    <p><strong>♀️ 月经安全线</strong>：瘦体重${lbm.toFixed(1)}kg × 30 = ${safeCal} kcal。每日摄入不应低于此值。</p>
    <p><strong>⏰ 进食时机</strong>：训练前后各摄入20-40g蛋白质，训练前1-2小时摄入碳水。</p>
    <p style="color:var(--text-muted);font-size:12px;margin-top:12px;">⚠️ 以上建议基于通用营养学原则（NSCA运动营养指南/ACSM），不构成医疗建议。个体差异可能导致实际需求不同。</p>`;
  } else {
    advice = `<h3>${u.goal==='bulk'?t('bulk_diet_advice'):t('maintain_diet_advice')}</h3>
    <p>根据您的档案（${u.name}，${u.weight}kg，体脂${u.bodyfat}%），以下是针对性建议：</p>
    <p><strong>🎯 热量目标</strong>：${u.goal==='bulk'?'建议每日摄入 '+Math.round(tdee*1.15)+' kcal（TDEE+'+Math.round(tdee*0.15)+' kcal）':'建议维持 '+tdee+' kcal 左右'}。</p>
    <p><strong>🥩 蛋白质</strong>：${proteinMin}-${proteinMax}g/天。</p>
    <p><strong>💧 水分</strong>：每日至少 ${water}ml。</p>
    <p style="color:var(--text-muted);font-size:12px;margin-top:12px;">⚠️ 以上建议基于通用营养学原则，不构成医疗建议。</p>`;
  }
  document.getElementById('adviceContent').innerHTML = `<div class="advice-card">${advice}</div>`;
}

function copyToWorkBuddy() {
  const u = currentUser || {};
  const dietFoods = getDietFoodsForSelectedDates();
  const summary = dietFoods.map(d => {
    const f = FOOD_DB.find(x=>x.id===d.foodId);
    return f ? `${f.name} ${d.amount}g (${Math.round(parseFloat(f.energyKCal||0)*d.amount/100)}kcal)` : '';
  }).join('\n');
  const text = `【用户档案】\n姓名: ${u.name||'未设置'}\n性别: ${u.gender==='male'?'男':'女'}\n身高: ${u.height}cm\n体重: ${u.weight}kg\n体脂率: ${u.bodyfat}%\n活动等级: ${u.activity}\n目标: ${u.goal}\n\n【今日饮食】\n${summary || '暂无记录'}\n\n【训练信息】\n类型: ${document.getElementById('trainingType')?.value||'未设置'}\n时长: ${document.getElementById('trainingDuration')?.value||'未设置'}分钟\n强度: ${document.getElementById('trainingIntensity')?.value||'未设置'}\n\n睡眠: ${document.getElementById('sleepHours')?.value||'未设置'}小时\n饮水量: ${document.getElementById('waterIntake')?.value||'未设置'}ml\n\n请根据以上信息，参考NSCA运动营养指南、ACSM运动营养学等权威文献，给出个性化饮食建议。`;
  navigator.clipboard.writeText(text).then(() => {
    alert(currentLang==='zh'?'已复制到剪贴板！请粘贴到WorkBuddy对话中获取AI深度建议。':'Copied! Paste into WorkBuddy chat for AI advice.');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    alert(currentLang==='zh'?'已复制！':'Copied!');
  });
}
