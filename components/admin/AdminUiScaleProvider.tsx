"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ADMIN_UI_SCALE_CHANGE_EVENT,
  DEFAULT_ADMIN_UI_SCALE,
  readAdminUiScaleFromStorage,
  writeAdminUiScaleToStorage,
  type AdminUiScale,
} from "@/lib/adminUiScale";

type Ctx = {
  scale: AdminUiScale;
  setScale: (s: AdminUiScale) => void;
};

const AdminUiScaleContext = createContext<Ctx | null>(null);

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const fn = () => onStoreChange();
  window.addEventListener("storage", fn);
  window.addEventListener(ADMIN_UI_SCALE_CHANGE_EVENT, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(ADMIN_UI_SCALE_CHANGE_EVENT, fn);
  };
}

function getServerSnapshot(): AdminUiScale {
  return DEFAULT_ADMIN_UI_SCALE;
}

export function AdminUiScaleProvider({ children }: { children: ReactNode }) {
  const scale = useSyncExternalStore(subscribe, readAdminUiScaleFromStorage, getServerSnapshot);

  const setScale = useCallback((next: AdminUiScale) => {
    writeAdminUiScaleToStorage(next);
  }, []);

  const value = useMemo(() => ({ scale, setScale }), [scale, setScale]);

  const wrapperClass = scale === "standard" ? "" : `admin-scale-${scale}`;

  return (
    <AdminUiScaleContext.Provider value={value}>
      <div className={wrapperClass}>{children}</div>
    </AdminUiScaleContext.Provider>
  );
}

export function useAdminUiScale(): Ctx {
  const ctx = useContext(AdminUiScaleContext);
  if (!ctx) {
    throw new Error("useAdminUiScale must be used within AdminUiScaleProvider");
  }
  return ctx;
}

/** For optional UI (e.g. modals) that may render outside the provider tree in the future. */
export function useAdminUiScaleOptional(): Ctx | null {
  return useContext(AdminUiScaleContext);
}
