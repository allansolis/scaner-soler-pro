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

  // Login + Navigate
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });
  await page.evaluate((e,p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(4000);
  await page.click('input[value*="continuar"]').catch(() => {});
  await sleep(3000);
  await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas')?.click());
  await sleep(3000);
  await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consulta por Número de Finca')?.click());
  await sleep(3000);

  // Guardar HTML completo del formulario
  const fullHTML = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync('form-completo.html', fullHTML);
  console.log('HTML del formulario guardado:', fullHTML.length, 'chars');

  // Buscar el botón consultar en TODO el HTML
  const consultarBtns = fullHTML.match(/<[^>]*(consult|Consult|CONSULT)[^>]*>/g);
  console.log('\nElementos con "consult":', consultarBtns?.join('\n') || 'ninguno');

  // Buscar imágenes con "consult" 
  const imgMatches = fullHTML.match(/<img[^>]*(consult|boton|btn|button)[^>]*>/gi);
  console.log('\nImágenes con consult/boton:', imgMatches?.join('\n') || 'ninguna');

  // Buscar todos los img tags
  const imgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src, alt: i.alt, id: i.id, onclick: (i.onclick||'').toString().substring(0,80) }))
  );
  console.log('\nIMGs en la página:', JSON.stringify(imgs.filter(i => i.alt || i.onclick), null, 2));

  // Buscar todos los <a> en la zona del formulario
  const anchors = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.href,
      onclick: (a.onclick || '').toString().substring(0,100)
    })).filter(a => a.text.length < 60)
  );
  const filtrado = anchors.filter(a => 
    a.text.toLowerCase().includes('consult') || 
    a.onclick.toLowerCase().includes('params') ||
    a.onclick.toLowerCase().includes('finca') ||
    a.onclick.toLowerCase().includes('submit')
  );
  console.log('\nLinks relevantes:', JSON.stringify(filtrado, null, 2));

  await browser.close();
}

test().catch(e => console.error('ERROR:', e.message));
