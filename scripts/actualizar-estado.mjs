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

const DIAS_HISTORIAL = 90;
const AHORA_SEG = Math.floor(Date.now() / 1000);
const INICIO_SEG = AHORA_SEG - DIAS_HISTORIAL * 86400;

const resp = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
  body: JSON.stringify({
    api_key: API_KEY,
    format: "json",
    custom_uptime_ratios: "1-7-30-90",
    response_times: 1,
    response_times_limit: 1,
    logs: 1,
    log_types: "1", // solo eventos de caída (2=arriba, 98/99=pausa no nos sirven aquí)
    logs_start_date: INICIO_SEG,
    logs_end_date: AHORA_SEG,
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

// Reconstruye cuánto tiempo estuvo caído CADA DÍA de los últimos 90, a
// partir de los eventos de caída reales que reporta UptimeRobot (logs,
// type 1) — no una aproximación ni datos inventados. Cada evento trae
// cuándo empezó (datetime) y cuánto duró (duration, en segundos); si
// sigue caído en este momento, duration puede venir en 0/ausente, así
// que se usa "ahora" como fin en ese caso.
const eventosCaida = (monitor.logs ?? [])
  .filter((l) => l.type === 1)
  .map((l) => {
    const inicio = l.datetime * 1000;
    const fin = l.duration ? inicio + l.duration * 1000 : Date.now();
    return { inicio, fin };
  });

const dia0 = new Date();
dia0.setHours(0, 0, 0, 0);
const historial = [];
for (let i = DIAS_HISTORIAL - 1; i >= 0; i--) {
  const inicioDia = new Date(dia0);
  inicioDia.setDate(inicioDia.getDate() - i);
  const finDia = new Date(inicioDia);
  finDia.setDate(finDia.getDate() + 1);
  let minutos = 0;
  for (const ev of eventosCaida) {
    const iniOv = Math.max(ev.inicio, inicioDia.getTime());
    const finOv = Math.min(ev.fin, finDia.getTime());
    if (finOv > iniOv) minutos += Math.round((finOv - iniOv) / 60000);
  }
  historial.push({
    fecha: inicioDia.toISOString().slice(0, 10),
    minutosCaido: minutos,
    estado: minutos > 0 ? "caido" : "op",
  });
}
writeFileSync(join(raiz, "data/historial.json"), JSON.stringify(historial, null, 2) + "\n");

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
