-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post candidates table
CREATE TABLE post_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  raw_text TEXT,
  category TEXT,
  sub_category TEXT,
  region TEXT,
  target_audience TEXT,
  event_date DATE,
  deadline DATE,
  organizer TEXT,
  application_url TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  importance TEXT DEFAULT 'normal' CHECK (importance IN ('important', 'normal', 'reference')),
  status TEXT DEFAULT 'unconfirmed' CHECK (status IN (
    'unconfirmed', 'candidate', 'drafting', 'draft_created',
    'image_created', 'review_waiting', 'ready', 'scheduled', 'published', 'skipped'
  )),
  review_status TEXT DEFAULT 'not_required' CHECK (review_status IN (
    'not_required', 'not_started', 'requesting', 'revision_requested',
    'confirmed', 'rejected', 'skipped'
  )),
  scheduled_at TIMESTAMPTZ,
  platforms TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  ai_score INT,
  ai_reason TEXT,
  fact_check_points JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social posts table
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_candidate_id UUID REFERENCES post_candidates(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'x')),
  post_text TEXT,
  hashtags TEXT,
  story_text TEXT,
  image_title TEXT,
  image_subtitle TEXT,
  image_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'scheduled', 'published', 'skipped', 'failed')),
  external_post_id TEXT,
  external_post_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated images table
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_candidate_id UUID REFERENCES post_candidates(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  image_size TEXT DEFAULT '1080x1080',
  image_url TEXT,
  image_text_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_candidate_id UUID REFERENCES post_candidates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources table (for future source management)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT,
  source_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_post_candidates_status ON post_candidates(status);
CREATE INDEX idx_post_candidates_priority ON post_candidates(priority);
CREATE INDEX idx_post_candidates_deadline ON post_candidates(deadline);
CREATE INDEX idx_post_candidates_created_at ON post_candidates(created_at DESC);
CREATE INDEX idx_social_posts_candidate_id ON social_posts(post_candidate_id);
CREATE INDEX idx_social_posts_scheduled_at ON social_posts(scheduled_at);
CREATE INDEX idx_comments_candidate_id ON comments(post_candidate_id);
CREATE INDEX idx_generated_images_candidate_id ON generated_images(post_candidate_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER post_candidates_updated_at BEFORE UPDATE ON post_candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER social_posts_updated_at BEFORE UPDATE ON social_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER generated_images_updated_at BEFORE UPDATE ON generated_images FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id);

-- All authenticated users can do everything on main tables
CREATE POLICY "post_candidates_all" ON post_candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "social_posts_all" ON social_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "generated_images_all" ON generated_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "comments_all" ON comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "categories_all" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sources_all" ON sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (auth_user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
