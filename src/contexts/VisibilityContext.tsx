import {
  createContext, useState, useEffect, useCallback, useRef, type ReactNode,
} from 'react';
import {
  fetchVisibilitySettings,
  upsertVisibilitySetting,
  type VisibilitySettingRow,
} from '@/services/nocodb';

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
  activeRole: string | null;
  setActiveRole: (role: string | null) => void;
  activeRoles: string[];
  setActiveRoles: (roles: string[]) => void;
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
  const [density, setDensityState] = useState<Density>(loadDensity);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<string | null>(null);
  const [activeRoles, setActiveRolesState] = useState<string[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load visibility settings for all active roles (merge: if any role hides
  // a collection/field, it stays hidden; if any shows it, it's visible unless
  // another explicitly hides it).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      const rolesToFetch = activeRoles.length > 0 ? activeRoles : (activeRole ? [activeRole] : []);
      if (rolesToFetch.length === 0) {
        // No roles — fetch global settings (role = null)
        const rows = await fetchVisibilitySettings(null);
        if (cancelled) return;
        setState(parseRows(rows));
        setLoading(false);
        return;
      }
      // Fetch for each role in parallel, plus global (null) settings
      const fetches = [
        fetchVisibilitySettings(null),
        ...rolesToFetch.map((r) => fetchVisibilitySettings(r)),
      ];
      const allRows = (await Promise.all(fetches)).flat();
      if (cancelled) return;
      setState(parseRows(allRows));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activeRole, activeRoles]);

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // ignore
    }
  }, [density]);

  const collectionVisible = useCallback(
    (name: string) => state.collections[name] !== false,
    [state.collections],
  );

  const fieldVisible = useCallback(
    (collectionName: string, fieldName: string) =>
      state.fields[collectionName]?.[fieldName] !== false,
    [state.fields],
  );

  // Writes always use the single activeRole (the one selected in the admin panel)
  const setCollectionVisible = useCallback((name: string, visible: boolean) => {
    setState((prev) => ({
      ...prev,
      collections: { ...prev.collections, [name]: visible },
    }));
    upsertVisibilitySetting(name, null, visible, activeRole);
  }, [activeRole]);

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
      upsertVisibilitySetting(collectionName, fieldName, visible, activeRole);
    },
    [activeRole],
  );

  const toggleCollection = useCallback((name: string) => {
    const current = stateRef.current.collections[name] !== false;
    setState((prev) => ({
      ...prev,
      collections: { ...prev.collections, [name]: !current },
    }));
    upsertVisibilitySetting(name, null, !current, activeRole);
  }, [activeRole]);

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
    upsertVisibilitySetting(collectionName, fieldName, !current, activeRole);
  }, [activeRole]);

  const setDensity = useCallback((d: Density) => setDensityState(d), []);

  const setActiveRole = useCallback((role: string | null) => {
    setActiveRoleState(role);
  }, []);

  const setActiveRoles = useCallback((roles: string[]) => {
    setActiveRolesState(roles);
  }, []);

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
        activeRole,
        setActiveRole,
        activeRoles,
        setActiveRoles,
      }}
    >
      {children}
    </VisibilityContext.Provider>
  );
}
