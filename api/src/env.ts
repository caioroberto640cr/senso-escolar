// Carrega variáveis de api/.env em desenvolvimento.
// Em produção (Render), as variáveis vêm do ambiente e não há arquivo .env — tudo bem.
try {
  // Node 20.12+/22: carrega ./.env a partir do diretório atual (api/)
  (process as any).loadEnvFile?.();
} catch {
  // Sem arquivo .env: usa as variáveis já presentes em process.env
}
