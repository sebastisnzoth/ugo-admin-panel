-- Track the Development dashboard itself in the same source of truth it exposes.
insert into public.development_checklist(
  code,area,title,description,priority,status,weight,position,evidence,test_required,completed_at
)
values(
  'DEV-PANEL',
  'Release',
  'Panel Desarrollo en tiempo real',
  'La landing abre un panel Admin con porcentaje verificado, checklist maestro, P0, métricas por área e historial Realtime.',
  'P1',
  'approved',
  3,
  25,
  'UGO Core CI 34939907788 aprobado en main (585d2dcb3cc3acfff7101f8ae02bcb3ee420bedc), incluyendo tests/contracts/development-readiness-dashboard.test.mjs. Deploy Vercel del entorno TEST READY y ruta ?app=development respondió HTTP 200.',
  true,
  now()
)
on conflict (code) do update set
  area=excluded.area,
  title=excluded.title,
  description=excluded.description,
  priority=excluded.priority,
  status=excluded.status,
  weight=excluded.weight,
  position=excluded.position,
  evidence=excluded.evidence,
  test_required=excluded.test_required,
  completed_at=coalesce(public.development_checklist.completed_at,excluded.completed_at),
  updated_at=now();
