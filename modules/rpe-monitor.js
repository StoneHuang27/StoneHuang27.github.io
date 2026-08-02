// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: rpe-monitor.js
// Purpose: RPE / sRPE 周负荷、单调度(Monotony)、应激(Strain) 管理
//          数据持久化并联动 health.js 的 healthData（同库、同云同步）
// ============================================================

// 周偏移：0 = 本周，负数为过去周
let rpeWeekOffset = 0;

const RPE_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 取某周（周一 Mon 到周日 Sun）的 7 个 Date；weekOffset 以整周为单位偏移（0=本周，负=过去）
function rpeWeekDates(weekOffset) {
  const off = (weekOffset === undefined) ? rpeWeekOffset : weekOffset;
  const base = new Date();
  base.setDate(base.getDate() + off * 7);
  // 以周一为一周起点：getDay() 周日=0 -> 转为以周一为0
  const dow = (base.getDay() + 6) % 7; // 周一=0 ... 周日=6
  const monday = new Date(base);
  monday.setDate(base.getDate() - dow);
  monday.setHours(0, 0, 0, 0);
  const arr = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    arr.push(day);
  }
  return arr;
}

// 使用本地时区格式化日期，避免 toISOString() 的 UTC 偏移导致日期/星期错位
function rpeDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 切换周
function rpeShiftWeek(delta) {
  rpeWeekOffset += delta;
  renderRpeModule();
}

// 添加训练表单里的“星期”下拉选项（基于当前所选周）
function rpeWeekdayOptions() {
  const dates = rpeWeekDates();
  // 默认选中“今天”所在的那一天
  const todayStr = rpeDateStr(new Date());
  const todayIdx = dates.findIndex(d => rpeDateStr(d) === todayStr);
  const sel = todayIdx >= 0 ? todayIdx : 0;
  return dates.map((d, i) =>
    `<option value="${rpeDateStr(d)}" ${i === sel ? 'selected' : ''}>${RPE_WEEKDAYS[i]} (${rpeDateStr(d).slice(5)})</option>`
  ).join('');
}

// 读取某天的 RPE 训练会话
function rpeGetSessions(dateStr) {
  if (!currentUser || !dateStr) return [];
  const rec = healthData[currentUser.id]?.[dateStr];
  return (rec && rec.rpeSessions) ? rec.rpeSessions : [];
}

// 保存（写入 healthData + 本地 + 云同步）
// 采用“读取-合并-写回”策略：从 localStorage 重新载入最新副本后再合并，
// 避免云同步(pullAll/实时订阅)用旧云端副本整体覆盖导致刚写入的 rpeSessions 丢失。
function rpeSave() {
  if (!currentUser) return;
  // 1) 从 localStorage 重载最新数据，合并当前内存中的 rpeSessions，再写回
  let latest = {};
  try { latest = JSON.parse(localStorage.getItem('nutripro_healthData') || '{}'); } catch (e) { latest = {}; }
  if (!latest[currentUser.id]) latest[currentUser.id] = {};
  if (!healthData[currentUser.id]) healthData[currentUser.id] = {};
  // 合并当前用户下所有日期的 rpeSessions（以内存为准，内存缺失则用磁盘）
  const memUser = healthData[currentUser.id];
  const diskUser = latest[currentUser.id] || {};
  for (const ds of Object.keys(memUser)) {
    const memRec = memUser[ds] || {};
    if (!diskUser[ds]) diskUser[ds] = {};
    if (memRec.rpeSessions) diskUser[ds].rpeSessions = memRec.rpeSessions;
    // 保留磁盘上可能存在的其他字段（training/sleep/photos 等）
    for (const k of Object.keys(memRec)) {
      if (k !== 'rpeSessions') diskUser[ds][k] = memRec[k];
    }
  }
  latest[currentUser.id] = diskUser;
  healthData[currentUser.id] = diskUser;
  // 2) 写回 localStorage 与内存，确保刷新可恢复
  localStorage.setItem('nutripro_healthData', JSON.stringify(latest));
  // 3) 云同步（未初始化时安全返回，不抛错）
  if (typeof CloudSync !== 'undefined') CloudSync.push('health', latest);
}

// 单日负荷
function rpeDailyLoad(dateStr) {
  return rpeGetSessions(dateStr).reduce((s, x) => s + (x.rpe * x.duration), 0);
}

// 计算整周指标
function rpeComputeWeek(offset) {
  const off = (offset === undefined) ? rpeWeekOffset : offset;
  const dates = rpeWeekDates(off);
  const daily = dates.map(d => rpeDailyLoad(rpeDateStr(d)));
  const wtl = daily.reduce((a, b) => a + b, 0);
  const mean = wtl / 7;
  const n = daily.length;
  const sd = (function () {
    if (n <= 1) return 0;
    const m = daily.reduce((a, b) => a + b, 0) / n;
    const v = daily.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1);
    return Math.sqrt(v);
  })();
  const mono = sd > 0 ? mean / sd : 0;
  const strain = wtl * mono;
  let risk = 'good', riskMsg = t('rpe_low_risk');
  if (mono >= 2.5) { risk = 'bad'; riskMsg = t('rpe_high_risk'); }
  else if (mono >= 2.0) { risk = 'warn'; riskMsg = t('rpe_mid_risk'); }
  return { daily, wtl, mean, sd, mono, strain, risk, riskMsg };
}

// 添加一条会话
function rpeAddSession() {
  try {
    if (!currentUser) { alert(currentLang === 'zh' ? '请先选择用户' : 'Please select a user'); return; }
    const dateStr = document.getElementById('rpeDay')?.value;
    const activity = (document.getElementById('rpeActivity')?.value || '').trim() || t('rpe_session');
    const rpe = parseFloat(document.getElementById('rpeRpe')?.value) || 0;
    const duration = parseFloat(document.getElementById('rpeDuration')?.value) || 0;
    if (!dateStr || duration <= 0) { alert(currentLang === 'zh' ? '请输入有效时长' : 'Enter a valid duration'); return; }

    if (!healthData[currentUser.id]) healthData[currentUser.id] = {};
    if (!healthData[currentUser.id][dateStr]) healthData[currentUser.id][dateStr] = {};
    const rec = healthData[currentUser.id][dateStr];
    if (!rec.rpeSessions) rec.rpeSessions = [];
    rec.rpeSessions.push({ activity, rpe, duration });

    rpeSave();
    if (typeof renderHealthDashboard === 'function') renderHealthDashboard();
    if (typeof showSyncNotification === 'function') showSyncNotification(t('rpe_link_health'));
    renderRpeModule();
    if (typeof showSyncNotification === 'function') showSyncNotification(currentLang === 'zh' ? '已添加训练' : 'Session added');
  } catch (e) {
    console.error('rpeAddSession error:', e);
    alert(currentLang === 'zh' ? '添加失败：' + e.message : 'Add failed: ' + e.message);
  }
}

// 删除一条会话
function rpeDeleteSession(dateStr, idx) {
  try {
    if (!currentUser) return;
    const rec = healthData[currentUser.id]?.[dateStr];
    if (!rec || !rec.rpeSessions) return;
    rec.rpeSessions.splice(idx, 1);
    if (rec.rpeSessions.length === 0) delete rec.rpeSessions;
    rpeSave();
    if (typeof renderHealthDashboard === 'function') renderHealthDashboard();
    renderRpeModule();
  } catch (e) {
    console.error('rpeDeleteSession error:', e);
    alert(currentLang === 'zh' ? '删除失败：' + e.message : 'Delete failed: ' + e.message);
  }
}

// 从今日训练记录导入（联动 health）
function rpeImportToday() {
  try {
    if (!currentUser) { alert(currentLang === 'zh' ? '请先选择用户' : 'Please select a user'); return; }
    const todayStr = rpeDateStr(new Date());
    const rec = healthData[currentUser.id]?.[todayStr];
    const tr = rec?.training;
    if (!tr || !tr.duration || tr.duration <= 0) {
      alert(currentLang === 'zh'
        ? '今日健康记录中无有效训练时长。请先到「健康」页保存今天的训练（类型+时长+强度），再点此导入。'
        : 'No training duration found for today. Save today\'s training in Health first, then import.');
      return;
    }
    const typeLabel = tr.type === 'strength' ? '力量' : tr.type === 'cardio' ? '有氧' : tr.type === 'hiit' ? 'HIIT'
      : tr.type === 'flexibility' ? '柔韧' : tr.type === 'rest' ? '休息' : (tr.type || t('rpe_session'));
    const intensityToRpe = { low: 3, moderate: 5, high: 8 };
    const rpe = intensityToRpe[tr.intensity] || 5;
    if (!healthData[currentUser.id][todayStr]) healthData[currentUser.id][todayStr] = {};
    const r = healthData[currentUser.id][todayStr];
    if (!r.rpeSessions) r.rpeSessions = [];
    r.rpeSessions.push({ activity: typeLabel + ' ' + t('rpe_session'), rpe, duration: tr.duration });
    rpeSave();
    if (typeof renderHealthDashboard === 'function') renderHealthDashboard();
    if (typeof showSyncNotification === 'function') showSyncNotification(t('rpe_link_health'));
    renderRpeModule();
    if (typeof showSyncNotification === 'function') showSyncNotification(currentLang === 'zh' ? '已导入今日训练' : 'Imported today\'s training');
  } catch (e) {
    console.error('rpeImportToday error:', e);
    alert(currentLang === 'zh' ? '导入失败：' + e.message : 'Import failed: ' + e.message);
  }
}

// 清空本周
function rpeClearWeek() {
  try {
    if (!currentUser) return;
    if (!confirm(currentLang === 'zh' ? '确定清空本周所有 RPE 训练记录？' : 'Clear all RPE sessions this week?')) return;
    const dates = rpeWeekDates();
    dates.forEach(d => {
      const ds = rpeDateStr(d);
      const rec = healthData[currentUser.id]?.[ds];
      if (rec && rec.rpeSessions) {
        delete rec.rpeSessions;
        if (Object.keys(rec).length === 0 && healthData[currentUser.id][ds]) delete healthData[currentUser.id][ds];
      }
    });
    rpeSave();
    renderRpeModule();
  } catch (e) {
    console.error('rpeClearWeek error:', e);
    alert(currentLang === 'zh' ? '清空失败：' + e.message : 'Clear failed: ' + e.message);
  }
}

// 导出 CSV
function rpeExportCSV() {
  const dates = rpeWeekDates();
  const rows = [['Date', 'Weekday', 'Activity', 'RPE', 'Duration(min)', 'sRPE']];
  dates.forEach((d, i) => {
    const ds = rpeDateStr(d);
    const sessions = rpeGetSessions(ds);
    if (sessions.length === 0) {
      rows.push([ds, RPE_WEEKDAYS[i], '', '', '', 0]);
    } else {
      sessions.forEach(s => rows.push([ds, RPE_WEEKDAYS[i], s.activity, s.rpe, s.duration, s.rpe * s.duration]));
    }
  });
  const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rpe_week_' + rpeDateStr(new Date()) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

// 渲染主模块
function renderRpeModule() {
  const kpisEl = document.getElementById('rpeKpis');
  const riskEl = document.getElementById('rpeRisk');
  const tableEl = document.getElementById('rpeTable');
  const labelEl = document.getElementById('rpeWeekLabel');
  const dates = rpeWeekDates();
  const weekStart = rpeDateStr(dates[0]);
  const weekEnd = rpeDateStr(dates[6]);
  if (labelEl) labelEl.textContent = `${weekStart} ~ ${weekEnd}`;

  const w = rpeComputeWeek();
  const colorVar = w.risk === 'bad' ? 'var(--danger)' : w.risk === 'warn' ? 'var(--warning)' : 'var(--success)';

  if (kpisEl) {
    kpisEl.innerHTML = `
      <div class="rpe-kpi"><div class="lab">${t('rpe_weekly_load')}</div><div class="val">${w.wtl.toFixed(0)}</div></div>
      <div class="rpe-kpi"><div class="lab">${t('rpe_daily_avg')}</div><div class="val">${w.mean.toFixed(0)}</div></div>
      <div class="rpe-kpi"><div class="lab">${t('rpe_daily_sd')}</div><div class="val">${w.sd.toFixed(1)}</div></div>
      <div class="rpe-kpi"><div class="lab">${t('rpe_monotony')}</div><div class="val">${w.mono.toFixed(2)}</div></div>
      <div class="rpe-kpi"><div class="lab">${t('rpe_strain')}</div><div class="val">${w.strain.toFixed(0)}</div></div>`;
  }
  if (riskEl) {
    riskEl.style.borderColor = colorVar;
    riskEl.style.color = colorVar;
    riskEl.innerHTML = `📊 ${t('rpe_risk')}：<span class="rpe-badge ${w.risk}">${w.riskMsg}</span>`;
  }

  if (tableEl) {
    let allEmpty = true;
    let rows = '';
    dates.forEach((d, i) => {
      const ds = rpeDateStr(d);
      const sessions = rpeGetSessions(ds);
      if (sessions.length > 0) allEmpty = false;
      if (sessions.length === 0) {
        rows += `<tr><td colspan="6" style="color:var(--text-muted);">${RPE_WEEKDAYS[i]} — ${t('rpe_no_session').split('，')[0]}</td></tr>`;
      } else {
        sessions.forEach((s, idx) => {
          rows += `<tr>
            <td>${RPE_WEEKDAYS[i]}</td>
            <td>${s.activity}</td>
            <td>${s.rpe}</td>
            <td>${s.duration}</td>
            <td><b>${(s.rpe * s.duration).toFixed(0)}</b></td>
            <td><button class="btn-action" onclick="rpeDeleteSession('${ds}',${idx})">✕</button></td>
          </tr>`;
        });
      }
    });
    if (allEmpty) {
      tableEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">${t('rpe_no_session')}</p>`;
    } else {
      tableEl.innerHTML = `<table class="rpe-table">
        <thead><tr><th>${t('rpe_weekday')}</th><th>${t('rpe_activity')}</th><th>${t('rpe_rpe')}</th><th>${t('rpe_duration')}</th><th>${t('rpe_srpe')}</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>`;
    }
  }

  rpeDrawTrend();
}

// 近 8 周周负荷趋势（纯 Canvas，无外部依赖）
function rpeDrawTrend() {
  const canvas = document.getElementById('rpeTrendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const weeks = 8;
  const data = [];
  for (let off = -(weeks - 1); off <= 0; off++) {
    data.push(rpeComputeWeek(off).wtl);
  }
  const maxVal = Math.max.apply(null, data) || 1;
  const pad = { top: 16, right: 12, bottom: 24, left: 40 };
  const cw = canvas.width - pad.left - pad.right;
  const ch = canvas.height - pad.top - pad.bottom;

  // 轴
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ch - (ch * i / 4);
    const val = Math.round(maxVal * i / 4);
    ctx.fillText(val, pad.left - 5, y + 3);
  }

  // 柱
  const bw = cw / weeks * 0.6;
  data.forEach((val, i) => {
    const x = pad.left + (cw / weeks) * i + (cw / weeks - bw) / 2;
    const h = (val / maxVal) * ch;
    const y = pad.top + ch - h;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, y, bw, h);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const wkLabel = (weeks - 1 - i) === 0 ? t('rpe_this_week') : '-' + (weeks - 1 - i);
    ctx.fillText(wkLabel, x + bw / 2, canvas.height - 6);
  });
}
