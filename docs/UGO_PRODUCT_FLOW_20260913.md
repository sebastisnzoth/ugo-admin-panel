# UGO — Flujo de producto 2026-09-13

## Objetivo
Convertir la experiencia Cliente ↔ Hugo ↔ Proveedor en un flujo natural, visible y confiable, preparar versiones web reales para Cliente y Proveedor, y preparar UGO Empresas/Contratistas sin mezclarlo con el pedido doméstico.

## P0 Cliente · Hugo

### Conversación guiada
Hugo debe completar el pedido mientras el cliente habla o escribe. Voz, texto y formulario comparten un único borrador y nunca deben pisarse entre sí.

Orden recomendado:
1. Lugar del servicio.
2. Categoría/profesional.
3. Qué pasó / qué hay que hacer.
4. Cuándo se necesita.
5. Preferencias relevantes.
6. Resumen.
7. Confirmación.
8. Matching.

Ejemplo validado de conversación:
- Lugar: casa.
- Profesional: electricista.
- Problema: dos enchufes y un punto de luz.
- Fecha: mañana 10:00.
- Preferencias: puntualidad y aviso antes de llegar.
- Hugo resume y sólo entonces confirma.

### Direcciones
El cliente debe poder elegir direcciones guardadas por nombre, por ejemplo Casa, Trabajo, Casa de fin de semana u Otra. Hugo debe entender frases naturales como “en mi casa”, “en la oficina” o “en casa de mi mamá”. Si la dirección no existe, debe ofrecer usar ubicación actual o cargar una nueva y poder guardarla.

### Matching
La pantalla de búsqueda nunca puede parecer congelada. Debe mostrar:
- estado activo;
- contador de tiempo;
- texto “Estamos buscando tu profesional”;
- reintento sobre el mismo serviceId;
- cancelar;
- seguir usando UGO mientras la búsqueda continúa;
- actualización realtime cuando cambia el estado.

## P0 Proveedor

### Oportunidad entrante
El proveedor recibe una notificación push similar a una app de mensajería. Antes de aceptar debe ver lo necesario para decidir:
- categoría;
- descripción del trabajo;
- zona/distancia aproximada sin revelar más datos personales de los necesarios;
- fecha y hora;
- duración estimada si está disponible;
- urgencia;
- valor estimado / visita base;
- fotos/evidencias del pedido;
- compatibilidad con su perfil.

Acciones: Aceptar / Rechazar.

### Agenda
Una oportunidad aceptada y programada pasa a Agenda/Mis trabajos. UGO Pro debe convertirse en agenda diaria del proveedor:
- resumen del día;
- próximos trabajos;
- recordatorio el día anterior o por la mañana;
- recordatorio previo a la salida;
- “Voy en camino”;
- “Llegué”;
- inicio del trabajo;
- cierre.

El matching debe considerar agenda y evitar ofrecer trabajos incompatibles por horario. No alcanza con cercanía.

### Precio y ampliaciones
El proveedor puede definir visita/tarifa base y especialidades. Si en el lugar aparece trabajo adicional, se agrega dentro de UGO con descripción, precio, tiempo y aprobación explícita del cliente antes de ejecutarlo.

### Retención dentro de UGO
No se intenta impedir que cliente y proveedor hablen. Se reduce el incentivo a sacar el trabajo de plataforma haciendo que continuar dentro de UGO tenga más valor:
- garantía y protección;
- cobro trazable;
- ampliaciones en un toque;
- historial y comprobante;
- reputación/Karma;
- recontratación sencilla del mismo profesional;
- soporte/disputa;
- recordatorios y agenda;
- comisión razonable y transparente.

El objetivo es que coordinar por fuera sea menos conveniente que seguir dentro de UGO.

## P1 Web real · Cliente y Proveedor

Las versiones web no deben ser demos separadas ni usar datos inventados. Deben reutilizar las mismas sesiones, estados, RPC, permisos y serviceId de las apps operativas.

### Cliente Web
- misma autenticación y onboarding que Cliente;
- mismo Hugo y mismo borrador voz/texto/formulario;
- mismas categorías y direcciones;
- mismo matching, pagos, actividad, perfil, evidencia y disputas;
- layout adaptado a navegador/desktop sin duplicar dominio.

Rutas previstas:
- `?app=client-web`
- `?app=web-client`

### Proveedor Web
- misma autenticación y onboarding que Proveedor;
- mismas oportunidades, agenda, trabajo activo, ganancias, perfil y Hugo;
- misma autoridad backend y realtime;
- layout adaptado a navegador/desktop sin crear un proveedor paralelo.

Rutas previstas:
- `?app=provider-web`
- `?app=web-provider`

La variante `stitch-client` queda sólo como referencia visual/demo y no debe confundirse con Cliente Web operativo.

## P1 UGO Empresas / Contratistas

Crear un flujo separado para contratistas, obras y empresas. Un pedido empresarial puede requerir varios profesionales o nichos específicos (por ejemplo azulejista, carpintero de obra, electricista, pintor) y no debe modelarse como un pedido doméstico de un único proveedor.

El pedido empresarial debe admitir:
- cantidad de profesionales por oficio;
- fechas/turnos;
- duración del proyecto;
- ubicación de obra;
- responsable/contratista;
- presupuesto o tarifa;
- requisitos/documentación;
- aceptación de varios proveedores;
- agenda y seguimiento por lote.

## Orden de implementación
1. Unificar borrador Hugo voz + texto + formulario + ubicación/direcciones.
2. Cerrar matching Cliente recuperable y realtime.
3. Enriquecer Oportunidad Proveedor con fecha/hora/duración/valor/descripción.
4. Push proveedor accionable.
5. Agenda proveedor y detección de conflictos.
6. Visita base + ampliación dentro de UGO.
7. Consolidar Cliente Web y Proveedor Web sobre el dominio real.
8. Estrategia de retención y recontratación.
9. Diseñar UGO Empresas/Contratistas como flujo independiente.

## Regla de validación
Nada pasa a VALIDATED sólo por compilar o verse bien. Se valida con flujo real Cliente ↔ Proveedor sobre TEST, mismo serviceId, estados persistidos, realtime y acciones positivas/negativas reproducibles. Las variantes web deben demostrar que reutilizan ese mismo contrato y no datos demo.
