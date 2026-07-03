# NutriPro 项目编辑指南

> 本文档供后续编辑和维护 NutriPro 项目时使用。

---

## 一、项目概述

**NutriPro** 是一款面向健身/运动人群的全功能营养管理平台，纯前端静态应用，零后端依赖（可选 Supabase 云同步）。

- **当前版本**: v1.5.3
- **技术栈**: 原生 HTML5 + CSS3 + Vanilla JavaScript（零框架）
- **部署方式**: GitHub Pages / 任意静态托管
- **离线支持**: Service Worker (cache-first 策略)
- **图表库**: Chart.js 4.x（多 CDN 自动切换）
- **云同步**: Supabase（国内可访问的 Firebase 替代品）
- **截图导出**: html2canvas 1.4.1
- **CSS 动画**: animate.css 4.x（页面/模态框动画）、Hover.css（hover 效果增强）

---

## 二、文件结构

```
index.html          # 主入口（HTML 结构 + 模块引用）
styles.css          # 全局样式表
sw.js               # Service Worker（离线缓存管理）
food_db_embed.js    # 嵌入式食物数据库（压缩数据）
modules/            # JavaScript 模块
├── config.js       # Supabase 配置、常量、escapeHtml 工具
├── utils.js        # SHA256 哈希、i18n 国际化翻译字典
├── state.js        # 全局状态集中管理（单一数据源）
├── cloud-sync.js   # Supabase 云同步逻辑
├── auth.js         # 认证系统（登录/注册/会话/权限）
├── admin.js        # 管理员面板（邀请码/审批/常驻用户）
├── admin-food.js   # 食物编辑和应用模态框
├── admin-users.js  # 用户管理按钮处理器
├── admin-key.js    # 密钥管理 + 安全问题
├── food-render.js  # 食物网格渲染、排行榜、对比
├── calculators.js  # 12 个计算工具引擎
├── diet.js         # 饮食记录 + 用户管理表单
├── advice.js       # 饮食建议生成
├── app.js          # 初始化 + 页面切换 + 事件绑定
├── health.js       # 健康追踪（训练/睡眠/饮水/HRV/照片）
├── supplements.js  # 补剂追踪器
├── data-export.js  # 本地数据导出/导入（JSON 备份恢复，独立于 Supabase）
└── db-compress.js  # 嵌入式数据库解压初始化
archive/            # 历史版本归档
```

---

## 三、核心架构

### 3.1 状态管理（state.js）

所有全局状态集中在 `state.js`，遵循单一数据源原则：

| 变量 | 用途 | 持久化 |
|------|------|--------|
| `FOOD_DB` | 食物数据库（内存数组） | 从嵌入式数据解压 |
| `users` | 用户列表 | localStorage + 云端 |
| `currentUser` | 当前选中用户 | localStorage |
| `allDietData` | 饮食记录（按用户+日期） | localStorage + 云端 |
| `healthData` | 健康数据（训练/睡眠/饮水） | localStorage + 云端 |
| `supplementLog` | 补剂记录 | localStorage + 云端 |
| `currentSession` | 当前会话信息 | localStorage |
| `energyUnit` | 能量单位偏好 (kcal/kJ) | localStorage |
| `siteName` | 网站名称 | localStorage |

**修改规则**：
- 新增全局状态变量时，先在 `state.js` 声明
- 涉及持久化的数据，使用对应的 `persistXxx()` 函数或直接 `localStorage.setItem`
- 涉及云端同步的数据，调用 `CloudSync.push(key, data)`

### 3.2 模块化加载顺序

`index.html` 中的 `<script>` 标签顺序即为加载顺序，依赖此顺序保证函数可用性：

```
config.js → utils.js → state.js → cloud-sync.js → auth.js
→ admin.js → admin-food.js → admin-users.js → admin-key.js
→ food-render.js → calculators.js → diet.js → advice.js
→ app.js → health.js → supplements.js → data-export.js
```

**注意**：修改模块顺序时必须确保所有依赖关系满足。

### 3.3 权限模型

三级角色 + 权限审批：

| 角色 | 权限 | 说明 |
|------|------|------|
| `admin` | 全部模块 + 管理面板 | 管理员，通过密钥登录 |
| `resident` | 全部模块 | 常驻用户，由管理员预设或审批晋升 |
| `guest` | 仅食物数据库 | 访客，可申请升级或单项权限 |

权限控制通过 `hasPermission(module)` 函数判断，UI 通过 `.locked` 类和 `.perm-locked` 类隐藏。

### 3.4 云同步机制

**Supabase 表结构（sync_data 表）**：

| key | localStorage 对应 | 数据类型 |
|-----|-------------------|----------|
| `auth` | `nutripro_auth` | 邀请码/申请/权限配置 |
| `users` | `nutripro_users` | 用户列表 |
| `diet` | `nutripro_allDietData` | 饮食记录 |
| `userFoods` | `nutripro_userFoods` | 用户自定义食物 |
| `health` | `nutripro_healthData` | 健康数据 |
| `supplement` | `nutripro_supplementLog` | 补剂记录 |

**同步流程**：
1. 数据变更 → `CloudSync.push(key, data)` → 写入 `sync_data` 表
2. 拉取数据 → `CloudSync.pull(key)` → 从 `sync_data` 表读取 → 写入 localStorage
3. 实时推送 → Supabase Realtime 订阅 `sync_data` 表变更
4. 轮询兜底 → 每 30 秒 `CloudSync.pullAll()` 检测变化

**配置 Supabase**：
1. 点击左上角 ⚙️ → "云同步设置"
2. 粘贴 Supabase URL 和 Anon Key（JSON 格式）
3. 点击"保存并连接"

---

## 四、常用编辑操作

### 4.1 添加新功能模块

1. 在 `modules/` 下创建新 JS 文件
2. 在 `index.html` 末尾添加 `<script src="modules/xxx.js"></script>`
3. 在 `state.js` 中声明需要的全局状态
4. 在 `app.js` 的 `init()` 中调用初始化函数

### 4.2 修改 i18n 翻译

编辑 `modules/utils.js` 中的 `i18n` 对象：

```javascript
const i18n = {
  zh: {
    my_new_key: "我的新中文文本",
  },
  en: {
    my_new_key: "My new English text",
  }
};
```

在 HTML 中使用 `data-i18n="my_new_key"` 属性：

```html
<span data-i18n="my_new_key">我的新中文文本</span>
```

或通过 JS 使用 `t('my_new_key')` 函数。

### 4.3 添加新的计算器

1. 在 `modules/calculators.js` 中添加计算逻辑函数
2. 在 `index.html` 的计算器列表中添加入口
3. 在 `utils.js` 的 i18n 字典中添加名称翻译

### 4.4 修改 Service Worker 缓存

编辑 `sw.js`：

```javascript
// 升级版本号触发缓存更新
const CACHE_NAME = 'nutripro-vX';  // 递增版本号

// 新增需要缓存的文件
const STATIC_ASSETS = [
  '...',
  'modules/new-module.js',  // 新模块
];
```

**重要**：每次修改 `CACHE_NAME` 都会触发旧缓存清理和新缓存填充。

### 4.5 修改版本号

需要更新的版本号位置：
- `index.html` 第 6 行 `<title>` 标签
- `index.html` 第 123 行 `<h1>` 标签
- `modules/app.js` 第 13、26、27 行 `siteName` 和 `applySiteName()`
- `README.md` 顶部版本号和更新日志

---

## 五、已知限制和注意事项

### 5.1 安全性

- 密码使用 SHA-256 哈希存储（**无盐**），仅适合非生产环境
- Supabase Anon Key 在前端公开是正常的（RLS 保护数据）
- 管理员密钥默认值：`HS25324*`，首次登录后务必修改

### 5.2 数据容量

- LocalStorage 配额通常 5-10MB，大量饮食记录和照片可能超出
- 照片使用 Base64 存储且压缩到 800px，但仍占用较多空间
- 建议定期清理不需要的数据

### 5.3 云同步

- Supabase 免费额度：每月 50GB 带宽，1GB 数据库
- 如果同步失败，检查网络连接和 Supabase 配置
- SDK 加载超时 15 秒，国内网络建议使用 jsDelivr CDN

### 5.4 浏览器兼容性

- 需要支持 ES6+、localStorage、Service Worker、crypto.subtle
- Chrome 60+、Firefox 55+、Edge 79+、Safari 12+
- IE 不支持

---

## 六、部署流程

### 6.1 GitHub Pages 部署

1. 将代码推送到 GitHub 仓库
2. Settings → Pages → Source: main branch / `/ (root)`
3. 访问 `https://<username>.github.io/<repo>/`

### 6.2 本地测试

```bash
# 使用 Python 静态服务器
python -m http.server 8765

# 或使用 Node.js
npx serve .
```

### 6.3 版本发布检查清单

- [ ] 所有模块功能测试通过
- [ ] Service Worker 缓存版本已升级
- [ ] 版本号在所有文件中已更新
- [ ] README.md 更新日志已添加
- [ ] 云同步功能测试通过（如配置了 Supabase）
- [ ] 离线模式测试通过
- [ ] 多浏览器兼容测试

---

## 七、常见问题排查

### Q1: 页面显示空白或加载失败

1. 打开浏览器 DevTools → Console 查看错误
2. 检查 `FOOD_DB` 是否正确加载
3. 清除 Service Worker 缓存：DevTools → Application → Service Workers → Unregister

### Q2: 饮食摘要图表不显示

1. 检查 Chart.js 是否加载成功（Console 中搜索 `Chart.js`）
2. 确认有饮食记录（`allDietData` 不为空）
3. 检查 `generateDietSummary()` 是否有报错

### Q3: 云同步不工作

1. 点击右上角云同步图标查看状态
2. 检查 Supabase 配置是否正确
3. 检查网络连接（Supabase SDK 需要访问 CDN）
4. 尝试点击"重试加载 SDK"按钮

### Q4: 数据丢失

1. 检查 localStorage 中是否有数据：DevTools → Application → Local Storage
2. 尝试从云端恢复：点击云同步图标触发手动同步
3. 检查是否有多个用户数据冲突

---

## 八、开发路线图（参考）

- [ ] 密码加盐（bcrypt/scrypt）
- [ ] 补充单元测试
- [ ] 数据导出为 PDF/图片
- [ ] 更多食物分类和营养指标
- [ ] 训练计划模板库
- [ ] 离线优先架构（IndexedDB）
- [ ] PWA 安装支持

---

*最后更新: 2026-06-20, NutriPro v1.5.3*
