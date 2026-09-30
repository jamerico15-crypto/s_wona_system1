import {
  createContext, useState, useEffect, useCallback, useRef, type ReactNode,
} from 'react';
import {
  fetchVisibilitySettings,
  upsertVisibilitySetting,
  fetchProjectTableVisibility,
  type VisibilitySettingRow,
  type ProjectTableVisibilityRow,
} from '@/services/nocodb';
import { useProject } from '@/hooks/useProject';

export type Density = 'compact' | 'comfortable';

interface VisibilityState {
  collections: Record<string, boolean>;
  fields: Record<string, Record<string, boolean>>;
}

export interface VisibilityContextValue {
  collectionVisible: (collectionName: string) => boolean;
  fieldVisible: (collectionName: string, fieldName: string) => boolean;
  toggleCollection: (collectionName: string) => void;
  toggleField: (collectionName: string, fieldName: string) => void;
  setCollectionVisible: (collectionName: string, visible: boolean) => void;
  setFieldVisible: (collectionName: string, fieldName: string, visible: boolean) => void;
  density: Density;
  setDensity: (d: Density) => void;
  hiddenFieldCount: (collectionName: string) => number;
  loading: boolean;
}

export const VisibilityContext = createContext<VisibilityContextValue | null>(null);

const DENSITY_KEY = 'app_density';

function loadDensity(): Density {
  try {
    const d = localStorage.getItem(DENSITY_KEY);
    return d === 'compact' ? 'compact' : 'comfortable';
  } catch {
    return 'comfortable';
  }
}

function parseRows(rows: VisibilitySettingRow[]): VisibilityState {
  const state: VisibilityState = { collections: {}, fields: {} };
  for (const row of rows) {
    if (row.field_name === null) {
      state.collections[row.collection_name] = row.visible;
    } else {
      if (!state.fields[row.collection_name]) {
        state.fields[row.collection_name] = {};
      }
      state.fields[row.collection_name][row.field_name] = row.visible;
    }
  }
  return state;
}

export function VisibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisibilityState>({ collections: {}, fields: {} });
  const [projectHidden, setProjectHidden] = useState<Set<string>>(new Set());
  const [density, setDensityState] = useState<Density>(loadDensity);
  const [loading, setLoading] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;
  const { activeProject } = useProject();
  const projectIdRef = useRef<string | number | null>(null);
  projectIdRef.current = activeProject?.id ?? null;

  // Load global visibility settings once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await fetchVisibilitySettings();
      if (cancelled) return;
      setState(parseRows(rows));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load per-project table visibility whenever the active project changes
  useEffect(() => {
    const pid = activeProject?.id;
    if (pid == null) {
      setProjectHidden(new Set());
      return;
    }
    let cancelled = false;
    async function loadProjectVisibility() {
      const rows: ProjectTableVisibilityRow[] = await fetchProjectTableVisibility(pid!);
      if (cancelled) return;
      const hidden = new Set<string>();
      for (const row of rows) {
        if (!row.visible) hidden.add(row.collection_name);
      }
      setProjectHidden(hidden);
    }
    loadProjectVisibility();
    return () => { cancelled = true; };
  }, [activeProject?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // ignore
    }
  }, [density]);

  const collectionVisible = useCallback(
    (name: string) => {
      if (projectHiddenRef.current.has(name)) return false;
      return stateRef.current.collections[name] !== false;
    },
    [],
  );

  const projectHiddenRef = useRef(projectHidden);
  projectHiddenRef.current = projectHidden;

  const fieldVisible = useCallback(
    (collectionName: string, fieldName: string) =>
      state.fields[collectionName]?.[fieldName] !== false,
    [state.fields],
  );

  const setCollectionVisible = useCallback((name: string, visible: boolean) => {
    setState((prev) => ({
      ...prev,
      collections: { ...prev.collections, [name]: visible },
    }));
    upsertVisibilitySetting(name, null, visible);
  }, []);

  const setFieldVisible = useCallback(
    (collectionName: string, fieldName: string, visible: boolean) => {
      setState((prev) => {
        const colFields = prev.fields[collectionName] ?? {};
        return {
          ...prev,
          fields: {
            ...prev.fields,
            [collectionName]: { ...colFields, [fieldName]: visible },
          },
        };
      });
      upsertVisibilitySetting(collectionName, fieldName, visible);
    },
    [],
  );

  const toggleCollection = useCallback((name: string) => {
    const current = stateRef.current.collections[name] !== false;
    setState((prev) => ({
      ...prev,
      collections: { ...prev.collections, [name]: !current },
    }));
    upsertVisibilitySetting(name, null, !current);
  }, []);

  const toggleField = useCallback((collectionName: string, fieldName: string) => {
    const current = stateRef.current.fields[collectionName]?.[fieldName] !== false;
    setState((prev) => {
      const colFields = prev.fields[collectionName] ?? {};
      return {
        ...prev,
        fields: {
          ...prev.fields,
          [collectionName]: { ...colFields, [fieldName]: !current },
        },
      };
    });
    upsertVisibilitySetting(collectionName, fieldName, !current);
  }, []);

  const setDensity = useCallback((d: Density) => setDensityState(d), []);

  const hiddenFieldCount = useCallback(
    (collectionName: string) => {
      const colFields = state.fields[collectionName];
      if (!colFields) return 0;
      return Object.values(colFields).filter((v) => v === false).length;
    },
    [state.fields],
  );

  return (
    <VisibilityContext.Provider
      value={{
        collectionVisible,
        fieldVisible,
        toggleCollection,
        toggleField,
        setCollectionVisible,
        setFieldVisible,
        density,
        setDensity,
        hiddenFieldCount,
        loading,
      }}
    >
      {children}
    </VisibilityContext.Provider>
  );
}
