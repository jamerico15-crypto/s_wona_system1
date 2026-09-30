import { useContext } from 'react';
import { VisibilityContext } from '@/contexts/VisibilityContext';
import type { VisibilityContextValue } from '@/contexts/VisibilityContext';

const noop = () => {};
const noopBool = () => true;
const noopStr = () => {};
const noopArr = () => {};

const safeFallback: VisibilityContextValue = {
  collectionVisible: noopBool,
  fieldVisible: noopBool,
  toggleCollection: noop,
  toggleField: noop,
  setCollectionVisible: noop,
  setFieldVisible: noop,
  density: 'comfortable',
  setDensity: noop,
  hiddenFieldCount: () => 0,
  loading: false,
  activeRole: null,
  setActiveRole: noopStr,
  activeRoles: [],
  setActiveRoles: noopArr,
};

export function useVisibility(): VisibilityContextValue {
  const ctx = useContext(VisibilityContext);
  if (!ctx) {
    console.error('useVisibility called outside of VisibilityProvider — returning safe defaults.');
    return safeFallback;
  }
  return ctx;
}
