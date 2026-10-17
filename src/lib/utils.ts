// Utility functions for date formatting, number formatting, and stock status

export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoDate;
  }
}

export function formatDateShort(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoDate;
  }
}

export function isLowStock(stok: number, stokMinimum: number): boolean {
  return stok <= stokMinimum;
}
