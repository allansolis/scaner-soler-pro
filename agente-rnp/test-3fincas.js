const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const EMAIL  = 'allann.solis.94@gmail.com';
const PASS   = 'sDS!matclfO!1';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 3 fincas de prueba del Excel real
const PRUEBAS = [
  { finca:'201485', prov:'1', mat:'201485-000', provNombre:'SAN JOSE'  },
  { finca:'219494', prov:'6', mat:'219494-000', provNombre:'PUNTARENAS'},
  { finca:'176997', prov:'5', mat:'176997-000', provNombre:'GUANACASTE'},
];

async function test() {
  console.log('=== TEST AGENTE RNP - 3 fincas de prueba ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox','--window-size=1280,900'],
    defaultViewport: { width:1280, height:900 }
  });
  const page = await browser.newPage();

  // LOGIN
  console.log('1. Login...');
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });
  await page.type('input[name*="correo"]', EMAIL, { delay:50 });
  await page.type('input[type="password"]', PASS, { delay:50 });
  await page.click('input[value="Ingresar"]');
  await sleep(5000);

  // Verificar login
  const menu = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(a => a.textContent.trim()).filter(t => t.length > 2 && t.length < 50);
  });
  console.log('Menu encontrado:', menu.slice(0,10).join(' | '));
  await page.screenshot({ path:'test-01-login.png' });

  // NAVEGAR A CONSULTA
  console.log('\n2. Navegando a Consulta por Número de Finca...');
  const fincaURL = 'https://www.rnpdigital.com/shopping/citizen/property/propertyByFolioReal.jspx';
  await page.goto(fincaURL, { waitUntil:'networkidle2', timeout:20000 }).catch(() => {});
  await sleep(2000);
  await page.screenshot({ path:'test-02-formulario.png' });
  
  const urlActual = page.url();
  const texto2 = await page.evaluate(() => document.body.innerText.substring(0,300));
  console.log('URL:', urlActual);
  console.log('Contenido inicial:', texto2);

  // Verificar selects disponibles
  const selects = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name,
      id: s.id,
      options: Array.from(s.options).map(o => `${o.value}=${o.text}`).slice(0,10)
    }));
  });
  console.log('\nSelects en el formulario:', JSON.stringify(selects, null, 2));

  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="text"], input[type="number"]')).map(i => ({
      name: i.name, id: i.id, placeholder: i.placeholder
    }));
  });
  console.log('Inputs de texto:', JSON.stringify(inputs, null, 2));

  // PROBAR 1 FINCA
  console.log('\n3. Probando finca 201485 (San José)...');
  
  // Seleccionar provincia 1 - San José
  const sel0 = await page.$('select');
  if (sel0) {
    await page.select('select', '1');
    await sleep(500);
  }

  // Ingresar número de finca
  const inp = await page.$('input[type="text"]');
  if (inp) {
    await inp.click({ clickCount:3 });
    await page.evaluate(el => el.value='', inp);
    await inp.type('201485', { delay:40 });
  }

  await page.screenshot({ path:'test-03-antes-consultar.png' });

  // Click Consultar
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('input, button'));
    const btn = btns.find(b => (b.value||b.textContent||'').toLowerCase().includes('consult'));
    if (btn) btn.click();
  });
  await sleep(4000);

  await page.screenshot({ path:'test-04-resultado.png' });
  const resultado = await page.evaluate(() => document.body.innerText);
  const valorMatch = resultado.match(/VALOR FISCAL[:\s]+([\d,\.]+)/i);
  console.log('Resultado finca 201485:', valorMatch ? valorMatch[1] : 'NO ENCONTRADO');
  console.log('Texto relevante:', resultado.match(/.{0,200}FISCAL.{0,200}/i)?.[0] || 'sin match');

  await browser.close();
  console.log('\n=== Screenshots guardados: test-01 a test-04 ===');
}

test().catch(e => { console.error('ERROR:', e.message); });
