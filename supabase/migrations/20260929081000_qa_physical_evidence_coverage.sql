-- Simulated DB lifecycle and server GPS rejection probes cannot establish
-- that a physical device captured GPS or that evidence bytes were uploaded.
update public.autonomous_quality_coverage
set requirement='Persisted demo P0 business lifecycle; physical GPS, image bytes and real customer excluded',
    updated_at=now()
where coverage_key='service-lifecycle';
update public.autonomous_quality_coverage
set requirement='Backend GPS and geofence deterministic probes; physical device fix excluded',
    updated_at=now()
where coverage_key='gps-geofence';
insert into public.autonomous_quality_coverage(coverage_key,domain,requirement,status)
values
 ('physical-gps-device','location','Recent physical device GPS acquisition during two-device P0 journey','UNCOVERED'),
 ('uploaded-media-bytes','evidence','Initial and final uploaded image bytes can be fetched from protected Storage','UNCOVERED'),
 ('real-customer-acceptance','journey','Non-demo customer and provider complete and accept full journey on two devices','UNCOVERED')
on conflict(coverage_key) do nothing;
