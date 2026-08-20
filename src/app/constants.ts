export const SUGGESTIONS = [
  'iPhone 16 Pro',
  'AirPods Pro 2',
  'Anker 100W charger',
  'iPad Air',
  'Sony a7 IV',
] as const;

export const PROV_LABEL = {
  receipt: 'From receipt',
  photo: 'Photo guess',
  manual: 'Entered',
} as const;

export type TabId = 'decide' | 'inv' | 'add';
