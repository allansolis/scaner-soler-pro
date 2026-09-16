const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const EMAIL  = 'allann.solis.94@gmail.com';
const PASS   = 'sDS!matclfO!1';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  console.log('Iniciando Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox','--window-size=1280,900'],
    defaultViewport: { width:1280, height:900 }
  });

  const page = await browser.newPage();

  // Login
  console.log('Abriendo login...');
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2', timeout:30000 });
  await page.screenshot({ path:'paso1-login.png' });

  await page.waitForSelector('input[name*="correo"]', { timeout:15000 });
  await page.click('input[name*="correo"]', { clickCount:3 });
  await page.type('input[name*="correo"]', EMAIL, { delay:50 });
  await page.click('input[name*="pass"]', { clickCount:3 });
  await page.type('input[name*="pass"]', PASS, { delay:50 });

  // Encontrar botón login
  const allInputs = await page.$$('input');
  for (const inp of allInputs) {
    const t = await page.evaluate(e => e.type, inp);
    const n = await page.evaluate(e => e.name||'', inp);
    console.log(`Input: type=${t} name=${n}`);
  }

  // Click submit - imagen naranja o input con onclick AJAX
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    for (const inp of inputs) {
      if (inp.onclick && inp.onclick.toString().includes('AJAX') && !inp.value.includes('Verificar')) {
        console.log('Encontrado btn login:', inp.name);
        inp.click();
        return;
      }
    }
    // Fallback: click image
    const img = document.querySelector('input[type="image"]');
    if (img) img.click();
  });

  await sleep(4000);
  await page.screenshot({ path:'paso2-post-login.png' });
  console.log('URL post-login:', page.url());

  // Mostrar todos los links del menú
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim().substring(0,60),
      href: a.href
    })).filter(l => l.text.length > 0);
  });
  console.log('Links encontrados:');
  links.slice(0,30).forEach(l => console.log(' -', l.text, '→', l.href.substring(0,80)));

  await browser.close();
}

test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
