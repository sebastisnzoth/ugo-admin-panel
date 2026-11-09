# Pagamentos V2 — Release, backup y rollback

Actualizado: 2026-11-09. Ámbito exclusivo: PR #618 y entornos TEST/Preview aislados. Este documento no autoriza producción, reembolsos, Split ni operaciones comerciales.

## Estado ejecutable

```bash
node scripts/ugo-payment-release-gate.mjs
```

La gate lee únicamente `docs/evidence/pagamentos-v2-arena-20261109.json`; no contacta servicios ni contiene credenciales. Debe terminar **BLOCKED** mientras falte cualquiera de: Split real 85/15, Auth/Realtime/RLS operacional, backup/restore, autorización explícita de producción o primer servicio/comisión real. Un Pix Sandbox PASS no sustituye esas pruebas.

## Rollback de código Preview — verificado por redeploy

1. No usar rollback instantáneo ni cambiar aliases de producción.
2. Redesplegar en el proyecto aislado `ugo-pagamentos-v2-sandbox`, target Preview/staging, el SHA limpio conocido `765255238899ece28fa8d4904dca19cde1545d7c` o un SHA posterior cuyos checks estén verdes.
3. Confirmar en eventos que el comando es `npm run build`, que el deployment queda `READY` y que no aparecen acciones `prepare_*`, `create`, `recover_*`, `confirm` o `reconcile`.
4. Comprobar salud autenticada del deployment con GET. No invocar POST financieros como smoke test.
5. Conservar la evidencia del deployment anterior y del redeploy. El deployment limpio observado es `dpl_4obep2CzzAYr3NhKSzwPS7VY6sus`.

Esto acredita una ruta de rollback de código Preview, no una restauración de base de datos ni rollback financiero.

## Backup y restore Neon TEST — pendiente de ejecución autorizada

No hay evidencia de dump/restore de la base financiera Neon TEST. El backup HIVE/SQLite documentado en otra parte del repositorio no cubre este esquema y no debe aceptarse como sustituto.

Procedimiento requerido, sin ejecutar contra Arena PROD:

1. Desde un entorno autorizado con `UGO_NEON_TEST_READONLY_URL`, crear un dump Custom sólo del esquema `ugo_payments_v2`, fuera de Git y con permisos de archivo `0600`. No imprimir la URL ni incluirla en argumentos registrados por logs.
2. Registrar SHA256, bytes, fecha, SHA del código y conteos por tabla sin exportar PII a la evidencia pública.
3. Restaurar en una base TEST nueva y vacía, nunca sobre la original. Verificar esquema, constraints, conteos y el intent canónico conciliado `received` con exactamente un pago vinculado.
4. Probar que la aplicación apuntada a esa copia no pueda crear otro cargo para el mismo servicio y que los marcadores de recuperación sigan presentes.
5. Destruir la copia sólo tras conservar evidencia sanitizada y autorización de limpieza. No guardar dumps en Git, issues, PR, Vercel logs ni artifacts públicos.

Hasta completar estos pasos, `backupRestore=BLOCKED`.

## Rollback financiero

Una conciliación `RECEIVED` no se revierte cambiando Neon ni redeplegando código. Cualquier cancelación, estorno, transferencia o Split requiere una orden separada, verificación de identidad/estado remoto y evidencia. No ejecutar reembolsos automáticos. Los valores 8.416/1.485 centavos son proyección local, no saldo disponible ni comisión recibida.

## Gates para Release Candidate y producción

- Split real con wallet Asaas independiente, titularidad/KYC, habilitación y lectura de liquidación.
- Auth/Realtime/RLS operacional; los 9 SKIP locales no son PASS.
- Backup/restore TEST comprobado y rollback de código repetible.
- CI same-SHA y Preview limpio.
- Revisión LGPD/KYC, runbook de incidentes y autorización escrita independiente para producción.
- Piloto real separado: cliente/proveedor reales consentidos, servicio completado, Pix conciliado y comisión efectivamente recibida. No extrapolar Sandbox a ingresos reales.
