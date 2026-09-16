const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const EMAIL  = 'allann.solis.94@gmail.com';
const PASS   = 'sDS!matclfO!1';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox','--window-size=1280,900','--disable-extensions'],
    defaultViewport: { width:1280, height:900 }
  });
  const page = await browser.newPage();

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('login.jspx') && res.request().method() === 'POST') {
      try {
        const body = await res.text();
        // Buscar mensaje de error
        const msgMatch = body.match(/rich-message[^>]*>.*?<\/span>/s);
        if (msgMatch) console.log('[MENSAJE]', msgMatch[0].replace(/<[^>]+>/g,'').trim());
        
        // Buscar redirect
        const redirMatch = body.match(/Location['":\s]*([^"'\s<]+)/);
        if (redirMatch) console.log('[REDIRECT]', redirMatch[1]);
      } catch(e) {}
    }
  });

  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2', timeout:30000 });
  await page.type('input[type="text"][name*="correo"]', EMAIL, { delay:60 });
  await page.type('input[type="password"]', PASS, { delay:60 });
  await page.click('input[value="Ingresar"]');
  await sleep(5000);

  // Revisar si hay modal de sesion activa visible
  const modalContent = await page.evaluate(() => {
    const modals = document.querySelectorAll('[id*="modalSesion"], .rich-mpnl-body, .rich-modalpanel');
    return Array.from(modals).map(m => ({
      id: m.id,
      visible: m.style.display !== 'none' && m.style.visibility !== 'hidden',
      text: m.textContent.trim().substring(0,200)
    }));
  });
  console.log('Modales:', JSON.stringify(modalContent, null, 2));

  // Ver mensajes de error en pantalla
  const msgs = await page.evaluate(() => {
    const spans = document.querySelectorAll('span.rich-message, span[id*="j_id25"], .errorMessage');
    return Array.from(spans).map(s => s.textContent.trim()).filter(t => t.length > 0);
  });
  console.log('Mensajes en pantalla:', msgs);

  await page.screenshot({ path:'login-debug.png' });
  await browser.close();
}

test().catch(e => { console.error('ERROR:', e.message); });
