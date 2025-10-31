import { KEY, DEFAULT_BRE } from './constants';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      leads: parsed.leads || [],
      bre: parsed.bre || DEFAULT_BRE,
    };
  } catch (e) {
    console.error('loadState', e);
    return { leads: [], bre: DEFAULT_BRE };
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}