import { createContext, type ReactNode, useContext } from "react";
import type { StorageProvider } from "./StorageProvider";

const StorageContext = createContext<StorageProvider | null>(null);

export function StorageProviderContext({
  provider,
  children,
}: {
  provider: StorageProvider;
  children: ReactNode;
}) {
  return <StorageContext.Provider value={provider}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageProvider {
  const provider = useContext(StorageContext);
  if (!provider) throw new Error("useStorage must be used inside <StorageProviderContext>");
  return provider;
}
