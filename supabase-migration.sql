-- ============================================================
-- NutriPro - Supabase 数据库迁移脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'guest'
        CHECK (role IN ('admin', 'resident', 'guest')),
    gender VARCHAR(10) DEFAULT 'male',
    age INTEGER DEFAULT 25,
    height NUMERIC(5,1) DEFAULT 170,
    weight NUMERIC(5,1) DEFAULT 65,
    bodyfat NUMERIC(4,1) DEFAULT 15,
    activity VARCHAR(20) DEFAULT 'moderate',
    training_years NUMERIC(3,1) DEFAULT 1,
    goal VARCHAR(20) DEFAULT 'maintain',
    granted_permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(9) UNIQUE NOT NULL,
    created_by UUID REFERENCES users(id),
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMPTZ,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 申请表
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) DEFAULT '普通用户',
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('upgrade', 'food_edit', 'permission')),
    target VARCHAR(50) DEFAULT '',
    reason TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_reply TEXT DEFAULT '',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 饮食记录表 (保持与前端 allDietData 一致的灵活结构)
CREATE TABLE IF NOT EXISTS diet_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    record_date DATE NOT NULL,
    foods JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, record_date)
);

-- 5. 权限授权表
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    granted_by VARCHAR(100),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module)
);

-- 6. 管理员配置表 (存储 adminKeyHash, sessionDays 等)
CREATE TABLE IF NOT EXISTS admin_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 全局同步数据表 (兼容旧版 localStorage 结构的完整快照)
CREATE TABLE IF NOT EXISTS sync_data (
    key VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 索引 =====
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_used ON invite_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_records_user_date ON diet_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_diet_records_date ON diet_records(record_date);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- ===== RLS 行级安全策略 =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- 通用策略: 认证用户可读取
DROP POLICY IF EXISTS "authenticated_read" ON users;
CREATE POLICY "authenticated_read" ON users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_read" ON invite_codes;
CREATE POLICY "authenticated_read" ON invite_codes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_read" ON applications;
CREATE POLICY "authenticated_read" ON applications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_read" ON user_permissions;
CREATE POLICY "authenticated_read" ON user_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_read" ON admin_config;
CREATE POLICY "authenticated_read" ON admin_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_read" ON sync_data;
CREATE POLICY "authenticated_read" ON sync_data FOR SELECT TO authenticated USING (true);

-- 饮食记录: 用户只能操作自己的
DROP POLICY IF EXISTS "diet_read_own" ON diet_records;
CREATE POLICY "diet_read_own" ON diet_records FOR SELECT TO authenticated
    USING (user_id = auth.jwt() ->> 'user_id' OR user_id = auth.uid()::text);
DROP POLICY IF EXISTS "diet_insert_own" ON diet_records;
CREATE POLICY "diet_insert_own" ON diet_records FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.jwt() ->> 'user_id' OR user_id = auth.uid()::text);
DROP POLICY IF EXISTS "diet_update_own" ON diet_records;
CREATE POLICY "diet_update_own" ON diet_records FOR UPDATE TO authenticated
    USING (user_id = auth.jwt() ->> 'user_id' OR user_id = auth.uid()::text);
DROP POLICY IF EXISTS "diet_delete_own" ON diet_records;
CREATE POLICY "diet_delete_own" ON diet_records FOR DELETE TO authenticated
    USING (user_id = auth.jwt() ->> 'user_id' OR user_id = auth.uid()::text);

-- 匿名访问策略 (游客模式需要基本读取)
DROP POLICY IF EXISTS "anon_read_users" ON users;
CREATE POLICY "anon_read_users" ON users FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_read_invite" ON invite_codes;
CREATE POLICY "anon_read_invite" ON invite_codes FOR SELECT TO anon USING (is_used = false);
DROP POLICY IF EXISTS "anon_read_sync" ON sync_data;
CREATE POLICY "anon_read_sync" ON sync_data FOR SELECT TO anon USING (true);

-- sync_data 写入策略 (认证用户和管理员)
DROP POLICY IF EXISTS "sync_write_authenticated" ON sync_data;
CREATE POLICY "sync_write_authenticated" ON sync_data FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "sync_write_anon" ON sync_data;
CREATE POLICY "sync_write_anon" ON sync_data FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "sync_update_anon" ON sync_data;
CREATE POLICY "sync_update_anon" ON sync_data FOR UPDATE TO anon USING (true);

-- invite_codes 写入策略
DROP POLICY IF EXISTS "invite_insert_authenticated" ON invite_codes;
CREATE POLICY "invite_insert_authenticated" ON invite_codes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "invite_update_authenticated" ON invite_codes;
CREATE POLICY "invite_update_authenticated" ON invite_codes FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "invite_delete_authenticated" ON invite_codes;
CREATE POLICY "invite_delete_authenticated" ON invite_codes FOR DELETE TO authenticated USING (true);

-- applications 写入策略
DROP POLICY IF EXISTS "app_insert_authenticated" ON applications;
CREATE POLICY "app_insert_authenticated" ON applications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "app_update_authenticated" ON applications;
CREATE POLICY "app_update_authenticated" ON applications FOR UPDATE TO authenticated USING (true);

-- users 写入策略
DROP POLICY IF EXISTS "users_insert_authenticated" ON users;
CREATE POLICY "users_insert_authenticated" ON users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "users_update_authenticated" ON users;
CREATE POLICY "users_update_authenticated" ON users FOR UPDATE TO authenticated USING (true);

-- admin_config 写入策略
DROP POLICY IF EXISTS "admin_config_write" ON admin_config;
CREATE POLICY "admin_config_write" ON admin_config FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_config_write_anon" ON admin_config;
CREATE POLICY "admin_config_write_anon" ON admin_config FOR ALL TO anon USING (true);

-- user_permissions 写入策略
DROP POLICY IF EXISTS "perm_insert_authenticated" ON user_permissions;
CREATE POLICY "perm_insert_authenticated" ON user_permissions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "perm_update_authenticated" ON user_permissions;
CREATE POLICY "perm_update_authenticated" ON user_permissions FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "perm_delete_authenticated" ON user_permissions;
CREATE POLICY "perm_delete_authenticated" ON user_permissions FOR DELETE TO authenticated USING (true);

-- ===== 初始数据 =====
-- 管理员密钥哈希 (SHA256 of 'HS25324*')
INSERT INTO admin_config (key, value) VALUES
    ('auth', '{"adminKeyHash":"4281d01508ec16626fe3da0fabdb5d487f4950a97f9755532f36c4d14767773b","sessionDays":30}')
ON CONFLICT (key) DO NOTHING;

-- ===== RPC 函数: 验证邀请码并注册 =====
CREATE OR REPLACE FUNCTION register_with_invite(
    p_invite_code VARCHAR,
    p_name VARCHAR,
    p_password_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code RECORD;
    v_user_id UUID;
    v_existing INTEGER;
BEGIN
    -- 检查用户名是否已存在
    SELECT COUNT(*) INTO v_existing FROM users WHERE name = p_name;
    IF v_existing > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', '用户名已存在');
    END IF;

    -- 查找有效邀请码
    SELECT * INTO v_code FROM invite_codes
        WHERE code = p_invite_code AND is_used = false
        FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '邀请码无效或已被使用');
    END IF;

    -- 创建用户
    INSERT INTO users (name, password_hash, role, gender, age, height, weight, bodyfat, activity, training_years, goal, granted_permissions)
    VALUES (p_name, p_password_hash, 'resident', 'male', 25, 170, 65, 15, 'moderate', 1, 'maintain', '[]')
    RETURNING id INTO v_user_id;

    -- 标记邀请码已使用
    UPDATE invite_codes SET is_used = true, used_by = v_user_id, used_at = NOW()
        WHERE id = v_code.id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id::text,
        'name', p_name,
        'role', 'resident'
    );
END;
$$;

-- ===== RPC 函数: 管理员密钥验证 =====
CREATE OR REPLACE FUNCTION verify_admin_key(
    p_key_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash VARCHAR;
BEGIN
    SELECT value->>'adminKeyHash' INTO v_stored_hash FROM admin_config WHERE key = 'auth';
    IF v_stored_hash = p_key_hash THEN
        RETURN jsonb_build_object('success', true, 'role', 'admin');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', '密钥错误');
END;
$$;

-- ===== RPC 函数: 用户登录验证 =====
CREATE OR REPLACE FUNCTION verify_user_login(
    p_name VARCHAR,
    p_password_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT id, name, role, gender, age, height, weight, bodyfat, activity, training_years, goal, granted_permissions
    INTO v_user FROM users WHERE name = p_name AND role = 'resident';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户名不存在或非常驻用户');
    END IF;

    IF v_user.password_hash != p_password_hash THEN
        RETURN jsonb_build_object('success', false, 'error', '密码错误');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user.id::text,
        'name', v_user.name,
        'role', v_user.role,
        'gender', v_user.gender,
        'age', v_user.age,
        'height', v_user.height,
        'weight', v_user.weight,
        'bodyfat', v_user.bodyfat,
        'activity', v_user.activity,
        'training_years', v_user.training_years,
        'goal', v_user.goal,
        'granted_permissions', v_user.granted_permissions
    );
END;
$$;

-- ===== RPC 函数: 创建邀请码 (绕过RLS) =====
CREATE OR REPLACE FUNCTION create_invite_code(
    p_code VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_existing INTEGER;
BEGIN
    -- 检查邀请码是否已存在
    SELECT COUNT(*) INTO v_existing FROM invite_codes WHERE code = p_code;
    IF v_existing > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', '邀请码已存在');
    END IF;

    INSERT INTO invite_codes (code, is_used)
    VALUES (p_code, false)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id::text,
        'code', p_code
    );
END;
$$;

-- ===== RPC 函数: 删除邀请码 (绕过RLS) =====
CREATE OR REPLACE FUNCTION delete_invite_code(
    p_code VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM invite_codes WHERE code = p_code AND is_used = false;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', '邀请码不存在或已被使用');
    END IF;

    RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted);
END;
$$;

-- ===== RPC 函数: 修改管理员密钥 =====
CREATE OR REPLACE FUNCTION change_admin_key(
    p_old_key_hash VARCHAR,
    p_new_key_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash VARCHAR;
BEGIN
    SELECT value->>'adminKeyHash' INTO v_stored_hash FROM admin_config WHERE key = 'auth';
    IF v_stored_hash IS NULL OR v_stored_hash != p_old_key_hash THEN
        RETURN jsonb_build_object('success', false, 'error', '当前密钥错误');
    END IF;
    UPDATE admin_config SET value = jsonb_set(value, '{adminKeyHash}', to_jsonb(p_new_key_hash)) WHERE key = 'auth';
    RETURN jsonb_build_object('success', true);
END;
$$;

-- ===== RPC 函数: 通过安全问题重置管理员密钥 =====
CREATE OR REPLACE FUNCTION reset_admin_key_via_question(
    p_answer_hash VARCHAR,
    p_new_key_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_answer_hash VARCHAR;
BEGIN
    SELECT value->>'answer_hash' INTO v_stored_answer_hash FROM admin_config WHERE key = 'security';
    IF v_stored_answer_hash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '未设置安全问题');
    END IF;
    IF v_stored_answer_hash != p_answer_hash THEN
        RETURN jsonb_build_object('success', false, 'error', '安全问题答案错误');
    END IF;
    UPDATE admin_config SET value = jsonb_set(value, '{adminKeyHash}', to_jsonb(p_new_key_hash)) WHERE key = 'auth';
    RETURN jsonb_build_object('success', true);
END;
$$;

-- ===== 触发器: 自动更新 updated_at =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS diet_records_updated_at ON diet_records;
CREATE TRIGGER diet_records_updated_at BEFORE UPDATE ON diet_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS admin_config_updated_at ON admin_config;
CREATE TRIGGER admin_config_updated_at BEFORE UPDATE ON admin_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS sync_data_updated_at ON sync_data;
CREATE TRIGGER sync_data_updated_at BEFORE UPDATE ON sync_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
