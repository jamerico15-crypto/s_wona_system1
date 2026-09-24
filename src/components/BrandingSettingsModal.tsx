import { useState, useRef, type ChangeEvent } from 'react';
import { ImagePlus, X, Loader2, RotateCcw, Save, Type } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { DEFAULT_BRANDING } from '@/contexts/BrandingContext';
import { useToast } from '@/components/Toast';
import { TLM_PRIMARY } from '@/config/theme';
import { uploadAttachment, type NocoBaseAttachment } from '@/services/nocodb';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

interface BrandingSettingsModalProps {
  onClose: () => void;
}

export default function BrandingSettingsModal({ onClose }: BrandingSettingsModalProps) {
  const { branding, updateBranding, resetBranding } = useBranding();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logo);
  const [logoAttachment, setLogoAttachment] = useState<NocoBaseAttachment | null>(null);
  const [loginTitle, setLoginTitle] = useState(branding.loginTitle);
  const [loginSubtitle, setLoginSubtitle] = useState(branding.loginSubtitle);
  const [loginButtonText, setLoginButtonText] = useState(branding.loginButtonText);
  const [processingFile, setProcessingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      notify('error', 'Formato não suportado. Use PNG, JPG ou SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notify('error', 'O ficheiro é demasiado grande (máx. 2 MB).');
      return;
    }

    setProcessingFile(true);
    try {
      const attachment = await uploadAttachment(file);
      setLogoAttachment(attachment);
      setLogoPreview(attachment.url);
      notify('success', 'Logótipo carregado. Clique em "Guardar" para aplicar.');
    } catch {
      notify('error', 'Falha ao enviar o ficheiro para o servidor.');
    } finally {
      setProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBranding(
        { logo: logoPreview, loginTitle: loginTitle.trim() || DEFAULT_BRANDING.loginTitle, loginSubtitle: loginSubtitle.trim() || DEFAULT_BRANDING.loginSubtitle, loginButtonText: loginButtonText.trim() || DEFAULT_BRANDING.loginButtonText },
        logoAttachment ? [logoAttachment] : null,
      );
      notify('success', 'Personalização guardada e aplicada em todo o sistema.');
      onClose();
    } catch {
      notify('error', 'Falha ao guardar a personalização.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetBranding();
      setLogoPreview(null);
      setLoginTitle(DEFAULT_BRANDING.loginTitle);
      setLoginSubtitle(DEFAULT_BRANDING.loginSubtitle);
      setLoginButtonText(DEFAULT_BRANDING.loginButtonText);
      notify('success', 'Personalização restaurada para os valores padrão.');
      onClose();
    } catch {
      notify('error', 'Falha ao restaurar a personalização.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoAttachment(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: TLM_PRIMARY }}>
              <ImagePlus className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Personalizar Sistema</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8 p-6">
          {/* Logo upload section */}
          <section>
            <h4 className="mb-1 text-sm font-bold text-slate-800">Logótipo do Sistema</h4>
            <p className="mb-4 text-xs text-slate-500">
              Carregue um logótipo (PNG, JPG ou SVG até 2 MB). Será aplicado na página de login, barra lateral e painel administrativo.
            </p>

            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Pré-visualização do logótipo" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <div className="text-center">
                    <ImagePlus className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-1 text-[10px] text-slate-400">Sem logótipo</p>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingFile}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {processingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {processingFile ? 'A processar...' : 'Carregar Logótipo'}
                </button>
                {logoPreview && (
                  <button
                    onClick={handleRemoveLogo}
                    className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                  >
                    <X className="h-4 w-4" />
                    Remover
                  </button>
                )}
                <p className="text-xs text-slate-400">
                  Recomendação: imagem quadrada, fundo transparente (PNG/SVG) para melhor resultado.
                </p>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Login texts section */}
          <section>
            <div className="mb-1 flex items-center gap-2">
              <Type className="h-4 w-4 text-slate-500" />
              <h4 className="text-sm font-bold text-slate-800">Textos da Página de Login</h4>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Personalize os textos exibidos no ecrã de entrada. Deixe em branco para usar os valores padrão.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Título</label>
                <input
                  type="text"
                  value={loginTitle}
                  onChange={(e) => setLoginTitle(e.target.value)}
                  placeholder={DEFAULT_BRANDING.loginTitle}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Subtítulo / Descrição</label>
                <input
                  type="text"
                  value={loginSubtitle}
                  onChange={(e) => setLoginSubtitle(e.target.value)}
                  placeholder={DEFAULT_BRANDING.loginSubtitle}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Texto do Botão</label>
                <input
                  type="text"
                  value={loginButtonText}
                  onChange={(e) => setLoginButtonText(e.target.value)}
                  placeholder={DEFAULT_BRANDING.loginButtonText}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: TLM_PRIMARY }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar e Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


