const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function main() {
  const logoPath = path.resolve('src/assets/logo.svg');
  const logoSvg = fs.readFileSync(logoPath, 'utf8');
  const logoData = `data:image/svg+xml;base64,${Buffer.from(logoSvg, 'utf8').toString('base64')}`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        background: linear-gradient(180deg, #f8fcff 0%, #eaf4fb 100%);
        font-family: Arial, sans-serif;
      }
      .wrap {
        width: 1200px;
        height: 630px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .card {
        width: 1040px;
        height: 430px;
        background: #ffffff;
        border: 1px solid #dbe6f0;
        border-radius: 22px;
        box-shadow: 0 18px 45px rgba(10, 47, 76, 0.14);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .logo {
        width: 760px;
        max-width: 90%;
        height: auto;
      }
      .sub {
        position: absolute;
        bottom: 64px;
        left: 0;
        right: 0;
        text-align: center;
        color: #35556e;
        font-size: 28px;
        font-weight: 600;
        letter-spacing: 0.2px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <img class="logo" src="${logoData}" alt="NOVAMOTIS Logo" />
      </div>
      <div class="sub">Foerdertechnik Konfigurator</div>
    </div>
  </body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.screenshot({ path: path.resolve('public/og-image-logo-20260413.jpg'), type: 'jpeg', quality: 92 });
  await browser.close();

  console.log('Created public/og-image-logo-20260413.jpg');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
