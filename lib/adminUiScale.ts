export const ADMIN_UI_SCALE_STORAGE_KEY = "ntu_admin_ui_scale";
export const ADMIN_UI_SCALE_CHANGE_EVENT = "ntu-admin-ui-scale";

export type AdminUiScale = "standard" | "comfortable" | "large";

export const DEFAULT_ADMIN_UI_SCALE: AdminUiScale = "comfortable";

const VALID: readonly AdminUiScale[] = ["standard", "comfortable", "large"];

export function parseAdminUiScale(raw: string | null | undefined): AdminUiScale {
  if (raw && (VALID as readonly string[]).includes(raw)) return raw as AdminUiScale;
  return DEFAULT_ADMIN_UI_SCALE;
}

export function readAdminUiScaleFromStorage(): AdminUiScale {
  if (typeof window === "undefined") return DEFAULT_ADMIN_UI_SCALE;
  try {
    return parseAdminUiScale(localStorage.getItem(ADMIN_UI_SCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_ADMIN_UI_SCALE;
  }
}

export function writeAdminUiScaleToStorage(scale: AdminUiScale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_UI_SCALE_STORAGE_KEY, scale);
    window.dispatchEvent(new Event(ADMIN_UI_SCALE_CHANGE_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}
