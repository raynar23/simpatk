// Utility constants and helpers for ATK physical storage rack placement (Rak 1, Rak 2, Rak 3, Rak 4)
import type { Item } from '@/lib/types';

export const RAK_KEYS = ['Rak 1', 'Rak 2', 'Rak 3', 'Rak 4'] as const;
export type RakKey = (typeof RAK_KEYS)[number];

export interface RakDefinition {
  id: RakKey;
  nama: string;
  sub: string;
  zona: string;
  deskripsi: string;
  defaultCategories: string[];
  theme: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    headerBg: string;
    accent: string;
  };
}

export const RAK_DEFINITIONS: RakDefinition[] = [
  {
    id: 'Rak 1',
    nama: 'Rak 1: Kertas & Tinta',
    sub: 'Media Cetak & Toner',
    zona: 'Zona A - Baris Depan',
    deskripsi: 'Penyimpanan persediaan kertas HVS, form continuous, botol tinta refill, dan toner printer.',
    defaultCategories: ['Kertas', 'Tinta dan Toner'],
    theme: {
      badgeBg: 'bg-primary-soft text-primary border-primary/25',
      badgeText: 'text-primary',
      badgeBorder: 'border-primary/25',
      headerBg: 'bg-primary-soft/50 border-primary/20',
      accent: 'border-l-primary',
    },
  },
  {
    id: 'Rak 2',
    nama: 'Rak 2: Alat Tulis',
    sub: 'Pulpen, Pensil & Spidol',
    zona: 'Zona B - Baris Tengah',
    deskripsi: 'Penyimpanan perlengkapan menulis harian: pulpen ballpoint, gel pen, pensil 2B, spidol marker, dan highlighter.',
    defaultCategories: ['Alat Tulis'],
    theme: {
      badgeBg: 'bg-primary-soft text-primary border-primary/25',
      badgeText: 'text-primary',
      badgeBorder: 'border-primary/25',
      headerBg: 'bg-primary-soft/50 border-primary/20',
      accent: 'border-l-primary',
    },
  },
  {
    id: 'Rak 3',
    nama: 'Rak 3: Perekat & Pemotong',
    sub: 'Lakban, Cutter & Gunting',
    zona: 'Zona C - Baris Belakang',
    deskripsi: 'Penyimpanan perkakas potong dan rekat: lakban packing, cutter, gunting stainless, dan double tape.',
    defaultCategories: ['Perekat dan Pemotong'],
    theme: {
      badgeBg: 'bg-primary-soft text-primary border-primary/25',
      badgeText: 'text-primary',
      badgeBorder: 'border-primary/25',
      headerBg: 'bg-primary-soft/50 border-primary/20',
      accent: 'border-l-primary',
    },
  },
  {
    id: 'Rak 4',
    nama: 'Rak 4: Arsip & Meja',
    sub: 'Ordner, Stapler, Klip & Lainnya',
    zona: 'Zona D - Baris Samping',
    deskripsi: 'Penyimpanan map ordner, schnellhecter, stapler, isi staples, paper clip, binder clip, serta baterai alkaline.',
    defaultCategories: ['Arsip dan Map', 'Perlengkapan Meja', 'Lainnya'],
    theme: {
      badgeBg: 'bg-primary-soft text-primary border-primary/25',
      badgeText: 'text-primary',
      badgeBorder: 'border-primary/25',
      headerBg: 'bg-primary-soft/50 border-primary/20',
      accent: 'border-l-primary',
    },
  },
];

const STORAGE_KEY = 'simpatk_rak_placements_v1';

/**
 * Returns the default standard rack assignment based on category.
 */
export function getDefaultRak(category?: string): RakKey {
  if (!category) return 'Rak 1';
  if (category === 'Kertas' || category === 'Tinta dan Toner') return 'Rak 1';
  if (category === 'Alat Tulis') return 'Rak 2';
  if (category === 'Perekat dan Pemotong') return 'Rak 3';
  return 'Rak 4';
}

/**
 * Reads local storage overrides for custom manual re-placements.
 */
export function getSavedRakOverrides(): Record<string, RakKey> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Persists an item placement update into localStorage and dispatches change event.
 */
export function saveRakPlacement(itemId: string, targetRak: RakKey): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedRakOverrides();
    current[itemId] = targetRak;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('simpatk-rak-updated', { detail: { itemId, targetRak } }));
  } catch {
    // Graceful fallback
  }
}

/**
 * Resets all custom rack overrides back to category defaults.
 */
export function resetAllRakPlacements(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('simpatk-rak-updated', { detail: { reset: true } }));
  } catch {
    // Graceful fallback
  }
}

/**
 * Resolves the active rack for a given item, honoring:
 * 1. User manual override (localStorage)
 * 2. Explicit item.rak property (from database)
 * 3. Default category mapping
 */
export function getItemRak(item: Item, overrides?: Record<string, RakKey>): RakKey {
  const activeOverrides = overrides || (typeof window !== 'undefined' ? getSavedRakOverrides() : {});
  if (activeOverrides[item.id] && RAK_KEYS.includes(activeOverrides[item.id])) {
    return activeOverrides[item.id];
  }
  if (item.rak && RAK_KEYS.includes(item.rak as RakKey)) {
    return item.rak as RakKey;
  }
  return getDefaultRak(item.kategori);
}
