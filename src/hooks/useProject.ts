import { useContext } from 'react';
import { ProjectContext } from '@/contexts/ProjectContext';
import type { ProjectContextValue } from '@/contexts/ProjectContext';

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
