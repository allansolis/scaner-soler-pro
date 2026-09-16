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

  // ── 1. LOGIN ──
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });
  await page.evaluate((e,p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(4000);
  await page.click('input[value*="continuar"]').catch(() => {});
  await sleep(3000);
  console.log('✅ Login - URL:', page.url().substring(0,60));

  // ── 2. CLICK CONSULTAS GRATUITAS ──
  await page.evaluate(() => {
    const l = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas');
    if (l) l.click();
  });
  await sleep(3000);
  console.log('✅ Consultas Gratuitas - URL:', page.url().substring(0,80));
  await page.screenshot({ path:'s1-consultas.png' });

  // ── 3. CLICK CONSULTA POR NÚMERO DE FINCA ──
  await page.evaluate(() => {
    const l = Array.from(document.querySelectorAll('a')).find(a => 
      a.textContent.trim() === 'Consulta por Número de Finca'
    );
    if (l) l.click();
  });
  await sleep(3000);
  console.log('✅ Formulario finca - URL:', page.url().substring(0,80));
  await page.screenshot({ path:'s2-formulario.png' });

  // Ver estructura del formulario
  const formData = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name, id: s.id,
      opts: Array.from(s.options).map(o => `${o.value}=${o.text}`).join(', ')
    }));
    const inputs = Array.from(document.querySelectorAll('input[type="text"]')).map(i => ({
      name: i.name, id: i.id
    }));
    const btns = Array.from(document.querySelectorAll('input[value*="Consultar"],input[value*="consultar"],input[src*="consult"]')).map(b => ({
      type: b.type, name: b.name, value: b.value, src: b.src
    }));
    const bodyText = document.body.innerText.substring(0,300);
    return { selects, inputs, btns, bodyText };
  });
  console.log('\nBody:', formData.bodyText);
  console.log('Selects:', JSON.stringify(formData.selects, null, 2));
  console.log('Inputs:', JSON.stringify(formData.inputs, null, 2));
  console.log('Botones consultar:', JSON.stringify(formData.btns, null, 2));

  // ── 4. LLENAR FORMULARIO ──
  // Finca 201485, Provincia San José (1)
  if (formData.selects.length > 0) {
    console.log('\nSeleccionando provincia 1 (San José)...');
    await page.select(`select[name="${formData.selects[0].name}"]`, '1');
    await sleep(500);
  }
  
  if (formData.inputs.length > 0) {
    console.log('Escribiendo número de finca 201485...');
    const inputSel = `input[name="${formData.inputs[0].name}"]`;
    await page.click(inputSel, { clickCount:3 });
    await page.type(inputSel, '201485', { delay:40 });
  }

  await page.screenshot({ path:'s3-form-filled.png' });

  // ── 5. CLICK CONSULTAR ──
  // Buscar botón de consultar de múltiples formas
  const clicked = await page.evaluate(() => {
    // Buscar botón "Consultar" (imagen naranja en el sitio)
    const allInputs = Array.from(document.querySelectorAll('input'));
    const btn = allInputs.find(i => 
      (i.value || '').toLowerCase().includes('consult') ||
      (i.src || '').toLowerCase().includes('consult') ||
      (i.alt || '').toLowerCase().includes('consult')
    );
    if (btn) { btn.click(); return btn.value || btn.src || 'clicked'; }
    
    // Fallback: submit del form principal
    const forms = document.querySelectorAll('form');
    for (const f of forms) {
      const submitBtns = f.querySelectorAll('input[type="submit"]');
      for (const sb of submitBtns) {
        if (!sb.name.includes('declinar')) { sb.click(); return 'submit-btn'; }
      }
    }
    return null;
  });
  console.log('\nBotón clickado:', clicked);

  await sleep(5000);
  await page.screenshot({ path:'s4-resultado.png' });

  // ── 6. EXTRAER RESULTADO ──
  const resultText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== RESULTADO ===');
  
  const mFiscal = resultText.match(/VALOR FISCAL[:\s]+([\d,\.]+\s*COLONES)/i);
  const mFiscal2 = resultText.match(/VALOR FISCAL[:\s]+([\d,\.]+)/i);
  
  if (mFiscal)  console.log('✅ VALOR FISCAL:', mFiscal[1]);
  else if (mFiscal2) console.log('✅ VALOR FISCAL (sin COLONES):', mFiscal2[1]);
  else {
    console.log('❌ No encontrado. Extracto relevante:');
    const lines = resultText.split('\n').filter(l => l.match(/fiscal|valor|finca|matric/i));
    lines.forEach(l => console.log(' -', l.trim()));
    console.log('\nPrimeras 500 chars:', resultText.substring(0,500));
  }

  await browser.close();
  console.log('\nScreenshots: s1-consultas.png, s2-formulario.png, s3-form-filled.png, s4-resultado.png');
}

test().catch(e => console.error('ERROR:', e.message));
