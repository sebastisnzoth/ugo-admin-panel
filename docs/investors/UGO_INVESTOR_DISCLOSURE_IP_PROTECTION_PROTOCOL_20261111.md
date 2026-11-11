# UGO — Protocolo de protección antes de contactar inversores

**Fecha:** 2026-11-11  
**Estado:** política interna de divulgación. No es dictamen jurídico ni registro de marca/software.  
**Alcance:** documentación únicamente; no cambia visibilidad de repositorios, permisos, PROD, secretos ni contratos.

## Regla principal

Buscar capital **sin entregar activos técnicos ni información confidencial**. En la primera reunión, mostrar problema, producto a nivel funcional, mercado, equipo, estado de validación, modelo comercial hipotético y plan de uso de fondos; no código, arquitectura sensible ni datos personales.

## Clasificación de información

| Nivel | Se puede mostrar | Condición |
| --- | --- | --- |
| Público / teaser | Qué hace UGO, Florianópolis, categorías, hipótesis de modelo, capturas TEST anonimizadas | Revisión previa y aprobación del fundador |
| Controlado / diligence | Roadmap, riesgos, demo guiada TEST, modelo financiero con supuestos, costos, detalles de módulos | Identidad y legitimidad del destinatario verificadas; enlace de acceso limitado y registro de entrega |
| Confidencial | Código fuente, algoritmos detallados, esquema de BD, reglas de seguridad, integraciones internas, contratos, documentos legales de IP | Necesidad real, asesoramiento jurídico y NDA cuando corresponda; acceso mínimo |
| Nunca enviar | Contraseñas, tokens, service_role, claves Asaas, backups con datos personales, información de usuarios, accesos PROD | Prohibición absoluta |

**Importante:** no asumir que el repositorio GitHub es privado. Verificar visibilidad y secretos/historial antes de considerar cualquier activo confidencial. Si el código ya es público, un NDA posterior no revierte su divulgación.

## Medidas prácticas antes del primer contacto

1. Verificar visibilidad de cada repositorio y sus forks, releases, GitHub Pages, paquetes y artefactos públicos; registrar evidencia sin cambiar permisos automáticamente.
2. Revisar historial Git, variables de entorno, screenshots, archivos y documentos para exposición de secretos o datos personales. Si se detectan claves reales, tratar como incidente y pedir autorización para rotación; no copiarlas a reportes.
3. Auditar licencia raíz, licencias de dependencias, mapas/tiles, assets, contribuciones y uso de herramientas IA; no prometer titularidad exclusiva antes de revisión.
4. Construir un teaser en tres idiomas sin secretos, datos personales, diagramas internos ni promesas de ingresos.
5. Etiquetar explícitamente TEST, Sandbox, hipótesis financieras y limitaciones del producto.
6. Registrar destinatario, versión de documento, fecha, canal, propósito y aprobación para cada envío.
7. No permitir acceso de terceros a cuentas, base de datos, repositorios o paneles de administración por el hecho de ser inversores.
8. Consultar abogado brasileño sobre titularidad de software, protección de marca ante INPI, contratos con colaboradores y estructura societaria. Registro de marca y registro de programa de computador son trámites distintos; no afirmar derechos registrados.
9. Evaluar NDA para divulgación técnica profunda, reconociendo que muchos fondos no firman NDAs para pitches iniciales; usar disclosure escalonado.
10. Evaluar conflictos de interés del potencial inversor y no firmar exclusividad, cesión de IP ni derechos preferentes sin revisión profesional.

## Guion de presentación seguro

**Se puede decir:** «UGO desarrolla una plataforma para conectar clientes y profesionales de servicios domiciliarios en Florianópolis. Tenemos un producto implementado y un flujo completo documentado en TEST; buscamos socios para validar comercialmente el piloto y cerrar riesgos de operación y pagos».

**No se puede decir sin prueba:** «Tenemos clientes reales pagando», «Pix split funciona en producción», «UGO está patentado», «La marca UGO está registrada», «La empresa vale R$ X», «El software es 100% de titularidad exclusiva sin terceros».

## Control de salida

- [ ] Teaser revisado en español, inglés y portugués.
- [ ] Capturas TEST sin identificadores personales.
- [ ] Auditoría de secretos y visibilidad del repositorio.
- [ ] Revisión de marca, licencia, contribuciones e IP.
- [ ] Registro de entregas preparado.
- [ ] Autorización expresa del fundador para compartir cada material.

## Fuentes primarias a consultar en revisión legal

- INPI Brasil — marcas: https://www.gov.br/inpi/pt-br/servicos/marcas
- INPI Brasil — programas de computador: https://www.gov.br/inpi/pt-br/servicos/programas-de-computador
- Ley brasileña de software 9.609/1998: https://www.planalto.gov.br/ccivil_03/leis/l9609.htm
- Ley general de protección de datos 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

**No se envió material a inversores. No se realizó registro legal ni cambio de permisos.**
