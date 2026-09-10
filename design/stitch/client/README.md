# UGO Cliente — Stitch import

Fuente: export `stitch_ugo_services_mobile_app.zip` generado desde Google Stitch.

## Objetivo

Este directorio conserva la especificación visual y UX de UGO Cliente como referencia para integrar progresivamente las pantallas al código React/Vite existente sin reemplazar la lógica, APIs, routing ni módulos de proveedor/admin.

## Rama de integración

- Base: `feat/client-ui-penpot`
- Integración: `feat/client-ui-stitch`

## Inventario del export

Pantallas incluidas en el ZIP original:

1. UGO logo
2. UGO Cliente / Home · Radar
3. UGO Cliente / Buscar servicio
4. UGO Cliente / Solicitud · Descripción
5. UGO Cliente / Solicitud · Cuándo
6. UGO Cliente / Solicitud · Ubicación
7. UGO Cliente / Solicitud · Resumen
8. UGO Cliente / Matching
9. UGO Cliente / Profesional encontrado
10. UGO Cliente / Profesional en camino
11. UGO Cliente / Servicio en curso
12. UGO Cliente / Ampliar servicio
13. UGO Cliente / Finalización y firma
14. UGO Cliente / Calificación y propina
15. UGO Cliente / Actividad, historial y garantías
16. UGO Cliente / Perfil del cliente
17. UGO Cliente / Garantías y mediación · UGO Shield
18. UGO Cliente / Reclamo · Carga de evidencias
19. UGO Cliente / Confirmación y ticket de reclamo
20. UGO Cliente / Comprobante, factura y acta técnica
21. UGO Cliente / Factura fiscal y desglose de impuestos
22. UGO Cliente / Póliza Shield y cobertura de garantía
23. UGO Cliente / Modal activar Shield e incidencia
24. UGO Cliente / Re-visita Shield · Tracking en camino
25. UGO Cliente / Acta de cierre de re-visita y liberación de fondos
26. UGO Cliente / Modal de éxito · Custodia liberada y certificado PDF
27. UGO Cliente / Certificado PDF oficial · Peritaje y sellos notariales
28. UGO Cliente / Certificado PDF oficial pág. 2 · Anexo forense
29. UGO Cliente / Actividad · Certificado guardado e historial Shield
30. UGO Cliente / Exportar certificado · Descarga y compartir por email

Cada carpeta del export original contiene `code.html` y `screen.png`. El ZIP adjunto en la conversación es la fuente completa de esos archivos; este commit incorpora primero las reglas y design tokens para iniciar la integración segura.

## Reglas de integración

- No copiar el HTML de Stitch literalmente como aplicación final.
- Reutilizar componentes existentes de UGO cuando sea posible.
- Mantener el Design System único del producto.
- Integrar por flujo: Home → Solicitud → Matching → Servicio → Pago → Actividad → Shield.
- Hugo debe ser un copiloto contextual, no decorativo.
- Mantener touch targets mínimos de 48 px y estados Loading / Empty / Error / Success.
- Ejecutar build y lint antes de promover cambios a la rama base.

## Siguiente etapa

Convertir las pantallas prioritarias del export a componentes React/TypeScript dentro de la arquitectura existente, empezando por Home/Radar y el flujo de solicitud, y comparar cada cambio con la implementación actual antes de modificarla.
