// Database and application domain types

export type AppRole = 'admin' | 'user';
export type RequestStatus = 'diproses' | 'selesai';

export interface Profile {
  id: string;
  role: AppRole;
  nama_divisi: string;
  email?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface Item {
  id: string;
  kode?: string;
  nama: string;
  kategori?: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  harga_satuan?: number | null;
  rak?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface RequestItem {
  id: string;
  nomor?: string;
  user_id: string;
  item_id: string;
  jumlah: number;
  keperluan: string;
  status: RequestStatus;
  created_at: string;
  completed_at?: string | null;
  catatan_ga?: string | null;
  [key: string]: unknown;
}

export interface RequestWithDetails extends RequestItem {
  items?: Item | null;
  profiles?: Profile | null;
}

