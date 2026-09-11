# Stitch Sources Manifest

Estos ZIPs son la **fuente visual oficial de Google Stitch** para el sistema UGO.

## Reglas de uso

- Son referencia visual y documental de diseño.
- **No son código productivo.**
- **No se deben copiar directo a `src/`.**
- **No se debe copiar `code.html` al runtime.**
- No reemplazan componentes React existentes.
- Cualquier implementación futura debe portar el lenguaje visual de forma controlada dentro del design system.

## Neutralización obligatoria antes de portar textos al runtime

Antes de mover cualquier texto, etiqueta, claim o microcopy desde estas fuentes hacia producto, hay que neutralizar o validar claims no verificados como:

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

## Inventario de ZIPs

| ZIP | Archivos totales | HTML | PNG | Carpetas principales |
| --- | ---: | ---: | ---: | --- |
| `stitch_ugo_client_web_app.zip` | 107 | 48 | 48 | `stitch_ugo_client_web_app`, `stitch_ugo_client_web_app/` |
| `stitch_ugo_services_mobile_app.zip` | 97 | 45 | 48 | `stitch_ugo_services_mobile_app`, `stitch_ugo_services_mobile_app/` |
| `stitch_ugo_provider_onboarding_app.zip` | 68 | 28 | 31 | `stitch_ugo_provider_onboarding_app`, `stitch_ugo_provider_onboarding_app/` |
| `stitch_task_action_manager.zip` | 61 | 26 | 27 | `stitch_task_action_manager`, `stitch_task_action_manager/` |
| `stitch_ugo_admin_platform_design.zip` | 15 | 6 | 6 | `stitch_ugo_admin_platform_design`, `stitch_ugo_admin_platform_design/` |

## Nota de nombres locales

La instrucción original esperaba nombres con sufijos como `(2)` y `(1)`. En esta carpeta, los exports físicos presentes están versionados sin esos sufijos:

- `stitch_ugo_client_web_app.zip`
- `stitch_ugo_services_mobile_app.zip`
- `stitch_ugo_provider_onboarding_app.zip`
- `stitch_task_action_manager.zip`
- `stitch_ugo_admin_platform_design.zip`
