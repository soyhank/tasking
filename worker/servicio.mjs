// Mantiene encendido el programa de WhatsApp en segundo plano (sin ventanas) y lo reinicia si se cae.
//   node servicio.mjs              → arranca el supervisor (lo hace Windows solo al iniciar sesión)
//   node servicio.mjs --instalar   → lo registra para que arranque con Windows y lo enciende ya
//   node servicio.mjs --desinstalar→ lo quita del inicio de Windows y lo apaga
//   node servicio.mjs --estado     → dice si está corriendo
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 47321; // candado: solo puede haber un supervisor a la vez
const REGISTRO = path.join(DIR, 'registro.log');
const VBS = path.join(DIR, 'arranque-oculto.vbs');
const CLAVE_INICIO = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const NOMBRE = 'TaskingWhatsApp';

function hablar(mensaje) {
  return new Promise((resolve) => {
    const c = net.connect(PUERTO, '127.0.0.1', () => c.end(mensaje));
    let respuesta = '';
    c.on('data', (d) => (respuesta += d));
    c.on('close', () => resolve(respuesta || 'ok'));
    c.on('error', () => resolve(null));
  });
}

function arrancarOculto() {
  // wscript ejecuta el .vbs, que lanza node sin ninguna ventana
  spawn('wscript.exe', [VBS], { detached: true, stdio: 'ignore' }).unref();
}

const accion = process.argv[2];

if (accion === '--instalar') {
  const vbs = [
    'Set sh = CreateObject("WScript.Shell")',
    `sh.CurrentDirectory = "${DIR}"`,
    `sh.Run """${process.execPath}"" ""${path.join(DIR, 'servicio.mjs')}""", 0, False`,
    '',
  ].join('\r\n');
  fs.writeFileSync(VBS, vbs);
  // HKCU (del usuario): no necesita permisos de administrador
  execFileSync('reg', ['add', CLAVE_INICIO, '/v', NOMBRE, '/t', 'REG_SZ', '/d', `wscript.exe "${VBS}"`, '/f'], { stdio: 'ignore' });
  if ((await hablar('estado')) === null) arrancarOculto();
  console.log('Instalado: el programa de WhatsApp arranca solo con Windows y ya está encendido.');
  process.exit(0);
}

if (accion === '--desinstalar') {
  try {
    execFileSync('reg', ['delete', CLAVE_INICIO, '/v', NOMBRE, '/f'], { stdio: 'ignore' });
  } catch {}
  const r = await hablar('detener');
  console.log(r === null ? 'Quitado del inicio de Windows (no estaba corriendo).' : 'Quitado del inicio de Windows y apagado.');
  process.exit(0);
}

if (accion === '--estado') {
  const r = await hablar('estado');
  console.log(r === null ? 'Apagado' : `Encendido: ${r}`);
  process.exit(0);
}

// --- Supervisor ---
let hijo = null;
let deteniendo = false;
const inicio = Date.now();

function abrirRegistro() {
  try {
    if (fs.statSync(REGISTRO).size > 2 * 1024 * 1024) fs.renameSync(REGISTRO, `${REGISTRO}.anterior`);
  } catch {}
  return fs.openSync(REGISTRO, 'a');
}

function lanzar() {
  if (deteniendo) return;
  const fd = abrirRegistro();
  hijo = spawn(process.execPath, [path.join(DIR, 'index.mjs')], { cwd: DIR, stdio: ['ignore', fd, fd], windowsHide: true });
  hijo.on('exit', (codigo) => {
    fs.closeSync(fd);
    hijo = null;
    if (!deteniendo) {
      fs.appendFileSync(REGISTRO, `\n[servicio] el programa terminó (código ${codigo}); se reinicia en 5 s\n`);
      setTimeout(lanzar, 5000);
    }
  });
}

const servidor = net.createServer((c) => {
  c.on('data', (d) => {
    const orden = String(d).trim();
    if (orden === 'detener') {
      deteniendo = true;
      c.end('detenido');
      hijo?.kill();
      setTimeout(() => process.exit(0), 1500);
    } else c.end(`desde hace ${Math.round((Date.now() - inicio) / 60000)} min, pid ${hijo?.pid ?? '-'}`);
  });
});
servidor.once('error', () => process.exit(0)); // ya hay otro supervisor corriendo
servidor.listen(PUERTO, '127.0.0.1', lanzar);
