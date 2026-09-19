import { spawn } from "node:child_process";
import assert from "node:assert/strict";

// Verifica el build local, sin iniciar sesión ni consultar expedientes reales.
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3317",
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
);
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("El servidor de prueba no inició.")),
      20000,
    );
    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`El servidor salió con código ${code}`));
    });
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Ready")) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  });
  const base = "http://127.0.0.1:3317";
  const restricted = await fetch(`${base}/historiales`, { redirect: "manual" });
  assert.equal(restricted.status, 307);
  assert.match(restricted.headers.get("location"), /\/historiales\/ingresar$/);
  assert.match(restricted.headers.get("cache-control"), /no-store/);
  const login = await fetch(`${base}/historiales/ingresar`);
  assert.equal(login.status, 200);
  const html = await login.text();
  assert.match(html, /Ingresa tu código para continuar/);
  assert.match(html, /name="code"/);
  assert.doesNotMatch(html, /name="email"|name="password"|5501/);
  const preview = await fetch(`${base}/historiales/vista-previa`);
  assert.equal(preview.status, 404);
  assert.doesNotMatch(await preview.text(), /PRUEBA-001/);
  const home = await fetch(base);
  assert.equal(home.status, 200);
  console.log(
    "OK: acceso anónimo redirigido, no-cache, entrada disponible, vista ficticia bloqueada en producción y página principal disponible.",
  );
} finally {
  server.kill();
}
