/**
 * AGENTE LEGAL RNP - Consulta Valor Fiscal de Fincas
 * Registro Nacional de Costa Rica - rnpdigital.com
 *
 * FLUJO VERIFICADO:
 *   1. Login (maneja modal "Sesión Activa" automáticamente)
 *   2. Consultas Gratuitas > Consulta por Número de Finca
 *      URL: /shopping/consultaDocumentos/paramConsultaFinca.jspx
 *   3. Formulario: select[name=params:j_id268] (Provincia) +
 *                  input[name=params:finca] (Número)
 *   4. Botón Consultar: img[alt="Consultar"] en <a> con jsfcljs
 *   5. Resultado: texto "VALOR FISCAL: X,XXX,XXX.00 COLONES"
 *
 * LÍMITE: 10 consultas gratuitas cada 2 minutos.
 * REANUDACIÓN: Lee de EXCEL_SALIDA si existe (retoma donde quedó).
 * RETRY: Reintenta filas con ERROR o ERROR SITIO.
 * SESSION: Re-login automático si la sesión expira durante pausa.
 */

const puppeteer = require('puppeteer-core');
const XLSX      = require('xlsx');
const fs        = require('fs');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const EXCEL_PATH       = 'C:\\Users\\Usuario\\Desktop\\Remates 2026.xlsx';
const EXCEL_SALIDA     = 'C:\\Users\\Usuario\\Desktop\\Remates 2026 - VALORES RNP.xlsx';
const SHEET_NAME       = 'Prop';
const COL_MATRICULA    = 13;   // col N
const COL_PROVINCIA    = 17;   // col R
const COL_VALOR_FISCAL = 25;   // col Z

const EMAIL  = 'allann.solis.94@gmail.com';
const PASS   = 'NEt$LQ6NJm/E1';
const CHROME = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

const CONSULTAS_POR_LOTE = 9;
const PAUSA_LOTE_MS      = 130 * 1000;
const PAUSA_FILA_MS      =   7 * 1000;

// ─── PROVINCIAS ─────────────────────────────────────────────────────────────
const PROV_CODIGO = {
  'SAN JOSE':1,'SAN JOSÉ':1,'ALAJUELA':2,'CARTAGO':3,'HEREDIA':4,
  'GUANACASTE':5,'PUNTARENAS':6,'LIMON':7,'LIMÓN':7,
};

const CANTON_PROV = {
  // San José (1)
  'ESCAZÚ':1,'ESCAZU':1,'DESAMPARADOS':1,'PURISCAL':1,'ASERRÍ':1,'ASERI':1,
  'MORA':1,'GOICOECHEA':1,'SANTA ANA':1,'ALAJUELITA':1,'TIBÁS':1,'TIBAS':1,
  'MORAVIA':1,'MONTES DE OCA':1,'CURRIDABAT':1,'SAN PEDRO':1,'PAVAS':1,
  'HATILLO':1,'HOSPITAL':1,'CATEDRAL':1,'ZAPOTE':1,'URUCA':1,'MERCED':1,
  'SAN FRANCISCO DE DOS RÍOS':1,'SAN FRANCISCO DE DOS RIOS':1,
  'BRASIL':1,'COLÓN':1,'COLON':1,'PATARRÁ':1,'PATARRA':1,
  'GRIFO ALTO':1,'VUELTA DE JORCO':1,'SAN JUAN DE DIOS':1,
  'GRANADILLA':1,'SÁNCHEZ':1,'SANCHEZ':1,'GUADALUPE':1,'IPÍS':1,'IPIS':1,
  'PURRAL':1,'CINCO ESQUINAS':1,'ANSELMO LLORENTE':1,'SAN VICENTE':1,
  'POZOS':1,'PIEDADES':1,'SAN MARCOS':1,'LA TRINIDAD':1,'SANTIAGO':1,
  'CIUDAD COLÓN':1,'CIUDAD COLON':1,'SAN JOSECITO':1,
  'RINCÓN DE SABANILLA':1,'RINCON DE SABANILLA':1,'SABANILLA':1,
  'SAN RAFAEL ABAJO':1,'SAN JUAN':1,'SAN ISIDRO':1,'SAN DIEGO':1,
  'SALITRILLOS':1,'SAN JOSÉ (PIZOTE)':1,'SAN ANTONIO':1,'SANTA LUCÍA':1,'SANTA LUCIA':1,
  // Alajuela (2)
  'OROTINA':2,'ZARCERO':2,'QUESADA':2,'FLORENCIA':2,'AGUAS ZARCAS':2,
  'SARCHÍ':2,'SARCHI':2,'RÍO SEGUNDO':2,'RIO SEGUNDO':2,'COYOLAR':2,
  'POCOSOL':2,'SAN RAMÓN':2,'SAN RAMON':2,'GRECIA':2,'NARANJO':2,
  'PALMARES':2,'UPALA':2,'LOS CHILES':2,'GUATUSO':2,'ATENAS':2,
  'SAN MATEO':2,'LA FORTUNA':2,'VENECIA':2,'PITAL':2,'TACARES':2,
  // Cartago (3)
  'EL TEJAR':3,'DULCE NOMBRE':3,'LLANOS DE SANTA LUCÍA':3,'QUEBRADILLA':3,
  'SAN NICOLÁS':3,'SAN NICOLAS':3,'AGUACALIENTE (SAN FRANCISCO)':3,
  'GUADALUPE (ARENILLA)':3,'CERVANTES':3,'LA ISABEL':3,'PEJIBAYE':3,
  'TURRIALBA':3,'PARAÍSO':3,'PARAISO':3,'OROSI':3,'OROSÍ':3,
  'BIRRISITO':3,'TUCURRIQUE':3,'ALEGRÍA':3,'ALEGRIA':3,'CIPRESES':3,
  'COPEY':3,'TIERRA BLANCA':3,'EL ROSARIO':3,'TRES RÍOS':3,'TRES RIOS':3,
  // Heredia (4)
  'BARVA':4,'BELÉN':4,'BELEN':4,'FLORES':4,'SAN PABLO':4,'SARAPIQUÍ':4,'SARAPIQUI':4,
  'PUERTO VIEJO':4,'LA VIRGEN':4,'LAS HORQUETAS':4,'LLORENTE':4,
  'SANTA BÁRBARA':4,'SANTA BARBARA':4,'JESÚS':4,'JESUS':4,
  'PUENTE DE PIEDRA':4,'ULLOA':4,'SAN FRANCISCO':4,'MERCEDES':4,
  // Guanacaste (5)
  'LIBERIA':5,'NICOYA':5,'BAGACES':5,'CAÑAS':5,'CANAS':5,'TILARÁN':5,'TILARAN':5,
  'LA CRUZ':5,'CURUBANDÉ':5,'CURUBANDE':5,'NACASCOLO':5,'TIERRAS MORENAS':5,
  'TRONADORA':5,'MONTE VERDE':5,'GUAYCARÁ':5,'GUAYCARA':5,'CARRILLO':5,
  'ABANGARES':5,'NANDAYURE':5,'HOJANCHA':5,'SANTA CRUZ':5,'FILADELFIA':5,
  // Puntarenas (6)
  'BARRANCA':6,'CHACARITA':6,'CHOMES':6,'TÁRCOLES':6,'TARCOLES':6,
  'JACÓ':6,'JACO':6,'BAHÍA BALLENA':6,'BAHIA BALLENA':6,
  'PALMAR':6,'PUERTO CORTÉS':6,'PUERTO CORTES':6,'PIEDRAS BLANCAS':6,
  'CORREDOR':6,'SABALITO':6,'PITTIER':6,'POTRERO CERRADO':6,
  'RIVAS':6,'SAN ISIDRO DE EL GENERAL':6,'DANIEL FLORES':6,
  'QUEPOS':6,'PARRITA':6,'CÓBANO':6,'COBANO':6,'PAQUERA':6,
  'ESPÍRITU SANTO':6,'ESPIRITO SANTO':6,'MACACONA':6,'MERCEDES SUR':6,
  'GOLFITO':6,'OSA':6,'BUENOS AIRES':6,'MONTES DE ORO':6,'ESPARZA':6,
  // Limón (7)
  'CARIARI':7,'GUÁPILES':7,'GUAPILES':7,'SIQUIRRES':7,'RÍO JIMÉNEZ':7,
  'RIO JIMENEZ':7,'RÍO NUEVO':7,'RIO NUEVO':7,'GUÁCIMO':7,'GUACIMO':7,
  'TALAMANCA':7,'MATINA':7,'POCOCÍ':7,'POCOCI':7,
};

// ─── HELPERS ───────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T',' ').substring(0,19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync('rnp-log.txt', line + '\n');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function norm(s) {
  return s.toUpperCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ');
}

function resolverProvincia(provinciaExcel) {
  const n = norm(provinciaExcel);
  for (const [k,v] of Object.entries(PROV_CODIGO)) { if (norm(k) === n) return v; }
  for (const [k,v] of Object.entries(CANTON_PROV)) { if (norm(k) === n) return v; }
  for (const [k,v] of Object.entries(CANTON_PROV)) {
    if (n.includes(norm(k)) || norm(k).includes(n)) return v;
  }
  return null;
}

function parsearMatricula(matricula) {
  const partes = matricula.toString().trim().split('-');
  const finca = partes[0];
  let duplicado = '', derecho = '000';
  if (partes.length === 2) derecho = partes[1].padStart(3,'0');
  else if (partes.length === 3) {
    if (isNaN(partes[1])) { duplicado = partes[1]; derecho = partes[2]; }
    else { duplicado = partes[1].padStart(3,'0'); derecho = partes[2].padStart(3,'0'); }
  } else if (partes.length >= 4) {
    duplicado = partes[1]; derecho = partes[partes.length-1].padStart(3,'0');
  }
  return { finca, duplicado, derecho };
}

// ─── EXCEL ─────────────────────────────────────────────────────────────────
function leerExcel() {
  // Reanudar desde el archivo de salida si existe (tiene resultados parciales)
  const srcPath = fs.existsSync(EXCEL_SALIDA) ? EXCEL_SALIDA : EXCEL_PATH;
  log(`Leyendo: ${srcPath === EXCEL_SALIDA ? 'SALIDA (reanudando)' : 'ORIGINAL (inicio fresco)'}`);
  const wb = XLSX.readFile(srcPath);
  const ws = wb.Sheets[SHEET_NAME];
  const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
  log(`Excel leído: ${data.length-1} filas`);
  return { wb, ws, data };
}

function guardarExcel(wb) {
  try {
    XLSX.writeFile(wb, EXCEL_SALIDA);
    log(`💾 Guardado en: Remates 2026 - VALORES RNP.xlsx`);
  } catch(e) {
    log(`⚠️ No se pudo guardar: ${e.message}`);
  }
}

function escribirValor(ws, rowIndex, valor) {
  const addr = XLSX.utils.encode_cell({ r: rowIndex, c: COL_VALOR_FISCAL });
  ws[addr] = { v: valor, t: 's' };
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  if (rowIndex > range.e.r) range.e.r = rowIndex;
  if (COL_VALOR_FISCAL > range.e.c) range.e.c = COL_VALOR_FISCAL;
  ws['!ref'] = XLSX.utils.encode_range(range);
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
async function login(page) {
  log('→ Login RNP...');
  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2', timeout:30000 });
  await page.waitForSelector('input[type="text"]', { timeout:15000 });
  await sleep(1000);

  // Llenar con evaluate() + eventos (método más confiable con JSF)
  await page.evaluate((e, p) => {
    const emailEl = document.querySelector('input[type="text"]');
    const passEl  = document.querySelector('input[type="password"]');
    emailEl.value = e;
    passEl.value  = p;
    ['input','change','blur'].forEach(ev => {
      emailEl.dispatchEvent(new Event(ev, { bubbles:true }));
      passEl.dispatchEvent(new Event(ev, { bubbles:true }));
    });
  }, EMAIL, PASS);
  await sleep(500);

  // Verificar que se llenaron
  const emailVal = await page.$eval('input[type="text"]', el => el.value);
  const passLen  = await page.$eval('input[type="password"]', el => el.value.length);
  log(`  Form: email="${emailVal}" pass=${passLen} chars`);

  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  log('  → Ingresar #1');
  await sleep(7000);

  // Detectar modal "Sesión Activa"
  const botones = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'))
      .map(b => b.value.trim()).filter(Boolean)
  );
  log(`  Botones post-click: [${botones.join(' | ')}]`);

  const hayModal = botones.some(v => /s[ií].*continuar|^No$/i.test(v));
  if (hayModal) {
    // "Sí, continuar" = confirmar login aquí cerrando sesión activa
    const btnSi = botones.find(v => /s[ií].*continuar/i.test(v));
    if (btnSi) {
      await page.evaluate((bVal) => {
        const btn = Array.from(document.querySelectorAll('input'))
          .find(b => b.value.trim() === bVal);
        if (btn) btn.click();
      }, btnSi);
      log(`  → Modal: click "${btnSi}"`);
    } else {
      // Fallback: "No"
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('input'))
          .find(b => /^No$/i.test((b.value||'').trim()));
        if (btn) btn.click();
      });
      log('  → Modal: click "No"');
    }
    await sleep(8000);
  }

  // Verificar éxito
  const texto = await page.evaluate(() => document.body.innerText.substring(0,300));
  log(`  Página post-login: ${texto.replace(/\n/g,' ').substring(0,200)}`);

  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim()).filter(Boolean)
  );
  log(`  Links: [${links.slice(0,10).join(' | ')}]`);

  const ok = links.some(t => t.includes('Consultas Gratuitas'));
  log(ok ? '✅ Login exitoso' : '❌ Login fallido');
  return ok;
}

// ─── NAVEGAR AL FORMULARIO (con re-login si la sesión expiró) ──────────────
async function irAFormulario(page) {
  // Si estamos en login.jspx, verificar si realmente expiró la sesión
  // (el URL no cambia al hacer login en JSF/AJAX — puede ser que acabamos de loguearnos)
  if (page.url().includes('login.jspx')) {
    const logueado = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).some(a => a.textContent.includes('Consultas Gratuitas'))
    );
    if (!logueado) {
      log('⚠️ Sesión expirada — re-ingresando...');
      if (!await login(page)) {
        log('❌ Re-login fallido');
        return false;
      }
    }
    // Si está logueado (o recién hizo login), continúa a la navegación
  }

  // Si ya estamos en el formulario, hacer reload
  if (page.url().includes('paramConsultaFinca')) {
    await page.reload({ waitUntil:'networkidle2', timeout:20000 }).catch(() => {});
    await sleep(1500);
    // Verificar que el reload no nos mandó al login
    if (page.url().includes('login.jspx')) {
      log('⚠️ Sesión expirada tras reload — re-ingresando...');
      if (!await login(page)) { log('❌ Re-login fallido'); return false; }
      // Continuar a navegación al formulario
    } else {
      return true;
    }
  }

  // Navegar a Consultas Gratuitas → Consulta por Número de Finca
  await page.evaluate(() => {
    const l = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Consultas Gratuitas');
    if (l) l.click();
  });
  await sleep(3000);

  await page.evaluate(() => {
    const l = Array.from(document.querySelectorAll('a')).find(a =>
      a.textContent.trim() === 'Consulta por Número de Finca'
    );
    if (l) l.click();
  });
  await sleep(2500);

  const ok = page.url().includes('paramConsultaFinca');
  if (!ok) log(`⚠️  URL inesperada: ${page.url()}`);
  return ok;
}

// ─── CONSULTAR UNA FINCA ───────────────────────────────────────────────────
async function consultarFinca(page, finca, duplicado, derecho, provCod) {
  try {
    await page.waitForSelector('input[name="params:finca"]', { timeout:10000 });

    // Seleccionar Provincia
    await page.select('select[name="params:j_id268"]', String(provCod));
    await sleep(400);

    // Limpiar y escribir número de finca
    await page.evaluate(() => {
      const el = document.querySelector('input[name="params:finca"]');
      if (el) el.value = '';
    });
    await page.click('input[name="params:finca"]', { clickCount:3 });
    await page.type('input[name="params:finca"]', finca, { delay:40 });

    // Duplicado (si aplica)
    if (duplicado && duplicado.match(/^[A-Z]$/)) {
      await page.select('select[name="params:j_id279"]', duplicado).catch(() => {});
    }

    // Derecho (si no es 000)
    if (derecho && derecho !== '000') {
      await page.evaluate(v => {
        const el = document.querySelector('input[name="params:j_id313"]');
        if (el) el.value = v;
      }, derecho);
    }

    // Click botón Consultar (img[alt="Consultar"] dentro de <a>)
    await page.evaluate(() => {
      const img = document.querySelector('img[alt="Consultar"]');
      if (img && img.parentElement) img.parentElement.click();
    });

    // Esperar resultado
    await Promise.race([
      page.waitForNavigation({ waitUntil:'networkidle2', timeout:15000 }),
      sleep(8000)
    ]).catch(() => {});

    await sleep(1000);

    // Extraer Valor Fiscal
    const texto = await page.evaluate(() => document.body.innerText);

    const m = texto.match(/VALOR FISCAL[:\s]+([\d,\.]+)\s*COLONES/i);
    if (m) return m[1].trim() + ' COLONES';

    const m2 = texto.match(/VALOR FISCAL[:\s]+([\d,\.]+)/i);
    if (m2) return m2[1].trim();

    if (/no existe|no encontr|no registr/i.test(texto)) return 'FINCA NO ENCONTRADA';
    if (/error/i.test(texto)) return 'ERROR SITIO';

    await page.screenshot({ path: `debug-${finca}.png` });
    return 'SIN VALOR FISCAL';

  } catch (err) {
    log(`  ⚠️ Error: ${err.message.substring(0,80)}`);
    return 'ERROR';
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  log('═══════════════════════════════════════════════');
  log('    AGENTE LEGAL RNP - Valor Fiscal Fincas     ');
  log('═══════════════════════════════════════════════');

  const { wb, ws, data } = leerExcel();

  // Pendientes: vacías + filas con ERROR para reintentar
  const REINTENTAR = new Set(['ERROR', 'ERROR SITIO']);
  const pendientes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const mat = String(row[COL_MATRICULA]    || '').trim();
    const val = String(row[COL_VALOR_FISCAL] || '').trim();
    if (mat && (!val || REINTENTAR.has(val))) pendientes.push({ idx: i, row });
  }
  log(`Pendientes: ${pendientes.length} / ${data.length - 1}`);
  if (!pendientes.length) { log('✅ Nada pendiente. Todo procesado.'); return; }

  const csv = fs.createWriteStream('resultados.csv', { flags:'a' });
  csv.write('Fila,Matricula,Provincia,ProvCod,NumFinca,ValorFiscal\n');

  log('→ Iniciando Chrome...');
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

    let procesadas = 0, errores = 0, enLote = 0;

    for (const { idx, row } of pendientes) {
      const matRaw  = String(row[COL_MATRICULA] || '').trim();
      const provRaw = String(row[COL_PROVINCIA] || '').trim();

      const provCod = resolverProvincia(provRaw);
      if (!provCod) {
        const msg = `PROVINCIA DESCONOCIDA: ${provRaw}`;
        log(`Fila ${idx+1}: ⚠️ ${msg}`);
        escribirValor(ws, idx, msg);
        csv.write(`${idx+1},"${matRaw}","${provRaw}","?","?","${msg}"\n`);
        continue;
      }

      const { finca, duplicado, derecho } = parsearMatricula(matRaw);
      log(`Fila ${idx+1}/${data.length-1}: Finca ${finca} | Prov ${provCod} | ${matRaw}`);

      // Pausa por límite de tasa
      if (enLote >= CONSULTAS_POR_LOTE) {
        log(`⏸️  Pausando ${PAUSA_LOTE_MS/1000}s (límite 10/2min)...`);
        guardarExcel(wb);
        await sleep(PAUSA_LOTE_MS);
        enLote = 0;
        // irAFormulario detecta sesión expirada y re-loguea si es necesario
        if (!await irAFormulario(page)) {
          log('❌ No se pudo retomar el formulario tras pausa. Abortando.');
          break;
        }
      }

      const valor = await consultarFinca(page, finca, duplicado, derecho, provCod);
      log(`    → ${valor}`);

      escribirValor(ws, idx, valor);
      csv.write(`${idx+1},"${matRaw}","${provRaw}","${provCod}","${finca}","${valor}"\n`);

      procesadas++;
      enLote++;
      if (!valor.includes('COLONES') && !valor.includes('NO ENCONTRADA')) errores++;

      if (procesadas % 5 === 0) guardarExcel(wb);
      await sleep(PAUSA_FILA_MS);

      // Volver al formulario (también detecta sesión expirada)
      if (!await irAFormulario(page)) {
        log('⚠️ No se pudo retomar formulario, reintentando login...');
        if (!await login(page) || !await irAFormulario(page)) {
          log('❌ Fallo crítico de sesión. Guardando y saliendo.');
          break;
        }
      }
    }

    guardarExcel(wb);
    csv.end();
    log('═══════════════════════════════════════════════');
    log(`✅ Fin: ${procesadas} procesadas | ${errores} con error`);
    log('═══════════════════════════════════════════════');

  } catch (err) {
    log(`❌ ERROR FATAL: ${err.message}`);
    await page.screenshot({ path:'error-fatal.png' }).catch(() => {});
    guardarExcel(wb);
    csv.end();
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
