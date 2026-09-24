import { useContext } from 'react';
import { LanguageContext, type Language, type TranslationKey } from '@/contexts/LanguageContext';

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

export function useTranslation() {
  const { t } = useLanguage();
  return t;
}

export type { Language, TranslationKey };
