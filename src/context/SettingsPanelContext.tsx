import { createContext, useContext, useState, type ReactNode } from 'react';

interface SettingsPanelContextValue {
  activeNodeId: string | null;
  openSettings: (nodeId: string) => void;
  closeSettings: () => void;
}

const SettingsPanelContext = createContext<SettingsPanelContextValue>({
  activeNodeId: null,
  openSettings: () => {},
  closeSettings: () => {},
});

export function SettingsPanelProvider({ children }: { children: ReactNode }) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  return (
    <SettingsPanelContext.Provider
      value={{
        activeNodeId,
        openSettings: (nodeId: string) => setActiveNodeId(nodeId),
        closeSettings: () => setActiveNodeId(null),
      }}
    >
      {children}
    </SettingsPanelContext.Provider>
  );
}

export function useSettingsPanel() {
  return useContext(SettingsPanelContext);
}
