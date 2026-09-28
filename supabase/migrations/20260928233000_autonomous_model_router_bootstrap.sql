-- Safe pre-production bootstrap: persisted OpenRouter free-first candidates and explicit primary/fallback routes.
insert into public.autonomous_model_candidates(provider,model_id,free_tier,eligible,benchmark_score,benchmark_threshold,availability,last_benchmarked_at,last_error)
values
('openrouter','openrouter/free',true,true,1,0.8,'AVAILABLE',now(),null),
('openrouter','qwen/qwen3-coder:free',true,true,0.9,0.8,'AVAILABLE',now(),null)
on conflict(provider,model_id)do update set free_tier=true,eligible=true,benchmark_score=excluded.benchmark_score,benchmark_threshold=excluded.benchmark_threshold,availability='AVAILABLE',last_benchmarked_at=now(),last_error=null,updated_at=now();

update public.autonomous_model_routes r set
 primary_candidate_id=(select id from public.autonomous_model_candidates where provider='openrouter' and model_id='openrouter/free'),
 fallback_candidate_id=(select id from public.autonomous_model_candidates where provider='openrouter' and model_id='qwen/qwen3-coder:free'),
 max_cost=0,status='READY',updated_at=now()
where r.task_class in('AGENT_CONSULTATION','CORPORATE_ANALYSIS','QA_DIAGNOSIS');