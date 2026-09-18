#!/usr/bin/env node
// Genera bitacora.xml, incidentes.xml y api/estado.json a partir de
// data/entradas.json y data/componentes.json. Se corre a mano después de
// editar los datos (o lo dispara el panel /admin al publicar) — GitHub
// Pages no ejecuta nada del lado del servidor, así que estos archivos
// derivados tienen que existir ya generados en el repo.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const entradas = JSON.parse(readFileSync(join(raiz, "data/entradas.json"), "utf8"));
// estado-global.json lo escribe scripts/actualizar-estado.mjs (vía UptimeRobot,
// ver .github/workflows/monitor.yml) — puede no existir todavía en un checkout
// nuevo, de ahí el try/catch con un valor por default razonable.
let estadoGlobal = null;
try {
  estadoGlobal = JSON.parse(readFileSync(join(raiz, "data/estado-global.json"), "utf8"));
} catch {
  // Aún no se ha corrido el monitor — el feed sale con global "pendiente".
}

const SITIO = "https://status.pahlass.com";
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
const rfc822 = (iso) => new Date(iso).toUTCString();

function rss(titulo, descripcion, ruta, filas) {
  // Empate de fecha (mismo día) se rompe con la posición original en el
  // arreglo — entradas.json crece agregando al final, así que la más
  // nueva del mismo día es la que está más abajo (mismo criterio que
  // index.html).
  const items = filas
    .map((e, i) => ({ e, i }))
    .sort((a, b) => new Date(b.e.f) - new Date(a.e.f) || b.i - a.i)
    .map(({ e }) => e)
    .map(
      (e) => `  <item>
    <title>${esc(e.ti)}</title>
    <link>${SITIO}/#${esc(e.id)}</link>
    <guid isPermaLink="false">${esc(e.id)}</guid>
    <pubDate>${rfc822(e.f)}</pubDate>
    <description><![CDATA[${e.rs}]]></description>
  </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(titulo)}</title>
  <link>${SITIO}/</link>
  <description>${esc(descripcion)}</description>
${items}
</channel></rss>
`;
}

writeFileSync(
  join(raiz, "bitacora.xml"),
  rss("Bitácora — Pahlass", "Estado, novedades, avances y avisos de Pahlass.", "/", entradas)
);

writeFileSync(
  join(raiz, "incidentes.xml"),
  rss(
    "Incidentes — Pahlass",
    "Incidentes de estado de Pahlass.",
    "/",
    entradas.filter((e) => e.t === "estado")
  )
);

const abiertos = entradas.filter((e) => e.t === "estado" && e.abierto);

writeFileSync(
  join(raiz, "api/estado.json"),
  JSON.stringify(
    {
      actualizado: new Date().toISOString(),
      global: estadoGlobal
        ? { estado: estadoGlobal.estado, uptime90d: estadoGlobal.uptime?.dias90 ?? null, medidoPor: estadoGlobal.medidoPor }
        : { estado: "pendiente", uptime90d: null, medidoPor: null },
      incidentesAbiertos: abiertos.map((e) => ({
        id: e.id,
        titulo: e.ti,
        severidad: e.sev,
        componentes: e.comp,
        desde: e.f,
        faseActual: e.upd?.[0]?.e ?? null,
      })),
    },
    null,
    2
  ) + "\n"
);

console.log("Generados: bitacora.xml, incidentes.xml, api/estado.json");
