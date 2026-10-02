import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { fetchBrandingSettings, saveBrandingSettings, resetBrandingSettings, type Attachment } from '@/services/database';

function resolveAttachmentUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return url;
}

export interface BrandingConfig { logo: string | null; loginTitle: string; loginSubtitle: string; loginButtonText: string; }
export const DEFAULT_BRANDING: BrandingConfig = { logo: null, loginTitle: 'The Leprosy Mission\nMozambique', loginSubtitle: 'Sistema de MERL', loginButtonText: 'Entrar' };
export interface BrandingContextValue { branding: BrandingConfig; updateBranding: (partial: Partial<BrandingConfig>, logoAttachment?: Attachment[] | null) => Promise<void>; resetBranding: () => Promise<void>; loading: boolean; }
export const BrandingContext = createContext<BrandingContextValue | null>(null);
const STORAGE_KEY = 'app_branding_config';

function loadFromStorage(): BrandingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw);
    return { logo: parsed.logo ?? null, loginTitle: parsed.loginTitle ?? DEFAULT_BRANDING.loginTitle, loginSubtitle: parsed.loginSubtitle ?? DEFAULT_BRANDING.loginSubtitle, loginButtonText: parsed.loginButtonText ?? DEFAULT_BRANDING.loginButtonText };
  } catch { return DEFAULT_BRANDING; }
}
function saveToStorage(config: BrandingConfig): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); return true; } catch { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, logo: null })); return false; } catch { return false; } }
}
function clearStorage() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }
function mapBrandingRecord(row: { logo: Attachment[] | null; login_title: string; login_subtitle: string; login_button_text: string }): BrandingConfig {
  return { logo: resolveAttachmentUrl(row.logo?.[0]?.url), loginTitle: row.login_title || DEFAULT_BRANDING.loginTitle, loginSubtitle: row.login_subtitle || DEFAULT_BRANDING.loginSubtitle, loginButtonText: row.login_button_text || DEFAULT_BRANDING.loginButtonText };
}
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(loadFromStorage);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; (async () => { try { const record = await fetchBrandingSettings(); if (!cancelled && record) setBranding(mapBrandingRecord(record)); } catch {} finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, []);
  useEffect(() => { const handler = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setBranding(loadFromStorage()); }; window.addEventListener('storage', handler); return () => window.removeEventListener('storage', handler); }, []);
  const updateBranding = useCallback(async (partial: Partial<BrandingConfig>, logoAttachment?: Attachment[] | null) => { const next = { ...branding, ...partial }; setBranding(next); saveToStorage(next); try { await saveBrandingSettings({ logo: logoAttachment !== undefined ? logoAttachment : (next.logo ? [{ id: '', url: next.logo, filename: null, mimetype: null, size: null }] : null), login_title: next.loginTitle, login_subtitle: next.loginSubtitle, login_button_text: next.loginButtonText }); } catch {} }, [branding]);
  const resetBranding = useCallback(async () => { setBranding(DEFAULT_BRANDING); clearStorage(); try { await resetBrandingSettings(); } catch {} }, []);
  return <BrandingContext.Provider value={{ branding, updateBranding, resetBranding, loading }}>{children}</BrandingContext.Provider>;
}
