# Panel de publicación

Formulario en `/admin` para agregar/editar entradas de la bitácora (`data/entradas.json`)
sin editar JSON a mano. No tiene backend propio: escribe directo al repositorio vía la
API de GitHub, usando un token que solo tú tienes.

## Cómo entrar la primera vez

1. Ve a `status.pahlass.com/admin/`.
2. Genera un token en GitHub: **github.com/settings/personal-access-tokens/new**
   - Repository access → **Only select repositories** → `pahlass/status`
   - Permissions → Repository permissions → **Contents** → **Read and write**
   - Generate token
3. Pega el token en el panel y dale **Conectar**.

El token se guarda solo en el `localStorage` de tu navegador — nunca se sube al repositorio
ni se envía a ningún otro lado que no sea `api.github.com`. Si usas otro navegador o dispositivo,
tendrás que generar/pegar el token ahí también (o generar uno nuevo — los anteriores se pueden
revocar en la misma pantalla de GitHub).

## Qué puede hacer

- Crear una entrada nueva (novedad, avance, aviso, prensa) o un incidente (estado).
- Editar cualquier entrada existente (se busca por su `id`).
- Para un incidente abierto: agregar una actualización nueva (fase + texto), o marcarlo
  como resuelto (desmarca "Sigue abierto" — la fecha de cierre se pone sola).
- Eliminar una entrada.

Cada "Publicar" hace un commit directo a `main` sobre `data/entradas.json`. GitHub Pages
republica solo, normalmente en menos de un minuto. Los archivos derivados (`bitacora.xml`,
`incidentes.xml`, `api/estado.json`) los regenera el mismo GitHub Action que actualiza el
estado de UptimeRobot cada 5 minutos (`.github/workflows/monitor.yml`) — no hace falta nada
más de tu parte.

## Si el token deja de funcionar

GitHub expira los tokens según lo que hayas configurado al crearlos (o nunca, si elegiste
"No expiration"). Si el panel dice que no puede leer el repositorio, genera uno nuevo con
los mismos permisos y vuelve a conectarte — el anterior puedes revocarlo desde GitHub.
