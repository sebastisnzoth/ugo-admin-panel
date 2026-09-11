# UGO — Flujo integral del ecosistema

**Versión:** 2.3 · 11 de septiembre de 2026  
**Estado:** documento maestro funcional  
**Gobernado por:** `UGO_MASTER_GOVERNANCE.md`

> UGO debe permitir pedir y completar un servicio con la simplicidad mental de pedir un viaje: el usuario expresa una necesidad, confirma pocos pasos y UGO resuelve la complejidad por debajo.

---

# 1. Circuito central

```text
Necesidad
→ Hugo entiende
→ solicitud guiada + evidencia
→ confirmación del cliente
→ matching
→ oportunidad
→ aceptación atómica
→ asignación
→ método de pago elegido/habilitado
→ proveedor en camino
→ llegada validada cuando corresponde
→ evidencia Antes
→ ejecución
→ evidencia final
→ cierre según método
→ aprobación/disputa
→ reputación
→ nueva necesidad
```

North Star: **servicios confiables completados dentro de UGO con mínima fricción**.

Regla: el usuario nunca debe tener que entender estados internos, RPC, procesadores, retenciones o arquitectura para pedir un servicio.

---

# 2. Actores

- **Cliente:** cuenta qué necesita, confirma la solicitud, elige cómo pagar, sigue el servicio, aprueba/disputa y califica.
- **Proveedor:** recibe oportunidades, acepta/rechaza, ejecuta, evidencia y cobra.
- **Admin:** opera excepciones, personas, finanzas, disputas y calidad.
- **Super Admin:** gobierna reglas, permisos, configuración e integraciones.
- **Hugo:** mejor amigo/copiloto de UGO; entiende la necesidad, propone solución, completa la solicitud y acompaña el servicio.
- **Scout:** inteligencia operativa.
- **Academia:** formación y mejora de calidad.

---

# 3. Flujo Cliente · pedir un servicio

## 3.1 Principio rector

**Pedir un servicio debe sentirse tan fácil como pedir un Uber, sin copiar su interfaz.**

No se presenta un formulario largo. UGO conduce una conversación por pasos cortos. Cada paso tiene una pregunta principal, una confirmación clara y conserva todo lo ya entendido.

El **Orbe de Hugo permanece accesible** durante el flujo. Voz y texto son dos entradas equivalentes al mismo borrador de solicitud.

## 3.2 Inicio

Home prioriza una sola intención:

```text
¿Qué necesitás?
```

El cliente puede:

```text
hablar con Hugo
O
escribir
O
usar categoría/búsqueda
```

Todas las entradas convergen al mismo flujo.

## 3.3 Hugo entiende antes de preguntar

Ejemplo:

```text
Cliente: “Necesito alguien que me coloque azulejos en el baño.”
Hugo interpreta:
- necesidad: colocación/reparación de azulejos
- profesional probable: azulejista / categoría equivalente
- contexto conocido
```

Hugo **no vuelve a preguntar lo que ya entendió**. Sólo solicita datos faltantes necesarios para conseguir al profesional correcto.

Si la categoría no es obvia, Hugo propone una solución comprensible y pide confirmación; el cliente no necesita conocer el nombre técnico del oficio.

## 3.4 Wizard conversacional canónico

Objetivo normal: **3–5 confirmaciones humanas antes de buscar**, adaptativas según la necesidad.

```text
PASO 1 · ¿Qué necesitás?
voz / texto
→ Hugo interpreta problema + servicio/profesional probable
→ cliente confirma o corrige

PASO 2 · Mostrame el problema
foto/cámara/galería cuando aporte valor
→ Hugo usa la evidencia como contexto
→ omitir si no hace falta

PASO 3 · ¿Cuándo lo necesitás?
ahora / hoy / elegir fecha-hora
→ ubicación se reutiliza si ya está autorizada

PASO 4 · Revisá lo que entendí
servicio + profesional/categoría + lugar + cuándo + fotos + condiciones esenciales
→ Editar o Confirmar solicitud

PASO 5 · Buscar
→ matching real
```

Los pasos son adaptativos: si un dato ya existe o no corresponde, se omite. **Nunca se agregan pasos para satisfacer la estructura interna de la base de datos.**

## 3.5 Solicitud viva

Mientras el cliente habla o escribe, Hugo completa un único draft persistente:

```text
necesidad original
categoría/profesional inferido
resumen estructurado
ubicación
fecha/hora
urgencia
fotos/evidencia
observaciones relevantes
```

El cliente puede ver/corregir lo que Hugo entendió. Voz y texto actualizan el mismo draft; cambiar de modalidad no reinicia el proceso.

La evidencia queda vinculada al draft/request antes del matching.

## 3.6 Matching y asignación

```text
Solicitud confirmada
→ Buscando profesionales
→ oportunidad vinculada al mismo serviceId
→ proveedor acepta atómicamente
→ Proveedor encontrado
→ forma de pago
→ Proveedor en camino
```

Durante la espera se muestra estado humano, recuperación/cancelación y alternativas si no hay match. Nunca se simula una asignación.

---

# 4. Pago · elección simple del Cliente

La complejidad financiera no debe romper el recorrido. El Cliente elige **cómo quiere pagar** con opciones simples y reconocibles, según disponibilidad regional/integraciones:

```text
Tarjeta de crédito/débito
Mercado Pago / billetera compatible
Pix u otro método electrónico habilitado
Efectivo al profesional
```

Métodos guardados pueden reutilizarse. Agregar un método se hace dentro del flujo sin perder el servicio.

## 4.1 Electrónico con custodia cuando aplique

```text
método elegido
→ autorización/procesamiento
→ retenido/protegido cuando el modelo lo permita
→ servicio habilitado
```

## 4.2 Efectivo presencial

```text
cliente elige efectivo
→ efectivo pendiente
→ servicio habilitado
→ ejecución
→ evidencia final
→ proveedor confirma recepción
→ cliente aprueba
→ completado
```

Efectivo nunca se presenta como dinero protegido o custodiado electrónicamente por UGO.

La UI habla de la elección del usuario; backend mantiene procesador, modelo, estado, comisión e idempotencia.

---

# 5. Servicio activo · experiencia tipo viaje

Después de confirmar, el Cliente deja de completar formularios y pasa a **seguir el servicio**:

```text
Buscando
→ Proveedor encontrado
→ Proveedor en camino
→ Llegó
→ Trabajo en curso
→ Trabajo terminado
→ Revisar
→ Cerrar/calificar
```

La pantalla muestra estado actual, proveedor, ETA/ubicación cuando exista, precio/método, evidencia y una próxima acción clara.

El Proveedor ve el mismo `serviceId` y sólo acciones válidas para el estado real.

## 5.1 Llegada

Mientras el proveedor está `en_camino`, UGO puede compartir tracking autorizado. Cuando la solicitud tiene ubicación exacta y aplica validación geográfica, `Confirmar llegada` usa backend como autoridad y el radio operativo vigente es **200 m**.

La UI puede anticipar “ya podés confirmar llegada”, pero nunca reemplaza el guard backend.

## 5.2 Evidencia operacional

La evidencia respeta el momento real del trabajo:

```text
llegado              → Antes
en_progreso          → Durante / Después
esperando_aprobacion → Después sólo como recuperación histórica
```

Una foto `Después` no puede cargarse antes de iniciar y reservarse para cerrar más tarde. El objetivo es que la evidencia represente el trabajo real, no sólo satisfacer un campo.

---

# 6. Proveedor

Estado operacional propio:

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

No se mezcla con estados del servicio.

## Home
Debe responder: **¿qué tengo que hacer ahora?**

## Demanda
Señal agregada de dónde puede existir trabajo; no es una oportunidad concreta.

## Oportunidad

```text
serviceId · trabajo · zona/distancia · cuándo · valor
contexto/evidencia autorizada · match
→ aceptar/rechazar
→ asignación atómica
```

## Misión activa

```text
método habilitado
→ En camino
→ Llegué (validación geográfica cuando aplica)
→ evidencia Antes
→ Iniciar
→ ejecutar
→ evidencia Durante opcional
→ ampliación opcional
→ evidencia Después
→ cierre según método
→ aprobación/disputa
```

---

# 7. Hugo · mejor amigo de UGO

Hugo no es un chatbot lateral. Es una **capa de interacción transversal**.

Cliente:

```text
entiende lenguaje natural
califica la necesidad
propone tipo de solución/profesional
completa el draft mientras conversa
pide sólo lo faltante
explica por qué necesita una foto/dato
resume antes de confirmar
acompaña matching y servicio
ayuda ante dudas o problemas
```

Proveedor:

```text
prepara checklist
ayuda con diagnóstico y seguridad
sugiere ampliación cuando corresponda
ayuda a documentar evidencia
acompaña cierre y aprendizaje
```

Reglas obligatorias:

1. Orbe disponible durante los momentos principales sin tapar CTA críticos.
2. Voz y texto comparten contexto y draft.
3. Hugo no repregunta información confiablemente entendida.
4. Hugo propone; el humano confirma decisiones importantes.
5. Nunca inventa disponibilidad, precio, profesional, pago o estado.
6. Nunca salta permisos, backend guards o aprobación requerida.

---

# 8. Ampliar servicio

```text
se detecta trabajo adicional
→ propuesta: qué + tiempo + costo
→ Cliente revisa
→ impacto financiero se resuelve según método
→ Cliente aprueba/rechaza
→ registro auditable
→ continuar
```

Debe sentirse como parte del servicio actual, no como comenzar otro formulario.

Regla de confianza: **un trabajo adicional con costo no puede quedar aprobado si ese costo no está incorporado o financiado de forma segura**.

Comportamiento actual:

```text
sin pago todavía → el total se ajusta antes del checkout
efectivo pendiente → el total presencial se reajusta
pago fallido/reembolsado → se reajusta para el próximo intento
pago electrónico activo + costo extra → aprobación bloqueada hasta cobrar el delta
```

El checkout específico de **delta electrónico** es P0 pendiente. Hasta que exista y sea conciliable/idempotente, UGO muestra el bloqueo en vez de prometer una ampliación no financiada. Una ampliación sin costo sí puede aprobarse sin alterar custodia.

---

# 9. Finalización

Electrónico:

```text
evidencia final
→ cualquier ampliación con costo ya financiada/reconciliada
→ solicitar revisión
→ cliente aprueba/disputa
→ liberación/reembolso según reglas
→ completado
```

Efectivo:

```text
evidencia final
→ total presencial incluye ampliaciones aprobadas
→ proveedor confirma recepción
→ cliente revisa y aprueba/disputa
→ completado
```

La revisión del Cliente sólo considera su servicio y la evidencia final del proveedor asignado. Sin evidencia final o sin forma de pago válida, UGO no habilita el cierre.

Después del cierre: calificación breve, comentario opcional, historial y posibilidad inmediata de pedir otro servicio.

---

# 10. Recuperación

Todo paso crítico contempla:

```text
sin conexión
error de voz
foto fallida
sin proveedor
rechazo
timeout
método de pago fallido
reconexión
cancelación
reintento/reasignación
```

La recuperación conserva el draft y el `serviceId` cuando corresponda. Un error técnico nunca obliga a reconstruir la solicitud desde cero sin necesidad.

---

# 11. E2E de referencia

```text
Cliente abre UGO
→ habla/escribe a Hugo
→ Hugo entiende y estructura
→ cliente confirma pocos pasos
→ foto si aporta valor
→ cuándo/ubicación
→ resumen y Confirmar solicitud
→ matching
→ proveedor acepta
→ cliente elige/usa método de pago
→ proveedor en camino
→ llegada
→ evidencia Antes
→ trabajo
→ ampliación opcional financiada si tiene costo
→ evidencia Después
→ cierre según método
→ cliente conforme/disputa
→ calificación
→ listo para otro servicio
```

---

# 12. Regla final

**El Cliente cuenta el problema; Hugo y UGO convierten ese problema en una solución. La persona confirma, no administra la complejidad. Si pedir un servicio requiere aprender cómo funciona UGO, el flujo está mal diseñado.**