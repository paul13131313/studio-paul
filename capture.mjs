import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// ── CSVをfetch ──
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK9SAFKJrv3hyi6mulfb3HAaiAYmu0dKx8MOw5gwX4LJtOanKVMoti5DoDVRwix3DHsKX9KqsBF9si/pub?output=csv';

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cols.push(current.trim());
    if (cols[0] && cols[1]?.startsWith('http')) {
      rows.push({ title: cols[0], url: cols[1], bg: cols[5] || '' });
    }
  }
  return rows;
}

function slugify(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/paul13131313\.github\.io\//, '')
    .replace(/\.vercel\.app\/?/, '')
    .replace(/\.com\/?/, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'item';
}

// ── スキップリスト（CLIツールやスクショ不可なもの） ──
const SKIP_URLS = [
  'paul13131313.github.io/autonote',
];

const THUMBS_DIR = path.resolve('thumbs');
if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR);

async function main() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const items = parseCSV(text);

  console.log(`📋 ${items.length} items found`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const results = [];

  for (let i = 0; i < items.length; i++) {
    const { title, url } = items[i];
    const slug = slugify(url);
    const filepath = path.join(THUMBS_DIR, `${slug}.webp`);

    // 既にスクショがあればスキップ（再実行対応）
    if (fs.existsSync(filepath)) {
      console.log(`⏭  [${i+1}/${items.length}] ${title} — already exists`);
      results.push({ title, slug, status: 'exists' });
      continue;
    }

    // スキップ対象
    if (SKIP_URLS.some(s => url.includes(s))) {
      console.log(`⏭  [${i+1}/${items.length}] ${title} — skipped`);
      results.push({ title, slug, status: 'skipped' });
      continue;
    }

    try {
      console.log(`📸 [${i+1}/${items.length}] ${title} — ${url}`);
      const page = await browser.newPage();

      // タイムアウト長めに、ネットワークがアイドルになるまで待つ
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

      // 追加で少し待つ（アニメーション・フォント読み込み等）
      await new Promise(r => setTimeout(r, 2000));

      // ダイアログやモーダルを閉じる試み（あれば）
      try {
        await page.keyboard.press('Escape');
      } catch {}

      await page.screenshot({ path: filepath, type: 'webp', quality: 80 });
      await page.close();

      results.push({ title, slug, status: 'ok' });
    } catch (err) {
      console.error(`❌ [${i+1}/${items.length}] ${title} — ${err.message}`);
      results.push({ title, slug, status: 'error', error: err.message });
    }
  }

  await browser.close();

  // 結果サマリー
  const ok = results.filter(r => r.status === 'ok' || r.status === 'exists').length;
  const errors = results.filter(r => r.status === 'error');
  console.log(`\n✅ ${ok}/${items.length} captured`);
  if (errors.length) {
    console.log(`❌ Errors:`);
    errors.forEach(e => console.log(`   ${e.title}: ${e.error}`));
  }

  // slug マッピングを保存
  fs.writeFileSync('thumbs/manifest.json', JSON.stringify(
    results.filter(r => r.status === 'ok' || r.status === 'exists')
      .map(r => r.slug),
    null, 2
  ));
}

main();
