export function clean(value:unknown,max=4000){
 return String(value??'').trim().slice(0,max)
}

export function sanitizeForModel(value:unknown,max=4000){
 let text=clean(value,max)
 text=text
  .replace(/Bearer\\s+[A-Za-z0-9._~+\\/-]+=*/gi,'Bearer [REDACTED]')
  .replace(/\\beyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\b/g,'[REDACTED_JWT]')
  .replace(/\\b(?:sk|sb_secret|service_role|ghp|github_pat|AIza)[-_A-Za-z0-9]{12,}\\b/g,'[REDACTED_SECRET]')
  .replace(/\\b(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|passwd|authorization)\\b\\s*[:=]\\s*["']?[^\\s,"'}]{6,}["']?/gi,'$1=[REDACTED]')
  .replace(/data:[^;\\s]+;base64,[A-Za-z0-9+/=]{80,}/gi,'[REDACTED_BLOB]')
  .replace(/[A-Za-z0-9+/]{800,}={0,2}/g,'[REDACTED_BLOB]')
 return text.slice(0,max)
}
