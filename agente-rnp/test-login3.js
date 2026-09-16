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

  // Interceptar responses para ver qué pasa
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('rnpdigital')) {
      console.log(`[NET] ${res.status()} ${url.substring(0,80)}`);
    }
  });

  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2', timeout:30000 });

  await page.type('input[type="text"][name*="correo"]', EMAIL, { delay:60 });
  await page.type('input[type="password"]', PASS, { delay:60 });

  // Esperar que no haya modal de sesión activa primero
  await sleep(500);

  // Click en botón "Ingresar"
  console.log('Clickeando botón Ingresar...');
  await page.click('input[value="Ingresar"]');

  // Esperar respuesta AJAX (el A4J usa meta redirect)
  await sleep(6000);

  const url = page.url();
  console.log('URL actual:', url);

  // Revisar si hay modal de sesión activa
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.rich-mpnl-body, .modalSesionActiva, [id*="modalSesion"]');
    return modal ? modal.textContent.substring(0, 200) : null;
  });
  
  if (modalVisible) {
    console.log('Modal detectado:', modalVisible);
    // Click en "Sí, continuar"
    await page.click('input[name*="j_id34"]').catch(() => {});
    await sleep(3000);
  }

  // Verificar estado
  const pageTitle = await page.title();
  console.log('Título página:', pageTitle);

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Contenido:', bodyText);
  
  await page.screenshot({ path:'login-resultado.png' });
  console.log('Screenshot guardado');

  await browser.close();
}

test().catch(e => { console.error('ERROR:', e.message); });
