// Génère les images de partage (Open Graph, données structurées) depuis tools/partage.html.
//   npx --yes -p playwright node tools/build-partage.mjs   (après : npx playwright install chromium)
// Nécessite un serveur local à la racine du site : python3 -m http.server 8064
import { chromium } from 'playwright';

const formats = { og: [1200, 630], '16x9': [1200, 675], '4x3': [1200, 900], '1x1': [1200, 1200] };
const navigateur = await chromium.launch();
for (const [f, [l, h]] of Object.entries(formats)) {
  const page = await navigateur.newPage({ viewport: { width: l, height: h } });
  await page.goto(`http://localhost:8064/tools/partage.html?f=${f}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `img/partage-${f}.jpg`, type: 'jpeg', quality: 84 });
  await page.close();
}
await navigateur.close();
