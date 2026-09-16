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
  console.log('✅ Login OK');

  // Navegar
  await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas')?.click());
  await sleep(3000);
  await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consulta por Número de Finca')?.click());
  await sleep(3000);
  console.log('✅ Formulario URL:', page.url());

  // Test 3 fincas del Excel real
  const PRUEBAS = [
    { finca:'201485', prov:'1', desc:'San José' },
    { finca:'219494', prov:'6', desc:'Puntarenas' },
    { finca:'152221', prov:'5', desc:'Guanacaste' },
  ];

  for (const p of PRUEBAS) {
    console.log(`\n→ Consultando finca ${p.finca} (${p.desc})...`);
    
    // Asegurarse de estar en el formulario (puede necesitar recarga)
    if (!page.url().includes('paramConsultaFinca')) {
      await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas')?.click());
      await sleep(2000);
      await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consulta por Número de Finca')?.click());
      await sleep(2000);
    } else {
      await page.reload({ waitUntil:'networkidle2' });
      await sleep(1500);
    }

    await page.waitForSelector('input[name="params:finca"]', { timeout:10000 });
    
    // Llenar formulario
    await page.select('select[name="params:j_id268"]', p.prov);
    await sleep(300);
    await page.evaluate(() => { document.querySelector('input[name="params:finca"]').value = ''; });
    await page.click('input[name="params:finca"]', { clickCount:3 });
    await page.type('input[name="params:finca"]', p.finca, { delay:40 });
    
    // Click Consultar
    await page.evaluate(() => {
      const img = document.querySelector('img[alt="Consultar"]');
      if (img?.parentElement) img.parentElement.click();
    });

    await Promise.race([
      page.waitForNavigation({ waitUntil:'networkidle2', timeout:12000 }),
      sleep(8000)
    ]).catch(() => {});
    await sleep(1000);

    const texto = await page.evaluate(() => document.body.innerText);
    const m = texto.match(/VALOR FISCAL[:\s]+([\d,\.]+\s*COLONES)/i);
    const url = page.url();
    
    console.log(`  URL resultado: ${url.substring(0,70)}`);
    if (m) console.log(`  ✅ VALOR FISCAL: ${m[1]}`);
    else {
      const extracto = texto.match(/.{0,80}FISCAL.{0,80}/i)?.[0];
      console.log(`  ❌ No encontrado. Extracto: ${extracto || 'ninguno'}`);
      console.log(`  Primeros 300 chars:`, texto.substring(0,300));
    }
    await page.screenshot({ path:`resultado-${p.finca}.png` });
    await sleep(7000); // respetar límite del sitio
  }

  await browser.close();
  console.log('\nDone. Screenshots guardados.');
}

test().catch(e => console.error('ERROR:', e.message));
