-- RLS cannot govern authenticated reads without base table privileges.
grant select on public.autonomous_qa_simulators to authenticated;
grant select on public.autonomous_qa_scenarios to authenticated;
grant select on public.autonomous_qa_runs to authenticated;
grant select on public.autonomous_quality_coverage to authenticated;
grant select on public.autonomous_release_gate to authenticated;
grant select on public.autonomous_model_candidates to authenticated;
grant select on public.autonomous_model_routes to authenticated;
grant select on public.autonomous_model_metrics to authenticated;
grant select on public.autonomous_enterprise_risks to authenticated;
grant select on public.autonomous_control_coverage to authenticated;
grant select on public.autonomous_challenges to authenticated;
grant select on public.autonomous_experience_signals to authenticated;
grant select on public.autonomous_experience_patterns to authenticated;