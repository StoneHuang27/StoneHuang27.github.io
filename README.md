# NutriPro v1.5.2 — 运动营养数据平台

> 一款面向健身/运动人群的全功能营养管理平台，集成食物数据库、身体指标计算器、饮食记录和个性化建议。

## v1.5.2 更新日志（正式部署版）

### 关键修复
- **饮食摘要环形图修复（终版）**：将 `generateDietSummary()` 中 `totalP/C/F/Cal` 变量从 `const` 改为 `let`，修复"Assignment to constant variable"错误，使补剂营养数据能正确累加到饮食摘要中
- **Service Worker 缓存版本升级**：`CACHE_NAME` 从 `v5` → `v6`，`RUNTIME_CACHE` 从 `v1` → `v2`，确保所有更新生效
- **i18n 翻译键补全**：`total_calories`、`protein_diet`、`carbs_diet`、`fat_diet`、`macro_ratio_label`、`diet_summary_prefix`、`diet_summary_suffix` 中英文翻译完整

### 修改文件
- `sw.js` — `CACHE_NAME` `v5` → `v6`，`RUNTIME_CACHE` `v1` → `v2`
- `modules/diet.js` — `const totalP/C/F/Cal` → `let`，修复补剂营养累加
- `modules/utils.js` — 补充饮食摘要相关 i18n 翻译键
- `modules/app.js` — 版本号更新
- `index.html` — 版本号更新
- `README.md` — 版本更新为 v1.5.2

---

# NutriPro v1.5.1 — 运动营养数据平台

> 一款面向健身/运动人群的全功能营养管理平台，集成食物数据库、身体指标计算器、饮食记录和个性化建议。

## v1.5.1 更新日志（饮食摘要图表修复）

### 关键修复
- **饮食摘要环形图不显示**：升级 Service Worker 缓存版本（`nutripro-v4` → `nutripro-v5`），确保浏览器加载最新代码
- **`renderDietPage()` 不再自动渲染空摘要**：移除页面切换时自动调用 `generateDietSummary()`，仅在用户点击"生成饮食摘要"按钮时才渲染
- **i18n 翻译键补全**：添加 `total_calories`、`protein_diet`、`carbs_diet`、`fat_diet`、`macro_ratio_label`、`diet_summary_prefix`、`diet_summary_suffix` 的中英文翻译
- **`generateDietSummary()` 错误处理增强**：
  - FOOD_DB 未加载时显示友好提示
  - 无饮食记录时显示"请先添加食物"提示
  - Chart.js 加载失败时在卡片底部显示警告（而非插入到错误位置）
  - 图表渲染延迟从 50ms 降至 10ms（DOM 已就绪，无需等待）
  - 顶层 try-catch 捕获错误后在页面上显示具体错误信息

### 修改文件
- `sw.js` — CACHE_NAME `v4` → `v5`
- `modules/diet.js` — `renderDietPage()` 移除 `generateDietSummary()` 调用；`generateDietSummary()` 增强错误处理和用户反馈
- `modules/utils.js` — 补充饮食摘要相关 i18n 翻译键
- `README.md` — 版本更新为 v1.5.1

---

## v1.5 更新日志

### 数据持久化修复（关键）
- **健康数据云同步**：`health` 数据现在加入云同步 key 列表，清除浏览器数据后可从云端恢复
- **补剂记录云同步**：`supplementLog` 和 `customSupplements` 现在通过 `supplement` key 同步到云端
- **照片关联云同步**：`associatePhotoWithDiet()` 和 `removePhoto()` 现在调用 `CloudSync.push('health')`
- **手动同步增强**：点击云同步图标后，自动刷新健康数据和补剂记录 UI

### 跨设备食物同步修复（关键）
- **FOOD_DB 重建机制**：从云端拉取 `userFoods` 后，自动调用 `rebuildFoodDB()` 重新合并食物数据库
- **实时监听增强**：收到 `userFoods` 实时推送时，重建 FOOD_DB 并更新所有食物 UI
- **轮询同步增强**：30 秒轮询检测到 userFoods 变化时，自动重建 FOOD_DB
- **`allFoodsForDiet` 同步更新**：FOOD_DB 重建后同步更新饮食页面食物下拉列表

### Bug 修复
- **饮食摘要环形图**：Chart.js 加载失败时显示文本降级提示；Chart.js CDN 增加多源自动切换（jsdelivr → bootcdn → unpkg）
- **`logAudit` 未定义错误**：在 state.js 中实现 `logAudit()` 函数，修复用户删除/停用时的 ReferenceError
- **重复函数清理**：移除 diet.js 中重复定义的 `saveDietData()` 和 `getDietFoodsForSelectedDates()`，避免混淆

### 清理优化
- Service Worker CDN_ASSETS 增加 Chart.js 多 CDN 源缓存
- 版本更新为 v1.5

### 新增功能
- **食物数据库跨设备同步**：管理员添加/编辑的食物通过 Supabase 云同步，多设备可见
- **补剂记录移至食物数据库**：补剂追踪器现在显示在食物数据库页面，方便选食物时同步记录补剂
- **饮食记录日期选择器**：支持单日/多日范围模式切换，可查看历史日期
- **饮食记录健康数据联动**：切换日期后健康数据（训练/睡眠/HRV）自动更新

### Bug 修复
- **用户管理角色筛选修复**：修复搜索框和角色筛选器参数颠倒导致的筛选失效问题；修复筛选状态不保持（搜索文字和选中角色重置）的问题
- **饮食记录添加食物功能恢复**：实现了缺失的 `renderDietPage()`、`addDietFood()`、`confirmAddDietFood()` 函数
- **训练/睡眠记录去重**：移除饮食记录页面中与健康仪表盘重复的训练记录卡片和睡眠生活卡片
- **用户数据持久化加固**：修复 `addUser()` 中 ID 生成冲突可能导致的数据丢失问题

### 清理优化
- 整理项目目录结构，将临时调试文件和旧备份移至 archive/
- 清理多余的 web bug fix 文件夹

## 快速开始

1. 直接在浏览器中打开 `index.html` 即可运行（纯静态，无需服务器）
2. 首次使用以访客身份浏览，或通过管理员密钥进入管理系统
3. 点击左上角 ⚙️ 按钮配置 Supabase 云同步（可选）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML5 + CSS3 + Vanilla JavaScript（零框架） |
| 离线 | Service Worker（cache-first / network-first 策略） |
| 图表 | Chart.js 4.x |
| 截图导出 | html2canvas 1.4.1 |
| 后端/数据库 | Supabase（PostgreSQL + Realtime） |
| 认证 | SHA-256 密码哈希 + 邀请码注册 |
| 部署 | GitHub Pages / 任意静态托管 |

## 功能模块

### 🍎 食物数据库（公开）
- **1,500+** 种食物，涵盖 20 大分类（谷物、蔬菜、肉类、海鲜、乳制品等）
- 每份食物包含 30+ 营养指标：热量、宏量营养素、维生素、矿物质、脂肪酸、FODMAP 等级、蛋白质质量（BV/PDCAAS/DIAAS）
- 全文搜索、分类筛选、饮食标签过滤（地中海/高蛋白/低碳水/低FODMAP）
- 食物详情弹窗（含 Chart.js 饼图/柱状图可视化）
- 排行榜：按任意营养素排序 Top 100
- 多食物对比：最多 10 种食物并排比较 + 雷达图

### 🧮 计算工具（需权限）
共 12 个专业计算器：
| 工具 | 说明 |
|------|------|
| TDEE | 每日总能量消耗（Mifflin/Katch 双公式综合） |
| BMR | 基础代谢率（4 种公式对比 + 柱状图） |
| FFMI | 去脂体重指数及分级评价 |
| 热量缺口 | 目标减重天数预估 |
| 月经安全线 | 基于瘦体重的最低安全热量 |
| 增肌上限 | Lyle McDonald / Alan Aragon 模型 |
| TEF | 食物热效应计算 |
| BMI | 身体质量指数 |
| 体脂率 | US Navy 公式估算 |
| 蛋白质需求 | 按目标定制（减脂/维持/增肌） |
| 水分需求 | 基础 + 运动补充 |
| 宏量配比 | P/C/F 克数换算 |

### 📋 饮食记录（需权限）
- 按用户、按日期记录饮食
- 支持单日 / 多日范围查看模式
- 自动生成宏量营养素比例饼图
- 训练记录（类型/时长/强度）
- 睡眠与饮水追踪

### 💡 饮食建议（需权限）
- 基于用户档案 + 饮食记录生成个性化建议
- 支持一键复制到剪贴板，发送给 AI 助手深度分析

### 👤 用户管理（常驻用户+）
- 用户档案 CRUD（性别/年龄/身高/体重/体脂率/活动等级/目标）
- 数据导入/导出（JSON）
- 权限审批系统（访客可申请升级或模块权限）

### 🛡️ 管理员面板
- 会话有效期管理（1天/7天/30天/90天/365天）
- 邀请码生成/复制/删除
- 用户审批（权限申请、升级申请、食物修改申请）
- 管理员密钥修改 + 安全问题恢复
- 常驻用户列表管理

## 数据库架构

### Supabase 表结构（7 张表）

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户档案 | id(UUID), name, password_hash, role, gender, age, height, weight, bodyfat, activity, goal |
| `invite_codes` | 邀请码 | code, is_used, used_by, used_at |
| `applications` | 权限/升级申请 | user_id, type(perm/upgrade), status, reason, admin_reply |
| `diet_records` | 饮食记录 | user_id, record_date, foods(JSONB) |
| `user_permissions` | 模块权限 | user_id, module(calc/diet/advice), granted_by |
| `admin_config` | 管理员配置 | key(security/admin_key), value(JSONB) |
| `sync_data` | 云同步桥接 | key(auth/users/diet), data(JSONB), updated_at |

### 行级安全（RLS）
所有 7 张表均启用 RLS，通过 PL/pgSQL RPC 函数（`SECURITY DEFINER`）绕过策略执行认证。

## 文件结构

```
index.html          # 主应用（HTML 结构 + 模块引用，~575行）
styles.css          # 样式表
food_db.json        # 食物数据库（1550+ 种食物，动态加载）
sw.js               # Service Worker（离线支持）
modules/            # JavaScript 模块
├── config.js       # Supabase 配置、常量、escapeHtml
├── utils.js        # SHA256、i18n 国际化
├── state.js        # 全局状态集中管理
├── error-boundary.js # 渲染函数错误边界工具
├── cloud-sync.js   # Supabase 云同步
├── auth.js         # 认证、登录、会话、权限
├── admin.js        # 管理员面板、邀请码、审批
├── admin-food.js   # 食物编辑、应用模态框
├── admin-users.js  # 用户按钮处理器
├── admin-key.js    # 密钥管理、安全问题、导出/导入
├── food-db.js      # 食物数据库加载
├── food-render.js  # 食物渲染、排行、对比
├── calculators.js  # 12 个计算工具引擎
├── diet.js         # 饮食记录、用户管理
├── advice.js       # 饮食建议生成
└── app.js          # 初始化、页面切换、事件监听
supabase-migration.sql  # Supabase 建表脚本
food_data_final.json    # 备用食物数据库 JSON
archive/              # 历史版本归档
food_data_raw/        # 原始营养数据 JSON（按食物分类）
知识库/               # 项目相关文档
```

## 国际语言

支持中文/英文双语切换，通过 `data-i18n` 属性驱动。翻译字典定义在 `modules/utils.js` 的 `i18n` 对象中。

## 部署

### GitHub Pages
1. 将仓库推送到 GitHub
2. Settings → Pages → Source: main branch / `/ (root)`
3. 访问 `https://<username>.github.io/<repo>/`

### 本地运行
```bash
# 任意静态服务器即可
python -m http.server 8000
# 或
npx serve .
```

## 安全须知

- 管理员密钥默认值：`HS25324*`（首次登录后务必修改）
- 密码使用 SHA-256 哈希存储（不含盐，建议后续加盐）
- Supabase Anon Key 在前端公开是正常的（RLS 保护数据）
- 敏感配置（Supabase URL/Key）支持运行时修改，无需硬编码

## 开发路线

- [x] 拆分 `index.html` 为模块化文件（CSS/JS/DB 分离）
- [x] 统一状态管理（`modules/state.js` 集中管理全局状态）
- [ ] 添加 Service Worker 实现离线支持
- [ ] 密码加盐（bcrypt/scrypt）
- [ ] 补充单元测试
- [x] 食物数据库懒加载（按需 fetch food_db.json）
- [x] Service Worker 离线支持（cache-first / network-first 策略）
- [x] 全局状态集中管理（state.js）
- [x] 渲染函数错误边界（error-boundary.js）
