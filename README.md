# Pahlass — Estado y novedades

Página pública de estado, novedades, avances y avisos de Pahlass.

**Alojada deliberadamente fuera de la infraestructura de Newton** (GitHub Pages, no Railway/Supabase),
para que siga funcionando aunque la plataforma no responda.

## Cómo está armado

- `index.html` — la página pública. Es estática: en cada carga hace `fetch()` de
  `data/entradas.json` y `data/componentes.json` y arma todo con JavaScript en el navegador.
  No hay build step ni framework.
- `data/entradas.json` — la bitácora completa: incidentes (`t:"estado"`), novedades, avances,
  avisos y prensa. Cada entrada es un objeto; ver los campos usados en `index.html` (`entrada()`).
- `data/componentes.json` — el estado ACTUAL de cada componente (Aplicación, Agenda, Finanzas...).
  Se edita a mano cada vez que cambia.
- El historial de 90 días que se ve en el panel lateral **no es un monitoreo automático**: se
  calcula en el navegador a partir de los incidentes ya publicados en `entradas.json` (qué
  componentes tocó cada incidente y cuánto duró). Si algún día se agrega un chequeo automático
  real (ej. un GitHub Action que haga ping a Newton cada minuto), esa pieza se reemplaza sin tocar
  el resto de la página.
- `bitacora.xml`, `incidentes.xml`, `api/estado.json` — versiones "de máquina" de lo mismo, para
  quien quiera consultarlo desde otra herramienta (lector RSS, un monitor externo). Se generan con
  `scripts/generar-feeds.mjs` a partir de los mismos datos — **hay que volver a correrlo después de
  editar `data/*.json` a mano** (`node scripts/generar-feeds.mjs`). El panel `/admin` lo hace solo.
- `CNAME` — apunta el dominio personalizado `status.pahlass.com` (configurado en GitHub Pages).

## Publicar una entrada nueva (sin el panel)

1. Edita `data/entradas.json` — agrega un objeto nuevo al arreglo (o edita uno existente para
   agregar una actualización a un incidente en curso, dentro de `upd`).
2. Corre `node scripts/generar-feeds.mjs` para regenerar los feeds.
3. Confirma y sube los cambios (`git add`, `git commit`, `git push`) a `main`.
4. GitHub Pages se vuelve a publicar solo, normalmente en menos de un minuto.

## Panel de publicación (`/admin`)

Hace exactamente los 4 pasos de arriba, pero desde un formulario — sin editar JSON a mano. Ver
`admin/README.md` para cómo configurarlo (requiere un token de acceso personal de GitHub, se
guarda solo en tu navegador).
