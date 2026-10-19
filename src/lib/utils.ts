// Utility functions with explicit id-ID locale and Asia/Jakarta timezone for hydration safety

export function formatDate(isoDate: string | Date): string {
  try {
    const d = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return String(isoDate);
  }
}

export function formatDateShort(isoDate: string | Date): string {
  try {
    const d = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return String(isoDate);
  }
}

export function formatMonthYear(isoDate: string | Date): string {
  try {
    const d = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return String(isoDate);
  }
}

export function formatNumber(num: number): string {
  try {
    return new Intl.NumberFormat('id-ID').format(num);
  } catch {
    return String(num);
  }
}

export function formatRupiah(amount: number): string {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
}

// Unified low stock definition: stok <= stokMinimum (includes out of stock)
export function isLowStock(stok: number, stokMinimum: number): boolean {
  return stok <= stokMinimum;
}

// Uniform duration formatting: under 48 hours in hours, 48+ hours in days with 1 decimal
export function formatDuration(hours: number): string {
  if (hours < 48) {
    const formatted = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
    return `${formatted} jam`;
  }
  const days = (hours / 24).toFixed(1);
  return `${days} hari`;
}

export interface ParsedRequestKeperluan {
  namaBarang: string;
  satuan: string;
  cleanKeperluan: string;
}

// Parses custom user-inputted unit and item name from request purpose if provided [Barang: ...] [Satuan: ...]
export function parseRequestKeperluan(
  keperluan?: string | null,
  fallbackSatuan?: string,
  fallbackBarang?: string
): ParsedRequestKeperluan {
  if (!keperluan) {
    return {
      namaBarang: fallbackBarang || '',
      satuan: fallbackSatuan || 'unit',
      cleanKeperluan: '-',
    };
  }

  let text = keperluan;
  let namaBarang = fallbackBarang || '';
  let satuan = fallbackSatuan || 'unit';

  // Extract [Barang: ...] tag if present
  const barangMatch = text.match(/\[Barang:\s*([^\]]+)\]/i);
  if (barangMatch) {
    namaBarang = barangMatch[1].trim();
    text = text.replace(barangMatch[0], '').trim();
  }

  // Extract [Satuan: ...] tag if present
  const satuanMatch = text.match(/\[Satuan:\s*([^\]]+)\]/i);
  if (satuanMatch) {
    satuan = satuanMatch[1].trim();
    text = text.replace(satuanMatch[0], '').trim();
  }

  return {
    namaBarang: namaBarang || fallbackBarang || '',
    satuan: satuan || fallbackSatuan || 'unit',
    cleanKeperluan: text.trim() || '-',
  };
}

