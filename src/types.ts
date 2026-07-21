export type MarketingStatus = 'BARU' | 'DIHUBUNGI' | 'FOLLOW UP' | 'CLOSING' | 'CLOSED' | 'GAGAL';
export type ClosingProbability = 'LOW' | 'MEDIUM' | 'HIGH' | '';

export type UserRole = 'SUPERADMIN' | 'MANAGER' | 'AE' | 'MARKETING_LAPANGAN';

export interface SchoolRecord {
  no: number;
  namaSekolah: string;
  originalName?: string; // Tracks the immutable original surveyed database name
  provinsi?: string; // Provinsi (Province)
  kota?: string; // Kota/Kabupaten (City/Regency)
  instagramHandle?: string; // extracted from name, e.g. @ipheast_ss
  tiktokHandle?: string; // tiktok username e.g. @school_tiktok
  picMarketing: string; // Assigned AE / PIC
  marketingLapangan?: string; // Field Marketing (optional)
  status: MarketingStatus;
  kontakPic1: string;
  kontakPic2: string;
  kontakPic3: string;
  kontakPic4: string;
  tanggalKontakAwal: string;
  jenisLayanan: string;
  catatanAwal: string;
  tanggalFollowUpTerakhir: string;
  kemungkinanClosing: ClosingProbability;
  updates: string[]; // List of updates (UPDATE 1 to UPDATE 7 and more)
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  password?: string;
}

export interface MarketingStats {
  total: number;
  byStatus: Record<MarketingStatus, number>;
  byClosingProbability: Record<string, number>;
  byPic: Record<string, number>;
}
