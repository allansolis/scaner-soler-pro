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

  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });

  // Llenar form
  await page.evaluate((e, p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await sleep(300);

  // Click login
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(4000);

  // Guardar HTML completo post-login
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync('post-login-full.html', html);
  console.log('HTML guardado:', html.length, 'chars');

  // Buscar modal de sesión activa
  const modalInfo = await page.evaluate(() => {
    // Ver si hay un panel modal de sesión activa visible
    const panel = document.querySelector('[id*="modalSesionActiva"]');
    const openedState = document.querySelector('#modalSesionActivaOpenedState');
    return {
      panelExists: !!panel,
      panelHTML: panel ? panel.outerHTML.substring(0,500) : null,
      openedStateValue: openedState ? openedState.value : null
    };
  });
  console.log('Modal sesión activa:', JSON.stringify(modalInfo, null, 2));

  // Si hay modal de sesión activa, hacer click en "Sí, continuar"
  if (modalInfo.openedStateValue === 'true' || modalInfo.panelExists) {
    console.log('→ Detectado modal sesión activa, clickando Sí continuar...');
    await page.click('input[name*="j_id34"], input[value*="continuar"], input[value*="Sí"]').catch(e => console.log('Click error:', e.message));
    await sleep(5000);
  }

  // Verificar estado
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0,200));
  console.log('Body post:', bodyText);

  // Ver si tenemos el menú autenticado
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim()).filter(t => t.length > 2 && t.length < 60)
  );
  console.log('Todos los links:', links);

  await page.screenshot({ path:'debug-final.png' });
  await browser.close();
}

test().catch(e => console.error('ERROR:', e.message));
