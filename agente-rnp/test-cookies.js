const puppeteer = require('puppeteer-core');

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

  // Capturar todas las peticiones POST
  page.on('request', req => {
    if (req.method() === 'POST') {
      const postData = req.postData() || '';
      console.log('[POST]', req.url().substring(0,80));
      console.log('  Body:', postData.substring(0,300));
    }
  });

  page.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('login')) {
      const headers = res.headers();
      console.log('[RESP STATUS]', res.status());
      console.log('[RESP SET-COOKIE]', headers['set-cookie'] || 'ninguna');
      const body = await res.text().catch(() => '');
      console.log('[RESP BODY 600]', body.substring(0,600));
    }
  });

  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });

  // Escribir credenciales via evaluate (más confiable)
  await page.evaluate((email, pass) => {
    const correoInput = document.querySelector('input[type="text"]');
    const passInput   = document.querySelector('input[type="password"]');
    if (correoInput) { correoInput.value = email; correoInput.dispatchEvent(new Event('change')); }
    if (passInput)   { passInput.value   = pass;  passInput.dispatchEvent(new Event('change')); }
  }, EMAIL, PASS);

  await sleep(500);

  // Verificar valores escritos
  const vals = await page.evaluate(() => ({
    correo: document.querySelector('input[type="text"]')?.value,
    pass: document.querySelector('input[type="password"]')?.value?.length
  }));
  console.log('Valores en form:', vals);

  // Click via evaluate (dispara el onclick nativamente)
  await page.evaluate(() => {
    const btn = document.querySelector('input[value="Ingresar"]');
    if (btn) {
      console.log('Encontrado botón:', btn.name, btn.value);
      btn.click();
    } else {
      console.log('Botón no encontrado!');
    }
  });

  console.log('Esperando respuesta...');
  await sleep(8000);

  const cookiesAfter = await page.cookies();
  console.log('Cookies después login:', cookiesAfter.map(c => `${c.name}=${c.value.substring(0,30)}`).join('; '));
  
  const url = page.url();
  console.log('URL:', url);

  // Leer el menú actual
  const menuItems = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.menuLeft li a, .leftMenu a, #menu a, td a'))
      .map(a => a.textContent.trim()).filter(t => t)
  );
  console.log('Items menu sidebar:', menuItems.slice(0,15));

  await page.screenshot({ path:'test-login-final.png' });
  await browser.close();
}

test().catch(e => console.error('ERROR:', e.message));
