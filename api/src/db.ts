// Conexão com Postgres (Neon) — só para dados de USUÁRIO (cadastro/login).
// Os indicadores do INEP continuam vindo do JSON do ETL.
import pg from 'pg';

const { Pool } = pg;
const URL = process.env.DATABASE_URL;

/** true quando há banco configurado (DATABASE_URL definido). */
export const dbReady = !!URL;

// Neon (e a maioria dos Postgres gerenciados) exige SSL.
const precisaSSL =
  !!URL && (/neon\.tech/.test(URL) || /sslmode=require/.test(URL) || process.env.NODE_ENV === 'production');

export const pool = URL
  ? new Pool({ connectionString: URL, ssl: precisaSSL ? { rejectUnauthorized: false } : undefined })
  : null;

/** Cria a tabela de usuários se ainda não existir. Chamado na subida do servidor. */
export async function initSchema() {
  if (!pool) {
    console.warn('⚠ DATABASE_URL não definido — cadastro/login indisponíveis (defina para ativar).');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         SERIAL PRIMARY KEY,
      nome       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil     TEXT NOT NULL DEFAULT 'pai',
      ativo      BOOLEAN NOT NULL DEFAULT true,
      criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM usuarios');
  console.log(`🗄️  Banco conectado — ${rows[0].n} usuário(s) cadastrado(s).`);
}

/** Helper de query tipado. */
export async function q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!pool) throw new Error('SEM_BANCO');
  const r = await pool.query(sql, params);
  return r.rows as T[];
}
