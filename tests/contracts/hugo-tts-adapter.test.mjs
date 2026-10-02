import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo chat delegates TTS to the server adapter',async()=>{
 const[chat,tts]=await Promise.all([read('api/hugo/chat.ts'),read('server/hugo/ttsAdapter.ts')])
 assert.match(chat,/askHugoTts/)
 assert.doesNotMatch(chat,/generativelanguage\.googleapis\.com/)
 assert.match(tts,/generativelanguage\.googleapis\.com/)
})

test('Hugo TTS sanitizes text and keeps bounded provider timeout',async()=>{
 const tts=await read('server/hugo/ttsAdapter.ts')
 assert.match(tts,/sanitizeForModel\(text,360\)/)
 assert.match(tts,/AbortSignal\.timeout\(6500\)/)
 assert.match(tts,/GEMINI_API_KEY/)
 assert.match(tts,/x-goog-api-key/)
})

test('Hugo TTS keeps bounded fallback models and retry policy',async()=>{
 const tts=await read('server/hugo/ttsAdapter.ts')
 assert.match(tts,/gemini-3\.1-flash-tts-preview/)
 assert.match(tts,/gemini-2\.5-flash-preview-tts/)
 assert.match(tts,/\[404,500,502,503\]/)
 assert.match(tts,/response\.status===429/)
})

test('Hugo TTS returns only audio metadata and base64 payload',async()=>{
 const tts=await read('server/hugo/ttsAdapter.ts')
 assert.match(tts,/audio_base64:audioBase64/)
 assert.match(tts,/mime_type:mimeType/)
 assert.match(tts,/sample_rate:sampleRateFromMime/)
})