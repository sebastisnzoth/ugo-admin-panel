# UGO — Auditoría de licencias, titularidad, validación de tarifas y valoración

**Fecha:** 2026-11-11  
**Estado:** AUDITORÍA DOCUMENTAL EN CURSO — NO DICTAMEN JURÍDICO NI VALORACIÓN CERTIFICADA  
**Restricción:** no tocar UGO Arena PROD, no contratar servicios, no exponer secretos.

## A. Licencias y titularidad: pruebas efectuadas

Se consultaron directamente los archivos de `main`:
- [`package.json`](../package.json): dependencias directas y scripts.
- [`package-lock.json`](../package-lock.json): **existe**, lockfile v3; permite una revisión futura de versiones transitivas. **No se inspeccionaron todas las licencias individuales** ni se ejecutó escáner SBOM.
- [`docs/third-party/agent-skills-LICENSE`](third-party/agent-skills-LICENSE): aviso MIT de Addy Osmani. Conservar avisos aplicables.
- `LICENSE` en raíz: no localizado mediante consulta exacta; no prueba titularidad ni dominio público.
- [`docs/UGO_INVESTMENT_READINESS.md`](UGO_INVESTMENT_READINESS.md): contiene declaraciones del fundador sobre desarrollo individual con asistencia de IA, aún pendientes de respaldo jurídico/documental.

**Matriz de titularidad / riesgos**
| Grupo | Hallazgo | Riesgo | Evidencia para cerrar |
| --- | --- | --- | --- |
| Código propio UGO | Existe código en repo, no se verificó cadena completa de autoría | Alto para inversión | historial Git, contratos/cesiones, autoría de colaboradores y documentación |
| Código asistido por IA | Declarado por fundador; no verificado origen de cada archivo | Medio/alto | registro de herramientas, términos de uso aplicables, revisión de similitudes |
| Dependencias npm | `package.json` y lockfile presentes | Medio | SBOM completo, versiones, licencias SPDX, avisos y restricciones |
| Recursos de mapas | SDK TomTom y MapLibre declarados | Medio/alto | términos de SDK, API, uso de tiles, datos y atribución |
| Diseños, imágenes, fuentes y marcas | No auditados exhaustivamente | Alto | fuente original, licencia, autorización, atribución y registro de marca si corresponde |
| Datos de usuarios / pruebas | Hay evidencias TEST | Alto | consentimiento, anonimización, LGPD y política de retención |
| Documentación de terceros | Aviso MIT verificado | Bajo si se cumplen avisos | listado de redistribución y conservación de copyright |

**No afirmar que UGO tiene titularidad exclusiva libre de cargas.**

### Protocolo para completar auditoría
1. Congelar SHA de `main` y generar inventario recursivo de código, assets y submódulos.
2. Exportar SBOM con versiones reales del lockfile, licencias y procedencia; investigar licencias ausentes o duales.
3. Auditar imágenes, tipografías, iconos, plantillas, código generado, SDKs y marcas.
4. Revisar historial de commits, colaboradores, contratos y cesiones de derechos; documentar qué pertenece al fundador.
5. Revisar obligaciones de atribución, redistribución, uso comercial, privacidad y tratamiento de datos.
6. Obtener revisión legal especializada en Brasil antes de certificar derechos o negociar cesiones.

## B. Validación externa inicial de tarifas (fuentes públicas, NO ofertas de proveedores)

**Fuentes consultadas 2026-11-11:**
- Lancei, benchmark Brasil 2026: Full Stack pleno R$120–260/h (mediana reportada R$170/h); sênior R$220–450/h. https://www.lancei.pro/benchmark
- GoappyConnect, tabla de precios publicada para JavaScript/Full Stack: pleno R$100–165/h; sênior R$170–280/h. https://goappyconnect.com/br/blog/quanto-custa-contratar-programador-freelancer
- Revin, artículo de agosto de 2026: freelancer sênior US$18–30/h, fábrica US$25–45/h, squad US$45–75/h, según propuestas observadas por la empresa; **no es índice oficial**, ni se convierte a BRL sin FX fechado. https://revin.com.br/pt/blog/valor-hora-desenvolvimento-brasil-2026
- Sebrae, métodos de valoración: flujo de caja descontado y supuestos de riesgo. https://sebrae.com.br/Sebrae/Portal%20Sebrae/UFs/PE/Anexos/Valuation%20como%20calcular%20o%20valor%20da%20sua%20startup.pdf

**Evaluación:** R$150/h está dentro de las franjas públicas de desarrollador pleno. R$80/h puede corresponder a niveles iniciales; R$250/h corresponde a una banda más especializada. La matriz anterior no es inverosímil como **sensibilidad**, pero no ha sido validada mediante ofertas vinculantes ni mediante estimación externa de horas.

## C. Escenarios revisados con las horas preliminares (sin validar)

| Escenario | Horas asumidas | Tarifa de análisis | Resultado |
| --- | ---: | ---: | ---: |
| Reconstrucción reducida | 1.630 | R$100/h | R$163.000 |
| Reconstrucción central | 3.090 | R$170/h | R$525.300 |
| Reconstrucción compleja | 5.370 | R$280/h | R$1.503.600 |

**Advertencia esencial:** son multiplicaciones de supuestos, **no** valor de mercado, no costo de activos existentes, no oferta contractual. Las horas no fueron estimadas independientemente, y el alcance incluye Pix y automatización aún no terminados. No se suman impuestos, contingencias, licencias, infraestructura, comercialización ni costos legales.

## D. Valoración empresarial fundamentada: conclusión actual

**Resultado de due diligence preliminar: NO DETERMINABLE CON RIGOR.**

- **Método de costo:** sirve para aproximar el esfuerzo de reemplazar funciones especificadas; exige inventario completo, descuento de deuda técnica y separar producto construido de pendientes. No convierte automáticamente costo en valor de empresa.
- **Método de ingresos / DCF:** no aplicable cuantitativamente aún sin ventas reales, márgenes, retención, CAC, churn, crecimiento, impuestos, capital de trabajo y tasa de descuento sustentados. El servicio #2697 fue TEST, no ingreso comercial.
- **Método de comparables:** exige operaciones de empresas verdaderamente comparables por geografía, etapa, mercado, tracción y condiciones; no se identificaron transacciones suficientes para inferir múltiplo.
- **Valor pre-money / participación:** imposible justificar sin monto solicitado, estructura societaria, titularidad, hitos, riesgo y términos de inversión.

**Conclusión para inversores:** presentar los escenarios de reconstrucción como **estimaciones internas con benchmarks públicos**, y la valoración empresarial como **pendiente de validación**, nunca como una tasación aprobada.

## E. Evidencias necesarias y criterio de cierre

| Tarea | Estado |
| --- | --- |
| Verificar archivos de Admin, Super Admin y dependencias directas | HECHO |
| Confirmar lockfile y aviso MIT de terceros | HECHO |
| Contrastar tarifas con fuentes públicas brasileñas | HECHO — REFERENCIAL |
| Construir sensibilidad de reconstrucción | HECHO — HIPOTÉTICA |
| SBOM completo y licencias transitivas | PENDIENTE |
| Auditoría de autoría, contratos y assets | PENDIENTE |
| Dos cotizaciones independientes con alcance fijo | PENDIENTE |
| Estimación independiente de horas por módulo | PENDIENTE |
| Presupuesto del piloto y métricas reales de tracción | PENDIENTE |
| Valoración revisada por profesional competente | PENDIENTE |

**No se efectuó contratación, desembolso, cambio de infraestructura ni prueba contra PROD.**
