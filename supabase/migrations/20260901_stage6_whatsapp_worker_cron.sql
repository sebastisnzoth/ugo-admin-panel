create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='ugo-whatsapp-outbox' loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

select cron.schedule(
  'ugo-whatsapp-outbox',
  '* * * * *',
  $$select net.http_get(
      url:='https://ugo-admin-panel.vercel.app/api/whatsapp/send?process_outbox=1',
      headers:='{"Accept":"application/json"}'::jsonb,
      timeout_milliseconds:=15000
    );$$
);
