// Sessão por cookie httpOnly + proteção CSRF (double-submit token).
// Express 4 não parseia cookies por padrão; aqui lemos/definimos manualmente
// (res.cookie é nativo do Express, então não precisamos de cookie-parser).
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export const COOKIE_TOKEN = 'eduinsight_token';
export const COOKIE_CSRF = 'eduinsight_csrf';
const SETE_DIAS = 1000 * 60 * 60 * 24 * 7;

/** Lê os cookies do request (Express 4 não parseia por padrão). */
export function lerCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const par of raw.split(';')) {
    const i = par.indexOf('=');
    if (i < 0) continue;
    const k = par.slice(0, i).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(par.slice(i + 1).trim());
  }
  return out;
}

/**
 * Define o cookie de sessão (httpOnly, inacessível ao JS → imune a XSS) e o
 * cookie CSRF (legível pelo front, reenviado no header X-CSRF-Token).
 * `Secure` segue req.secure (true atrás de HTTPS via trust proxy no Render).
 */
export function definirSessao(req: Request, res: Response, token: string): string {
  const secure = req.secure;
  const csrf = randomUUID();
  res.cookie(COOKIE_TOKEN, token, {
    httpOnly: true, secure, sameSite: 'lax', maxAge: SETE_DIAS, path: '/',
  });
  res.cookie(COOKIE_CSRF, csrf, {
    httpOnly: false, secure, sameSite: 'lax', maxAge: SETE_DIAS, path: '/',
  });
  return csrf;
}

/** Remove os cookies de sessão (logout). */
export function limparSessao(res: Response) {
  res.clearCookie(COOKIE_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_CSRF, { path: '/' });
}

/**
 * Middleware CSRF (double-submit). Aplica-se só a métodos que alteram estado
 * E quando a sessão veio por cookie (navegador): compara o cookie CSRF com o
 * header X-CSRF-Token. Clientes via Bearer (curl/API) não mandam cookie e ficam
 * isentos — não há vetor de CSRF sem cookie automático.
 */
export function verificarCsrf(req: Request, res: Response, next: NextFunction) {
  const m = req.method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return next();
  const cookies = lerCookies(req);
  if (!cookies[COOKIE_TOKEN]) return next(); // sem sessão por cookie → nada a proteger aqui
  const header = req.headers['x-csrf-token'];
  if (!cookies[COOKIE_CSRF] || !header || cookies[COOKIE_CSRF] !== header) {
    return res.status(403).json({ erro: 'Token CSRF ausente ou inválido.' });
  }
  next();
}
