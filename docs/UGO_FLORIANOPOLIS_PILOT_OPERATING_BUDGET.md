# UGO — Presupuesto operativo del piloto Florianópolis (modelo sin gasto autorizado)

**Fecha:** 2026-11-11  
**Estado:** MODELO OPERATIVO PRELIMINAR, NO PRESUPUESTO COTIZADO  
**Restricción absoluta:** R$0 de gasto autorizado; sin contratar, activar servicios pagos ni tocar PROD.

## 1. Objetivo y alcance
Piloto limitado a Florianópolis y categorías iniciales Faxina y Marido de Aluguel. El propósito es demostrar servicios reales, continuidad del sistema, experiencia Cliente–Proveedor y conciliación financiera, **sin confundir pruebas TEST con ventas**.

### Puertas técnicas antes de captar clientes reales
1. Salud y cuotas de Supabase PROD verificadas y sostenibles, con límites y alertas.
2. Autenticación y sesiones Cliente/Proveedor estables, GPS y matching comprobados.
3. Política de privacidad, consentimiento, soporte, reclamos, cancelaciones y seguridad.
4. Método de pago legal y funcional; Pix/Asaas split/escrow **NO** se declara E2E aprobado.
5. Recuperación, backups, respuesta a incidentes y métricas de operación.

## 2. Presupuesto por rubro — sin inventar cotizaciones

| Rubro | Gasto aprobado hoy | Costo mensual validado | Método de validación | Condición de activación |
| --- | ---: | --- | --- | --- |
| Supabase / base y almacenamiento | R$0 | Pendiente | Consumo real, cuotas y precio oficial | Continuidad sin excedentes |
| Hosting y funciones | R$0 | Pendiente | Plan y límites de Vercel/alternativas | Medir uso y restricciones comerciales |
| Mapas y geocodificación | R$0 | Pendiente | Políticas de tiles, API y atribución | Estimar solicitudes por servicio |
| Pagos y liquidación | R$0 | Pendiente | Tabla contractual Asaas/otro proveedor | E2E + cumplimiento legal |
| Soporte y moderación | R$0 | Pendiente | Horas reales por incidente y costo de operador | Procedimientos y SLA piloto |
| Captación de proveedores | R$0 | Pendiente | Horas, materiales y tasa de activación | Oferta verificada |
| Captación de clientes | R$0 | Pendiente | Canal orgánico/experimentos, CAC observado | Conversión medible |
| Contabilidad, formalización, privacidad | R$0 | Pendiente | Consulta profesional y requisitos Brasil | Operación comercial regular |
| Seguridad, respaldo y contingencia | R$0 | Pendiente | Pruebas y cotizaciones | Recuperación demostrada |

**No se afirma que estos servicios sean comercialmente gratuitos:** algunos planes gratuitos restringen uso comercial o capacidad; hay que verificar términos antes del piloto.

## 3. Economía unitaria: ejemplo ilustrativo y fórmula
La evidencia TEST #2697 registra un servicio en efectivo de R$120 y comisión de R$18 (15%). **No es venta real ni tarifa oficial universal.**

Definiciones:
- `P` = precio medio real por servicio.
- `c` = comisión efectiva de plataforma (entre 0 y 1).
- `f` = tarifa variable de procesamiento por servicio (R$).
- `s` = costo variable de soporte/operación por servicio (R$).
- `r` = costo esperado de reembolsos, disputas, fraude e impuestos variables por servicio (R$).
- `F` = costos fijos mensuales (R$).
- `N` = servicios reales completados y cobrados por mes.

`Margen de contribución unitario = P × c − f − s − r`  
`Resultado operativo simplificado = N × margen unitario − F`  
`Punto de equilibrio (servicios/mes) = ceil(F / margen unitario)`, **solo si el margen es positivo**.

### Sensibilidad matemática (NO pronóstico, NO cotización)
Se usa exclusivamente como ejercicio `P = R$120`, `c = 15%`, `f+s+r = R$6`, por lo que el margen unitario **hipotético** sería R$12. Ninguno de estos costos variables ha sido medido.

| Costos fijos mensuales hipotéticos | Servicios/mes para cubrirlos | Servicios/día aprox. (30 días) |
| --- | ---: | ---: |
| R$0 | 0 | 0 |
| R$600 | 50 | 1,67 |
| R$1.500 | 125 | 4,17 |
| R$3.000 | 250 | 8,33 |

**Importante:** no se incluyen salarios de fundador, gastos financieros, inversiones iniciales, obligaciones fiscales específicas ni provisiones legales. Si el margen unitario es menor o negativo, el punto de equilibrio sube o no existe.

## 4. Métricas del piloto y evidencia requerida

| Indicador | Fórmula o prueba | Línea de base real |
| --- | --- | --- |
| Servicios cobrados | Pago real conciliado con proveedor y banco | No establecida |
| GMV | Suma de servicios reales completados y cobrados | No establecido |
| Ingreso de plataforma | Comisiones efectivamente devengadas | No establecido |
| Margen de contribución | Ingreso menos costos variables medidos | No establecido |
| Tasa de matching | Ofertas aceptadas / solicitudes elegibles | No establecida |
| Conversión | Servicios pagados / solicitudes válidas | No establecida |
| Cancelaciones | Cancelaciones / solicitudes válidas | No establecida |
| CAC | Gasto de captación / nuevos clientes que pagan | No establecido |
| Recompra | Clientes con segundo servicio / clientes pagadores | No establecida |
| Continuidad | Disponibilidad y errores observados | Medición de piloto pendiente |

## 5. Etapas con criterio de salida
- **P0, seguridad:** estabilizar sesiones, cuotas y base de datos; comprobar backup y restauración TEST. No usar PROD como banco de pruebas.
- **P1, pagos:** demostrar cobro y conciliación E2E en Sandbox y luego revisar requisitos para uso comercial.
- **P2, operación:** documentar soporte, cancelación, KYC, privacidad y manejo de incidentes.
- **P3, piloto controlado:** obtener autorización para gastos/operación y medir un grupo pequeño de servicios reales.
- **P4, inversión:** elaborar presupuesto real de 3/6/12 meses con costos cotizados, datos del piloto y contingencias; solo entonces solicitar monto y evaluar pre-money.

## 6. Conexión con la valuación
El costo de reconstrucción preliminar (escenario central R$525.300) **no** es el costo de operar el piloto, ni la inversión requerida, ni el valor de empresa. La valuación queda abierta hasta contar con derechos verificables, tracción real, márgenes y evidencia de mercado.

**Acciones ejecutadas:** únicamente documentación en GitHub. Ningún gasto ni acceso a PROD.
