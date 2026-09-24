import { useContext } from 'react';
import { BrandingContext } from '@/contexts/BrandingContext';
import type { BrandingContextValue } from '@/contexts/BrandingContext';

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
