-- LAND情報発信統合システム 巡回サイト追加SQL
-- ※ url の重複チェックをWHERE NOT EXISTSで行うバージョン

INSERT INTO collection_sources (name, url, category, crawl_frequency, is_active, notes)
SELECT name, url, category, crawl_frequency, is_active, notes FROM (VALUES
  ('中小企業庁 補助金・支援情報', 'https://www.chusho.meti.go.jp/keiei/index.html', '補助金・助成金・支援制度', 'daily', true, '経済産業省中小企業庁。補助金・支援情報の最新情報'),
  ('J-Net21 補助金・助成金', 'https://j-net21.smrj.go.jp/snavi/index.html', '補助金・助成金・支援制度', 'daily', true, '中小企業基盤整備機構。補助金・助成金情報を網羅'),
  ('ミラサポplus', 'https://mirasapo-plus.go.jp/', '補助金・助成金・支援制度', 'daily', true, '中小企業向け補助金・給付金情報の政府統合ポータル'),
  ('ものづくり補助金', 'https://portal.monodukuri-hojo.jp/', '補助金・助成金・支援制度', 'daily', true, 'ものづくり・商業・サービス生産性向上促進補助金'),
  ('IT導入補助金', 'https://www.it-hojo.jp/', '補助金・助成金・支援制度', 'daily', true, 'IT導入補助金公式サイト'),
  ('小規模事業者持続化補助金', 'https://s23.jizokukahojokin.info/', '補助金・助成金・支援制度', 'daily', true, '小規模事業者持続化補助金公式'),
  ('事業再構築補助金', 'https://jigyou-saikouchiku.go.jp/', '補助金・助成金・支援制度', 'daily', true, '事業再構築補助金公式'),
  ('農林水産省 補助金', 'https://www.maff.go.jp/j/supply/hozyo/', '補助金・助成金・支援制度', 'weekly', true, '農林水産省の補助金・助成金情報（十勝の農業関連）'),
  ('北海道経済部 企業支援', 'https://www.pref.hokkaido.lg.jp/kz/kki/index.html', '補助金・助成金・支援制度', 'daily', true, '北海道庁 経済部 企業支援・補助金情報'),
  ('北海道中小企業総合支援センター', 'https://www.hsc.or.jp/', '補助金・助成金・支援制度', 'daily', true, '北海道中小企業総合支援センター。支援情報・セミナー'),
  ('北海道スタートアップ支援', 'https://www.pref.hokkaido.lg.jp/kz/sss/startup.html', '補助金・助成金・支援制度', 'weekly', true, '北海道のスタートアップ・創業支援'),
  ('帯広市 産業振興', 'https://www.city.obihiro.hokkaido.jp/sangyo/index.html', '補助金・助成金・支援制度', 'daily', true, '帯広市の産業振興・補助金情報'),
  ('帯広市 創業支援', 'https://www.city.obihiro.hokkaido.jp/sangyo/shoko/sougyoushien.html', '補助金・助成金・支援制度', 'weekly', true, '帯広市の創業支援・補助金'),
  ('十勝振興局 産業振興部', 'https://www.tokachi.pref.hokkaido.lg.jp/ss/srk/index.html', '補助金・助成金・支援制度', 'weekly', true, '十勝振興局の産業・経済関連情報'),
  ('北海道経済産業局', 'https://www.hkd.meti.go.jp/', '補助金・助成金・支援制度', 'daily', true, '北海道経済産業局の補助金・支援情報'),
  ('日本政策金融公庫 北海道', 'https://www.jfc.go.jp/n/finance/search/hokkaido.html', '補助金・助成金・支援制度', 'weekly', true, '日本公庫の創業融資・北海道向け情報'),
  ('帯広商工会議所', 'https://www.obihiro.or.jp/', 'イベント・セミナー', 'daily', true, '帯広商工会議所。セミナー・補助金情報'),
  ('十勝産業振興センター', 'https://www.toshinkn.or.jp/', 'イベント・セミナー', 'weekly', true, '十勝産業振興センターのイベント・支援情報'),
  ('北海道ビジネスEXPO', 'https://www.hokkaido-expo.com/', 'イベント・セミナー', 'weekly', true, '北海道最大のビジネスマッチングイベント'),
  ('北海道よろず支援拠点', 'https://hokkaido-yorozu.go.jp/', 'イベント・セミナー', 'weekly', true, '北海道よろず支援拠点。無料相談・セミナー情報'),
  ('Startup Weekend 北海道', 'https://startupweekend.org/', 'イベント・セミナー', 'monthly', true, 'スタートアップウィークエンド（学生・社会人向け）'),
  ('十勝総合振興局', 'https://www.tokachi.pref.hokkaido.lg.jp/', 'お知らせ・募集', 'weekly', true, '十勝総合振興局の各種情報'),
  ('公益財団法人とかち財団', 'https://www.tokachi-foundation.or.jp/', 'LANDの取り組み', 'daily', true, 'とかち財団の公式サイト。LAND関連情報・財団の活動'),
  ('とかち財団 お知らせ', 'https://www.tokachi-foundation.or.jp/news/', 'LANDの取り組み', 'daily', true, 'とかち財団のニュース・お知らせ'),
  ('フードバレーとかち', 'https://www.foodvalley.jp/', 'LANDの取り組み', 'weekly', true, '十勝フードバレー構想。農業・食産業の最新情報'),
  ('創業手帳', 'https://sogyotecho.jp/news/', 'コラム・ノウハウ', 'weekly', true, '創業・起業の実践情報。補助金情報も充実'),
  ('ドリームゲート', 'https://www.dreamgate.gr.jp/contents', 'コラム・ノウハウ', 'weekly', true, '起業家支援ポータル。各種セミナー・相談情報'),
  ('STARTUP DB', 'https://startup-db.com/articles', 'コラム・ノウハウ', 'weekly', true, 'スタートアップ情報データベース。起業・資金調達の事例')
) AS t(name, url, category, crawl_frequency, is_active, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM collection_sources cs WHERE cs.url = t.url
);

-- 追加結果確認
SELECT COUNT(*) as 合計件数,
       SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as 有効件数
FROM collection_sources;
