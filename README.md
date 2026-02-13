# kisscam-fzdomain

Repositorio full-stack para Kiss Cam:

- `web/`: Next.js (App Router) + TypeScript + API upload/list + galeria publica.
- `mobile/`: Expo (React Native) + TypeScript para operador (camara y subida).
- `deploy/`: snippet Docker Compose + notas Traefik para VPS.
- `.github/workflows/`: CI/CD (build+push GHCR privado + deploy SSH).

## Flujo del producto

1. Operador toma foto desde `mobile`.
2. `mobile` sube archivo a `POST /api/upload` con `X-Upload-Token`.
3. `web` publica todas las fotos en `GET /api/images`.
4. Usuario abre `Snack&Love Kisscam` en `kisscam.fzdomain.cloud`, elige marco y descarga la composicion.

Desde `mobile`, el operador tambien puede revisar historial y eliminar fotos del servidor (protegido por token).

Sin login, sin Google Drive, sin base de datos obligatoria. Las fotos viven en disco (`STORAGE_DIR`).

## Ejecutar localmente

### Web

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Variables:

- `UPLOAD_TOKEN=CHANGE_ME`
- `STORAGE_DIR=/app/data/images`
- `MAX_UPLOAD_MB=15`

### Mobile

```bash
cd mobile
cp .env.example .env
npm install
npm run start
```

Variables:

- `KISSCAM_BASE_URL=https://kisscam.fzdomain.cloud`
- `UPLOAD_TOKEN=CHANGE_ME`

### Mobile distribuible (EAS)

Para instalar en varios moviles sin Expo Go:

```bash
cd mobile
npm install -g eas-cli
eas login
eas init
npm run build:android:apk
```

El build `preview` genera APK instalable en multiples Android. Para iOS/tiendas usa `npm run build:ios` y `npm run build:android:aab`.

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/deploy.yml`

Al hacer push a `main`:

1. Build Docker de `web`.
2. Push a GHCR:
   - `ghcr.io/<owner>/<repo>:latest`
   - `ghcr.io/<owner>/<repo>:<sha>`
3. Deploy SSH al VPS:
   - `docker compose pull kisscam`
   - `docker compose up -d --no-deps kisscam`
   - `docker image prune -f`

Nota: el deploy remoto no hace `docker login`; asume que el VPS ya esta autenticado en GHCR.

## GitHub Secrets requeridos

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PROJECT_PATH`
- `VPS_PORT` (opcional, default `22`)
