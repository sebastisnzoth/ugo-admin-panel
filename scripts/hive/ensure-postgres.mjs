// Prints the PostgreSQL bin directory available for the concurrency suite.
// Exits 1 when there is none, so CI never turns a missing engine into a silent skip.
import { findPostgresBin } from './pg-harness.mjs'

const bin = findPostgresBin()
if (!bin) {
  console.error('NO_POSTGRES: no se encontró initdb/pg_ctl/psql en este entorno.')
  console.error('Instalar: sudo apt-get install -y postgresql  ·  o POSTGRES_BIN=/ruta/bin')
  process.exit(1)
}
console.log(`POSTGRES_BIN=${bin}`)
