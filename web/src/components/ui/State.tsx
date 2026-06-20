import { IconAlertTriangle } from '@tabler/icons-react';

export function Loading({ label = 'Carregando dados reais...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink-faint">
      <div className="h-8 w-8 rounded-full border-3 border-brand-200 border-t-brand-500 animate-spin mb-3" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-2xl bg-peach-100 text-peach-600 grid place-items-center mb-3"><IconAlertTriangle size={24} /></div>
      <p className="text-sm font-medium text-ink mb-1">Não foi possível carregar os dados</p>
      <p className="text-xs text-ink-faint max-w-sm">{message}</p>
      <p className="text-xs text-ink-faint mt-3">
        A API está rodando? <code className="bg-brand-50 px-1.5 py-0.5 rounded">npm start</code> em{' '}
        <code className="bg-brand-50 px-1.5 py-0.5 rounded">api/</code>
      </p>
    </div>
  );
}
