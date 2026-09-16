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

  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2', timeout:30000 });

  // Completar formulario
  await page.waitForSelector('input[type="text"][name*="correo"]');
  await page.focus('input[type="text"][name*="correo"]');
  await page.keyboard.type(EMAIL, { delay:50 });

  await page.focus('input[type="password"]');
  await page.keyboard.type(PASS, { delay:50 });

  // El botón login es type=button (no submit), con onclick AJAX
  // Obtener el onclick para ver cómo funciona
  const btnInfo = await page.evaluate(() => {
    const btn = document.querySelector('input[type="button"]');
    return btn ? { name: btn.name, value: btn.value, onclick: (btn.onclick || '').toString().substring(0,200) } : null;
  });
  console.log('Botón login:', JSON.stringify(btnInfo));

  // Hacer click en el botón
  await page.click('input[type="button"]');
  
  // Esperar redirección o cambio de página
  await Promise.race([
    page.waitForNavigation({ waitUntil:'networkidle2', timeout:10000 }),
    sleep(8000)
  ]).catch(() => {});

  const url = page.url();
  console.log('URL después del login:', url);
  await page.screenshot({ path:'login-test.png' });

  // Verificar si hay menú
  const menuText = await page.evaluate(() => {
    const menu = document.querySelector('.menu, #menu, nav, .sidebar, .menuLeft, .left-menu');
    return menu ? menu.textContent.substring(0,300) : 'No se encontró menú';
  });
  console.log('Menú:', menuText.substring(0,200));

  await browser.close();
}

test().catch(e => { console.error('ERROR:', e.message); });
