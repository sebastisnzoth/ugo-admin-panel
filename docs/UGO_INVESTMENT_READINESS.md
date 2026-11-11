# UGO — Preparación para inversión y protección del proyecto

**Fecha:** 2026-11-10  
**Estado:** DOCUMENTACIÓN INICIAL / NO AUDITADO  
**Alcance:** exclusivamente documental; no altera código, infraestructura, pagos ni producción.

## Objetivo
Preparar un expediente verificable para posibles inversores o socios comerciales sin comprometer los activos de UGO, asumir gastos ni presentar afirmaciones no demostradas.

## Declaraciones del fundador (pendientes de corroboración documental)
- El proyecto fue concebido aproximadamente diez años antes de 2026.
- El fundador declara haber dirigido y desarrollado el proyecto sin otros programadores humanos, utilizando asistencia de IA.
- No hay sociedad constituida, según declaración del fundador.
- La identidad legal y los números de documento se conservan **fuera de este repositorio público**.

Estas declaraciones no constituyen certificación legal de titularidad ni registro de propiedad intelectual.

## Evidencias y verificaciones pendientes
- [ ] Inventariar repositorios, ramas, primeros commits y contribuyentes.
- [ ] Revisar licencias, dependencias, assets y condiciones de herramientas IA.
- [ ] Verificar exposición de secretos y documentación sensible **sin reproducirlos**.
- [ ] Separar funcionalidades implementadas, validadas en TEST y publicadas.
- [ ] Recopilar evidencia de uso, demanda, pilotos e ingresos (si existieran).
- [ ] Preparar demo segura sin acceso a datos reales de clientes.
- [ ] Evaluar vías legales de registro y formalización solo con costos y requisitos comprobados.
- [ ] Investigar inversores y programas con elegibilidad comprobable para fundador sin sociedad constituida.
- [ ] Preparar pitch y presupuesto basados en evidencias; sin inventar valoración ni comprometer equity.

## Reglas de protección
1. Presupuesto de trabajo: **R$ 0**. Ningún gasto o compromiso sin aprobación expresa.
2. **PROD / UGO Arena: solo lectura**; ninguna escritura, migración, cambio de entorno, despliegue o test de carga.
3. No publicar DNI, CPF, RNE, dirección, credenciales, datos de clientes ni material privado.
4. No compartir código fuente con terceros como requisito de una presentación inicial.
5. No negociar ni aceptar cesión de derechos, participación accionaria o exclusividad sin consentimiento explícito y revisión adecuada.
6. Marcar cada afirmación como **verificada**, **declarada** o **pendiente**. No confundir commits o CI con funcionamiento comercial.
7. Este expediente no sustituye asesoría jurídica, contable o migratoria.

## Próxima acción del fundador
Conservar fuera del repositorio cualquier evidencia antigua de la idea (correos, bocetos, documentos o archivos fechados), si existe; no hace falta entregar documentos de identidad.

## Próxima acción técnica
Auditoría **de solo lectura** de autoría, dependencias, licencias y estado del producto; producir un inventario de evidencias con enlaces a commits y pruebas. No iniciar contacto con inversores hasta revisar el material público.

## Primera revisión documental (2026-11-10)
- **VERIFICADO:** existe historial de commits consultable; muestra de referencias: [b3fb12f](https://github.com/sebastisnzoth/ugo-admin-panel/commit/b3fb12f105531aa39fd0ce0a8ec8e22ff8307344) y [d41ff98](https://github.com/sebastisnzoth/ugo-admin-panel/commit/d41ff98153d40813450c45e1fabfd91dac3263d7). **No** se ha determinado aún el primer commit ni todos los autores.
- **VERIFICADO:** el código contiene integraciones de pagos sandbox (por ejemplo, `payments-sandbox/api/webhook.js`); esto **no demuestra** que el flujo comercial esté validado.
- **VERIFICADO:** existen referencias a licencia MIT de componentes externos en `docs/UGO_AGENT_SKILLS_INTEGRACION.md`; falta auditoría integral de licencias.
- **PENDIENTE:** revisión integral de secretos. Una búsqueda de nombres de variables de entorno no confirma ni descarta filtración de valores.
- **PENDIENTE:** inventario de colaboradores, titularidad de assets y aportes de IA; evitar conclusiones legales anticipadas.

## Inventario técnico preliminar — 2026-11-10 (lectura de main)

### Stack comprobado en `package.json`
- React 19, React DOM 19, TypeScript 6, Vite 8.
- `@supabase/supabase-js` para integración con Supabase.
- `@tomtom-org/maps-sdk` y `maplibre-gl` para mapas.
- Herramientas de pruebas y análisis: Node test runner, ESLint y PGlite.
- Scripts definidos: `build`, `lint`, `test`, `test:p0`, `test:integration`, `verify:test-env`. **La existencia de scripts no significa que se hayan ejecutado ni aprobado.**

### Dependencias directas declaradas
| Paquete | Versión declarada | Estado de revisión legal |
| --- | --- | --- |
| react / react-dom | ^19.2.6 | Licencia y avisos: pendiente de verificación específica |
| @supabase/supabase-js | ^2.108.1 | Pendiente |
| @tomtom-org/maps-sdk | ^0.34.0 | Pendiente; revisar además términos de servicio/API |
| maplibre-gl | ^6.9.0 | Pendiente |
| vite | 8.1.6 | Pendiente |
| typescript | ~6.0.2 | Pendiente |
| @electric-sql/pglite | 0.5.10 | Pendiente |

La lista es **parcial**: no sustituye el inventario del lockfile, dependencias transitivas, imágenes, fuentes, iconos, SDK, contenidos o código de terceros.

### Hallazgos sobre procedencia
- La documentación `docs/UGO_AGENT_SKILLS_INTEGRACION.md` identifica un fork externo de Agent Skills, revisión `aeac41d4d005999432bb7312f7ff06383a91d59d`, licencia MIT y aviso en `docs/third-party/agent-skills-LICENSE`.
- Esta procedencia está **documentada** pero requiere comprobar el archivo de licencia y la correspondencia con el contenido incorporado.
- La declaración del fundador sobre desarrollo asistido por IA sigue siendo **declaración**, no auditoría legal de contribuciones ni titularidad.
- **No se ha comprobado** la existencia o ausencia de un archivo de licencia general en la raíz; no inferir que todo el repositorio sea libre o propietario por los avisos de terceros.

### Riesgos prioritarios antes de mostrar el repositorio a terceros
1. **Alto — repositorio público:** revisar historial completo por secretos, identificadores personales, claves y datos de clientes; la búsqueda textual parcial no permite descartar filtraciones.
2. **Alto — derechos y titularidad:** verificar autores de commits, material externo, assets y términos de herramientas IA.
3. **Alto — madurez comercial:** validar flujo completo de servicio y pagos en TEST; no atribuir ingresos, clientes o volumen sin registros.
4. **Medio — mapas y APIs:** verificar condiciones y límites de uso comercial de SDK/proveedores.
5. **Medio — evidencia para inversión:** preparar demo sin datos reales, presupuesto documentado y dossier sin código fuente.

### Próxima tarea verificable
Auditoría de historial de autores y secretos con herramientas de lectura, sin copiar secretos al expediente. Si aparece un posible secreto, documentar únicamente ruta/tipo/riesgo y solicitar rotación segura en el entorno autorizado; **no modificar PROD**.

**Alcance de esta actualización:** exclusivamente documentación pública no sensible. No se ejecutaron tests, cambios de infraestructura ni comprobación de producción.

## Segunda revisión — historial y exposición (2026-11-11)

**Método:** consultas de lectura a GitHub Search y a dos commits. No se ejecutó un escaneo exhaustivo del árbol ni del historial Git completo.

### Autoría observable
- La consulta de commits devolvió una **muestra** de 18 referencias; el conector no certifica que sea la totalidad del historial ni permite establecer el primer commit a partir de esta muestra.
- El commit [b3fb12f](https://github.com/sebastisnzoth/ugo-admin-panel/commit/b3fb12f105531aa39fd0ce0a8ec8e22ff8307344) está atribuido por GitHub a la cuenta `sebastisnzoth`, con fecha 2026-06-17. Es una evidencia de actividad del repositorio, **no** de la creación de la idea diez años antes ni de autoría exclusiva.
- No se han revisado todos los autores/coautores de commits. **Titularidad: pendiente.**

### Búsqueda preliminar de referencias sensibles
- Una búsqueda de `SUPABASE_SERVICE_ROLE_KEY` encontró referencias en scripts. Una referencia al **nombre** de la variable no prueba que su **valor** esté expuesto.
- Una búsqueda de `service_role` encontró migraciones SQL de controles de permisos. Tampoco demuestra exposición de una clave.
- Una búsqueda literal con caracteres especiales de una cabecera de clave privada fue rechazada por el buscador; **no se ejecutó ni aprobó** esa comprobación.
- **Resultado de seguridad:** no hay secreto confirmado con estas consultas; tampoco hay evidencia suficiente para declarar el repositorio libre de secretos. **Escaneo completo pendiente**.

### Puerta de divulgación a inversores
- Se puede preparar una ficha comercial sin secretos ni datos personales.
- **No enviar todavía** un enlace al repositorio como dossier de diligencia debida: es público, pero requiere revisión de historial y permisos.
- Si un escaneo posterior detecta una credencial real, no copiarla a documentación pública; priorizar evaluación de revocación/rotación por el responsable, con procedimiento seguro y autorización para entornos productivos.

### Próxima acción
Revisar un inventario completo de autores/archivos y un escaneo de secretos de Git con herramienta adecuada, sin divulgar resultados sensibles. Luego preparar una ficha comercial verificable, separada del expediente técnico público.

## Continuidad — 2026-11-11: primera ficha comercial creada
- **HECHO:** creado [borrador de ficha comercial](UGO_INVESTOR_ONE_PAGER_DRAFT.md), sin datos personales ni secretos, marcado **NO ENVIAR** hasta completar diligencia.
- **HECHO:** búsqueda reciente de 30 commits, con registros entre 2026-11-06 y 2026-11-11; muestra limitada, no inventario completo de autores.
- **LIMITACIÓN:** no fue posible clonar el repositorio en el entorno de auditoría por falta de resolución DNS hacia GitHub. No se ejecutó `git log --all` ni un escáner de secretos de historial completo.
- **PENDIENTE:** ejecutar escaneo de secretos sobre clon local completo, sin copiar valores a documentos públicos. Validar resultados y registrar solo clasificación, rutas y acciones.
- **NO REALIZADO:** contacto a inversores, auditoría legal, valoración, pruebas E2E, despliegues, escrituras en PROD.
- **PRÓXIMA ACCIÓN:** obtener acceso de lectura a historial Git completo para análisis de contribuyentes y secretos, y comprobar evidencia funcional en TEST sin escrituras en producción.
