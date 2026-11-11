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
