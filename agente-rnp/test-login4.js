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

  // Interceptar respuesta del AJAX login
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('login.jspx') && res.request().method() === 'POST') {
      try {
        const body = await res.text();
        console.log('[AJAX RESP]', body.substring(0, 500));
      } catch(e) {}
    }
  });

  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2', timeout:30000 });

  await page.type('input[type="text"][name*="correo"]', EMAIL, { delay:60 });
  await page.type('input[type="password"]', PASS, { delay:60 });

  await page.click('input[value="Ingresar"]');
  await sleep(5000);

  // Ver si hay mensaje de error en la página
  const errorMsg = await page.evaluate(() => {
    const errElements = document.querySelectorAll('.error, .errorMessage, .alert, span[class*="error"]');
    return Array.from(errElements).map(e => e.textContent.trim()).join(' | ');
  });
  console.log('Mensajes de error:', errorMsg || 'ninguno');

  // Todo el texto de la página
  const allText = await page.evaluate(() => document.body.innerText);
  const lines = allText.split('\n').filter(l => l.trim());
  const relevant = lines.filter(l => 
    l.includes('error') || l.includes('Error') || l.includes('incorrecto') || 
    l.includes('contraseña') || l.includes('Bienvenido') || l.includes('inválido')
  );
  console.log('Líneas relevantes:', relevant.join('\n'));

  await page.screenshot({ path:'login-error-check.png' });
  await browser.close();
}

test().catch(e => { console.error('ERROR:', e.message); });
