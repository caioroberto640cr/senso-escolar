import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { q, dbReady } from './db.ts';
import { lerCookies, definirSessao, limparSessao, COOKIE_TOKEN } from './cookies.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-inseguro-troque-em-producao';
const PERFIS_CADASTRO = ['pai', 'docente', 'gestor']; // self-cadastro permitido (admin é por promoção)

export interface UsuarioRow {
  id: number;
  nome: string;
  email: string;
  senha_hash?: string;
  perfil: string;
  ativo: boolean;
  criado_em?: string;
}

function semHash(u: UsuarioRow) {
  const { senha_hash, ...resto } = u;
  void senha_hash;
  return resto;
}

function assinar(u: UsuarioRow): string {
  return jwt.sign({ id: u.id, perfil: u.perfil }, JWT_SECRET, { expiresIn: '7d' });
}

/** Middleware: exige token válido; popula req.user. Lê do cookie httpOnly
 *  (navegador) ou do header Authorization: Bearer (clientes de API). */
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = lerCookies(req)[COOKIE_TOKEN]
    || (h?.startsWith('Bearer ') ? h.slice(7) : null);
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; perfil: string };
    const rows = await q<UsuarioRow>('SELECT id, nome, email, perfil, ativo FROM usuarios WHERE id=$1', [payload.id]);
    if (!rows[0] || !rows[0].ativo) return res.status(401).json({ erro: 'Sessão inválida' });
    (req as any).user = rows[0];
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

export function exigirAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user?.perfil !== 'admin') return res.status(403).json({ erro: 'Acesso restrito ao administrador' });
  next();
}

function exigeBanco(res: Response): boolean {
  if (!dbReady) {
    res.status(503).json({ erro: 'Cadastro/login indisponível: banco de dados não configurado (DATABASE_URL).' });
    return false;
  }
  return true;
}

// ---------- Handlers ----------
export async function registrar(req: Request, res: Response) {
  if (!exigeBanco(res)) return;
  const { nome, email, senha } = req.body ?? {};
  let { perfil } = req.body ?? {};
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Informe nome, e-mail e senha.' });
  if (String(senha).length < 6) return res.status(400).json({ erro: 'A senha deve ter ao menos 6 caracteres.' });
  const emailNorm = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailNorm)) return res.status(400).json({ erro: 'E-mail inválido.' });
  if (!PERFIS_CADASTRO.includes(perfil)) perfil = 'pai';

  try {
    const existe = await q('SELECT 1 FROM usuarios WHERE email=$1', [emailNorm]);
    if (existe.length) return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });

    // bootstrap: o primeiro usuário do sistema vira admin
    const total = await q<{ n: number }>('SELECT count(*)::int AS n FROM usuarios');
    const perfilFinal = total[0].n === 0 ? 'admin' : perfil;

    const hash = await bcrypt.hash(String(senha), 10);
    const rows = await q<UsuarioRow>(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil)
       VALUES ($1,$2,$3,$4)
       RETURNING id, nome, email, perfil, ativo, criado_em`,
      [String(nome).trim(), emailNorm, hash, perfilFinal]
    );
    const user = rows[0];
    const token = assinar(user);
    const csrf = definirSessao(req, res, token);
    // token também no corpo para clientes sem cookie (app mobile usa Bearer)
    res.status(201).json({ usuario: semHash(user), csrf, token });
  } catch (e: any) {
    console.error('registrar:', e.message);
    res.status(500).json({ erro: 'Falha ao cadastrar.' });
  }
}

export async function entrar(req: Request, res: Response) {
  if (!exigeBanco(res)) return;
  const { email, senha } = req.body ?? {};
  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  const emailNorm = String(email).trim().toLowerCase();
  try {
    const rows = await q<UsuarioRow>('SELECT * FROM usuarios WHERE email=$1', [emailNorm]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(String(senha), user.senha_hash!)))
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    if (!user.ativo) return res.status(403).json({ erro: 'Conta desativada. Procure um administrador.' });
    const token = assinar(user);
    const csrf = definirSessao(req, res, token);
    // token também no corpo para clientes sem cookie (app mobile usa Bearer)
    res.json({ usuario: semHash(user), csrf, token });
  } catch (e: any) {
    console.error('entrar:', e.message);
    res.status(500).json({ erro: 'Falha ao entrar.' });
  }
}

export async function eu(req: Request, res: Response) {
  res.json({ usuario: (req as any).user });
}

/** Logout: limpa os cookies de sessão. */
export function sair(_req: Request, res: Response) {
  limparSessao(res);
  res.json({ ok: true });
}

// ---------- CRUD (admin) ----------
export async function listarUsuarios(_req: Request, res: Response) {
  const rows = await q<UsuarioRow>(
    'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios ORDER BY criado_em DESC'
  );
  res.json(rows);
}

export async function atualizarUsuario(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { perfil, ativo } = req.body ?? {};
  const campos: string[] = [];
  const vals: unknown[] = [];
  if (perfil !== undefined) { campos.push(`perfil=$${campos.length + 1}`); vals.push(String(perfil)); }
  if (ativo !== undefined) { campos.push(`ativo=$${campos.length + 1}`); vals.push(!!ativo); }
  if (!campos.length) return res.status(400).json({ erro: 'Nada para atualizar.' });
  vals.push(id);
  const rows = await q<UsuarioRow>(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id=$${vals.length}
     RETURNING id, nome, email, perfil, ativo, criado_em`,
    vals
  );
  if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json(rows[0]);
}

export async function removerUsuario(req: Request, res: Response) {
  const id = Number(req.params.id);
  if ((req as any).user?.id === id) return res.status(400).json({ erro: 'Você não pode remover a própria conta.' });
  await q('DELETE FROM usuarios WHERE id=$1', [id]);
  res.json({ ok: true });
}
