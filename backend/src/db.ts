import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'postgres',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'lab_tiempos',
  user: process.env.DB_USER || 'labadmin',
  password: process.env.DB_PASSWORD || 'InmunoXXI2024!',
  max: 10,
});

export default pool;
