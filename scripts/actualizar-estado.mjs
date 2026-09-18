#!/usr/bin/env node
// Corre desde GitHub Actions (.github/workflows/monitor.yml) cada varios
// minutos: le pregunta a UptimeRobot el estado de Newton (monitor
// "newton-production-b3b4.up.railway.app", que apunta a app.pahlass.com)
// y escribe data/estado-global.json. Ese archivo es lo único que
// index.html necesita leer para pintar el estado global — nada de esto
// corre en el navegador de quien visita la página, así que la
// UPTIMEROBOT_API_KEY nunca se expone del lado del cliente.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_KEY = process.env.UPTIMEROBOT_API_KEY;
const NOMBRE_MONITOR = "newton-production-b3b4.up.railway.app";

if (!API_KEY) {
  console.error("Falta la variable de entorno UPTIMEROBOT_API_KEY.");
  process.exit(1);
}

const resp = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
  body: JSON.stringify({
    api_key: API_KEY,
    format: "json",
    custom_uptime_ratios: "1-7-30-90",
    response_times: 1,
    response_times_limit: 1,
  }),
});

if (!resp.ok) {
  console.error(`UptimeRobot respondió ${resp.status}`);
  process.exit(1);
}

const datos = await resp.json();
if (datos.stat !== "ok") {
  console.error("UptimeRobot devolvió un error:", JSON.stringify(datos));
  process.exit(1);
}

const monitor = datos.monitors.find((m) => m.friendly_name === NOMBRE_MONITOR) ?? datos.monitors[0];
if (!monitor) {
  console.error("No se encontró ningún monitor en la cuenta de UptimeRobot.");
  process.exit(1);
}

// status de UptimeRobot: 0 pausado, 1 sin revisar aún, 2 arriba,
// 8 "parece caído" (todavía confirmando), 9 confirmado caído.
const ESTADO_POR_CODIGO = {
  0: "mant",
  1: "pendiente",
  2: "op",
  8: "deg",
  9: "caido",
};

const [r1, r7, r30, r90] = String(monitor.custom_uptime_ratio ?? "").split("-");

writeFileSync(
  join(raiz, "data/estado-global.json"),
  JSON.stringify(
    {
      actualizado: new Date().toISOString(),
      monitor: monitor.friendly_name,
      url: monitor.url,
      estado: ESTADO_POR_CODIGO[monitor.status] ?? "pendiente",
      tiempoRespuestaMs: monitor.response_times?.[0]?.value ?? null,
      uptime: { dia: r1 ?? null, semana: r7 ?? null, mes: r30 ?? null, dias90: r90 ?? null },
      medidoPor: "UptimeRobot",
      intervaloMin: 5,
    },
    null,
    2
  ) + "\n"
);

console.log(`Estado actualizado: ${ESTADO_POR_CODIGO[monitor.status] ?? monitor.status} (${monitor.friendly_name})`);
