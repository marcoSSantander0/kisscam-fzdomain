# Mobile Operator App

App Expo para operador: toma foto y sube a Kiss Cam.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Define:

- `KISSCAM_BASE_URL` (ejemplo `https://kisscam.fzdomain.cloud`)
- `UPLOAD_TOKEN` (debe coincidir con backend `web`)
- `ANDROID_APPLICATION_ID` (ejemplo `cloud.fzdomain.kisscam`)
- `IOS_BUNDLE_IDENTIFIER` (ejemplo `cloud.fzdomain.kisscam`)
- `EAS_PROJECT_ID` (`e128507d-4336-4153-97d8-2b6f9b24f6f2`)

## Desarrollo local

```bash
npm install
npm run start
```

Para Android local:

```bash
npm run android
```

## Instalar en varios moviles (EAS)

1. Preparacion inicial:

```bash
npm install -g eas-cli
eas login
```

2. Guarda `UPLOAD_TOKEN` en EAS env:

```bash
eas env:create --scope project --environment preview --name UPLOAD_TOKEN --value "TU_TOKEN"
eas env:create --scope project --environment production --name UPLOAD_TOKEN --value "TU_TOKEN"
```

3. Build APK interna para instalar en varios Android:

```bash
npm run build:android:apk
```

4. Builds de produccion:

```bash
npm run build:android:aab
npm run build:ios
```

## Flujo

1. Pantalla camara.
2. Captura foto.
3. Previsualiza con marcos rectangulares ajustados al borde.
4. Subir (`multipart/form-data`, campo `photo`, header `X-Upload-Token`).
5. Estado visible: `subiendo`, `ok`, `error`.
6. Historial en servidor (auto-refresh cada 5s) con opcion de eliminar fotos.

La app admite orientacion vertical y horizontal.
