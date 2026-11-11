# UGO — Inventario reproducible de licencias npm (lockfile)

**Fecha de lectura:** 2026-11-11  
**Fuente exacta:** [`package-lock.json`](../package-lock.json), blob SHA `36a07209f895ae2a8e3337d4f1c6da3c8f0540b4`, lockfileVersion 3.  
**Alcance:** 217 entradas de paquetes instalables listadas en el lockfile, excluyendo la raíz del proyecto. Se cuentan variantes de plataforma por separado; **no son 217 productos ni 217 dependencias directas**. Los datos de licencia son metadatos del lockfile, no dictamen legal.

## Recuento por licencia declarada

| Licencia declarada | Entradas |
| --- | ---: |
| `MIT` | 153 |
| `ISC` | 18 |
| `Apache-2.0` | 16 |
| `MPL-2.0` | 12 |
| `BSD-2-Clause` | 8 |
| `BSD-3-Clause` | 5 |
| `(MIT OR Apache-2.0)` | 1 |
| `See in LICENSE.txt` | 1 |
| `CC-BY-4.0` | 1 |
| `BlueOak-1.0.0` | 1 |
| `0BSD` | 1 |
| **TOTAL** | **217** |

**Licencias no declaradas en lockfile:** 0. Esto no garantiza que las licencias declaradas sean correctas o suficientes.

## Casos que requieren revisión manual

| Paquete | Versión | Licencia del lockfile | Seguimiento |
| --- | --- | --- | --- |
| `@maplibre/mlt` | `1.2.1` | `(MIT OR Apache-2.0)` | Revisar texto completo y obligaciones de redistribución |
| `@tomtom-org/maps-sdk` | `0.34.0` | `See in LICENSE.txt` | Revisar texto completo y obligaciones de redistribución |
| `caniuse-lite` | `1.0.30001810` | `CC-BY-4.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-android-arm64` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-darwin-arm64` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-darwin-x64` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-freebsd-x64` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-linux-arm-gnueabihf` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-linux-arm64-gnu` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-linux-arm64-musl` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-linux-x64-gnu` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-linux-x64-musl` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-win32-arm64-msvc` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `lightningcss-win32-x64-msvc` | `1.32.0` | `MPL-2.0` | Revisar texto completo y obligaciones de redistribución |
| `minimatch` | `10.2.5` | `BlueOak-1.0.0` | Revisar texto completo y obligaciones de redistribución |

**Prioridad alta:** `@tomtom-org/maps-sdk` usa la etiqueta no SPDX `See in LICENSE.txt`; revisar su licencia real y condiciones contractuales del servicio, APIs, datos y atribución antes de asegurar uso comercial.  
**Prioridad media:** `lightningcss` y sus variantes declaran MPL-2.0, que tiene obligaciones específicas para archivos modificados y distribución; comprobar si se distribuyen binarios o código relevante.  
**Prioridad media:** `caniuse-lite` declara CC-BY-4.0; revisar atribución pertinente si se redistribuye contenido.  
**Prioridad media:** `minimatch` declara BlueOak-1.0.0; verificar texto aplicable.

## Próximos controles para cerrar la auditoría

- [x] Extraer y clasificar todas las entradas del lockfile.
- [x] Detectar licencias no SPDX, MPL, CC-BY y BlueOak.
- [ ] Obtener y revisar los textos completos de licencias, avisos y obligaciones de cada paquete.
- [ ] Clasificar dependencias de producción vs desarrollo y cuáles llegan al bundle distribuido.
- [ ] Revisar assets propios/externos, mapas, imágenes, tipografías y marcas.
- [ ] Comprobar titularidad mediante historial, colaboradores, contratos y cesiones.
- [ ] Obtener revisión legal brasileña; **no declarar auditoría jurídica completa hasta entonces**.

## Anexo — inventario de paquetes, versión y licencia

| Paquete (ruta del lockfile) | Versión | Licencia | Dev |
| --- | --- | --- | --- |
| `@babel/code-frame` | `7.29.7` | `MIT` | Sí |
| `@babel/compat-data` | `7.29.7` | `MIT` | Sí |
| `@babel/core` | `7.29.7` | `MIT` | Sí |
| `@babel/generator` | `7.29.7` | `MIT` | Sí |
| `@babel/helper-compilation-targets` | `7.29.7` | `MIT` | Sí |
| `@babel/helper-globals` | `7.29.7` | `MIT` | Sí |
| `@babel/helper-module-imports` | `7.29.7` | `MIT` | Sí |
| `@babel/helper-module-transforms` | `7.29.7` | `MIT` | Sí |
| `@babel/helper-string-parser` | `7.29.7` | `MIT` | Sí |
| `@babel/helper-validator-identifier` | `7.29.7` | `MIT` | Sí |
| `@babel/helper-validator-option` | `7.29.7` | `MIT` | Sí |
| `@babel/helpers` | `7.29.7` | `MIT` | Sí |
| `@babel/parser` | `7.29.7` | `MIT` | Sí |
| `@babel/template` | `7.29.7` | `MIT` | Sí |
| `@babel/traverse` | `7.29.7` | `MIT` | Sí |
| `@babel/types` | `7.29.7` | `MIT` | Sí |
| `@electric-sql/pglite` | `0.5.10` | `Apache-2.0` | Sí |
| `@emnapi/core` | `1.11.1` | `MIT` | Sí |
| `@emnapi/runtime` | `1.11.1` | `MIT` | Sí |
| `@emnapi/wasi-threads` | `1.2.2` | `MIT` | Sí |
| `@eslint-community/eslint-utils` | `4.9.1` | `MIT` | Sí |
| `@eslint-community/eslint-utils/node_modules/eslint-visitor-keys` | `3.4.3` | `Apache-2.0` | Sí |
| `@eslint-community/regexpp` | `4.12.2` | `MIT` | Sí |
| `@eslint/config-array` | `0.23.5` | `Apache-2.0` | Sí |
| `@eslint/config-helpers` | `0.6.0` | `Apache-2.0` | Sí |
| `@eslint/core` | `1.2.1` | `Apache-2.0` | Sí |
| `@eslint/js` | `10.0.1` | `MIT` | Sí |
| `@eslint/object-schema` | `3.0.5` | `Apache-2.0` | Sí |
| `@eslint/plugin-kit` | `0.7.2` | `Apache-2.0` | Sí |
| `@humanfs/core` | `0.19.2` | `Apache-2.0` | Sí |
| `@humanfs/node` | `0.16.8` | `Apache-2.0` | Sí |
| `@humanfs/types` | `0.15.0` | `Apache-2.0` | Sí |
| `@humanwhocodes/module-importer` | `1.0.1` | `Apache-2.0` | Sí |
| `@humanwhocodes/retry` | `0.4.3` | `Apache-2.0` | Sí |
| `@jridgewell/gen-mapping` | `0.3.13` | `MIT` | Sí |
| `@jridgewell/remapping` | `2.3.5` | `MIT` | Sí |
| `@jridgewell/resolve-uri` | `3.1.2` | `MIT` | Sí |
| `@jridgewell/sourcemap-codec` | `1.5.5` | `MIT` | Sí |
| `@jridgewell/trace-mapping` | `0.3.31` | `MIT` | Sí |
| `@mapbox/jsonlint-lines-primitives` | `2.0.3` | `MIT` | No |
| `@mapbox/point-geometry` | `1.1.0` | `ISC` | No |
| `@mapbox/tiny-sdf` | `2.2.0` | `BSD-2-Clause` | No |
| `@mapbox/unitbezier` | `1.0.0` | `BSD-2-Clause` | No |
| `@mapbox/vector-tile` | `3.0.0` | `BSD-3-Clause` | No |
| `@maplibre/geojson-vt` | `6.1.1` | `ISC` | No |
| `@maplibre/maplibre-gl-style-spec` | `26.4.2` | `ISC` | No |
| `@maplibre/mlt` | `1.2.1` | `(MIT OR Apache-2.0)` | No |
| `@maplibre/vt-pbf` | `4.3.2` | `MIT` | No |
| `@napi-rs/wasm-runtime` | `1.2.5` | `MIT` | Sí |
| `@oxc-project/types` | `0.139.0` | `MIT` | Sí |
| `@rolldown/binding-android-arm64` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-darwin-arm64` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-darwin-x64` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-freebsd-x64` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-linux-arm-gnueabihf` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-linux-arm64-gnu` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-linux-arm64-musl` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-linux-ppc64-gnu` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-linux-s390x-gnu` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-linux-x64-gnu` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-linux-x64-musl` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-openharmony-arm64` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-wasm32-wasi` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-win32-arm64-msvc` | `1.1.5` | `MIT` | Sí |
| `@rolldown/binding-win32-x64-msvc` | `1.1.5` | `MIT` | Sí |
| `@rolldown/pluginutils` | `1.0.1` | `MIT` | Sí |
| `@supabase/auth-js` | `2.108.1` | `MIT` | No |
| `@supabase/functions-js` | `2.108.1` | `MIT` | No |
| `@supabase/phoenix` | `0.4.2` | `MIT` | No |
| `@supabase/postgrest-js` | `2.108.1` | `MIT` | No |
| `@supabase/realtime-js` | `2.108.1` | `MIT` | No |
| `@supabase/storage-js` | `2.108.1` | `MIT` | No |
| `@supabase/supabase-js` | `2.108.1` | `MIT` | No |
| `@tomtom-org/maps-sdk` | `0.34.0` | `See in LICENSE.txt` | No |
| `@tybys/wasm-util` | `0.10.4` | `MIT` | Sí |
| `@types/esrecurse` | `4.3.1` | `MIT` | Sí |
| `@types/estree` | `1.0.9` | `MIT` | Sí |
| `@types/geojson` | `7946.0.16` | `MIT` | No |
| `@types/json-schema` | `7.0.15` | `MIT` | Sí |
| `@types/node` | `24.13.2` | `MIT` | Sí |
| `@types/react` | `19.2.17` | `MIT` | Sí |
| `@types/react-dom` | `19.2.3` | `MIT` | Sí |
| `@typescript-eslint/eslint-plugin` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/eslint-plugin/node_modules/ignore` | `7.0.5` | `MIT` | Sí |
| `@typescript-eslint/parser` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/project-service` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/scope-manager` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/tsconfig-utils` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/type-utils` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/types` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/typescript-estree` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/typescript-estree/node_modules/semver` | `7.8.4` | `ISC` | Sí |
| `@typescript-eslint/utils` | `8.61.0` | `MIT` | Sí |
| `@typescript-eslint/visitor-keys` | `8.61.0` | `MIT` | Sí |
| `acorn` | `8.17.0` | `MIT` | Sí |
| `acorn-jsx` | `5.3.2` | `MIT` | Sí |
| `ajv` | `6.15.0` | `MIT` | Sí |
| `balanced-match` | `4.0.4` | `MIT` | Sí |
| `baseline-browser-mapping` | `2.11.22` | `Apache-2.0` | Sí |
| `bidi-js` | `1.1.0` | `MIT` | No |
| `brace-expansion` | `5.0.12` | `MIT` | Sí |
| `browserslist` | `4.28.9` | `MIT` | Sí |
| `caniuse-lite` | `1.0.30001810` | `CC-BY-4.0` | Sí |
| `convert-source-map` | `2.0.0` | `MIT` | Sí |
| `cross-spawn` | `7.0.6` | `MIT` | Sí |
| `csstype` | `3.2.3` | `MIT` | Sí |
| `debug` | `4.4.3` | `MIT` | Sí |
| `deep-is` | `0.1.4` | `MIT` | Sí |
| `detect-libc` | `2.1.2` | `Apache-2.0` | Sí |
| `earcut` | `3.2.3` | `ISC` | No |
| `electron-to-chromium` | `1.5.427` | `ISC` | Sí |
| `escalade` | `3.2.0` | `MIT` | Sí |
| `escape-string-regexp` | `4.0.0` | `MIT` | Sí |
| `eslint` | `10.5.0` | `MIT` | Sí |
| `eslint-plugin-react-hooks` | `7.1.1` | `MIT` | Sí |
| `eslint-plugin-react-refresh` | `0.5.3` | `MIT` | Sí |
| `eslint-scope` | `9.1.2` | `BSD-2-Clause` | Sí |
| `eslint-visitor-keys` | `5.0.1` | `Apache-2.0` | Sí |
| `espree` | `11.2.0` | `BSD-2-Clause` | Sí |
| `esquery` | `1.7.0` | `BSD-3-Clause` | Sí |
| `esrecurse` | `4.3.0` | `BSD-2-Clause` | Sí |
| `estraverse` | `5.3.0` | `BSD-2-Clause` | Sí |
| `esutils` | `2.0.3` | `BSD-2-Clause` | Sí |
| `fast-deep-equal` | `3.1.3` | `MIT` | Sí |
| `fast-json-stable-stringify` | `2.1.0` | `MIT` | Sí |
| `fast-levenshtein` | `2.0.6` | `MIT` | Sí |
| `fdir` | `6.5.0` | `MIT` | Sí |
| `file-entry-cache` | `8.0.0` | `MIT` | Sí |
| `find-up` | `5.0.0` | `MIT` | Sí |
| `flat-cache` | `4.0.1` | `MIT` | Sí |
| `flatted` | `3.4.2` | `ISC` | Sí |
| `fsevents` | `2.3.3` | `MIT` | Sí |
| `gensync` | `1.0.0-beta.2` | `MIT` | Sí |
| `gl-matrix` | `3.4.4` | `MIT` | No |
| `glob-parent` | `6.0.2` | `ISC` | Sí |
| `globals` | `17.6.0` | `MIT` | Sí |
| `hermes-estree` | `0.25.1` | `MIT` | Sí |
| `hermes-parser` | `0.25.1` | `MIT` | Sí |
| `iceberg-js` | `0.8.1` | `MIT` | No |
| `ignore` | `5.3.2` | `MIT` | Sí |
| `imurmurhash` | `0.1.4` | `MIT` | Sí |
| `is-extglob` | `2.1.1` | `MIT` | Sí |
| `is-glob` | `4.0.3` | `MIT` | Sí |
| `isexe` | `2.0.0` | `ISC` | Sí |
| `js-tokens` | `4.0.0` | `MIT` | Sí |
| `jsesc` | `3.1.0` | `MIT` | Sí |
| `json-buffer` | `3.0.1` | `MIT` | Sí |
| `json-schema-traverse` | `0.4.1` | `MIT` | Sí |
| `json-stable-stringify-without-jsonify` | `1.0.1` | `MIT` | Sí |
| `json-stringify-pretty-compact` | `4.0.0` | `MIT` | No |
| `json5` | `2.2.3` | `MIT` | Sí |
| `kdbush` | `4.1.0` | `ISC` | No |
| `keyv` | `4.5.4` | `MIT` | Sí |
| `levn` | `0.4.1` | `MIT` | Sí |
| `lightningcss` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-android-arm64` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-darwin-arm64` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-darwin-x64` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-freebsd-x64` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-linux-arm-gnueabihf` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-linux-arm64-gnu` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-linux-arm64-musl` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-linux-x64-gnu` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-linux-x64-musl` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-win32-arm64-msvc` | `1.32.0` | `MPL-2.0` | Sí |
| `lightningcss-win32-x64-msvc` | `1.32.0` | `MPL-2.0` | Sí |
| `locate-path` | `6.0.0` | `MIT` | Sí |
| `lru-cache` | `5.1.1` | `ISC` | Sí |
| `maplibre-gl` | `6.9.0` | `BSD-3-Clause` | No |
| `minimatch` | `10.2.5` | `BlueOak-1.0.0` | Sí |
| `minimist` | `1.2.8` | `MIT` | No |
| `ms` | `2.1.3` | `MIT` | Sí |
| `murmurhash-js` | `1.0.0` | `MIT` | No |
| `nanoid` | `3.3.19` | `MIT` | Sí |
| `natural-compare` | `1.4.0` | `MIT` | Sí |
| `node-releases` | `2.0.55` | `MIT` | Sí |
| `optionator` | `0.9.4` | `MIT` | Sí |
| `p-limit` | `3.1.0` | `MIT` | Sí |
| `p-locate` | `5.0.0` | `MIT` | Sí |
| `path-exists` | `4.0.0` | `MIT` | Sí |
| `path-key` | `3.1.1` | `MIT` | Sí |
| `pbf` | `5.1.2` | `BSD-3-Clause` | No |
| `picocolors` | `1.1.1` | `ISC` | Sí |
| `picomatch` | `4.0.7` | `MIT` | Sí |
| `postcss` | `8.5.28` | `MIT` | Sí |
| `potpack` | `2.1.0` | `ISC` | No |
| `prelude-ls` | `1.2.1` | `MIT` | Sí |
| `protocol-buffers-schema` | `3.6.1` | `MIT` | No |
| `punycode` | `2.3.1` | `MIT` | Sí |
| `quickselect` | `3.0.0` | `ISC` | No |
| `react` | `19.2.7` | `MIT` | No |
| `react-dom` | `19.2.7` | `MIT` | No |
| `require-from-string` | `2.0.2` | `MIT` | No |
| `resolve-protobuf-schema` | `2.1.0` | `MIT` | No |
| `rolldown` | `1.1.5` | `MIT` | Sí |
| `scheduler` | `0.27.0` | `MIT` | No |
| `semver` | `6.3.1` | `ISC` | Sí |
| `shebang-command` | `2.0.0` | `MIT` | Sí |
| `shebang-regex` | `3.0.0` | `MIT` | Sí |
| `source-map-js` | `1.2.2` | `BSD-3-Clause` | Sí |
| `tinyglobby` | `0.2.17` | `MIT` | Sí |
| `tinyqueue` | `3.0.0` | `ISC` | No |
| `ts-api-utils` | `2.5.0` | `MIT` | Sí |
| `tslib` | `2.8.1` | `0BSD` | No |
| `type-check` | `0.4.0` | `MIT` | Sí |
| `typescript` | `6.0.3` | `Apache-2.0` | Sí |
| `typescript-eslint` | `8.61.0` | `MIT` | Sí |
| `undici-types` | `7.18.2` | `MIT` | Sí |
| `update-browserslist-db` | `1.3.3` | `MIT` | Sí |
| `uri-js` | `4.4.1` | `BSD-2-Clause` | Sí |
| `vite` | `8.1.6` | `MIT` | Sí |
| `which` | `2.0.2` | `ISC` | Sí |
| `word-wrap` | `1.2.5` | `MIT` | Sí |
| `yallist` | `3.1.1` | `ISC` | Sí |
| `yocto-queue` | `0.1.0` | `MIT` | Sí |
| `zod` | `4.6.7` | `MIT` | Sí |
| `zod-validation-error` | `4.0.2` | `MIT` | Sí |

**Sin cambios de código, despliegues, claves, base de datos o pagos.**
