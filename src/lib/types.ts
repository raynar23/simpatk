// Database and application domain types

export type AppRole = 'admin' | 'user';
export type RequestStatus = 'diproses' | 'selesai';

export interface Profile {
  id: string;
  role: AppRole;
  nama_divisi: string;
}

export interface Item {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  created_at: string;
}

export interface RequestItem {
  id: string;
  user_id: string;
  item_id: string;
  jumlah: number;
  keperluan: string;
  status: RequestStatus;
  created_at: string;
  completed_at: string | null;
}

export interface RequestWithDetails extends RequestItem {
  items?: Item | null;
  profiles?: Profile | null;
}
