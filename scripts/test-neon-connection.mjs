import { Pool } from 'pg';

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('NEON_DATABASE_URL not set in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT version()');
    console.log('Connected to:', result.rows[0].version);
    
    // Check current tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\nCurrent tables in public schema:');
    tables.rows.forEach(row => console.log(' -', row.table_name));
    
    // Check migration ledger
    const migrations = await pool.query(`
      SELECT * FROM ugo_migration.schema_migrations ORDER BY applied_at
    `).catch(() => ({ rows: [] }));
    console.log('\nApplied migrations:');
    if (migrations.rows.length === 0) {
      console.log(' - (none)');
    } else {
      migrations.rows.forEach(row => console.log(' -', row.version, row.source, row.applied_at));
    }
    
    // Check extensions
    const extensions = await pool.query(`
      SELECT extname FROM pg_extension ORDER BY extname
    `);
    console.log('\nEnabled extensions:');
    extensions.rows.forEach(row => console.log(' -', row.extname));
    
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
