import { useState, useEffect, useMemo } from 'react';
import { SchoolRecord, MarketingStatus, TeamMember, UserRole } from './types';
import { SURVEYED_DATABASE } from './data/surveyedSchools';
import Dashboard from './components/Dashboard';
import SchoolList from './components/SchoolList';
import SchoolDetailModal from './components/SchoolDetailModal';
import CSVImportExport from './components/CSVImportExport';
import TeamManagement from './components/TeamManagement';
import Login from './components/Login';
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
  User
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ae_marketing_tracker_schools_v2';
const TEAM_STORAGE_KEY = 'ae_marketing_tracker_team_v1';
const TOKEN_STORAGE_KEY = 'ae_marketing_tracker_token_v2';

export default function App() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prospects' | 'database' | 'sync' | 'team'>('dashboard');

  // Auth & Session States
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);

  // Fetch wrapper that attaches the session token and auto-logs-out on 401
  const authFetch = async (url: string, options: RequestInit = {}, token?: string | null) => {
    const activeToken = token !== undefined ? token : authToken;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      },
    });
    if (res.status === 401) {
      setCurrentUser(null);
      setAuthToken(null);
      localStorage.removeItem('ae_marketing_tracker_current_user_v1');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    return res;
  };

  // Custom surveyed database state for expansion
  const [customDatabase, setCustomDatabase] = useState<Record<string, Record<string, any[]>>>({});

  // Tab limitations based on UserRole
  const availableTabs = useMemo(() => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case 'SUPERADMIN':
      case 'MANAGER':
        return ['dashboard', 'prospects', 'database', 'sync', 'team'];
      case 'AE':
        return ['dashboard', 'prospects', 'database', 'sync'];
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
        const existingNames = new Set(merged[uppercaseProv][uppercaseCity].map(s => s.name.toUpperCase().trim()));
        
        customDatabase[prov][city].forEach(sch => {
          const schNameUpper = sch.name.toUpperCase().trim();
          if (!existingNames.has(schNameUpper)) {
            merged[uppercaseProv][uppercaseCity].push(sch);
            existingNames.add(schNameUpper);
          }
        });
      });
    });

    return merged;
  }, [customDatabase]);

  // Shared filter states (dashboard can set these to filter the school list automatically)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<MarketingStatus | ''>('');
  const [selectedPicFilter, setSelectedPicFilter] = useState<string | ''>('');

  // Shared active region states for database tab
  const [selectedProvince, setSelectedProvince] = useState<string>('JAWA TIMUR');
  const [selectedCity, setSelectedCity] = useState<string>('SURABAYA');

  // Hydrate session first; only load server data once a valid session token exists
  useEffect(() => {
    const hydrate = async () => {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUser = localStorage.getItem('ae_marketing_tracker_current_user_v1');

      if (savedToken && savedUser) {
        try {
          setAuthToken(savedToken);
          setCurrentUser(JSON.parse(savedUser));
          await loadServerData(savedToken);
        } catch (e) {
          console.error('Failed to restore session', e);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem('ae_marketing_tracker_current_user_v1');
        }
      }
      setAuthHydrated(true);
    };

    hydrate();
  }, []);

  // Load schools, team, and custom database from the server (requires an authenticated session)
  const loadServerData = async (token: string) => {
    try {
      const res = await authFetch('/api/custom-db', {}, token);
      if (res.ok) setCustomDatabase(await res.json());
    } catch (e) {
      console.warn('Failed to load custom database from server', e);
    }

    try {
      const res = await authFetch('/api/schools', {}, token);
      if (res.ok) setSchools(await res.json());
    } catch (e) {
      console.warn('Failed to load schools from server', e);
    }

    try {
      const res = await authFetch('/api/team', {}, token);
      if (res.ok) setTeamMembers(await res.json());
    } catch (e) {
      console.warn('Failed to load team from server', e);
    }
  };

  // Enforce available tabs based on user role
  useEffect(() => {
    if (currentUser && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] as any);
    }
  }, [currentUser, availableTabs, activeTab]);

  const handleLogin = async (credentials: { username: string; password?: string }) => {
    const cleanUsername = credentials.username.toLowerCase().trim();
    const cleanPassword = credentials.password || '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setAuthToken(data.token);
        localStorage.setItem('ae_marketing_tracker_current_user_v1', JSON.stringify(data.user));
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        await loadServerData(data.token);

        if (data.user.role === 'MARKETING_LAPANGAN') {
          setActiveTab('prospects');
        } else {
          setActiveTab('dashboard');
        }
      } else {
        alert(data.error || "Username atau password salah!");
      }
    } catch (e) {
      console.error('Login request failed', e);
      alert("Tidak dapat terhubung ke server. Coba lagi.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('ae_marketing_tracker_current_user_v1');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const saveSchools = (updatedSchools: SchoolRecord[]) => {
    setSchools(updatedSchools);
  };

  const saveTeamMembers = (updatedTeam: TeamMember[]) => {
    setTeamMembers(updatedTeam);
  };

  const saveCustomDatabase = async (newDb: Record<string, Record<string, any[]>>) => {
    setCustomDatabase(newDb);

    try {
      await authFetch('/api/custom-db-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDb)
      });
    } catch (e) {
      console.error('Failed to sync bulk custom database to server', e);
    }
  };

  // Callback to register team member (returns an error message on failure, undefined on success)
  const handleAddTeamMember = async (name: string, role: UserRole, username: string, password?: string): Promise<string | undefined> => {
    const cleanUsername = username.toLowerCase().trim();
    const newMember = {
      id: `${role.toLowerCase()}-${Date.now()}`,
      name,
      role,
      username: cleanUsername,
      password: password?.trim() || undefined,
    };

    try {
      const res = await authFetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();
      if (res.ok) {
        setTeamMembers(prev => [...prev.filter(t => t.id !== data.id && t.username !== cleanUsername), data]);
        return undefined;
      }
      return data.error || 'Gagal menambahkan anggota tim';
    } catch (e) {
      console.error('Failed saving team member to server', e);
      return 'Tidak dapat terhubung ke server';
    }
  };

  // Callback to delete team member and clear their penugasan on schools
  const handleDeleteTeamMember = async (id: string) => {
    const memberToDelete = teamMembers.find((m) => m.id === id);
    if (!memberToDelete) return;

    try {
      await authFetch(`/api/team/${id}`, { method: 'DELETE' });
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
      const res = await authFetch('/api/team/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.team);
        alert("Database tim marketing berhasil di-reset. Tersisa Super Admin.");
      } else {
        alert("Gagal me-reset database tim di server.");
      }
    } catch (e) {
      console.error('Failed resetting team on server', e);
      alert("Tidak dapat terhubung ke server.");
    }
  };

  // Callback to update or add a school
  const handleSaveSchool = async (updatedSchool: SchoolRecord) => {
    const isNew = !updatedSchool.no || !schools.some(s => s.no === updatedSchool.no);
    if (isNew && (!updatedSchool.no || updatedSchool.no === 0)) {
      const maxNo = schools.reduce((max, s) => s.no > max ? s.no : max, 0);
      updatedSchool.no = maxNo + 1;
    }

    try {
      const res = await authFetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSchool)
      });
      if (res.ok) {
        const saved = await res.json();
        if (isNew) {
          setSchools(prev => [saved, ...prev.filter(s => s.no !== updatedSchool.no)]);
        } else {
          setSchools(prev => prev.map(s => s.no === saved.no ? saved : s));
        }
      } else {
        alert('Gagal menyimpan sekolah ke server.');
      }
    } catch (e) {
      console.error('Failed saving school to server', e);
      alert('Tidak dapat terhubung ke server.');
    }
  };

  // Callback to delete a school
  const handleDeleteSchool = async (schoolNo: number) => {
    try {
      const res = await authFetch(`/api/schools/${schoolNo}`, { method: 'DELETE' });
      if (res.ok) {
        setSchools(prev => prev.filter(s => Number(s.no) !== Number(schoolNo)));
      } else {
        alert('Gagal menghapus sekolah di server.');
      }
    } catch (e) {
      console.error('Failed to delete school on server', e);
      alert('Tidak dapat terhubung ke server.');
    }
    setIsDetailOpen(false);
    setSelectedSchool(null);
  };

  // Callback to bulk-replace all schools (CSV import / full database reset) - always persists to server
  const handleBulkReplaceSchools = async (newSchools: SchoolRecord[]) => {
    try {
      const res = await authFetch('/api/schools/bulk-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchools)
      });
      if (res.ok) {
        setSchools(newSchools);
        return true;
      }
      alert('Gagal menyimpan data ke server.');
      return false;
    } catch (e) {
      console.error('Failed to bulk-replace schools on server', e);
      alert('Tidak dapat terhubung ke server.');
      return false;
    }
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

  // Calculate quick top counters
  const totalSchoolsCount = schools.length;
  const prospectSchoolsCount = schools.filter(s => ['PROSPEK', 'MEETING / VISIT', 'DEAL', 'CLOSING', 'CLOSED'].includes(s.status)).length;
  const contactedSchoolsCount = schools.filter(s => s.status !== 'BARU').length;
  const closedSuccessCount = schools.filter(s => s.status === 'DEAL' || (s.status as string) === 'CLOSED').length;

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
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans" id="app-root">
      
      {/* Dynamic Navigation Header */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-xs" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 md:py-3 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-3">
          
          {/* Logo Title & Profile combined on mobile */}
          <div className="flex items-center justify-between w-full md:w-auto" id="header-logo-container">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-8.5 h-8.5 md:w-9 md:h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                <Briefcase className="h-4 w-4 md:h-4.5 md:w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-900">
                    Marketing & CRM Tracker Nanoidn
                  </h1>
                  <span className="text-[7px] md:text-[8px] font-extrabold tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md">PWA</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium hidden md:block uppercase">Sistem Pemantauan Progress & Database Marketing Nanoidn</p>
              </div>
            </div>

            {/* Profile Avatar & Logout Button for Mobile only */}
            <div className="flex md:hidden items-center space-x-2 bg-indigo-50/60 border border-indigo-100/60 px-2 py-0.5 rounded-lg shadow-3xs" id="header-user-profile-mobile">
              <div className="flex items-center space-x-1 shrink-0">
                <div className="h-5 w-5 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-[8px] uppercase shadow-2xs shrink-0">
                  {currentUser?.name.substring(0, 2)}
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-extrabold text-slate-800 leading-none">{currentUser?.name.split(' ')[0]}</p>
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
          <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-3" id="header-actions-area">
            <div className="px-2 py-0.5 md:px-2.5 md:py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] md:text-[10px] font-semibold flex items-center gap-1 border border-emerald-100 shrink-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="hidden xs:inline">Sync Aktif</span>
              <span className="xs:hidden">Sync</span>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4 bg-slate-50 px-2 py-0.5 md:px-3 md:py-1 rounded-xl border border-slate-200 text-[10px] md:text-[11px] text-slate-600" id="header-counters">
              <div className="text-center min-w-[32px]">
                <p className="text-[7px] md:text-[8px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Target</p>
                <p className="font-bold text-slate-800 text-[10px] md:text-xs mt-0.5">{totalSchoolsCount}</p>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="text-center min-w-[32px]">
                <p className="text-[7px] md:text-[8px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Dijajaki</p>
                <p className="font-bold text-amber-600 text-[10px] md:text-xs mt-0.5">{contactedSchoolsCount}</p>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="text-center min-w-[32px]">
                <p className="text-[7px] md:text-[8px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Closed</p>
                <p className="font-bold text-emerald-600 text-[10px] md:text-xs mt-0.5">{closedSuccessCount}</p>
              </div>
            </div>

            {/* Profile Avatar & Logout Button for Desktop only */}
            <div className="hidden md:flex items-center space-x-2 bg-indigo-50/60 border border-indigo-100/60 px-2.5 py-1 rounded-xl shadow-3xs" id="header-user-profile-desktop">
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
            {availableTabs.includes('sync') && (
              <button
                onClick={() => setActiveTab('sync')}
                id="tab-btn-sync"
                className={`px-4 py-2 text-xs font-bold flex items-center space-x-2 transition-all rounded-lg shrink-0 ${
                  activeTab === 'sync'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Sinkronisasi Sheet</span>
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

        {/* Tab Contents */}
        <div className="transition-all duration-300" id="tab-renderer">
          {activeTab === 'dashboard' && (
            <Dashboard 
              schools={schools} 
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
              schools={schools}
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
              schools={schools}
              selectedStatusFilter=""
              selectedPicFilter=""
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

          {activeTab === 'sync' && (
            <CSVImportExport
              schools={schools}
              onImport={handleBulkReplaceSchools}
              onReset={async () => {
                await handleBulkReplaceSchools([]);
                await saveCustomDatabase({});
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
        {availableTabs.includes('sync') && (
          <button
            onClick={() => setActiveTab('sync')}
            id="mobile-nav-sync"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all relative ${
              activeTab === 'sync' ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
            title="Sinkronisasi Sheet"
          >
            <FileSpreadsheet className="h-5 w-5" />
            {activeTab === 'sync' && (
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
