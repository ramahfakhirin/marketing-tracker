export type MarketingStatus = 'BARU' | 'DIHUBUNGI' | 'FOLLOW UP' | 'PROSPEK' | 'MEETING / VISIT' | 'DEAL' | 'LOST';
export type ClosingProbability = 'LOW' | 'MEDIUM' | 'HIGH' | '';

export type UserRole = 'SUPERADMIN' | 'MANAGER' | 'AE' | 'MARKETING_LAPANGAN';

export type AcademicYearStatus = 'AKTIF' | 'MENDATANG' | 'ARSIP';

export interface AcademicYear {
  id: string;
  yearName: string; // e.g. "2026/2027"
  title: string; // e.g. "Tahun Ajaran 2026/2027"
  startDate: string; // e.g. "1 Jul 2026"
  endDate: string; // e.g. "30 Jun 2027"
  status: AcademicYearStatus; // 'AKTIF' | 'MENDATANG' | 'ARSIP'
  note?: string; // e.g. "Periode Berjalan Utama (Aktif)"
}

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
  periode?: string; // Academic Year period e.g. "2026/2027"
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
