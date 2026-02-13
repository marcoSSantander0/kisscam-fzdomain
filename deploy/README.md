# Deploy Notes (VPS + Traefik)

1. En el VPS, agrega al `.env` del compose root:

```env
GHCR_OWNER=tu_usuario_github_en_minusculas
UPLOAD_TOKEN=TU_TOKEN_DE_SUBIDA
DOMAIN_NAME=fzdomain.cloud
MAX_UPLOAD_MB=15
```

2. Copia el contenido de `docker-compose.kisscam.snippet.yml` dentro de tu `docker-compose.yml` root del VPS.

3. Asegurate de que el VPS ya tenga acceso a GHCR (segun tu setup ya esta logueado).

4. Levanta o actualiza el servicio:

```bash
docker compose up -d kisscam
```
