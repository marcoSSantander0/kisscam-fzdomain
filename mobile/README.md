# Mobile Operator App

App Expo para operador: toma foto y sube a Kiss Cam.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Define:

- `KISSCAM_BASE_URL` (ejemplo `https://kisscam.fzdomain.cloud`)
- `UPLOAD_TOKEN` (debe coincidir con backend `web`)

## Ejecutar

```bash
npm install
npm run start
```

Para abrir en Android:

```bash
npm run android
```

## Flujo

1. Pantalla camara.
2. Captura foto.
3. Previsualiza.
4. Subir (`multipart/form-data`, campo `photo`, header `X-Upload-Token`).
5. Estado visible: `subiendo`, `ok`, `error`.
