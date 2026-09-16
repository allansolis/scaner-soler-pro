const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const EMAIL  = 'allann.solis.94@gmail.com';
const PASS   = 'sDS!matclfO!1';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox','--window-size=1280,900'],
    defaultViewport: { width:1280, height:900 }
  });
  const page = await browser.newPage();

  // LOGIN
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });
  await page.evaluate((e,p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(4000);
  await page.click('input[value*="continuar"]').catch(() => {});
  await sleep(4000);
  console.log('✅ Login OK');

  // Guardar HTML completo para analizar menú
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.href,
      id: a.id,
      onclick: (a.onclick || '').toString().substring(0,100)
    })).filter(l => l.text.length > 1 && l.text.length < 80)
  );
  console.log('TODOS LOS LINKS:');
  links.forEach(l => console.log(' -', JSON.stringify(l)));

  // Click en Consultas Gratuitas (expande el submenu)
  await page.evaluate(() => {
    const l = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas');
    if (l) l.click();
  });
  await sleep(2000);

  // Ver links después de expandir
  const links2 = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.href,
      visible: a.offsetParent !== null
    })).filter(l => l.text.length > 1 && l.text.length < 80 && l.visible)
  );
  console.log('\nLINKS VISIBLES DESPUÉS DE CLICK:');
  links2.forEach(l => console.log(' -', l.text, '→', l.href.substring(0,80)));

  await page.screenshot({ path:'step-menu-expandido.png' });
  await browser.close();
}

test().catch(e => console.error('ERROR:', e.message));
