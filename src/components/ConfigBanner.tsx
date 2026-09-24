import { Settings, ExternalLink } from 'lucide-react';

interface ConfigBannerProps {
  missing: string[];
}

export default function ConfigBanner({ missing }: ConfigBannerProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50/60 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Settings className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-amber-900">Configuração necessária</h2>
        <p className="mt-2 text-sm text-amber-800">
          Para ligar ao servidor, é preciso preencher as seguintes variáveis de ambiente no ficheiro{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono">.env</code>:
        </p>
        <div className="mt-4 space-y-2">
          {missing.map((v) => (
            <div
              key={v}
              className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-left font-mono text-sm text-amber-900"
            >
              {v}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-amber-700">
          Copie o ficheiro <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.example</code> para{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env</code> e preencha os valores.
          Pode obter o token nas definições de API do servidor.
        </p>
        <a
          href="https://docs.nocobase.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900"
        >
          Documentação do NocoBase
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
