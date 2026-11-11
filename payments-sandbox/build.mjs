import {mkdirSync,writeFileSync} from 'node:fs'
mkdirSync('dist',{recursive:true})
writeFileSync('dist/index.html',`<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>UGO Payments Sandbox</title></head>
<body><main><h1>UGO Payments Sandbox</h1>
<p>Ambiente de teste isolado. Nenhuma cobrança real está habilitada nesta página.</p>
</main></body></html>`)
