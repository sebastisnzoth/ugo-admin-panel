# Stitch visual source exports

Este directorio versiona los exports físicos completos de Google Stitch para UGO como **fuente visual oficial**.

## Contenido

- Los archivos `.zip` en `design/stitch/sources/` son los exports originales de Stitch.
- Las carpetas descomprimidas existen para auditoría, comparación visual y trazabilidad.
- `STITCH_SOURCES_MANIFEST.md` documenta el inventario de fuentes disponibles.

## Reglas de uso

- Los HTML/PNG son referencia visual y documental, **no código productivo**.
- No se debe copiar `code.html` directamente a `src/`.
- No se deben reemplazar componentes React con código exportado por Stitch.
- Cualquier implementación futura debe portar el lenguaje visual de forma controlada dentro del design system del producto.

## Neutralización de claims antes de runtime

Antes de portar textos, etiquetas, claims o microcopy al runtime, se deben neutralizar o validar claims no verificados como:

- escrow
- BACEN
- custodia
- CFT
- SUSEP
- AWS
- forensic
- biometric
- póliza
- satelital
- seguro
- fiduciario
- certificación legal
