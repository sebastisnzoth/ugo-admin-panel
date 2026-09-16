# UGO — IMPLEMENTACIÓN GOOGLE AI STUDIO + SEGURIDAD P0

SOS EL AGENTE PRINCIPAL DE IMPLEMENTACIÓN DE UGO.

Tu trabajo NO es crear otro prototipo.
Tu trabajo es integrar en el producto REAL de UGO la interfaz y UX definidas por Google AI Studio / ZIP de referencia, conservando y conectando toda la funcionalidad existente.

REPOSITORIO:
https://github.com/sebastisnzoth/ugo-admin-panel

RAMA OBLIGATORIA:
main

NO crear branches.
NO trabajar en una rama alternativa.
NO reemplazar el proyecto por un demo.
NO destruir funcionalidad existente.
NO usar datos falsos donde exista backend real.

PRINCIPIO DE PRODUCTO:
"Un pedido. Un profesional. Sin vueltas."

==================================================
0. FUENTES DE VERDAD
==================================================

Antes de modificar código:

1. Leer AGENTS.md.
2. Leer los MD maestros existentes.
3. Leer el roadmap/checklist actual.
4. Leer el documento:
   UGO_AI_STUDIO_UX_UI_MASTER
5. Inspeccionar el ZIP/UI de Google AI Studio usado como referencia.
6. Inspeccionar la implementación REAL actual antes de tocarla.

La referencia de Google AI Studio manda en:
- jerarquía visual;
- disposición;
- componentes;
- navegación;
- claridad;
- comportamiento visible;
- estados;
- experiencia mobile.

El repositorio actual manda en:
- backend;
- datos;
- Supabase;
- autenticación;
- serviceId;
- pedidos;
- matching;
- proveedores;
- chat;
- pagos;
- estados;
- reglas de negocio.

NO elegir entre uno u otro.

OBJETIVO:
UI de AI Studio + funcionalidad real de UGO.

==================================================
1. CAMBIO P0 AHORA
==================================================

Implementar la experiencia visual del ZIP de Google AI Studio sobre la aplicación real.

NO reinterpretar innecesariamente el diseño.

NO dejar la interfaz vieja simplemente porque ya funciona.

NO reemplazar lógica funcional por HTML/CSS falso.

NO crear botones decorativos.

Todo botón visible debe:
- funcionar;
- navegar correctamente;
- cambiar estado correctamente;
- mostrar loading cuando corresponda;
- mostrar error cuando corresponda;
- tener recuperación;
- estar conectado a la operación real.

==================================================
2. EXPERIENCIA CLIENTE
==================================================

El flujo principal debe quedar:

Inicio
→ necesidad
→ categoría
→ ubicación
→ ahora / programar
→ búsqueda
→ profesionales reales disponibles
→ selección/asignación
→ confirmación
→ profesional asignado
→ en camino
→ llegó
→ trabajando
→ finalización
→ pago
→ calificación.

El cliente DEBE poder crear más de un pedido.

Un pedido activo o programado NO puede bloquear la creación de otro.

Actividad debe funcionar como memoria central.

Cada pedido debe abrir su detalle correcto usando su serviceId.

Debe poder:
- ver estado;
- abrir chat;
- cancelar cuando corresponda;
- reprogramar cuando corresponda;
- ver profesional;
- ver fecha/hora;
- ver ubicación;
- ver precio/pago cuando exista;
- acceder a ayuda y seguridad.

==================================================
3. BÚSQUEDA Y MATCHING
==================================================

Eliminar definitivamente los falsos bloqueos de:

"Buscando tu profesional..."

La búsqueda debe usar proveedores realmente ONLINE.

Debe existir:

SEARCHING
→ MATCHED

o

SEARCHING
→ EMPTY

o

SEARCHING
→ ERROR

Nunca dejar una espera infinita.

Si no hay profesionales:

mostrar empty state real con:
- explicación;
- reintentar;
- cambiar categoría;
- cambiar ubicación;
- programar;
- cancelar búsqueda.

Las ProviderCard deben representar datos reales.

No inventar:
- nombres;
- ratings;
- ubicación;
- distancia;
- disponibilidad;
- estados.

==================================================
4. CHAT P0
==================================================

El chat es P0.

Debe ser:

CLIENTE ↔ PROVEEDOR

bidireccional,
realtime,
aislado por serviceId.

Un mensaje del proveedor debe aparecer en el cliente.
Un mensaje del cliente debe aparecer en el proveedor.

No aceptar contaminación entre pedidos.

AUTORIZACIÓN OBLIGATORIA:
solo cliente y proveedor pertenecientes al pedido pueden leer/escribir en ese chat.

Agregar respuestas rápidas estilo apps de movilidad/servicios, por ejemplo:
- Ya voy
- Llegué
- Estoy en la puerta
- ¿Podés confirmar la dirección?
- Dame unos minutos
- Trabajo iniciado
- Trabajo finalizado

No exponer ni facilitar intercambio de contacto externo.

Detectar/bloquear según las reglas del producto:
- teléfonos;
- WhatsApp;
- emails;
- links;
- usernames/contactos externos.

==================================================
5. PROVEEDOR
==================================================

El proveedor debe tener un flujo simple:

Offline
→ Online
→ oferta
→ aceptar/rechazar
→ asignado
→ en camino
→ llegué
→ iniciar
→ trabajando
→ finalizar
→ cobrar.

Debe existir:

- trabajos actuales;
- próximos trabajos;
- agenda/calendario;
- historial;
- chat;
- ganancias;
- fondos disponibles;
- retiros;
- reputación/perfil.

No mostrar acciones inválidas para el estado actual.

==================================================
6. SEGURIDAD — P0 ABSOLUTO
==================================================

La nueva UI NO puede reducir la seguridad actual.

Al contrario: endurecerla.

REGLA FUNDAMENTAL:

NUNCA confiar en el frontend para autorización.

Cada operación sensible debe validarse SERVER-SIDE.

Para cualquier acción sobre un pedido:

1. usuario autenticado;
2. rol válido;
3. serviceId explícito;
4. pedido existente;
5. relación usuario ↔ pedido verificada;
6. transición de estado permitida;
7. autorización del backend;
8. registro/auditoría cuando corresponda.

No permitir que cambiar un serviceId en URL/request dé acceso a otro pedido.

CLIENTE:
solo puede operar pedidos propios.

PROVEEDOR:
solo puede operar pedidos asignados a él.

ADMIN:
usar permisos administrativos reales.

SUPER ADMIN:
mantener separado de usuarios normales.

Si Supabase utiliza RLS:
revisar políticas y asegurar aislamiento por usuario/serviceId.

==================================================
7. PROTECCIÓN DE DATOS
==================================================

No colocar secretos en frontend.

Nunca exponer:
- service role keys;
- API secrets;
- tokens administrativos;
- credenciales;
- datos internos innecesarios.

Usar variables de entorno existentes.

No imprimir secretos en logs.

No registrar información sensible innecesaria.

Validar inputs server-side.

Sanitizar contenido mostrado.

En uploads validar:
- autorización;
- tipo;
- tamaño;
- extensión/MIME;
- ownership.

Revisar endpoints y evitar IDOR.

Revisar CORS según arquitectura real.

Aplicar rate limiting a operaciones abusables cuando corresponda.

==================================================
8. SEGURIDAD DE SESIONES
==================================================

Mantener autenticación real.

Para áreas autenticadas:
- verificar sesión;
- verificar rol;
- verificar ownership.

NO convertir Admin en público.

IMPORTANTE:

El PANEL "DESARROLLO" solicitado para seguimiento del proyecto:
- sin login;
- solo lectura;
- nunca mostrar secretos;
- nunca permitir acciones administrativas;
- nunca mostrar datos privados reales innecesarios.

Admin/Super Admin siguen protegidos.

==================================================
9. ESTADOS DE UI
==================================================

Cada flujo importante debe contemplar:

LOADING
EMPTY
ERROR
SUCCESS
RETRY
OFFLINE/CONNECTION ERROR cuando corresponda.

Cada pantalla debe responder inmediatamente:

¿Dónde estoy?
¿Qué está pasando?
¿Qué puedo hacer ahora?

Una acción primaria dominante por pantalla.

Cliente y proveedor NO deben verse como paneles administrativos.

==================================================
10. UX / GOOGLE AI STUDIO
==================================================

Usar el ZIP de AI Studio como referencia visual prioritaria.

Mantener:
- simplicidad;
- espacios;
- jerarquía;
- cards;
- bottom sheets;
- navegación;
- CTA dominante;
- mapa como contexto;
- lista para decidir;
- estados claros.

Base visual:
blanco / negro / grises.

Turquesa UGO como acento.

No copiar:
- logos de Uber;
- textos de Uber;
- ilustraciones propietarias;
- código de Uber;
- activos de Uber.

Sí aplicar la disciplina de interacción.

==================================================
11. MOBILE FIRST
==================================================

El producto debe funcionar en celular REAL.

No aceptar como terminado algo que solo funciona en desktop.

Verificar como mínimo:
- Android;
- viewport móvil;
- teclado;
- scroll;
- safe areas;
- bottom navigation;
- modales;
- bottom sheets;
- mapa;
- formularios;
- chat;
- botones principales.

Desktop también debe estar diseñado intencionalmente.

==================================================
12. NO ROMPER
==================================================

Antes de modificar una pantalla localizar:

- componente;
- ruta;
- hooks;
- servicios;
- endpoints;
- consultas;
- tablas;
- estados;
- tipos;
- tests.

Preservar la lógica existente.

NO romper:
- Supabase;
- Auth;
- Cliente;
- Proveedor;
- Admin;
- serviceId;
- matching;
- chat;
- mapa;
- pagos;
- historial;
- actividad.

Si existe código funcional feo:
refactorizarlo sin destruir la lógica.

==================================================
13. ORDEN DE EJECUCIÓN
==================================================

Prioridad actual:

P0.1 — Integrar UI Google AI Studio
P0.2 — Cliente
P0.3 — Matching real
P0.4 — Estados reales del pedido
P0.5 — Chat realtime bidireccional
P0.6 — Proveedor
P0.7 — Cancelar/reprogramar
P0.8 — Múltiples pedidos
P0.9 — Seguridad
P0.10 — Prueba end-to-end real

No distraerse con P2 mientras exista un P0 roto.

==================================================
14. VALIDACIÓN
==================================================

No escribir "terminado" porque compile.

TERMINADO significa:

UI implementada
+
backend conectado
+
seguridad comprobada
+
flujo probado
+
build correcto
+
prueba real.

Antes de cerrar:

- revisar package.json;
- identificar package manager por lockfile;
- NO inventar scripts;
- ejecutar los scripts reales del repo;
- lint;
- TypeScript/typecheck;
- tests existentes;
- build de producción.

Luego probar manualmente.

==================================================
15. PRUEBA END-TO-END OBLIGATORIA
==================================================

Escenario mínimo:

TELÉFONO A — CLIENTE
TELÉFONO B — PROVEEDOR

1. proveedor online;
2. cliente crea pedido;
3. backend guarda pedido;
4. proveedor recibe oferta;
5. proveedor acepta;
6. cliente ve proveedor;
7. chat cliente → proveedor;
8. chat proveedor → cliente;
9. proveedor: en camino;
10. cliente ve cambio;
11. proveedor: llegué;
12. iniciar;
13. finalizar;
14. cliente confirma;
15. pago/estado correspondiente;
16. calificación;
17. pedido aparece correctamente en historial/actividad.

Después repetir creando un SEGUNDO pedido.

También probar:

- proveedor inexistente;
- cancelación;
- reprogramación;
- pérdida de conexión;
- refresh de navegador/app;
- usuario no autorizado intentando acceder a serviceId ajeno.

==================================================
16. GIT
==================================================

Trabajar SOLO sobre:

main

Antes de comenzar:

git status
git branch --show-current
git pull --ff-only

Confirmar que la rama sea main.

No crear branch.

Después de cada bloque estable:

git status
git diff
git add <archivos-correctos>
git commit -m "<mensaje claro>"

No subir:
- .env;
- secretos;
- tokens;
- credenciales;
- basura temporal.

==================================================
17. DOCUMENTACIÓN / PANEL DESARROLLO
==================================================

Actualizar el estado REAL del checklist.

Separar claramente:

IMPLEMENTADO
VALIDADO
RELEASED
BLOCKED

No aumentar porcentaje por código simplemente escrito.

Un punto aumenta el porcentaje VALIDADO únicamente después de pasar su criterio de aceptación.

Registrar:
- qué se cambió;
- archivos;
- pruebas;
- resultado;
- bloqueo real si existe;
- commit.

==================================================
18. REGLA DE AUTONOMÍA
==================================================

NO preguntarle a Sebastián por decisiones técnicas normales.

Inspeccionar.
Decidir.
Implementar.
Probar.
Corregir.
Volver a probar.
Documentar.
Commit.

Detenerse únicamente ante:
- dinero real;
- producción irreversible;
- credenciales faltantes;
- eliminación destructiva de datos;
- decisión de negocio que realmente requiera al dueño.

==================================================
19. PROHIBIDO
==================================================

PROHIBIDO:

- inventar progreso;
- inventar tests;
- inventar datos;
- declarar validado algo no probado;
- reemplazar funcionalidad por mockups;
- dejar botones sin acción;
- crear un segundo sistema paralelo;
- crear ramas;
- cambiar arquitectura porque sí;
- ocultar errores;
- dejar búsquedas infinitas;
- permitir acceso cruzado entre serviceId;
- exponer datos de contacto;
- exponer secretos.

==================================================
20. RESULTADO FINAL BUSCADO
==================================================

UGO debe verse y sentirse como la experiencia definida en Google AI Studio, pero funcionando sobre el producto REAL.

La apariencia tiene que ser extremadamente simple.

La arquitectura por debajo tiene que ser extremadamente segura.

UI SIMPLE.
LÓGICA REAL.
SEGURIDAD FUERTE.
DATOS REALES.
PRUEBAS REALES.

Un pedido.
Un profesional.
Sin vueltas.

EMPEZÁ AHORA:

1. inspeccioná el repo;
2. localizá los MD maestros;
3. localizá la referencia Google AI Studio;
4. compará la UI actual contra esa referencia;
5. identificá el primer gap P0;
6. implementalo;
7. probalo;
8. corregilo;
9. actualizá checklist;
10. commit en main;
11. seguí con el siguiente P0 sin esperar autorización.