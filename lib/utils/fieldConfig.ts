// Field configuration management for player/team import

export interface FieldConfig {
  name: string;
  key: string;
  required: boolean;
  enabled: boolean;
}

const STORAGE_KEY_PREFIX = 'player_field_config_';

export function getFieldConfig(eventId: string): FieldConfig[] {
  if (typeof window === 'undefined') return getDefaultFieldConfig();
  
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${eventId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing field config:', e);
      return getDefaultFieldConfig();
    }
  }
  return getDefaultFieldConfig();
}

export function saveFieldConfig(eventId: string, config: FieldConfig[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${eventId}`, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving field config:', e);
  }
}

export function getCustomFields(eventId: string): FieldConfig[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${eventId}_custom`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing custom fields:', e);
      return [];
    }
  }
  return [];
}

export function saveCustomFields(eventId: string, customFields: FieldConfig[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${eventId}_custom`, JSON.stringify(customFields));
  } catch (e) {
    console.error('Error saving custom fields:', e);
  }
}

export function getDefaultFieldConfig(): FieldConfig[] {
  return [
    { name: '名稱', key: 'name', required: true, enabled: true },
    { name: '系所', key: 'department', required: false, enabled: false },
    { name: 'Email', key: 'email', required: false, enabled: false },
    { name: '種子序號', key: 'seed', required: false, enabled: false },
  ];
}

export function getEnabledFields(eventId: string): FieldConfig[] {
  const config = getFieldConfig(eventId);
  const customFields = getCustomFields(eventId);
  return [...config.filter(f => f.enabled), ...customFields.filter(f => f.enabled)];
}
