# UGO Hive · endpoint de la consola Super Admin (TEST).
#
# El servicio necesita el binario `psql` (no usa drivers de base de datos), así que se
# empaqueta con postgresql-client. No contiene ninguna credencial: todo entra por entorno.
#
#   docker build -f hive/console-api/Dockerfile -t ugo-hive-console-api .
#   docker run --rm -p 8790:8790 \
#     -e HIVE_READER_DATABASE_URL -e HIVE_CONSOLE_SUPABASE_URL \
#     -e HIVE_CONSOLE_SUPABASE_ANON_KEY -e HIVE_CONSOLE_AUTH_MODE=user \
#     ugo-hive-console-api
#
# Pensado para un host que ejecute procesos (Render Free / similar). Vercel no sirve para
# este binario: ver docs/ugo-hive/TEST_HOST_EVALUATION.md.

FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 10001 hive \
 && useradd --system --uid 10001 --gid hive --home /app hive

WORKDIR /app

# Sólo lo necesario para este servicio (sin node_modules de la app).
COPY --chown=hive:hive hive/console-api/ ./hive/console-api/
COPY --chown=hive:hive hive/worker/config.mjs ./hive/worker/config.mjs
COPY --chown=hive:hive package.json ./package.json

USER hive
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8790

EXPOSE 8790
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8790)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `main()` del servidor: exige los secretos por entorno y se niega a arrancar si el rol de
# lectura pudiera escribir.
CMD ["node", "hive/console-api/server.mjs"]
