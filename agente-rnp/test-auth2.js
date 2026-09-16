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

  // Interceptar para ver respuesta completa del login
  page.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('rnpdigital') && res.url().includes('login')) {
      const body = await res.text().catch(() => '');
      // Guardar respuesta completa
      require('fs').writeFileSync('ajax-login-response.html', body);
      console.log('[AJAX LOGIN] Guardado en ajax-login-response.html (', body.length, 'chars)');
    }
  });

  await page.goto('https://www.rnpdigital.com/shopping/login.jspx', { waitUntil:'networkidle2' });

  // Escribir credenciales
  await page.evaluate((e, p) => {
    document.querySelector('input[type="text"]').value = e;
    document.querySelector('input[type="password"]').value = p;
  }, EMAIL, PASS);
  await sleep(300);

  // Click login
  await page.evaluate(() => document.querySelector('input[value="Ingresar"]').click());
  await sleep(8000); // esperar que A4J procese

  // Leer TODO el texto de la página
  const allText = await page.evaluate(() => document.body.innerText);
  require('fs').writeFileSync('pagina-post-login.txt', allText);
  console.log('Página post-login guardada (', allText.length, 'chars)');
  console.log('Primeras 5 líneas:', allText.split('\n').slice(0,8).join('\n'));

  // Intentar ir a la URL de consulta con las cookies actuales
  console.log('\nIntentando acceder a consulta con sesión activa...');
  const cookies = await page.cookies();
  console.log('Cookies activas:', cookies.map(c => c.name).join(', '));
  
  // Navegar a consulta
  await page.goto('https://www.rnpdigital.com/shopping/citizen/property/propertyByFolioReal.jspx', 
    { waitUntil:'networkidle2', timeout:15000 }).catch(e => console.log('goto error:', e.message));
  
  await sleep(2000);
  const urlConsulta = page.url();
  const textConsulta = await page.evaluate(() => document.body.innerText.substring(0,400));
  console.log('\nURL consulta:', urlConsulta);
  console.log('Texto consulta:', textConsulta);
  await page.screenshot({ path:'test-consulta-auth.png' });

  await browser.close();
}

test().catch(e => console.error('ERROR:', e.message));
