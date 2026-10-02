import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; onRetry?: () => void; }
interface State { hasError: boolean; message: string; isCors: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', isCors: false };
  static getDerivedStateFromError(error: Error): State {
    const isCors = error.message.toLowerCase().includes('cors') || (error as { isCors?: boolean }).isCors === true;
    return { hasError: true, message: error.message, isCors };
  }
  handleReset = () => { this.setState({ hasError: false, message: '', isCors: false }); this.props.onRetry?.(); };
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100"><AlertTriangle className="h-6 w-6 text-rose-600" /></div>
          <h3 className="text-lg font-semibold text-rose-900">Algo correu mal</h3>
          <p className="mt-2 text-sm text-rose-700">{this.state.message}</p>
          {this.state.isCors && <p className="mt-3 rounded-lg bg-rose-100/80 p-3 text-xs text-rose-800">Isto pode ser um problema de CORS. No Supabase, certifique-se de que o domínio desta aplicação está autorizado nas definições de CORS do projeto.</p>}
          <button onClick={this.handleReset} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"><RefreshCw className="h-4 w-4" />Tentar novamente</button>
        </div>
      </div>
    );
  }
}
