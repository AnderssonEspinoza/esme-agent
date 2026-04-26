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
6. En una pagina del portal, haz click en el icono de la extension para captura manual.
7. Veras una notificacion de exito/error y badge con cantidad importada.

## Objetivo

- leer vacantes o datos visibles en LinkedIn
- capturar entregas/fechas desde Cisco (NetAcad / SkillsForAll)
- capturar entregas desde cualquier portal universitario al hacer click en el icono de la extension
- enviar la captura a `POST /api/ingest/browser`
