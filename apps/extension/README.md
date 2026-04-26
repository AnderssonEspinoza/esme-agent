# XIO Chrome Extension

Extension privada para capturar informacion desde paginas que ya estas viendo con tu sesion iniciada.

## Uso

1. Abrir `chrome://extensions`
2. Activar `Developer mode`
3. Cargar esta carpeta como `Load unpacked`
4. Abrir `Options`
5. Configurar:
   - base URL de XIO
   - token de ingesta

## Objetivo

- leer vacantes o datos visibles en LinkedIn
- capturar entregas/fechas desde Cisco (NetAcad / SkillsForAll)
- capturar entregas desde cualquier portal universitario al hacer click en el icono de la extension
- enviar la captura a `POST /api/ingest/browser`
