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
const componentes = JSON.parse(readFileSync(join(raiz, "data/componentes.json"), "utf8"));

const SITIO = "https://status.pahlass.com";
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
const rfc822 = (iso) => new Date(iso).toUTCString();

function rss(titulo, descripcion, ruta, filas) {
  const items = filas
    .slice()
    .sort((a, b) => new Date(b.f) - new Date(a.f))
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
const global = componentes.some((c) => c.e === "caido")
  ? "interrumpido"
  : componentes.some((c) => c.e === "par")
    ? "interrupcion_parcial"
    : componentes.some((c) => c.e === "deg")
      ? "degradado"
      : componentes.some((c) => c.e === "mant")
        ? "mantenimiento"
        : "operativo";

writeFileSync(
  join(raiz, "api/estado.json"),
  JSON.stringify(
    {
      actualizado: new Date().toISOString(),
      global,
      componentes: componentes.map((c) => ({ clave: c.k, nombre: c.n, estado: c.e })),
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
