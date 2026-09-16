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

  // Login
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });
  await page.evaluate((e,p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(4000);
  await page.click('input[value*="continuar"]').catch(() => {});
  await sleep(3000);

  // Navegar a Consultas Gratuitas > Consulta por Número de Finca
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas')?.click();
  });
  await sleep(3000);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consulta por Número de Finca')?.click();
  });
  await sleep(3000);
  console.log('Formulario URL:', page.url());

  // Ver TODOS los inputs y botones del formulario
  const allElements = await page.evaluate(() => {
    const elems = Array.from(document.querySelectorAll('input, button, select'));
    return elems.map(e => ({
      tag: e.tagName,
      type: e.type || '',
      name: e.name || '',
      id: e.id || '',
      value: e.value ? e.value.substring(0,50) : '',
      src: e.src ? e.src.substring(0,80) : '',
      class: e.className ? e.className.substring(0,50) : '',
      onclick: e.onclick ? e.onclick.toString().substring(0,100) : ''
    })).filter(e => e.type !== 'hidden' || e.name.includes('param'));
  });
  console.log('TODOS LOS ELEMENTOS DEL FORM:');
  allElements.forEach(e => console.log(' ', JSON.stringify(e)));

  // Llenar forma y buscar botón consultar
  await page.select('select[name="params:j_id268"]', '1');
  await sleep(300);
  await page.click('input[name="params:finca"]', { clickCount:3 });
  await page.type('input[name="params:finca"]', '201485', { delay:40 });
  await sleep(300);

  // Tomar screenshot antes de consultar
  await page.screenshot({ path:'form-filled.png' });

  // Buscar botón Consultar (el naranja)
  const btnFound = await page.evaluate(() => {
    // Buscar image input o button
    const all = Array.from(document.querySelectorAll('input, button'));
    for (const el of all) {
      const info = `type:${el.type} name:${el.name} val:${el.value} src:${el.src||''} class:${el.className}`;
      if (el.type === 'image' || el.value.includes('Consult') || el.className.includes('consult')) {
        el.click();
        return 'clicked: ' + info;
      }
    }
    // Intentar el botón naranja por clase CSS
    const orangeBtn = document.querySelector('.buttonOrange, .btn-orange, input[class*="orange"], input[class*="Orange"]');
    if (orangeBtn) { orangeBtn.click(); return 'orange btn clicked'; }
    return null;
  });
  console.log('\nBotón consultar:', btnFound);

  if (!btnFound) {
    // Hacer zoom en el área del formulario para ver el botón
    await page.screenshot({ path:'form-zoom.png' });
    
    // Intentar submit del form params
    await page.evaluate(() => {
      const form = document.querySelector('form[id="params"]') || 
                   Array.from(document.querySelectorAll('form')).find(f => f.id.includes('param'));
      if (form) {
        const sb = form.querySelector('input[type="submit"]');
        if (sb) sb.click();
      }
    });
  }

  await sleep(5000);
  await page.screenshot({ path:'resultado-finca.png' });
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log('\nURL resultado:', page.url());
  console.log('Texto resultado (primeros 800):');
  console.log(text.substring(0,800));

  await browser.close();
}

test().catch(e => console.error('ERROR:', e.message));
