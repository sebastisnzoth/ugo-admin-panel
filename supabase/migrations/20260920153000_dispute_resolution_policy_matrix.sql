-- UGO · Matriz de política para disputas.
-- La matriz orienta a Admin/IA, pero no ejecuta automáticamente ninguna resolución.

alter table public.reglas_motivos_disputa
  add column if not exists criterio_resolucion text not null default 'Revisar evidencia verificable del mismo serviceId y pedir información adicional cuando falte contexto.',
  add column if not exists resultado_preferido text not null default 'solicitar_evidencia',
  add column if not exists auto_aplicar boolean not null default false;

do $$ begin
 alter table public.reglas_motivos_disputa
  add constraint reglas_motivos_disputa_resultado_preferido_check
  check(resultado_preferido in (
   'confirmar_servicio','retrabajo','reagendar','ajuste_financiero',
   'reembolso','penalizacion','revision_humana','solicitar_evidencia','acuerdo'
  ));
exception when duplicate_object then null;
end $$;

do $$ begin
 alter table public.reglas_motivos_disputa
  add constraint reglas_motivos_disputa_no_auto_apply_check
  check(auto_aplicar=false);
exception when duplicate_object then null;
end $$;

update public.reglas_motivos_disputa set
 criterio_resolucion=case codigo
  when 'no_realizado' then 'Contrastar estados, llegada/ubicación, chat y evidencia. Si no existe ejecución verificable, no asumir prestación sólo por asignación o presencia.'
  when 'incompleto' then 'Comparar alcance pedido con evidencia Antes/Durante/Después y mensajes. Diferenciar tarea pendiente de tarea extra no contratada.'
  when 'calidad' then 'Verificar el resultado visible contra el alcance acordado. Una foto puede mostrar condición, pero no causalidad ni responsabilidad por sí sola.'
  when 'retraso' then 'Comparar horario acordado, timestamps, reprogramaciones y avisos en chat. Considerar si el retraso fue aceptado o informado.'
  when 'cobro_incorrecto' then 'Conciliar monto cotizado, snapshot de tarifa, método de pago y registro del procesador/efectivo. No decidir por memoria de las partes.'
  when 'danio' then 'Revisión humana obligatoria. Comparar evidencia previa y posterior, timestamps y descripción; no atribuir quién causó el daño sin soporte verificable.'
  when 'cliente_ausente' then 'Verificar llegada, horario, chat y ubicación antes de considerar no-show. Confirmar que el proveedor estuvo en el lugar/ventana pactados.'
  when 'sin_acceso' then 'Verificar llegada, horario y mensajes sobre acceso. Priorizar reprogramación cuando ambas partes actuaron de buena fe y el servicio sigue siendo viable.'
  when 'negativa_pago' then 'Conciliar estado del trabajo, aprobación del cliente, método y registro de pago. Cualquier movimiento de dinero requiere flujo financiero auditado.'
  when 'tarea_extra' then 'Comparar pedido original, ampliaciones aceptadas y chat. Una tarea no aprobada no se incorpora automáticamente al alcance.'
  when 'cancelacion_tardia' then 'Verificar momento de cancelación frente al horario programado y evidencia de desplazamiento/preparación. Aplicar sólo consecuencias contractuales configuradas.'
  when 'conducta' then 'Revisión humana obligatoria. Priorizar seguridad y evidencia concreta; no exigir negociación directa entre las partes.'
  when 'fraude' then 'Revisión humana obligatoria. Verificar comprobantes, identidad operativa, pagos y consistencia temporal; evitar inferencias basadas en reputación.'
  else 'Revisar evidencia verificable del mismo serviceId y solicitar información adicional si no alcanza para una conclusión.'
 end,
 resultado_preferido=case codigo
  when 'no_realizado' then 'reembolso'
  when 'incompleto' then 'retrabajo'
  when 'calidad' then 'retrabajo'
  when 'retraso' then 'acuerdo'
  when 'cobro_incorrecto' then 'ajuste_financiero'
  when 'danio' then 'revision_humana'
  when 'cliente_ausente' then 'confirmar_servicio'
  when 'sin_acceso' then 'reagendar'
  when 'negativa_pago' then 'ajuste_financiero'
  when 'tarea_extra' then 'solicitar_evidencia'
  when 'cancelacion_tardia' then 'ajuste_financiero'
  when 'conducta' then 'revision_humana'
  when 'fraude' then 'revision_humana'
  else 'solicitar_evidencia'
 end,
 auto_aplicar=false;

comment on column public.reglas_motivos_disputa.criterio_resolucion is
 'Criterio objetivo que Admin/IA deben considerar. No es una decisión automática.';
comment on column public.reglas_motivos_disputa.resultado_preferido is
 'Salida sugerida por política; requiere revisión del caso y nunca mueve dinero por sí sola.';
comment on column public.reglas_motivos_disputa.auto_aplicar is
 'Guardrail: debe permanecer false. UGO no auto-resuelve disputas con esta matriz.';

notify pgrst,'reload schema';
