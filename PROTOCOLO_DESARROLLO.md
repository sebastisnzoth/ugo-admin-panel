# 🔒 PROTOCOLO DE DESARROLLO — U.GO

## REGLA #1: NUNCA HACER PUSH SIN VERIFICAR

### Antes de CUALQUIER commit:
1. ✅ **Revisar QUÉ cambié** (`git diff`)
2. ✅ **Probar LOCALMENTE** (abrir archivo en navegador o verificar sintaxis)
3. ✅ **Validar que no rompe nada existente**
4. ✅ **SOLO ENTONCES hacer commit y push**

### Cambios PROHIBIDOS sin verificación:
- ❌ Modificar archivos HTML/JS sin probar después
- ❌ Cambiar vercel.json sin testear headers
- ❌ Tocar Supabase schema sin backup
- ❌ Agregar headers/CSP sin validar en navegador

---

## REGLA #2: UN CAMBIO A LA VEZ

- **Nunca** múltiples cambios en un commit
- **Cada** cambio = **Un** commit separado
- Si algo se rompe, es fácil identificar cuál fue

---

## REGLA #3: DOCUMENTAR ANTES DE IMPLEMENTAR

Antes de tocar código:
1. 📝 Documentar QUÉ voy a cambiar
2. 📝 Documentar POR QUÉ
3. 📝 Documentar CÓMO lo voy a probar
4. **SOLO ENTONCES** empezar a implementar

---

## REGLA #4: PRUEBAS OBLIGATORIAS

Para CADA cambio:
- ✅ Verificar en navegador (F12 Console sin errores)
- ✅ Probar login/funcionalidad principal
- ✅ Verificar en móvil si aplica
- ✅ Revisar que Supabase conecta correctamente

---

## CHECKLIST ANTES DE PUSH

```
☐ ¿Probé el cambio localmente?
☐ ¿No hay errores en console?
☐ ¿Las funciones principales siguen funcionando?
☐ ¿Verifiqué que nada se rompió?
☐ ¿El cambio es UN SOLO cambio lógico?
☐ ¿Tiene un mensaje de commit claro?
☐ ¿Estoy 100% seguro de que funciona?

Si NO a cualquiera → NO HACER PUSH
```

---

## SI ALGO SE ROMPE

- Revertir INMEDIATAMENTE
- Analizar QUÉ se rompió
- Arreglarlo CORRECTAMENTE
- Verificar QUE FUNCIONA
- RECIÉN ENTONCES hacer push

---

**CUMPLIR ESTO SIN EXCEPCIONES. NO MÁS PROMESAS — ACCIONES.**
