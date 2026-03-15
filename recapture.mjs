import puppeteer from 'puppeteer';
import path from 'path';

const THUMBS_DIR = path.resolve('thumbs');

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1.5 }
  });

  // ── 名刺バトラー（黒背景デザインに戻した）──
  {
    const slug = 'meishi-battler';
    const url = 'https://meishi-battler.vercel.app';
    const filepath = path.join(THUMBS_DIR, `${slug}.webp`);
    console.log(`📸 ${slug} — ${url}`);

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // コンテンツをセンタリング
    await page.addStyleTag({
      content: `
        body {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 100vh !important;
        }
        main, #__next > div, #__next > main {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
        }
      `
    });
    await new Promise(r => setTimeout(r, 500));

    await page.screenshot({ path: filepath, type: 'webp', quality: 85 });
    await page.close();
    console.log(`✅ ${slug} recaptured`);
  }

  // ── KAFUN PARAPARA（ボタンクリック後にギャルが表示される）──
  {
    const slug = 'kafunparapara';
    const url = 'https://kafunparapara.vercel.app';
    const filepath = path.join(THUMBS_DIR, `${slug}.webp`);
    console.log(`📸 ${slug} — ${url}`);

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // 「花粉量をチェックする」ボタンをクリック
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('チェック'));
        if (btn) btn.click();
      });
      // メインコンテンツ＋動画の読み込みを待つ
      await new Promise(r => setTimeout(r, 4000));
    } catch (err) {
      console.log(`⚠️ Button click failed: ${err.message}`);
    }

    await page.screenshot({ path: filepath, type: 'webp', quality: 85 });
    await page.close();
    console.log(`✅ ${slug} recaptured`);
  }

  await browser.close();
}

main();
