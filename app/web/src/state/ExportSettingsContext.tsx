import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_EXPORT_SETTINGS,
  type ExportSettings,
  loadExportSettings,
  saveExportSettings,
} from "../services/export/settings";

interface Value {
  settings: ExportSettings;
  update: (patch: Partial<ExportSettings>) => void;
}

const Context = createContext<Value>({ settings: DEFAULT_EXPORT_SETTINGS, update: () => {} });

export function ExportSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ExportSettings>(loadExportSettings);
  const update = useCallback((patch: Partial<ExportSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveExportSettings(next);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useExportSettings = (): Value => useContext(Context);
