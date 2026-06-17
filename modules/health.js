// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: health.js
// Purpose: Health tracking (training, sleep, water, HRV), photo upload, trend visualization
// ============================================================

// ===== HEALTH DATA PERSISTENCE =====

function saveHealthRecord(dateStr) {
  if (!currentUser || !dateStr) { alert(currentLang === 'zh' ? '请先选择用户和日期' : 'Please select user and date'); return; }
  const trainingType = document.getElementById('trainingType')?.value || '';
  const trainingDuration = parseFloat(document.getElementById('trainingDuration')?.value) || 0;
  const trainingIntensity = document.getElementById('trainingIntensity')?.value || '';
  const sleepHours = parseFloat(document.getElementById('sleepHours')?.value) || 0;
  const sleepScore = parseInt(document.getElementById('sleepScore')?.value) || 0;
  const hrv = parseInt(document.getElementById('hrv')?.value) || 0;
  const waterIntake = parseFloat(document.getElementById('waterIntake')?.value) || 0;

  if (!healthData[currentUser.id]) healthData[currentUser.id] = {};
  healthData[currentUser.id][dateStr] = {
    training: { type: trainingType, duration: trainingDuration, intensity: trainingIntensity },
    sleep: { hours: sleepHours, score: sleepScore },
    hrv: hrv,
    water: { ml: waterIntake },
    photos: healthData[currentUser.id][dateStr]?.photos || []
  };

  localStorage.setItem('nutripro_healthData', JSON.stringify(healthData));
  CloudSync.push('health', healthData);
  renderHealthDashboard();
  showSyncNotification(currentLang === 'zh' ? '✅ 健康数据已保存' : 'Health data saved');
}

function loadHealthRecord(dateStr) {
  if (!currentUser || !dateStr) return;
  const record = healthData[currentUser.id]?.[dateStr];
  if (!record) return;

  if (record.training) {
    if (document.getElementById('trainingType')) document.getElementById('trainingType').value = record.training.type || '';
    if (document.getElementById('trainingDuration')) document.getElementById('trainingDuration').value = record.training.duration || '';
    if (document.getElementById('trainingIntensity')) document.getElementById('trainingIntensity').value = record.training.intensity || '';
  }
  if (record.sleep) {
    if (document.getElementById('sleepHours')) document.getElementById('sleepHours').value = record.sleep.hours || '';
    if (document.getElementById('sleepScore')) document.getElementById('sleepScore').value = record.sleep.score || '';
  }
  if (record.hrv !== undefined) {
    if (document.getElementById('hrv')) document.getElementById('hrv').value = record.hrv || '';
  }
  if (record.water) {
    if (document.getElementById('waterIntake')) document.getElementById('waterIntake').value = record.water.ml || '';
  }

  // Render photos
  renderPhotoGallery(dateStr);
}

function getHealthHistory(days) {
  if (!currentUser) return [];
  let history = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const record = healthData[currentUser.id]?.[ds];
    if (record) {
      history.push({ date: ds, record: record });
    }
  }
  return history;
}

function calculateTrend(metric, period) {
  // period: 'day' | 'week' | 'month'
  const days = period === 'day' ? 7 : period === 'week' ? 28 : 90;
  const history = getHealthHistory(days);
  if (history.length === 0) return [];

  let results = [];
  history.forEach(function(item) {
    let value = 0;
    switch(metric) {
      case 'water': value = item.record.water?.ml || 0; break;
      case 'sleep': value = item.record.sleep?.hours || 0; break;
      case 'hrv': value = item.record.hrv || 0; break;
      case 'sleepScore': value = item.record.sleep?.score || 0; break;
      case 'training': value = item.record.training?.duration || 0; break;
    }
    results.push({ date: item.date, value: value });
  });
  return results;
}

// ===== RENDER HEALTH DASHBOARD =====
function renderHealthDashboard() {
  const container = document.getElementById('healthDashboard');
  if (!container) return;

  const dateStr = selectedDietDate || new Date().toISOString().split('T')[0];
  const record = healthData[currentUser.id]?.[dateStr] || {};

  // Training
  const tr = record.training || {};
  // Sleep
  const sl = record.sleep || {};
  // Water
  const wt = record.water || {};

  container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
    <!-- Training Card -->
    <div class="calc-card">
      <h4>🏋️ 训练记录</h4>
      <div class="calc-field"><label>类型</label>
        <select id="trainingType">
          <option value="strength" ${tr.type==='strength'?'selected':''}>力量训练</option>
          <option value="cardio" ${tr.type==='cardio'?'selected':''}>有氧训练</option>
          <option value="hiit" ${tr.type==='hiit'?'selected':''}>HIIT</option>
          <option value="flexibility" ${tr.type==='flexibility'?'selected':''}>柔韧性</option>
          <option value="rest" ${tr.type==='rest'?'selected':''}>休息</option>
        </select>
      </div>
      <div class="calc-row" style="margin-top:8px;">
        <div class="calc-field"><label>时长(分钟)</label><input type="number" id="trainingDuration" value="${tr.duration||''}"></div>
        <div class="calc-field"><label>强度</label>
          <select id="trainingIntensity">
            <option value="low" ${tr.intensity==='low'?'selected':''}>低</option>
            <option value="moderate" ${tr.intensity==='moderate'?'selected':''}>中</option>
            <option value="high" ${tr.intensity==='high'?'selected':''}>高</option>
          </select>
        </div>
      </div>
    </div>
    <!-- Sleep & HRV Card -->
    <div class="calc-card">
      <h4>😴 睡眠 & HRV</h4>
      <div class="calc-row">
        <div class="calc-field"><label>睡眠时长(h)</label><input type="number" id="sleepHours" value="${sl.hours||''}" step="0.5" min="0" max="24"></div>
        <div class="calc-field"><label>睡眠评分</label><input type="number" id="sleepScore" value="${sl.score||''}" min="1" max="100"></div>
      </div>
      <div class="calc-field" style="margin-top:8px;"><label>HRV (ms)</label><input type="number" id="hrv" value="${record.hrv||''}" min="0"></div>
    </div>
    <!-- Water Card -->
    <div class="calc-card">
      <h4>💧 饮水量</h4>
      <div class="calc-field"><label>(ml)</label>
        <input type="number" id="waterIntake" value="${wt.ml||''}" min="0" step="50" style="width:100%;">
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-muted);">
        推荐量: ${currentUser ? Math.round(currentUser.weight * 35) : 2000}ml
      </div>
    </div>
    <!-- Trend Chart Card -->
    <div class="calc-card">
      <h4>📈 趋势</h4>
      <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;">
        <select id="trendMetric" onchange="renderTrendChart()" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:12px;">
          <option value="water">饮水量</option>
          <option value="sleep">睡眠时长</option>
          <option value="hrv">HRV</option>
          <option value="training">训练时长</option>
        </select>
        <select id="trendPeriod" onchange="renderTrendChart()" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:12px;">
          <option value="week">近7天</option>
          <option value="month">近30天</option>
        </select>
      </div>
      <canvas id="trendChart" width="300" height="150"></canvas>
    </div>
  </div>
  <button class="btn-primary" onclick="saveHealthRecord('${dateStr}')" style="margin-top:12px;">💾 保存健康数据</button>
  `;

  // Render trend chart
  setTimeout(function() { renderTrendChart(); }, 100);
}

// ===== TREND CHART (Canvas API, no external dependency) =====
function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const metric = document.getElementById('trendMetric')?.value || 'water';
  const period = document.getElementById('trendPeriod')?.value || 'week';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = calculateTrend(metric, period);
  if (data.length === 0) {
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '12px sans-serif';
    ctx.fillText('暂无数据', canvas.width / 2 - 20, canvas.height / 2);
    return;
  }

  const maxVal = Math.max.apply(null, data.map(function(d) { return d.value; })) || 1;
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const chartW = canvas.width - padding.left - padding.right;
  const chartH = canvas.height - padding.top - padding.bottom;

  // Y-axis labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH - (chartH * i / 4);
    const val = Math.round(maxVal * i / 4);
    ctx.fillText(val, padding.left - 5, y + 3);
    // Grid line
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(canvas.width - padding.right, y);
    ctx.stroke();
  }

  // Draw line
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach(function(d, i) {
    const x = padding.left + (chartW / (data.length - 1 || 1)) * i;
    const y = padding.top + chartH - (d.value / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw dots and date labels
  ctx.fillStyle = '#3b82f6';
  data.forEach(function(d, i) {
    const x = padding.left + (chartW / (data.length - 1 || 1)) * i;
    const y = padding.top + chartH - (d.value / maxVal) * chartH;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.date.substring(5), x, canvas.height - 5);
    ctx.fillStyle = '#3b82f6';
  });
}

// ===== PHOTO UPLOAD =====
function capturePhoto(source) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (source === 'camera') input.setAttribute('capture', 'environment');
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, function(base64) {
      associatePhotoWithDiet(base64, selectedDietDate);
    });
  };
  input.click();
}

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxDim = 800;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = h * maxDim / w; w = maxDim; }
        else { w = w * maxDim / h; h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // Compress to JPEG 0.7 quality
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      callback(compressed);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function associatePhotoWithDiet(base64, dateStr) {
  if (!currentUser || !dateStr) return;
  if (!healthData[currentUser.id]) healthData[currentUser.id] = {};
  if (!healthData[currentUser.id][dateStr]) {
    healthData[currentUser.id][dateStr] = { photos: [] };
  }
  if (!healthData[currentUser.id][dateStr].photos) {
    healthData[currentUser.id][dateStr].photos = [];
  }
  healthData[currentUser.id][dateStr].photos.push({
    id: 'photo_' + Date.now(),
    base64: base64,
    timestamp: Date.now()
  });
  localStorage.setItem('nutripro_healthData', JSON.stringify(healthData));
  renderPhotoGallery(dateStr);
  showSyncNotification(currentLang === 'zh' ? '✅ 照片已添加' : 'Photo added');
}

function renderPhotoGallery(dateStr) {
  const container = document.getElementById('photoGallery');
  if (!container) return;
  const photos = healthData[currentUser.id]?.[dateStr]?.photos || [];
  if (photos.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">暂无照片</p>';
    return;
  }
  container.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
    photos.map(function(p) {
      return `<div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);">
        <img src="${p.base64}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="window.open('${p.base64}', '_blank')">
        <button onclick="removePhoto('${p.id}')" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:1;">✕</button>
      </div>`;
    }).join('') + '</div>';
}

function removePhoto(photoId) {
  if (!currentUser) return;
  const dateStr = selectedDietDate;
  const photos = healthData[currentUser.id]?.[dateStr]?.photos || [];
  const filtered = photos.filter(function(p) { return p.id !== photoId; });
  if (filtered.length !== photos.length) {
    healthData[currentUser.id][dateStr].photos = filtered;
    localStorage.setItem('nutripro_healthData', JSON.stringify(healthData));
    renderPhotoGallery(dateStr);
  }
}

// ===== AI FOOD RECOGNITION (Deferred — v1.3+) =====
// TODO: Implement AI food recognition from photos
// Requires external API (Google Vision, Azure Computer Vision)
// Placeholder for future iteration
function aiRecognizeFood(photoBase64) {
  console.warn('AI food recognition not yet implemented. Coming in v1.3+.');
  return null;
}
