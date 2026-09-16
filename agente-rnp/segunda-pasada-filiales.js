/**
 * SEGUNDA PASADA - Fincas Filiales tipo -F- y -M-
 * Estas fincas usan el selector "Horizontal" (params:j_id308)
 * con valores F o M, en lugar del selector "Duplicado".
 *
 * Lee el archivo de salida, encuentra las filas con "FINCA NO ENCONTRADA"
 * cuya matrícula contenga -F- o -M-, y las reintenta con el selector correcto.
 */

const puppeteer = require('puppeteer-core');
const XLSX      = require('xlsx');
const fs        = require('fs');

const EXCEL_SALIDA     = 'C:\\Users\\Usuario\\Desktop\\Remates 2026 - VALORES RNP.xlsx';
const SHEET_NAME       = 'Prop';
const COL_MATRICULA    = 13;
const COL_PROVINCIA    = 17;
const COL_VALOR_FISCAL = 25;

const EMAIL  = 'allann.solis.94@gmail.com';
const PASS   = 'NEt$LQ6NJm/E1';
const CHROME = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

const CONSULTAS_POR_LOTE = 9;
const PAUSA_LOTE_MS      = 130 * 1000;
const PAUSA_FILA_MS      =   7 * 1000;

// Mapa provincias
const PROV_CODIGO = { 'SAN JOSE':1,'SAN JOSÉ':1,'ALAJUELA':2,'CARTAGO':3,'HEREDIA':4,'GUANACASTE':5,'PUNTARENAS':6,'LIMON':7,'LIMÓN':7 };
const CANTON_PROV = {
  'ESCAZÚ':1,'DESAMPARADOS':1,'PURISCAL':1,'ASERRÍ':1,'MORA':1,'GOICOECHEA':1,'SANTA ANA':1,'ALAJUELITA':1,'TIBÁS':1,'MORAVIA':1,'MONTES DE OCA':1,'CURRIDABAT':1,'SAN PEDRO':1,'PAVAS':1,'HATILLO':1,'HOSPITAL':1,'CATEDRAL':1,'ZAPOTE':1,'URUCA':1,'BRASIL':1,'COLÓN':1,'PATARRÁ':1,'GRIFO ALTO':1,'VUELTA DE JORCO':1,'SAN JUAN DE DIOS':1,'GRANADILLA':1,'SÁNCHEZ':1,'GUADALUPE':1,'IPÍS':1,'PURRAL':1,'CINCO ESQUINAS':1,'ANSELMO LLORENTE':1,'SAN VICENTE':1,'POZOS':1,'PIEDADES':1,'SAN MARCOS':1,'LA TRINIDAD':1,'SANTIAGO':1,'RINCÓN DE SABANILLA':1,'SABANILLA':1,'SAN ANTONIO':1,'SANTA LUCÍA':1,
  'OROTINA':2,'ZARCERO':2,'QUESADA':2,'FLORENCIA':2,'AGUAS ZARCAS':2,'SARCHÍ':2,'RÍO SEGUNDO':2,'COYOLAR':2,'POCOSOL':2,'SAN RAMÓN':2,'GRECIA':2,'NARANJO':2,'PALMARES':2,'UPALA':2,'LOS CHILES':2,'GUATUSO':2,'ATENAS':2,
  'EL TEJAR':3,'DULCE NOMBRE':3,'LLANOS DE SANTA LUCÍA':3,'QUEBRADILLA':3,'SAN NICOLÁS':3,'AGUACALIENTE (SAN FRANCISCO)':3,'GUADALUPE (ARENILLA)':3,'CERVANTES':3,'LA ISABEL':3,'PEJIBAYE':3,'TURRIALBA':3,'PARAÍSO':3,'OROSI':3,'BIRRISITO':3,'TUCURRIQUE':3,'ALEGRÍA':3,'CIPRESES':3,'COPEY':3,'TRES RÍOS':3,
  'BARVA':4,'BELÉN':4,'FLORES':4,'SAN PABLO':4,'SARAPIQUÍ':4,'PUERTO VIEJO':4,'LA VIRGEN':4,'LAS HORQUETAS':4,'LLORENTE':4,'SANTA BÁRBARA':4,'JESÚS':4,'PUENTE DE PIEDRA':4,'ULLOA':4,'SAN FRANCISCO':4,
  'LIBERIA':5,'NICOYA':5,'BAGACES':5,'CAÑAS':5,'TILARÁN':5,'LA CRUZ':5,'CURUBANDÉ':5,'NACASCOLO':5,'TIERRAS MORENAS':5,'TRONADORA':5,'MONTE VERDE':5,'GUAYCARÁ':5,'CARRILLO':5,'ABANGARES':5,
  'BARRANCA':6,'CHACARITA':6,'CHOMES':6,'TÁRCOLES':6,'JACÓ':6,'BAHÍA BALLENA':6,'PALMAR':6,'PUERTO CORTÉS':6,'PIEDRAS BLANCAS':6,'CORREDOR':6,'SABALITO':6,'PITTIER':6,'POTRERO CERRADO':6,'RIVAS':6,'SAN ISIDRO DE EL GENERAL':6,'DANIEL FLORES':6,'QUEPOS':6,'PARRITA':6,'CÓBANO':6,'PAQUERA':6,'ESPÍRITU SANTO':6,'MACACONA':6,'MERCEDES SUR':6,'GOLFITO':6,'OSA':6,'BUENOS AIRES':6,'ESPARZA':6,
  'CARIARI':7,'GUÁPILES':7,'SIQUIRRES':7,'RÍO JIMÉNEZ':7,'RÍO NUEVO':7,'GUÁCIMO':7,'TALAMANCA':7,'MATINA':7,'POCOCÍ':7,
};

function log(msg) {
  const ts = new Date().toISOString().replace('T',' ').substring(0,19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync('rnp-segunda-pasada.log', line + '\n');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function norm(s) {
  return s.toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
}

function resolverProvincia(p) {
  const n = norm(p);
  for (const [k,v] of Object.entries(PROV_CODIGO)) { if (norm(k) === n) return v; }
  for (const [k,v] of Object.entries(CANTON_PROV)) { if (norm(k) === n) return v; }
  for (const [k,v] of Object.entries(CANTON_PROV)) { if (n.includes(norm(k)) || norm(k).includes(n)) return v; }
  return null;
}

function guardarExcel(wb) {
  try {
    XLSX.writeFile(wb, EXCEL_SALIDA);
    log('💾 Guardado');
  } catch(e) { log(`⚠️ Error al guardar: ${e.message}`); }
}

function escribirValor(ws, rowIndex, valor) {
  const addr = XLSX.utils.encode_cell({ r: rowIndex, c: COL_VALOR_FISCAL });
  ws[addr] = { v: valor, t: 's' };
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  if (rowIndex > range.e.r) range.e.r = rowIndex;
  if (COL_VALOR_FISCAL > range.e.c) range.e.c = COL_VALOR_FISCAL;
  ws['!ref'] = XLSX.utils.encode_range(range);
}

async function login(page) {
  log('→ Login RNP...');
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2', timeout:30000 });
  await page.waitForSelector('input[type="text"]', { timeout:15000 });
  await sleep(500);
  await page.evaluate((e,p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await sleep(200);
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(4000);
  await page.click('input[value*="continuar"]').catch(() => {});
  await sleep(3000);
  const ok = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).some(a => a.textContent.includes('Consultas Gratuitas'))
  );
  log(ok ? '✅ Login exitoso' : '⚠️ Login fallido');
  return ok;
}

async function irAFormulario(page) {
  if (page.url().includes('paramConsultaFinca')) {
    await page.reload({ waitUntil:'networkidle2', timeout:20000 }).catch(() => {});
    await sleep(1500);
    return true;
  }
  await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas')?.click());
  await sleep(3000);
  await page.evaluate(() => Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consulta por Número de Finca')?.click());
  await sleep(2500);
  return page.url().includes('paramConsultaFinca');
}

async function consultarFilial(page, finca, horizontal, provCod) {
  try {
    await page.waitForSelector('input[name="params:finca"]', { timeout:10000 });

    // Seleccionar Provincia
    await page.select('select[name="params:j_id268"]', String(provCod));
    await sleep(400);

    // Número de finca
    await page.evaluate(() => { document.querySelector('input[name="params:finca"]').value = ''; });
    await page.click('input[name="params:finca"]', { clickCount:3 });
    await page.type('input[name="params:finca"]', finca, { delay:40 });

    // ── CLAVE: seleccionar "F" o "M" en el selector Horizontal (params:j_id308) ──
    if (horizontal === 'F' || horizontal === 'M') {
      await page.select('select[name="params:j_id308"]', horizontal).catch(() => {
        log(`  ⚠️ No se pudo seleccionar horizontal ${horizontal}`);
      });
      await sleep(300);
    }

    // Click Consultar
    await page.evaluate(() => {
      const img = document.querySelector('img[alt="Consultar"]');
      if (img?.parentElement) img.parentElement.click();
    });

    await Promise.race([
      page.waitForNavigation({ waitUntil:'networkidle2', timeout:15000 }),
      sleep(8000)
    ]).catch(() => {});
    await sleep(1000);

    const texto = await page.evaluate(() => document.body.innerText);
    const m = texto.match(/VALOR FISCAL[:\s]+([\d,\.]+)\s*COLONES/i);
    if (m) return m[1].trim() + ' COLONES';
    const m2 = texto.match(/VALOR FISCAL[:\s]+([\d,\.]+)/i);
    if (m2) return m2[1].trim();
    if (/no existe|no encontr|no registr/i.test(texto)) return 'FINCA NO ENCONTRADA';
    return 'SIN VALOR FISCAL';
  } catch (err) {
    log(`  ⚠️ Error: ${err.message.substring(0,80)}`);
    return 'ERROR';
  }
}

async function main() {
  log('═══════════════════════════════════════════════════');
  log('   SEGUNDA PASADA - Fincas Filiales F y M         ');
  log('═══════════════════════════════════════════════════');

  // Leer Excel de salida
  const wb = XLSX.readFile(EXCEL_SALIDA);
  const ws = wb.Sheets[SHEET_NAME];
  const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });

  // Encontrar fincas con "FINCA NO ENCONTRADA" y matrícula -F- o -M-
  const pendientes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const mat = String(row[COL_MATRICULA] || '').trim();
    const val = String(row[COL_VALOR_FISCAL] || '').trim();
    // Detectar filiales: contiene -F- o termina en -F-000, -M-000, etc.
    if (val === 'FINCA NO ENCONTRADA' && mat.match(/-[FM]-/)) {
      pendientes.push({ idx: i, row, mat });
    }
  }

  log(`Filiales pendientes: ${pendientes.length}`);
  if (!pendientes.length) { log('Ninguna filial pendiente. Fin.'); return; }

  // Mostrar lista
  pendientes.forEach(p => log(`  - Fila ${p.idx+1}: ${p.mat}`));

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox','--window-size=1280,900'],
    defaultViewport: { width:1280, height:900 }
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    if (!await login(page)) { log('Abortando: login fallido.'); return; }
    if (!await irAFormulario(page)) { log('Abortando: formulario no encontrado.'); return; }

    let procesadas = 0, enLote = 0;

    for (const { idx, row, mat } of pendientes) {
      const provRaw = String(row[COL_PROVINCIA] || '').trim();
      const provCod = resolverProvincia(provRaw);
      if (!provCod) {
        log(`Fila ${idx+1}: ⚠️ Provincia no reconocida "${provRaw}"`);
        continue;
      }

      // Parsear matrícula filial: ej. "153286-F-000"
      const partes = mat.split('-');
      const finca = partes[0];
      const horizontal = partes[1]; // F o M

      log(`Fila ${idx+1}/${data.length-1}: Finca ${finca} | Horizontal: ${horizontal} | Prov: ${provCod}`);

      if (enLote >= CONSULTAS_POR_LOTE) {
        log(`⏸️  Pausando ${PAUSA_LOTE_MS/1000}s...`);
        guardarExcel(wb);
        await sleep(PAUSA_LOTE_MS);
        enLote = 0;
        await irAFormulario(page);
      }

      const valor = await consultarFilial(page, finca, horizontal, provCod);
      log(`    → ${valor}`);

      escribirValor(ws, idx, valor);
      procesadas++;
      enLote++;

      if (procesadas % 5 === 0) guardarExcel(wb);
      await sleep(PAUSA_FILA_MS);
      await irAFormulario(page);
    }

    guardarExcel(wb);
    log('═══════════════════════════════════════════════════');
    log(`✅ Segunda pasada completa: ${procesadas} filiales procesadas`);
    log('═══════════════════════════════════════════════════');

  } catch (err) {
    log(`❌ ERROR FATAL: ${err.message}`);
    guardarExcel(wb);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
