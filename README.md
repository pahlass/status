# Pahlass — Estado y novedades

Página pública de estado, novedades, avances y avisos de Pahlass.

**Alojada deliberadamente fuera de la infraestructura de Newton** (GitHub Pages, no Railway/Supabase),
para que siga funcionando aunque la plataforma no responda.

## Cómo está armado

- `index.html` — la página pública. Es estática: en cada carga hace `fetch()` de
  `data/entradas.json`, `data/componentes.json` y `data/estado-global.json`, y arma todo con
  JavaScript en el navegador. No hay build step ni framework.
- `data/entradas.json` — la bitácora completa: incidentes (`t:"estado"`), novedades, avances,
  avisos y prensa. Cada entrada es un objeto; ver los campos usados en `index.html` (`entrada()`).
  Se sigue editando a mano (o desde `/admin` más adelante).
- `data/componentes.json` — solo un catálogo de nombres (Aplicación, Agenda, Finanzas...), para
  poder decir "esta novedad afectó a Finanzas" dentro de una entrada. Ya no tiene un estado propio.
- `data/divisiones.json` — catálogo de las divisiones de Pahlass (Education, Salud, Retail...).
  Se muestran como filtro en la columna izquierda de la página; cada entrada de la bitácora puede
  traer una sola división en `div` (o ninguna, si es un anuncio de toda la empresa). Distinto de
  `componentes.json`: una división es de negocio, un componente es un módulo dentro de un producto.
- `data/estado-global.json` — **el estado real de Newton en su conjunto**, un solo valor
  (op/deg/caido/mant), NO por componente. Lo escribe automáticamente
  `scripts/actualizar-estado.mjs`, corrido cada 5 minutos por
  `.github/workflows/monitor.yml`, que le pregunta a **UptimeRobot** (ya monitorea
  `app.pahlass.com`) el estado actual vía su API. Nadie edita este archivo a mano — si hace falta
  cambiar de qué monitor se lee, se edita `NOMBRE_MONITOR` en ese script. El secreto
  `UPTIMEROBOT_API_KEY` (Read-Only) vive en Settings → Secrets and variables → Actions del repo,
  nunca en el código ni expuesto al navegador.
- `bitacora.xml`, `incidentes.xml`, `api/estado.json` — versiones "de máquina" de lo mismo, para
  quien quiera consultarlo desde otra herramienta (lector RSS, un monitor externo). Se generan con
  `scripts/generar-feeds.mjs` a partir de los mismos datos — **hay que volver a correrlo después de
  editar `data/entradas.json` a mano** (`node scripts/generar-feeds.mjs`); el Action de monitoreo y
  el panel `/admin` lo hacen solos.
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

## Bitácora interna de cambios (`/bitacora`)

`status.pahlass.com/bitacora/` es una bitácora **privada** para el equipo: proyectos, cambios
pedidos, cómo se hicieron y si se lograron (con su historial). Solo la **interfaz** vive en este
repo (que es público); los **datos** viven en `bitacora.json` dentro del repo **privado**
`pahlass/bitacora-interna`. Sin un token con acceso a ese repo, la página no muestra nada.

- Para entrar: token fine-grained de GitHub (resource owner `pahlass`, solo el repo
  `bitacora-interna`, Contents → Read and write). Se guarda solo en el navegador.
- Para dar acceso a alguien del equipo: agrégalo como colaborador de `pahlass/bitacora-interna`
  y que genere su propio token.
- Cada acción es un commit en ese repo, con quién la hizo — el historial completo queda en GitHub.
- La página tiene `noindex`, pero eso no la hace privada: lo privado son los datos.
