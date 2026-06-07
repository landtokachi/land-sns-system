-- LAND情報発信統合システム 巡回サイト追加SQL
-- Supabase SQL Editor で実行してください
-- 既存データと重複しないよう ON CONFLICT DO NOTHING を使用

INSERT INTO collection_sources (name, url, category, crawl_frequency, is_active, notes)
VALUES

-- ===== 国（中央省庁・政府系） =====
('中小企業庁 補助金・支援情報', 'https://www.chusho.meti.go.jp/keiei/index.html', '補助金・助成金・支援制度', 'daily', true, '経済産業省中小企業庁のメインページ。補助金・支援情報の最新情報'),
('J-Net21 補助金・助成金', 'https://j-net21.smrj.go.jp/snavi/index.html', '補助金・助成金・支援制度', 'daily', true, '中小企業基盤整備機構。補助金・助成金情報を網羅'),
('ミラサポplus', 'https://mirasapo-plus.go.jp/', '補助金・助成金・支援制度', 'daily', true, '中小企業向け補助金・給付金情報の政府統合ポータル'),
('ものづくり補助金', 'https://portal.monodukuri-hojo.jp/', '補助金・助成金・支援制度', 'daily', true, 'ものづくり・商業・サービス生産性向上促進補助金'),
('IT導入補助金', 'https://www.it-hojo.jp/', '補助金・助成金・支援制度', 'daily', true, 'IT導入補助金公式サイト'),
('小規模事業者持続化補助金', 'https://s23.jizokukahojokin.info/', '補助金・助成金・支援制度', 'daily', true, '小規模事業者持続化補助金公式'),
('事業再構築補助金', 'https://jigyou-saikouchiku.go.jp/', '補助金・助成金・支援制度', 'daily', true, '事業再構築補助金公式'),
('創業・起業支援 内閣府', 'https://www.kantei.go.jp/jp/headline/seicho_senryaku/kigyoka.html', '補助金・助成金・支援制度', 'weekly', true, '内閣府の創業・起業支援策'),
('農林水産省 補助金', 'https://www.maff.go.jp/j/supply/hozyo/', '補助金・助成金・支援制度', 'weekly', true, '農林水産省の補助金・助成金情報（十勝の農業関連）'),

-- ===== 北海道（道庁・道の機関） =====
('北海道経済部 企業支援', 'https://www.pref.hokkaido.lg.jp/kz/kki/index.html', '補助金・助成金・支援制度', 'daily', true, '北海道庁 経済部 企業支援・補助金情報'),
('北海道補助金・助成金一覧', 'https://www.pref.hokkaido.lg.jp/kz/kki/subsidy.html', '補助金・助成金・支援制度', 'daily', true, '北海道の補助金・助成金一覧'),
('北海道スタートアップ支援', 'https://www.pref.hokkaido.lg.jp/kz/sss/startup.html', '補助金・助成金・支援制度', 'weekly', true, '北海道のスタートアップ・創業支援'),
('北海道中小企業総合支援センター', 'https://www.hsc.or.jp/', '補助金・助成金・支援制度', 'daily', true, '北海道中小企業総合支援センター。支援情報・セミナー'),
('北海道立総合研究機構 農業試験場', 'https://www.hro.or.jp/', 'お知らせ・募集', 'weekly', true, '十勝の農業・産業技術関連情報'),
('北海道創業支援 Do Business', 'https://www.do-shigoto.com/', '補助金・助成金・支援制度', 'weekly', true, '北海道の創業支援情報'),

-- ===== 十勝・帯広（地域行政・支援機関） =====
('帯広市 産業振興', 'https://www.city.obihiro.hokkaido.jp/sangyo/index.html', '補助金・助成金・支援制度', 'daily', true, '帯広市の産業振興・補助金情報'),
('帯広市 創業支援', 'https://www.city.obihiro.hokkaido.jp/sangyo/shoko/sougyoushien.html', '補助金・助成金・支援制度', 'weekly', true, '帯広市の創業支援・補助金'),
('十勝振興局 産業振興部', 'https://www.tokachi.pref.hokkaido.lg.jp/ss/srk/index.html', '補助金・助成金・支援制度', 'weekly', true, '十勝振興局の産業・経済関連情報'),
('帯広商工会議所', 'https://www.obihiro.or.jp/', 'イベント・セミナー', 'daily', true, '帯広商工会議所。セミナー・補助金情報'),
('十勝総合振興局', 'https://www.tokachi.pref.hokkaido.lg.jp/', 'お知らせ・募集', 'weekly', true, '十勝総合振興局の各種情報'),
('北海道銀行 ほくぎんサポート', 'https://www.hokkaido-np.co.jp/', 'イベント・セミナー', 'weekly', true, '北海道銀行の創業・事業支援情報'),
('帯広信用金庫', 'https://www.obihiro-shinkin.co.jp/', 'イベント・セミナー', 'weekly', true, '帯広信金の経営支援・イベント情報'),
('十勝産業振興センター', 'https://www.toshinkn.or.jp/', 'イベント・セミナー', 'weekly', true, '十勝産業振興センターのイベント・支援情報'),
('帯広・十勝スタートアップ', 'https://obihiro-startup.jp/', 'イベント・セミナー', 'weekly', true, '帯広・十勝のスタートアップ情報'),

-- ===== とかち財団・LAND関連 =====
('公益財団法人とかち財団', 'https://www.tokachi-foundation.or.jp/', 'LANDの取り組み', 'daily', true, 'とかち財団の公式サイト。LAND関連情報・財団の活動'),
('とかち財団 お知らせ', 'https://www.tokachi-foundation.or.jp/news/', 'LANDの取り組み', 'daily', true, 'とかち財団のニュース・お知らせ'),

-- ===== 創業・スタートアップ（全国） =====
('STARTUP DB', 'https://startup-db.com/articles', 'コラム・ノウハウ', 'weekly', true, 'スタートアップ情報データベース。起業・資金調達の事例'),
('起業tv', 'https://kigyou.tv/news/', 'コラム・ノウハウ', 'weekly', true, '起業・スタートアップ関連ニュース'),
('創業手帳', 'https://sogyotecho.jp/news/', 'コラム・ノウハウ', 'weekly', true, '創業・起業の実践情報。補助金情報も充実'),
('ドリームゲート', 'https://www.dreamgate.gr.jp/contents', 'コラム・ノウハウ', 'weekly', true, '起業家支援ポータル。各種セミナー・相談情報'),
('BIZREACH CAMPUS 起業', 'https://br-campus.jp/articles', 'コラム・ノウハウ', 'weekly', false, '学生起業・インターン情報（必要に応じて有効化）'),

-- ===== よろず支援拠点 =====
('北海道よろず支援拠点', 'https://hokkaido-yorozu.go.jp/', 'イベント・セミナー', 'weekly', true, '北海道よろず支援拠点。無料相談・セミナー情報'),

-- ===== 金融機関・VC（北海道系） =====
('日本政策金融公庫 北海道', 'https://www.jfc.go.jp/n/finance/search/hokkaido.html', '補助金・助成金・支援制度', 'weekly', true, '日本公庫の創業融資・北海道向け情報'),
('北海道経済産業局', 'https://www.hkd.meti.go.jp/', '補助金・助成金・支援制度', 'daily', true, '北海道経済産業局の補助金・支援情報'),

-- ===== 農業・食・地域特化 =====
('フードバレーとかち', 'https://www.foodvalley.jp/', 'LANDの取り組み', 'weekly', true, '十勝フードバレー構想。農業・食産業の最新情報'),
('十勝農業協同組合連合会(JA十勝)', 'https://www.ja-tokachi.or.jp/', 'お知らせ・募集', 'weekly', false, 'JA十勝の農業支援情報（必要に応じて有効化）'),
('帯広畜産大学 産学連携', 'https://www.obihiro.ac.jp/research/', '学生起業支援', 'monthly', false, '帯広畜産大学の産学連携・研究情報'),

-- ===== イベント・ビジネスマッチング =====
('北海道ビジネスEXPO', 'https://www.hokkaido-expo.com/', 'イベント・セミナー', 'weekly', true, '北海道最大のビジネスマッチングイベント'),
('Startup Weekend 北海道', 'https://startupweekend.org/', 'イベント・セミナー', 'monthly', true, 'スタートアップウィークエンド（学生・社会人向け）'),

-- ===== コワーキング・シェアオフィス関連 =====
('JICA北海道', 'https://www.jica.go.jp/hokkaido/', 'お知らせ・募集', 'monthly', false, 'JICA北海道のイベント・研修情報'),
('北海道経済連合会', 'https://www.dokeiren.gr.jp/news/', 'お知らせ・募集', 'weekly', false, '北海道経済界のニュース')

ON CONFLICT (url) DO NOTHING;

-- 確認クエリ
SELECT COUNT(*) as total, is_active, crawl_frequency
FROM collection_sources
GROUP BY is_active, crawl_frequency
ORDER BY is_active DESC, crawl_frequency;
