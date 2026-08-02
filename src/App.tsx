import { useState, useEffect, useMemo } from 'react';
import { SchoolRecord, MarketingStatus, ClosingProbability, TeamMember, UserRole, AcademicYear } from './types';
import { getInitialSchools } from './data/schoolsSeed';
import { getInitialTeamMembers } from './data/teamSeed';
import { SURVEYED_DATABASE } from './data/surveyedSchools';
import Dashboard from './components/Dashboard';
import SchoolList from './components/SchoolList';
import SchoolDetailModal from './components/SchoolDetailModal';
import CSVImportExport from './components/CSVImportExport';
import TeamManagement from './components/TeamManagement';
import AcademicYearManagement from './components/AcademicYearManagement';
import MasterDataManagement from './components/MasterDataManagement';
import Login from './components/Login';
import { isSameCity } from './data/indonesiaData';
import { 
  BarChart3, 
  School, 
  FileSpreadsheet, 
  HelpCircle, 
  Layers, 
  Briefcase,
  Users,
  CheckCircle2,
  BookmarkCheck,
  TrendingUp,
  Download,
  Upload,
  Plus,
  LogOut,
  User,
  Calendar,
  Database
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ae_marketing_tracker_schools_v2';
const TEAM_STORAGE_KEY = 'ae_marketing_tracker_team_v1';
const AY_STORAGE_KEY = 'ae_marketing_academic_years_v1';

const DEFAULT_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay-2027-2028',
    yearName: '2027/2028',
    title: 'Tahun Ajaran 2027/2028',
    startDate: '1 Jul 2027',
    endDate: '30 Jun 2028',
    status: 'MENDATANG',
    note: 'Periode Persiapan Mendatang'
  },
  {
    id: 'ay-2026-2027',
    yearName: '2026/2027',
    title: 'Tahun Ajaran 2026/2027',
    startDate: '1 Jul 2026',
    endDate: '30 Jun 2027',
    status: 'AKTIF',
    note: 'Periode Berjalan Utama (Aktif)'
  },
  {
    id: 'ay-2025-2026',
    yearName: '2025/2026',
    title: 'Tahun Ajaran 2025/2026',
    startDate: '1 Jul 2025',
    endDate: '30 Jun 2026',
    status: 'ARSIP',
    note: 'Periode Arsip Tahun Lalu'
  },
  {
    id: 'ay-2024-2025',
    yearName: '2024/2025',
    title: 'Tahun Ajaran 2024/2025',
    startDate: '1 Jul 2024',
    endDate: '30 Jun 2025',
    status: 'ARSIP',
    note: 'Periode Arsip Lampau'
  }
];

export default function App() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(DEFAULT_ACADEMIC_YEARS);
  const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState<string>(''); // empty means "Semua Periode"
  const [selectedSchool, setSelectedSchool] = useState<SchoolRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prospects' | 'database' | 'master' | 'team'>('dashboard');

  // Auth & Session States
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);

  // Custom surveyed database state for expansion
  const [customDatabase, setCustomDatabase] = useState<Record<string, Record<string, any[]>>>({});

  // Tab limitations based on UserRole
  const availableTabs = useMemo(() => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case 'SUPERADMIN':
      case 'MANAGER':
        return ['dashboard', 'prospects', 'database', 'master', 'team'];
      case 'AE':
        return ['dashboard', 'prospects', 'database', 'master'];
      case 'MARKETING_LAPANGAN':
        return ['prospects', 'database'];
      default:
        return ['prospects'];
    }
  }, [currentUser]);

  // Load custom database from localStorage on startup
  useEffect(() => {
    const savedCustomDb = localStorage.getItem('ae_custom_surveyed_database_v2');
    if (savedCustomDb) {
      try {
        setCustomDatabase(JSON.parse(savedCustomDb));
      } catch (e) {
        console.error('Failed to parse custom database', e);
      }
    }
  }, []);

  const mergedDatabase = useMemo(() => {
    const merged: Record<string, Record<string, any[]>> = {};
    
    // 1. Copy original SURVEYED_DATABASE
    Object.keys(SURVEYED_DATABASE).forEach(prov => {
      merged[prov] = {};
      Object.keys(SURVEYED_DATABASE[prov]).forEach(city => {
        merged[prov][city] = [...SURVEYED_DATABASE[prov][city]];
      });
    });

    // 2. Merge customDatabase
    Object.keys(customDatabase).forEach(prov => {
      const uppercaseProv = prov.toUpperCase().trim();
      if (!merged[uppercaseProv]) {
        merged[uppercaseProv] = {};
      }
      Object.keys(customDatabase[prov]).forEach(city => {
        const uppercaseCity = city.toUpperCase().trim();
        if (!merged[uppercaseProv][uppercaseCity]) {
          merged[uppercaseProv][uppercaseCity] = [];
        }
        
        // Merge unique schools (prevent duplicates by name)
        const existingNames = new Set(merged[uppercaseProv][uppercaseCity].map(s => s.name ? s.name.toUpperCase().trim() : ''));
        
        customDatabase[prov][city].forEach(sch => {
          if (sch && sch.name) {
            const schNameUpper = sch.name.toUpperCase().trim();
            if (!existingNames.has(schNameUpper)) {
              merged[uppercaseProv][uppercaseCity].push(sch);
              existingNames.add(schNameUpper);
            }
          }
        });
      });
    });

    // 3. Merge active prospect schools so new cities/provinces are always visible
    schools.forEach(s => {
      if (s.provinsi && s.kota) {
        const uppercaseProv = s.provinsi.toUpperCase().trim();
        const uppercaseCity = s.kota.toUpperCase().trim();
        if (!merged[uppercaseProv]) {
          merged[uppercaseProv] = {};
        }
        if (!merged[uppercaseProv][uppercaseCity]) {
          merged[uppercaseProv][uppercaseCity] = [];
        }
        if (s.namaSekolah) {
          const schNameUpper = s.namaSekolah.toUpperCase().trim();
          const existingNames = new Set(merged[uppercaseProv][uppercaseCity].map(item => item.name ? item.name.toUpperCase().trim() : ''));
          if (!existingNames.has(schNameUpper)) {
            merged[uppercaseProv][uppercaseCity].push({
              name: s.namaSekolah,
              instagram: s.instagramHandle,
              tiktok: s.tiktokHandle
            });
          }
        }
      }
    });

    return merged;
  }, [customDatabase, schools]);

  // Shared filter states (dashboard can set these to filter the school list automatically)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<MarketingStatus | 'BELUM AKTIF' | ''>('');
  const [selectedPicFilter, setSelectedPicFilter] = useState<string | ''>('');

  // Shared active region states for database tab
  const [selectedProvince, setSelectedProvince] = useState<string>('JAWA TIMUR');
  const [selectedCity, setSelectedCity] = useState<string>('SURABAYA');

  const handleResetAllData = async () => {
    try {
      await fetch('/api/schools/reset', { method: 'POST' });
      await fetch('/api/custom-db/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Failed resetting on server, clearing locally', e);
    }
    setSchools([]);
    setCustomDatabase({});
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('ae_custom_surveyed_database_v2');
  };

  // Load initial data from Express backend with local storage fallbacks
  useEffect(() => {
    const loadData = async () => {
      // 1. Load custom database
      try {
        const res = await fetch('/api/custom-db');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            setCustomDatabase(data);
            localStorage.setItem('ae_custom_surveyed_database_v2', JSON.stringify(data));
          } else {
            const savedCustomDb = localStorage.getItem('ae_custom_surveyed_database_v2');
            if (savedCustomDb) {
              try {
                const parsed = JSON.parse(savedCustomDb);
                if (parsed && Object.keys(parsed).length > 0) {
                  setCustomDatabase(parsed);
                  fetch('/api/custom-db-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed)
                  }).catch(e => console.warn('Failed to re-sync custom db to server', e));
                }
              } catch (err) {
                console.error('Failed to parse custom database fallback', err);
              }
            }
          }
        } else {
          throw new Error('Not ok');
        }
      } catch (e) {
        console.warn('Failed to load custom database from server, using local fallback', e);
        const savedCustomDb = localStorage.getItem('ae_custom_surveyed_database_v2');
        if (savedCustomDb) {
          try {
            setCustomDatabase(JSON.parse(savedCustomDb));
          } catch (err) {
            console.error('Failed to parse custom database', err);
          }
        }
      }

      // 2. Load schools
      try {
        const res = await fetch('/api/schools');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSchools(data);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          } else {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setSchools(parsed);
                  fetch('/api/schools/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed)
                  }).catch(e => console.warn('Failed to re-sync schools to server', e));
                } else {
                  setSchools([]);
                }
              } catch (err) {
                console.error('Failed to parse saved schools', err);
                setSchools([]);
              }
            } else {
              setSchools([]);
            }
          }
        } else {
          throw new Error('Not ok');
        }
      } catch (e) {
        console.warn('Failed to load schools from server, using local fallback', e);
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          try {
            setSchools(JSON.parse(saved));
          } catch (err) {
            console.error('Failed to parse saved schools', err);
            setSchools([]);
          }
        } else {
          setSchools([]);
        }
      }

      // 3. Load team members
      try {
        const res = await fetch('/api/team');
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data);
        } else {
          throw new Error('Not ok');
        }
      } catch (e) {
        console.warn('Failed to load team from server, using local fallback', e);
        const savedTeam = localStorage.getItem(TEAM_STORAGE_KEY);
        if (savedTeam) {
          try {
            setTeamMembers(JSON.parse(savedTeam));
          } catch (err) {
            console.error('Failed to parse saved team, falling back to seed', err);
            const teamSeed = getInitialTeamMembers();
            setTeamMembers(teamSeed);
            localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamSeed));
          }
        } else {
          const teamSeed = getInitialTeamMembers();
          setTeamMembers(teamSeed);
          localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamSeed));
        }
      }

      // 4. Load academic years
      try {
        const res = await fetch('/api/academic-years');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAcademicYears(data);
            localStorage.setItem(AY_STORAGE_KEY, JSON.stringify(data));
          } else {
            setAcademicYears(DEFAULT_ACADEMIC_YEARS);
          }
        } else {
          throw new Error('Not ok');
        }
      } catch (e) {
        console.warn('Failed to load academic years from server, using local fallback', e);
        const savedAy = localStorage.getItem(AY_STORAGE_KEY);
        if (savedAy) {
          try {
            setAcademicYears(JSON.parse(savedAy));
          } catch (err) {
            setAcademicYears(DEFAULT_ACADEMIC_YEARS);
          }
        } else {
          setAcademicYears(DEFAULT_ACADEMIC_YEARS);
        }
      }

      // 5. Load session
      const savedUser = localStorage.getItem('ae_marketing_tracker_current_user_v1');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Failed to parse current user session', e);
        }
      }
      setAuthHydrated(true);
    };

    loadData();
  }, []);

  // Enforce available tabs based on user role
  useEffect(() => {
    if (currentUser && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] as any);
    }
  }, [currentUser, availableTabs, activeTab]);

  const handleLogin = async (user: TeamMember | { username: string; password?: string }) => {
    const cleanUsername = user.username.toLowerCase().trim();
    const cleanPassword = user.password || '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });
      if (res.ok) {
        const authenticatedUser = await res.json();
        setCurrentUser(authenticatedUser);
        localStorage.setItem('ae_marketing_tracker_current_user_v1', JSON.stringify(authenticatedUser));
        
        if (authenticatedUser.role === 'MARKETING_LAPANGAN') {
          setActiveTab('prospects');
        } else {
          setActiveTab('dashboard');
        }
        return;
      } else {
        const errorData = await res.json();
        // If server responded with error status (e.g. 401), check client fallback if available
        const foundLocal = teamMembers.find(u => u.username.toLowerCase() === cleanUsername);
        if (foundLocal && foundLocal.password && foundLocal.password === cleanPassword) {
          setCurrentUser(foundLocal);
          localStorage.setItem('ae_marketing_tracker_current_user_v1', JSON.stringify(foundLocal));
          if (foundLocal.role === 'MARKETING_LAPANGAN') setActiveTab('prospects');
          else setActiveTab('dashboard');
          return;
        }
        alert(errorData.error || "Username atau password salah!");
        return;
      }
    } catch (e) {
      console.warn('Login connection failed, using client fallback', e);
    }

    // Client fallback if server is unreachable
    const foundLocal = teamMembers.find(u => u.username.toLowerCase() === cleanUsername);
    if (foundLocal) {
      if (!foundLocal.password || foundLocal.password === cleanPassword) {
        setCurrentUser(foundLocal);
        localStorage.setItem('ae_marketing_tracker_current_user_v1', JSON.stringify(foundLocal));
        if (foundLocal.role === 'MARKETING_LAPANGAN') setActiveTab('prospects');
        else setActiveTab('dashboard');
        return;
      }
    } else if ('role' in user) {
      setCurrentUser(user);
      localStorage.setItem('ae_marketing_tracker_current_user_v1', JSON.stringify(user));
      if (user.role === 'MARKETING_LAPANGAN') setActiveTab('prospects');
      else setActiveTab('dashboard');
      return;
    }

    alert("Username atau password salah!");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ae_marketing_tracker_current_user_v1');
  };

  // Save to local storage helper
  const saveSchools = (updatedSchools: SchoolRecord[]) => {
    setSchools(updatedSchools);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSchools));
  };

  // Save bulk schools (e.g. CSV import) and sync to server & customDatabase
  const handleImportBulkSchools = async (importedSchools: SchoolRecord[]): Promise<{ success: boolean; count: number }> => {
    const usedNos = new Set<number>();
    const normalized = importedSchools.map((sch, idx) => {
      const parsedNo = typeof sch.no === 'number' ? sch.no : parseInt(String(sch.no), 10);
      let itemNo = (!isNaN(parsedNo) && parsedNo > 0) ? parsedNo : (idx + 1);
      while (usedNos.has(itemNo)) {
        itemNo++;
      }
      usedNos.add(itemNo);
      return {
        no: itemNo,
        namaSekolah: sch.namaSekolah || '',
        originalName: sch.originalName || '',
        provinsi: sch.provinsi || '',
        kota: sch.kota || '',
        instagramHandle: sch.instagramHandle || '',
        tiktokHandle: sch.tiktokHandle || '',
        picMarketing: sch.picMarketing || '',
        marketingLapangan: sch.marketingLapangan || '',
        status: (sch.status || 'BARU') as MarketingStatus,
        kontakPic1: sch.kontakPic1 || '',
        kontakPic2: sch.kontakPic2 || '',
        kontakPic3: sch.kontakPic3 || '',
        kontakPic4: sch.kontakPic4 || '',
        tanggalKontakAwal: sch.tanggalKontakAwal || '',
        jenisLayanan: sch.jenisLayanan || '',
        catatanAwal: sch.catatanAwal || '',
        tanggalFollowUpTerakhir: sch.tanggalFollowUpTerakhir || '',
        kemungkinanClosing: (sch.kemungkinanClosing || '') as ClosingProbability,
        updates: sch.updates || []
      };
    });

    // Save to local storage & React state
    saveSchools(normalized);

    // Sync to server bulk API
    try {
      const res = await fetch('/api/schools/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server HTTP Error ${res.status}`);
      }
    } catch (e: any) {
      console.error('Failed to sync bulk schools to server', e);
      throw new Error('Gagal menyimpan data ke database server: ' + (e.message || 'Koneksi gagal'));
    }

    // Auto-sync customDatabase for any imported schools with province & city
    const newCustomDb = { ...customDatabase };
    let hasCustomDbChanges = false;

    importedSchools.forEach(sch => {
      if (sch.provinsi && sch.kota && sch.namaSekolah) {
        const provUpper = sch.provinsi.toUpperCase().trim();
        const cityUpper = sch.kota.toUpperCase().trim();
        if (!newCustomDb[provUpper]) newCustomDb[provUpper] = {};
        if (!newCustomDb[provUpper][cityUpper]) newCustomDb[provUpper][cityUpper] = [];

        const existingNames = new Set(
          newCustomDb[provUpper][cityUpper].map(s => s.name ? s.name.toUpperCase().trim() : '')
        );
        const schNameUpper = sch.namaSekolah.toUpperCase().trim();
        if (!existingNames.has(schNameUpper)) {
          newCustomDb[provUpper][cityUpper].push({
            name: sch.namaSekolah,
            instagram: sch.instagramHandle || '',
            tiktok: sch.tiktokHandle || ''
          });
          hasCustomDbChanges = true;
        }
      }
    });

    if (hasCustomDbChanges) {
      await saveCustomDatabase(newCustomDb);
    }

    return { success: true, count: normalized.length };
  };

  const activeAcademicYear = useMemo(() => {
    const active = academicYears.find(a => a.status === 'AKTIF');
    return active ? active.yearName : '2026/2027';
  }, [academicYears]);

  // Filtered schools according to global Academic Year filter
  const displaySchools = useMemo(() => {
    if (!selectedAcademicYearFilter || selectedAcademicYearFilter === 'SEMUA') {
      return [];
    }
    return schools
      .map(s => ({ ...s, periode: s.periode || '2026/2027' }))
      .filter(s => s.periode === selectedAcademicYearFilter);
  }, [schools, selectedAcademicYearFilter]);

  const handleAddAcademicYear = async (newAy: Omit<AcademicYear, 'id'>) => {
    const ayObj: AcademicYear = {
      ...newAy,
      id: `ay-${Date.now()}`
    };
    
    let nextAys = [...academicYears];
    if (ayObj.status === 'AKTIF') {
      nextAys = nextAys.map(a => ({ ...a, status: 'ARSIP' as const }));
    }
    nextAys = [ayObj, ...nextAys];
    setAcademicYears(nextAys);
    localStorage.setItem(AY_STORAGE_KEY, JSON.stringify(nextAys));

    try {
      await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ayObj)
      });
    } catch (e) {
      console.warn('Failed sync academic year to server', e);
    }
  };

  const handleUpdateAcademicYear = async (updatedAy: AcademicYear) => {
    let nextAys = academicYears.map(a => a.id === updatedAy.id ? updatedAy : a);
    if (updatedAy.status === 'AKTIF') {
      nextAys = nextAys.map(a => a.id === updatedAy.id ? updatedAy : { ...a, status: 'ARSIP' as const });
    }
    setAcademicYears(nextAys);
    localStorage.setItem(AY_STORAGE_KEY, JSON.stringify(nextAys));

    try {
      await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAy)
      });
    } catch (e) {
      console.warn('Failed sync updated academic year to server', e);
    }
  };

  const handleDeleteAcademicYear = async (id: string) => {
    const nextAys = academicYears.filter(a => a.id !== id);
    setAcademicYears(nextAys);
    localStorage.setItem(AY_STORAGE_KEY, JSON.stringify(nextAys));

    try {
      await fetch(`/api/academic-years/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed delete academic year on server', e);
    }
  };

  const saveTeamMembers = (updatedTeam: TeamMember[]) => {
    setTeamMembers(updatedTeam);
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(updatedTeam));
  };

  const saveCustomDatabase = async (newDb: Record<string, Record<string, any[]>>) => {
    setCustomDatabase(newDb);
    localStorage.setItem('ae_custom_surveyed_database_v2', JSON.stringify(newDb));

    try {
      await fetch('/api/custom-db-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDb)
      });
    } catch (e) {
      console.error('Failed to sync bulk custom database to server', e);
    }
  };

  // Callback to register team member
  const handleAddTeamMember = async (name: string, role: UserRole, username: string, password?: string) => {
    const cleanUsername = username.toLowerCase().trim();
    const cleanPassword = password?.trim() || 'password123';

    const newMember: TeamMember = {
      id: `${role.toLowerCase()}-${Date.now()}`,
      name,
      role,
      username: cleanUsername,
      password: cleanPassword,
    };

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        const saved = await res.json();
        const memberWithPass = { ...saved, password: cleanPassword };
        setTeamMembers(prev => {
          const next = [...prev.filter(t => t.id !== saved.id && t.username !== cleanUsername), memberWithPass];
          localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
        return;
      }
    } catch (e) {
      console.error('Failed saving team member to server', e);
    }

    const nextTeam = [...teamMembers.filter(t => t.username !== cleanUsername), newMember];
    saveTeamMembers(nextTeam);
  };

  // Callback to delete team member and clear their penugasan on schools
  const handleDeleteTeamMember = async (id: string) => {
    const memberToDelete = teamMembers.find((m) => m.id === id);
    if (!memberToDelete) return;

    try {
      await fetch(`/api/team/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete team member on server', e);
    }

    const nextTeam = teamMembers.filter((m) => m.id !== id);
    saveTeamMembers(nextTeam);

    const nextSchools = schools.map((s) => {
      let updated = false;
      const copy = { ...s };
      if (
        memberToDelete.role === 'AE' &&
        s.picMarketing &&
        s.picMarketing.toLowerCase() === memberToDelete.name.toLowerCase()
      ) {
        copy.picMarketing = '';
        updated = true;
      } else if (
        memberToDelete.role === 'MARKETING_LAPANGAN' &&
        s.marketingLapangan &&
        s.marketingLapangan.toLowerCase() === memberToDelete.name.toLowerCase()
      ) {
        copy.marketingLapangan = '';
        updated = true;
      }
      return updated ? copy : s;
    });

    saveSchools(nextSchools);

    // Auto-logout if the deleted member is the current active logged in user
    if (currentUser && currentUser.id === id) {
      handleLogout();
    }
  };

  // Callback to reset marketing team database, keeping only Super Admin
  const handleResetTeam = async () => {
    try {
      const res = await fetch('/api/team/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.team);
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(data.team));
        alert("Database tim marketing berhasil di-reset. Tersisa Super Admin.");
        return;
      }
    } catch (e) {
      console.error('Failed resetting team on server', e);
    }

    const resetSeed = getInitialTeamMembers();
    setTeamMembers(resetSeed);
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(resetSeed));
    alert("Database tim marketing di-reset secara lokal. Tersisa Super Admin.");
  };

  // Callback to update or add a school
  const handleSaveSchool = async (updatedSchool: SchoolRecord) => {
    const isNew = !updatedSchool.no || updatedSchool.no <= 0 || !schools.some(s => s.no === updatedSchool.no);
    if (isNew) {
      const maxNo = schools.reduce((max, s) => s.no > max ? s.no : max, 0);
      updatedSchool.no = maxNo + 1;
    }

    // 1. Instantly save to local state and localStorage for instant UI response
    const exists = schools.some(s => s.no === updatedSchool.no);
    const initialNext = exists
      ? schools.map(s => s.no === updatedSchool.no ? updatedSchool : s)
      : [updatedSchool, ...schools];
    saveSchools(initialNext);

    let savedResult: SchoolRecord = updatedSchool;
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSchool)
      });
      if (res.ok) {
        savedResult = await res.json();
        setSchools(prev => {
          const prevExists = prev.some(s => s.no === savedResult.no || s.no === updatedSchool.no);
          const updatedList = prevExists
            ? prev.map(s => (s.no === savedResult.no || s.no === updatedSchool.no) ? savedResult : s)
            : [savedResult, ...prev];
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
          return updatedList;
        });
      }
    } catch (e) {
      console.warn('Failed saving school to server, using client fallback', e);
    }

    // Auto-sync custom database if province & city are provided
    if (savedResult.provinsi && savedResult.kota) {
      const provUpper = savedResult.provinsi.toUpperCase().trim();
      const cityUpper = savedResult.kota.toUpperCase().trim();
      const newCustomDb = { ...customDatabase };
      if (!newCustomDb[provUpper]) newCustomDb[provUpper] = {};
      if (!newCustomDb[provUpper][cityUpper]) newCustomDb[provUpper][cityUpper] = [];

      const existingNames = new Set(newCustomDb[provUpper][cityUpper].map(s => s.name ? s.name.toUpperCase().trim() : ''));
      if (savedResult.namaSekolah && !existingNames.has(savedResult.namaSekolah.toUpperCase().trim())) {
        newCustomDb[provUpper][cityUpper].push({
          name: savedResult.namaSekolah,
          instagram: savedResult.instagramHandle || '',
          tiktok: savedResult.tiktokHandle || ''
        });
        saveCustomDatabase(newCustomDb);
      } else if (!newCustomDb[provUpper][cityUpper]) {
        saveCustomDatabase(newCustomDb);
      }
    }
  };

  // Callback to delete a school
  const handleDeleteSchool = async (schoolNo: number, schoolName?: string) => {
    try {
      if (schoolNo > 0) {
        await fetch(`/api/schools/${schoolNo}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Failed to delete school on server, using client fallback', e);
    }

    const nextSchools = schools.filter(s => {
      if (schoolNo > 0 && Number(s.no) === Number(schoolNo)) {
        return false;
      }
      if (schoolName && s.namaSekolah?.toLowerCase().trim() === schoolName.toLowerCase().trim()) {
        return false;
      }
      return true;
    });

    saveSchools(nextSchools);
    setIsDetailOpen(false);
    setSelectedSchool(null);
  };

  // Callback from dashboard to filter status
  const handleDashboardFilterStatus = (status: MarketingStatus) => {
    setSelectedStatusFilter(status);
    const isProspectStage = ['PROSPEK', 'MEETING / VISIT', 'DEAL', 'CLOSING', 'CLOSED'].includes(status);
    if (isProspectStage) {
      setActiveTab('prospects');
    } else {
      setActiveTab('database');
    }
  };

  // Callback from dashboard to filter PIC
  const handleDashboardFilterPic = (pic: string) => {
    setSelectedPicFilter(pic);
    setActiveTab('prospects');
  };

  // Triggering the add new school drawer
  const handleTriggerAddSchool = () => {
    setSelectedSchool(null); // passing null creates a template
    setIsDetailOpen(true);
  };

  // Filtered schools according to selected region (Province & City) in addition to Academic Year
  const displaySchoolsForRegion = useMemo(() => {
    return displaySchools.filter(s => {
      if (selectedProvince) {
        const provUpper = s.provinsi?.toUpperCase().trim() || '';
        if (provUpper !== selectedProvince.toUpperCase().trim()) return false;
      }
      if (selectedCity) {
        const cityUpper = s.kota?.toUpperCase().trim() || '';
        if (!isSameCity(cityUpper, selectedCity, selectedProvince)) return false;
      }
      return true;
    });
  }, [displaySchools, selectedProvince, selectedCity]);

  // Calculate quick top counters based on current active period and active region filters
  const totalSchoolsCount = displaySchoolsForRegion.length;
  const prospectSchoolsCount = useMemo(() => {
    return displaySchoolsForRegion.filter(s => ['PROSPEK', 'MEETING / VISIT', 'DEAL', 'CLOSING', 'CLOSED'].includes(s.status)).length;
  }, [displaySchoolsForRegion]);
  const contactedSchoolsCount = useMemo(() => {
    return displaySchoolsForRegion.filter(s => s.status !== 'BARU').length;
  }, [displaySchoolsForRegion]);
  const closedSuccessCount = useMemo(() => {
    return displaySchoolsForRegion.filter(s => s.status === 'DEAL' || (s.status as string) === 'CLOSED').length;
  }, [displaySchoolsForRegion]);

  if (!authHydrated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md">
            <Briefcase className="h-6 w-6 animate-bounce" />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Memuat Sesi...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login teamMembers={teamMembers} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans max-w-full overflow-x-hidden" id="app-root">
      
      {/* Dynamic Navigation Header */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-xs max-w-full overflow-hidden" id="main-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 md:py-3 flex flex-col lg:flex-row items-center justify-between gap-2.5 lg:gap-4">
          
          {/* Logo Title & Profile combined on mobile & tablet */}
          <div className="flex items-center justify-between w-full lg:w-auto shrink-0 gap-2" id="header-logo-container">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                <Briefcase className="h-4 w-4 md:h-4.5 md:w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-slate-900 truncate">
                    Marketing & CRM Tracker Nanoidn
                  </h1>
                  <span className="text-[7px] md:text-[8px] font-extrabold tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-md shrink-0">PWA</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium hidden sm:block uppercase truncate">Sistem Pemantauan Progress & Database Marketing Nanoidn</p>
              </div>
            </div>

            {/* Profile Avatar & Logout Button for Mobile/Tablet (< lg) */}
            <div className="flex lg:hidden items-center space-x-1.5 bg-indigo-50/60 border border-indigo-100/60 px-2 py-0.5 rounded-lg shadow-3xs shrink-0" id="header-user-profile-mobile">
              <div className="flex items-center space-x-1 shrink-0">
                <div className="h-5 w-5 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-[8px] uppercase shadow-2xs shrink-0">
                  {currentUser?.name.substring(0, 2)}
                </div>
                <div className="text-left max-w-[60px] sm:max-w-none truncate">
                  <p className="text-[8px] sm:text-[9px] font-extrabold text-slate-800 leading-none truncate">{currentUser?.name.split(' ')[0]}</p>
                </div>
              </div>
              <div className="h-3.5 w-px bg-indigo-100"></div>
              <button
                onClick={handleLogout}
                id="btn-header-logout-mobile"
                title="Keluar / Logout"
                className="p-1 text-indigo-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Quick Stats Panel & Status badge in Header */}
          <div className="flex items-center justify-between sm:justify-end w-full lg:w-auto gap-1.5 sm:gap-2 md:gap-3 shrink-0" id="header-actions-area">
            
            {/* Global Academic Year Filter Dropdown */}
            <div 
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border transition-all shrink-0 ${
                !selectedAcademicYearFilter 
                  ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/50' 
                  : 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80 shadow-3xs'
              }`} 
              id="header-global-periode-filter"
            >
              <Calendar className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${!selectedAcademicYearFilter ? 'text-amber-700' : 'text-indigo-600'}`} />
              <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase hidden sm:inline ${!selectedAcademicYearFilter ? 'text-amber-800' : 'text-indigo-500'}`}>Periode:</span>
              <select
                id="select-global-academic-year"
                value={selectedAcademicYearFilter}
                onChange={(e) => setSelectedAcademicYearFilter(e.target.value)}
                className={`bg-transparent text-[11px] sm:text-xs font-black border-none outline-hidden focus:ring-0 cursor-pointer pr-0.5 max-w-[120px] sm:max-w-none truncate ${!selectedAcademicYearFilter ? 'text-amber-950' : 'text-indigo-950'}`}
              >
                <option value="">Pilih Periode</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.yearName}>
                    {ay.yearName} {ay.status === 'AKTIF' ? '★ Aktif' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-50 text-emerald-700 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-semibold flex items-center gap-1 border border-emerald-100 shrink-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="hidden xs:inline">Sync Aktif</span>
              <span className="xs:hidden">Sync</span>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 bg-slate-50 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-slate-200 text-[9px] sm:text-[10px] md:text-[11px] text-slate-600 shrink-0" id="header-counters">
              <div className="text-center min-w-[26px] sm:min-w-[32px]">
                <p className="text-[6.5px] sm:text-[7px] md:text-[8px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Target</p>
                <p className="font-bold text-slate-800 text-[9px] sm:text-[10px] md:text-xs mt-0.5">{totalSchoolsCount}</p>
              </div>
              <div className="h-3.5 sm:h-4 w-px bg-slate-200"></div>
              <div className="text-center min-w-[26px] sm:min-w-[32px]">
                <p className="text-[6.5px] sm:text-[7px] md:text-[8px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Dijajaki</p>
                <p className="font-bold text-amber-600 text-[9px] sm:text-[10px] md:text-xs mt-0.5">{contactedSchoolsCount}</p>
              </div>
              <div className="h-3.5 sm:h-4 w-px bg-slate-200"></div>
              <div className="text-center min-w-[26px] sm:min-w-[32px]">
                <p className="text-[6.5px] sm:text-[7px] md:text-[8px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Closed</p>
                <p className="font-bold text-emerald-600 text-[9px] sm:text-[10px] md:text-xs mt-0.5">{closedSuccessCount}</p>
              </div>
            </div>

            {/* Profile Avatar & Logout Button for Desktop only (>= lg) */}
            <div className="hidden lg:flex items-center space-x-2 bg-indigo-50/60 border border-indigo-100/60 px-2.5 py-1 rounded-xl shadow-3xs shrink-0" id="header-user-profile-desktop">
              <div className="flex items-center space-x-1.5">
                <div className="h-6 w-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-black text-[9px] uppercase shadow-2xs shrink-0">
                  {currentUser?.name.substring(0, 2)}
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-extrabold text-slate-800 leading-none">{currentUser?.name.split(' ')[0]}</p>
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest leading-none block mt-0.5">{currentUser?.role === 'SUPERADMIN' ? 'ADMIN' : currentUser?.role === 'MARKETING_LAPANGAN' ? 'LAPANGAN' : currentUser?.role}</span>
                </div>
              </div>
              <div className="h-4 w-px bg-indigo-100"></div>
              <button
                onClick={handleLogout}
                id="btn-header-logout-desktop"
                title="Keluar / Logout"
                className="p-1 text-indigo-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 lg:py-6 space-y-6" id="main-content-layout">
        
        {/* Tab Switcher */}
        <div className="hidden lg:flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-200 pb-4" id="tabs-navigation-panel">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar flex-nowrap" id="tabs-segmented-wrapper">
            {availableTabs.includes('dashboard') && (
              <button
                onClick={() => setActiveTab('dashboard')}
                id="tab-btn-dashboard"
                className={`px-4 py-2 text-xs font-bold flex items-center space-x-2 transition-all rounded-lg shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Dashboard Analisa</span>
              </button>
            )}
            {availableTabs.includes('prospects') && (
              <button
                onClick={() => setActiveTab('prospects')}
                id="tab-btn-prospects"
                className={`px-4 py-2 text-xs font-bold flex items-center space-x-2 transition-all rounded-lg shrink-0 ${
                  activeTab === 'prospects'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <School className="h-3.5 w-3.5" />
                <span>Daftar Prospek Sekolah</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'prospects' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                  {prospectSchoolsCount}
                </span>
              </button>
            )}
            {availableTabs.includes('database') && (
              <button
                onClick={() => setActiveTab('database')}
                id="tab-btn-database"
                className={`px-4 py-2 text-xs font-bold flex items-center space-x-2 transition-all rounded-lg shrink-0 ${
                  activeTab === 'database'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Database Sekolah</span>
              </button>
            )}
            {availableTabs.includes('master') && (
              <button
                onClick={() => setActiveTab('master')}
                id="tab-btn-master"
                className={`px-4 py-2 text-xs font-bold flex items-center space-x-2 transition-all rounded-lg shrink-0 ${
                  activeTab === 'master'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>Master Data</span>
              </button>
            )}
            {availableTabs.includes('team') && (
              <button
                onClick={() => setActiveTab('team')}
                id="tab-btn-team"
                className={`px-4 py-2 text-xs font-bold flex items-center space-x-2 transition-all rounded-lg shrink-0 ${
                  activeTab === 'team'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Tim Marketing</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'team' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                  {teamMembers.length}
                </span>
              </button>
            )}
          </div>

          <button
            onClick={handleTriggerAddSchool}
            id="quick-add-school-floating-top"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer w-full lg:w-auto"
          >
            <span>+ Tambah Sekolah</span>
          </button>
        </div>

        {/* Notice Banner when no Academic Year / Periode is selected */}
        {!selectedAcademicYearFilter && (
          <div className="bg-amber-50/95 border-2 border-amber-300/90 rounded-2xl p-4 sm:p-5 text-amber-950 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6" id="select-periode-global-notice">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-1.5">
                  <span>Pilih Periode (Tahun Ajaran) Terlebih Dahulu</span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-black">Wajib</span>
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Data sekolah target disembunyikan sampai Anda memilih periode di menu kanan atas header untuk meminimalisir duplikasi data.
                </p>
              </div>
            </div>
            {academicYears.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 self-stretch sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/80">
                <span className="text-[11px] font-bold text-amber-800 hidden md:inline">Pilih Cepat:</span>
                {academicYears.map(ay => (
                  <button
                    key={ay.id}
                    onClick={() => setSelectedAcademicYearFilter(ay.yearName)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <span>{ay.yearName}</span>
                    {ay.status === 'AKTIF' && <span className="text-[9px] bg-amber-800 text-amber-100 px-1 py-0.2 rounded font-black">Aktif</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Contents */}
        <div className="transition-all duration-300" id="tab-renderer">
          {activeTab === 'dashboard' && (
            <Dashboard 
              schools={displaySchools} 
              onSelectSchool={(school) => {
                setSelectedSchool(school);
                setIsDetailOpen(true);
              }}
              onFilterStatus={handleDashboardFilterStatus}
              onFilterPic={handleDashboardFilterPic}
            />
          )}

          {activeTab === 'prospects' && (
            <SchoolList
              viewMode="prospects"
              schools={displaySchools}
              selectedAcademicYearFilter={selectedAcademicYearFilter}
              selectedStatusFilter={selectedStatusFilter}
              selectedPicFilter={selectedPicFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              setSelectedPicFilter={setSelectedPicFilter}
              onSelectSchool={(school) => {
                setSelectedSchool(school);
                setIsDetailOpen(true);
              }}
              onAddSchool={handleTriggerAddSchool}
              mergedDatabase={mergedDatabase}
              customDatabase={customDatabase}
              onUpdateCustomDatabase={saveCustomDatabase}
              selectedProvince={selectedProvince}
              selectedCity={selectedCity}
              setSelectedProvince={setSelectedProvince}
              setSelectedCity={setSelectedCity}
            />
          )}

          {activeTab === 'database' && (
            <SchoolList
              viewMode="database"
              schools={displaySchools}
              selectedAcademicYearFilter={selectedAcademicYearFilter}
              selectedStatusFilter={selectedStatusFilter}
              selectedPicFilter={selectedPicFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              setSelectedPicFilter={setSelectedPicFilter}
              onSelectSchool={(school) => {
                setSelectedSchool(school);
                setIsDetailOpen(true);
              }}
              onAddSchool={handleTriggerAddSchool}
              mergedDatabase={mergedDatabase}
              customDatabase={customDatabase}
              onUpdateCustomDatabase={saveCustomDatabase}
              selectedProvince={selectedProvince}
              selectedCity={selectedCity}
              setSelectedProvince={setSelectedProvince}
              setSelectedCity={setSelectedCity}
            />
          )}

          {activeTab === 'master' && (
            <MasterDataManagement
              schools={schools}
              academicYears={academicYears}
              onImport={handleImportBulkSchools}
              onReset={handleResetAllData}
              onViewProspects={() => setActiveTab('prospects')}
              onAddAcademicYear={handleAddAcademicYear}
              onUpdateAcademicYear={handleUpdateAcademicYear}
              onDeleteAcademicYear={handleDeleteAcademicYear}
              onSelectYearFilter={(yearName) => {
                setSelectedAcademicYearFilter(yearName);
                setActiveTab('prospects');
              }}
            />
          )}

          {activeTab === 'team' && (
            <TeamManagement
              teamMembers={teamMembers}
              schools={schools}
              onAddMember={handleAddTeamMember}
              onDeleteMember={handleDeleteTeamMember}
              onResetTeam={handleResetTeam}
              currentUser={currentUser}
            />
          )}
        </div>

      </main>

      {/* PWA / Help Section in Footer */}
      <footer className="bg-white border-t border-slate-100 mt-12 py-8" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="flex items-center justify-center space-x-2 text-slate-500 text-sm font-semibold" id="pwa-install-help">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            <span>Cara Menjadikan Aplikasi PWA di HP Anda:</span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
            Buka aplikasi ini di browser HP Anda (Chrome untuk Android, Safari untuk iOS). Klik tombol menu browser, lalu pilih <b>"Tambahkan ke Layar Utama" (Add to Home Screen)</b>. Aplikasi akan terinstall secara mandiri dengan akses offline instan!
          </p>
          <p className="text-[10px] text-slate-300 pt-3">
            © 2026 AE Marketing Progress Tracker. Didukung Penyimpanan Offline Terenkripsi Lokal.
          </p>
        </div>
      </footer>

      {/* School Editor / Details Drawer Modal */}
      {isDetailOpen && (
        <SchoolDetailModal
          school={selectedSchool}
          teamMembers={teamMembers}
          academicYears={academicYears.map(a => a.yearName)}
          defaultPeriode={activeAcademicYear}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedSchool(null);
          }}
          onSave={handleSaveSchool}
          onDelete={handleDeleteSchool}
          mergedDatabase={mergedDatabase}
          currentUser={currentUser}
        />
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={handleTriggerAddSchool}
        className="lg:hidden fixed bottom-20 right-5 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.3)] hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-indigo-500"
        title="Tambah Sekolah"
        id="mobile-fab-add-school"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Mobile Bottom Navigation Bar (Icons Only) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-3 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe" id="mobile-bottom-nav">
        {availableTabs.includes('dashboard') && (
          <button
            onClick={() => setActiveTab('dashboard')}
            id="mobile-nav-dashboard"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all relative ${
              activeTab === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
            title="Dashboard Analisa"
          >
            <BarChart3 className="h-5 w-5" />
            {activeTab === 'dashboard' && (
              <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></span>
            )}
          </button>
        )}
        {availableTabs.includes('prospects') && (
          <button
            onClick={() => setActiveTab('prospects')}
            id="mobile-nav-prospects"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all relative ${
              activeTab === 'prospects' ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
            title="Daftar Prospek"
          >
            <div className="relative">
              <School className="h-5 w-5" />
              {prospectSchoolsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[8px] font-black px-1 py-0.2 rounded-full leading-none min-w-[12px] text-center scale-90">
                  {prospectSchoolsCount}
                </span>
              )}
            </div>
            {activeTab === 'prospects' && (
              <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></span>
            )}
          </button>
        )}
        {availableTabs.includes('database') && (
          <button
            onClick={() => setActiveTab('database')}
            id="mobile-nav-database"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all relative ${
              activeTab === 'database' ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
            title="Database Sekolah"
          >
            <Layers className="h-5 w-5" />
            {activeTab === 'database' && (
              <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></span>
            )}
          </button>
        )}
        {availableTabs.includes('master') && (
          <button
            onClick={() => setActiveTab('master')}
            id="mobile-nav-master"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all relative ${
              activeTab === 'master' ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
            title="Master Data"
          >
            <Database className="h-5 w-5" />
            {activeTab === 'master' && (
              <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></span>
            )}
          </button>
        )}
        {availableTabs.includes('team') && (
          <button
            onClick={() => setActiveTab('team')}
            id="mobile-nav-team"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all relative ${
              activeTab === 'team' ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
            title="Tim Marketing"
          >
            <div className="relative">
              <Users className="h-5 w-5" />
              {teamMembers.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[8px] font-black px-1 py-0.2 rounded-full leading-none min-w-[12px] text-center scale-90">
                  {teamMembers.length}
                </span>
              )}
            </div>
            {activeTab === 'team' && (
              <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></span>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
