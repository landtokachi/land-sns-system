-- 巡回情報源テーブル
CREATE TABLE IF NOT EXISTS collection_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  crawl_frequency TEXT DEFAULT 'weekly' CHECK (crawl_frequency IN ('daily', 'weekly', 'manual')),
  is_active BOOLEAN DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  last_found_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE collection_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can manage collection_sources"
  ON collection_sources FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- デフォルト情報源を登録
INSERT INTO collection_sources (name, url, category, crawl_frequency, notes) VALUES
  ('中小企業庁 経営支援情報', 'https://www.chusho.meti.go.jp/keiei/index.html', '補助金・助成金・支援制度', 'weekly', '国の補助金・支援制度情報'),
  ('J-Net21 支援情報ヘッドライン', 'https://j-net21.smrj.go.jp/support/headline/', '補助金・助成金・支援制度', 'daily', '中小企業向け支援情報の最新ヘッドライン'),
  ('Jグランツ（補助金申請システム）', 'https://jgrants.go.jp/', '補助金・助成金・支援制度', 'weekly', '国の補助金公募情報'),
  ('北海道経済部 創業支援', 'https://www.pref.hokkaido.lg.jp/kz/csk/', '補助金・助成金・支援制度', 'weekly', '北海道の創業・起業支援情報'),
  ('とかち財団 公式サイト', 'https://www.tokachi-zaidan.jp/', 'とかち財団の取り組み', 'daily', '財団自体の活動情報')
ON CONFLICT DO NOTHING;
