-- ══════════════════════════════════════════════════════════════
--  Jamaat Attendance — Supabase Database Schema (v2)
--  Run this in your Supabase SQL Editor to create all tables.
-- ══════════════════════════════════════════════════════════════

-- ── Profiles (extends Supabase auth.users) ──
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'scanner')) NOT NULL DEFAULT 'scanner',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Members (3700+ records) ──
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  its_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hfid TEXT DEFAULT '',
  back_barcode TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Events ──
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Attendance ──
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  its_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  scanned_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMPTZ DEFAULT now(),
  method TEXT CHECK (method IN ('manual', 'nfc')) DEFAULT 'manual',
  UNIQUE(event_id, member_id)
);

-- ── App Settings (singleton) ──
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  language TEXT DEFAULT 'en',
  dark_mode BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_settings (id, language, dark_mode)
VALUES (1, 'en', false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
--  INDEXES (critical for 3700 members)
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_members_its_id ON members(its_id);
CREATE INDEX IF NOT EXISTS idx_members_hfid ON members(hfid);
CREATE INDEX IF NOT EXISTS idx_members_barcode ON members(back_barcode);
CREATE INDEX IF NOT EXISTS idx_members_name ON members USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked ON attendance(marked_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Security: only one admin account allowed (prevents race condition in signup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_admin ON profiles (role) WHERE role = 'admin';

-- ══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ── Profiles: users can read own, admin reads all ──
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin reads all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admin manages profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- Allow insert for new user signup (trigger handles this)
CREATE POLICY "Allow profile creation on signup" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── Members: all authenticated can read, admin can write ──
CREATE POLICY "Authenticated read members" ON members
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages members" ON members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Events: all authenticated can read, admin can write ──
CREATE POLICY "Authenticated read events" ON events
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages events" ON events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Attendance: all authenticated can read & insert, admin can do all ──
CREATE POLICY "Authenticated read attendance" ON attendance
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert attendance" ON attendance
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin manages attendance" ON attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Settings: all authenticated read, admin writes ──
CREATE POLICY "Authenticated read settings" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages settings" ON app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════
--  ENABLE REALTIME for attendance (live scanning dashboard)
-- ══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- ══════════════════════════════════════════════════════════════
--  FUNCTION: Auto-create profile on signup
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'scanner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
