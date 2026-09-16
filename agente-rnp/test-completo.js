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

  // LOGIN
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });
  await page.evaluate((e,p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await sleep(300);
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(4000);
  // Manejar sesión activa
  await page.click('input[value*="continuar"]').catch(() => {});
  await sleep(4000);
  console.log('✅ Login OK - URL:', page.url());

  // Buscar link de Consultas Gratuitas
  const cgHref = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const l = links.find(a => a.textContent.trim() === 'Consultas Gratuitas');
    return l ? l.href : null;
  });
  console.log('Consultas Gratuitas URL:', cgHref);

  // Navegar
  if (cgHref) {
    await page.goto(cgHref, { waitUntil:'networkidle2' });
    await sleep(2000);
  } else {
    await page.evaluate(() => {
      const l = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Consultas Gratuitas'));
      if (l) l.click();
    });
    await sleep(2000);
  }
  await page.screenshot({ path:'step-consultas-gratuitas.png' });
  console.log('URL Consultas Gratuitas:', page.url());

  // Buscar "Consulta por Número de Finca"
  const fincaHref = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const l = links.find(a => a.textContent.includes('Número de Finca') && !a.textContent.includes('Tomos'));
    return l ? l.href : null;
  });
  console.log('Consulta Finca URL:', fincaHref);

  // Ir al formulario
  if (fincaHref) {
    await page.goto(fincaHref, { waitUntil:'networkidle2' });
    await sleep(2000);
  }
  await page.screenshot({ path:'step-formulario-finca.png' });
  console.log('URL Formulario:', page.url());

  // Ver estructura del formulario
  const formInfo = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name, id: s.id,
      options: Array.from(s.options).map(o => `${o.value}:${o.text}`)
    }));
    const inputs = Array.from(document.querySelectorAll('input[type="text"],input[type="number"]')).map(i => ({
      name: i.name, id: i.id, value: i.value
    }));
    const btns = Array.from(document.querySelectorAll('input[type="submit"],input[type="button"],button')).map(b => ({
      type: b.type, name: b.name, value: b.value || b.textContent
    }));
    return { selects, inputs, btns };
  });
  console.log('\nFormulario:');
  console.log('Selects:', JSON.stringify(formInfo.selects, null, 2));
  console.log('Inputs:', JSON.stringify(formInfo.inputs, null, 2));
  console.log('Botones:', JSON.stringify(formInfo.btns, null, 2));

  // PROBAR CONSULTA: finca 201485, Provincia 1 (San José)
  console.log('\n=== PRUEBA CONSULTA: finca 201485, San José ===');
  
  if (formInfo.selects.length > 0) {
    const selectName = formInfo.selects[0].name;
    await page.select(`select[name="${selectName}"]`, '1');
    await sleep(500);
  }
  
  if (formInfo.inputs.length > 0) {
    const inputName = formInfo.inputs[0].name;
    await page.evaluate(n => { document.querySelector(`input[name="${n}"]`).value = ''; }, inputName);
    await page.type(`input[name="${formInfo.inputs[0].name}"]`, '201485', { delay:40 });
  }

  // Click Consultar
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('input,button'));
    const btn = btns.find(b => (b.value||b.textContent||'').toLowerCase().includes('consult'));
    if (btn) btn.click();
  });
  await sleep(5000);
  await page.screenshot({ path:'step-resultado-finca.png' });

  const resultado = await page.evaluate(() => document.body.innerText);
  const match = resultado.match(/VALOR FISCAL[:\s]+([\d,\.]+\s*COLONES)/i);
  console.log('\n=== RESULTADO ===');
  console.log(match ? '✅ Valor Fiscal: ' + match[1] : '❌ No encontrado');
  console.log('Extracto:', resultado.match(/.{0,100}FISCAL.{0,100}/i)?.[0] || 'sin match');

  await browser.close();
}

test().catch(e => console.error('ERROR:', e.message));
