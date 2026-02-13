# KissCam Web

Next.js App Router + TypeScript con API de subida/listado y galeria publica.

## Variables

Usa `.env.example`:

```env
UPLOAD_TOKEN=CHANGE_ME
STORAGE_DIR=/app/data/images
MAX_UPLOAD_MB=15
```

## Endpoints

- `POST /api/upload`:
  - Header `X-Upload-Token`.
  - `multipart/form-data` campo `photo`.
  - Solo `image/jpeg` o `image/png`.
- `GET /api/images`:
  - Lista `[{ id, url, createdAt }]` ordenado por mas reciente.
- `GET /api/images/[id]`:
  - Devuelve el archivo.

## Desarrollo

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t kisscam-fzdomain .
docker run -p 3000:3000 \
  -e UPLOAD_TOKEN=CHANGE_ME \
  -e STORAGE_DIR=/app/data/images \
  -e MAX_UPLOAD_MB=15 \
  -v /opt/kisscam/images:/app/data/images \
  kisscam-fzdomain
```
