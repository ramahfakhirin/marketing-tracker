import React, { useState } from 'react';
import { TeamMember, SchoolRecord, UserRole } from '../types';
import { INDONESIAN_PROVINCES_DATA } from '../data/indonesiaData';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  Search, 
  Briefcase, 
  UserCheck, 
  Key, 
  ShieldAlert, 
  RefreshCw,
  MapPin,
  Check,
  X,
  Edit3,
  Globe,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TeamManagementProps {
  teamMembers: TeamMember[];
  schools: SchoolRecord[];
  onAddMember: (
    name: string, 
    role: UserRole, 
    username: string, 
    password?: string,
    assignedProvinces?: string[],
    assignedCities?: string[]
  ) => void;
  onUpdateMember?: (updatedMember: TeamMember) => void;
  onDeleteMember: (id: string) => void;
  onResetTeam?: () => void;
  currentUser: TeamMember;
}

// Region Checkpoint Selector Sub-Component
interface RegionCheckpointSelectorProps {
  assignedProvinces: string[];
  assignedCities: string[];
  onChangeProvinces: (provs: string[]) => void;
  onChangeCities: (cities: string[]) => void;
}

function RegionCheckpointSelector({
  assignedProvinces,
  assignedCities,
  onChangeProvinces,
  onChangeCities
}: RegionCheckpointSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProv, setExpandedProv] = useState<string | null>(null);

  const allProvinces = Object.keys(INDONESIAN_PROVINCES_DATA);

  // Filter provinces based on search term
  const filteredProvinces = allProvinces.filter(prov => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (prov.toLowerCase().includes(term)) return true;
    const cities = INDONESIAN_PROVINCES_DATA[prov] || [];
    return cities.some(c => c.toLowerCase().includes(term));
  });

  const toggleProvince = (prov: string) => {
    const isSelected = assignedProvinces.includes(prov);
    let nextProvs: string[];
    let nextCities = [...assignedCities];
    const provCities = INDONESIAN_PROVINCES_DATA[prov] || [];

    if (isSelected) {
      // Unselect province and all its cities
      nextProvs = assignedProvinces.filter(p => p !== prov);
      nextCities = nextCities.filter(c => !provCities.includes(c));
    } else {
      // Select province and all its cities
      nextProvs = [...assignedProvinces, prov];
      provCities.forEach(c => {
        if (!nextCities.includes(c)) nextCities.push(c);
      });
    }

    onChangeProvinces(nextProvs);
    onChangeCities(nextCities);
  };

  const toggleCity = (prov: string, city: string) => {
    const isCitySelected = assignedCities.includes(city);
    let nextCities: string[];

    if (isCitySelected) {
      nextCities = assignedCities.filter(c => c !== city);
    } else {
      nextCities = [...assignedCities, city];
    }

    const provCities = INDONESIAN_PROVINCES_DATA[prov] || [];
    const hasAnyCityInProv = provCities.some(c => nextCities.includes(c));

    let nextProvs = [...assignedProvinces];
    if (hasAnyCityInProv && !nextProvs.includes(prov)) {
      nextProvs.push(prov);
    } else if (!hasAnyCityInProv && nextProvs.includes(prov)) {
      nextProvs = nextProvs.filter(p => p !== prov);
    }

    onChangeProvinces(nextProvs);
    onChangeCities(nextCities);
  };

  const selectAllInProv = (prov: string) => {
    const provCities = INDONESIAN_PROVINCES_DATA[prov] || [];
    let nextCities = [...assignedCities];
    provCities.forEach(c => {
      if (!nextCities.includes(c)) nextCities.push(c);
    });
    let nextProvs = [...assignedProvinces];
    if (!nextProvs.includes(prov)) nextProvs.push(prov);

    onChangeProvinces(nextProvs);
    onChangeCities(nextCities);
  };

  const clearAllInProv = (prov: string) => {
    const provCities = INDONESIAN_PROVINCES_DATA[prov] || [];
    const nextCities = assignedCities.filter(c => !provCities.includes(c));
    const nextProvs = assignedProvinces.filter(p => p !== prov);
    onChangeProvinces(nextProvs);
    onChangeCities(nextCities);
  };

  return (
    <div className="space-y-3 bg-indigo-50/40 border border-indigo-100 p-3.5 rounded-xl text-xs">
      <div className="flex justify-between items-center gap-2">
        <label className="font-extrabold text-indigo-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-indigo-600" /> Checkpoint Checklist Hak Akses Wilayah
        </label>
        <span className="text-[10px] bg-indigo-100/80 text-indigo-800 border border-indigo-200 font-extrabold px-2 py-0.5 rounded-full">
          {assignedProvinces.length} Prov / {assignedCities.length} Kota/Kab
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari provinsi atau kota/kabupaten..."
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-semibold"
        />
      </div>

      {/* Provinces Accordion Checklist */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredProvinces.map((prov) => {
          const provCities = INDONESIAN_PROVINCES_DATA[prov] || [];
          const isProvChecked = assignedProvinces.includes(prov);
          const selectedCitiesInProv = provCities.filter(c => assignedCities.includes(c));
          const isExpanded = expandedProv === prov || (searchTerm.length > 0 && provCities.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())));

          return (
            <div key={prov} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <div className="p-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`chk-prov-${prov}`}
                    checked={isProvChecked}
                    onChange={() => toggleProvince(prov)}
                    className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor={`chk-prov-${prov}`} className="font-bold text-slate-800 text-xs cursor-pointer select-none">
                    {prov}
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    ({selectedCitiesInProv.length}/{provCities.length})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setExpandedProv(isExpanded ? null : prov)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'Tutup Checklist' : 'Detail Checklist'}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Sub-Cities Checklist */}
              {isExpanded && (
                <div className="bg-slate-50 p-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-[10px] pb-1 border-b border-slate-200">
                    <span className="font-extrabold text-slate-500 uppercase">Daerah Ditunjuk di {prov}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllInProv(prov)}
                        className="text-indigo-600 hover:underline font-bold cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => clearAllInProv(prov)}
                        className="text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {provCities.map((city) => {
                      const isCityChecked = assignedCities.includes(city);
                      return (
                        <label
                          key={city}
                          className={`flex items-center space-x-2 p-1.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer select-none ${
                            isCityChecked
                              ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isCityChecked}
                            onChange={() => toggleCity(prov, city)}
                            className="h-3.5 w-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="truncate">{city}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TeamManagement({
  teamMembers,
  schools,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onResetTeam,
  currentUser,
}: TeamManagementProps) {
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('AE');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isCustomRegion, setIsCustomRegion] = useState(false);
  const [assignedProvinces, setAssignedProvinces] = useState<string[]>([]);
  const [assignedCities, setAssignedCities] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [errorMessage, setErrorMessage] = useState('');

  // Editing modal state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('AE');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsCustomRegion, setEditIsCustomRegion] = useState(false);
  const [editAssignedProvinces, setEditAssignedProvinces] = useState<string[]>([]);
  const [editAssignedCities, setEditAssignedCities] = useState<string[]>([]);

  // Deleting modal alert state
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isManagerOrAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role === 'MANAGER';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    
    setErrorMessage('');
    
    const trimmedName = nameInput.trim();
    const trimmedUsername = usernameInput.trim().toLowerCase();
    const trimmedPassword = passwordInput.trim();

    if (!trimmedName) {
      setErrorMessage('Nama anggota tim tidak boleh kosong!');
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage('Username login tidak boleh kosong!');
      return;
    }

    if (trimmedUsername.length < 3) {
      setErrorMessage('Username minimal terdiri dari 3 karakter!');
      return;
    }

    // Check for duplicate name (case-insensitive)
    const isDuplicateName = teamMembers.some(
      (m) => m.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicateName) {
      setErrorMessage(`Anggota dengan nama "${trimmedName}" sudah terdaftar!`);
      return;
    }

    // Check for duplicate username
    const isDuplicateUsername = teamMembers.some(
      (m) => m.username.toLowerCase() === trimmedUsername
    );
    if (isDuplicateUsername) {
      setErrorMessage(`Username "${trimmedUsername}" sudah digunakan oleh pengguna lain!`);
      return;
    }

    const finalProvs = isCustomRegion ? assignedProvinces : [];
    const finalCities = isCustomRegion ? assignedCities : [];

    onAddMember(
      trimmedName, 
      roleInput, 
      trimmedUsername, 
      trimmedPassword || 'password123',
      finalProvs,
      finalCities
    );
    
    // Reset form
    setNameInput('');
    setUsernameInput('');
    setPasswordInput('');
    setIsCustomRegion(false);
    setAssignedProvinces([]);
    setAssignedCities([]);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditRole(member.role);
    setEditUsername(member.username);
    setEditPassword(member.password || 'password123');
    const hasCustom = (member.assignedProvinces && member.assignedProvinces.length > 0) || (member.assignedCities && member.assignedCities.length > 0);
    setEditIsCustomRegion(!!hasCustom);
    setEditAssignedProvinces(member.assignedProvinces || []);
    setEditAssignedCities(member.assignedCities || []);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !onUpdateMember) return;

    const updated: TeamMember = {
      ...editingMember,
      name: editName.trim(),
      role: editRole,
      username: editUsername.trim().toLowerCase(),
      password: editPassword.trim() || 'password123',
      assignedProvinces: editIsCustomRegion ? editAssignedProvinces : [],
      assignedCities: editIsCustomRegion ? editAssignedCities : []
    };

    onUpdateMember(updated);
    setEditingMember(null);
  };

  // Filter members
  const filteredMembers = teamMembers.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate stats for each member
  const getAssignedCount = (member: TeamMember) => {
    if (member.role === 'AE') {
      return schools.filter((s) => s.picMarketing.toLowerCase() === member.name.toLowerCase()).length;
    } else if (member.role === 'MARKETING_LAPANGAN') {
      return schools.filter((s) => s.marketingLapangan?.toLowerCase() === member.name.toLowerCase()).length;
    }
    return 0;
  };

  const formatRegionBadgeText = (member: TeamMember) => {
    const provs = member.assignedProvinces || [];
    const cities = member.assignedCities || [];

    if (provs.length === 0 && cities.length === 0) {
      return 'Akses Penuh (Semua Wilayah)';
    }

    if (provs.length === 1 && cities.length <= 3) {
      const cityShort = cities.map(c => c.replace('KOTA ', '').replace('KABUPATEN ', '')).join(', ');
      return `${provs[0]}${cityShort ? ` (${cityShort})` : ''}`;
    }

    return `${provs.length} Provinsi, ${cities.length} Kota/Kab`;
  };

  return (
    <div className="space-y-6" id="team-management-container">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="team-stats-grid">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-total-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider font-sans">Total Pengguna</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{teamMembers.length}</h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Akun pengguna aktif terdaftar</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-admin-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Super Admin & Manager</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Shield className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {teamMembers.filter((m) => m.role === 'SUPERADMIN' || m.role === 'MANAGER').length}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Pemegang hak akses administratif</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-ae-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Account Executive (AE)</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Briefcase className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {teamMembers.filter((m) => m.role === 'AE').length}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Menangani hubungan, negosiasi, dan closing</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-field-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Marketing Lapangan</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {teamMembers.filter((m) => m.role === 'MARKETING_LAPANGAN').length}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Bergerak di lapangan dan pengenalan fisik</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="team-main-layout">
        {/* Registration Form (Only active for SUPERADMIN) */}
        <div className="lg:col-span-1" id="team-registration-card">
          {isSuperAdmin ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Daftarkan Anggota Baru</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Buat user dengan hak akses khusus & wilayah penugasan.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" id="team-reg-form">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-name">
                    Nama Lengkap Anggota
                  </label>
                  <input
                    type="text"
                    id="member-name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-role">
                    Peran / Hak Akses (Role)
                  </label>
                  <select
                    id="member-role"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  >
                    <option value="AE">Account Executive (AE) / PIC</option>
                    <option value="MARKETING_LAPANGAN">Marketing Lapangan (Field)</option>
                    <option value="MANAGER">Manager (Hak Pantau Penuh & Analitik)</option>
                    <option value="SUPERADMIN">Super Admin (Hak Akses Penuh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-username">
                    Username Login
                  </label>
                  <input
                    type="text"
                    id="member-username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Contoh: ahmad123"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-password">
                    Password Login
                  </label>
                  <input
                    type="text"
                    id="member-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Biarkan kosong untuk 'password123'"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>

                {/* Hak Akses Wilayah Checkpoint Assignment */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Hak Akses Wilayah Penugasan
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsCustomRegion(false)}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                        !isCustomRegion
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Akses Penuh (Semua Wilayah)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomRegion(true)}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                        isCustomRegion
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Batasi Hak Akses Checkpoint
                    </button>
                  </div>

                  {isCustomRegion && (
                    <RegionCheckpointSelector
                      assignedProvinces={assignedProvinces}
                      assignedCities={assignedCities}
                      onChangeProvinces={setAssignedProvinces}
                      onChangeCities={setAssignedCities}
                    />
                  )}
                </div>

                {errorMessage && (
                  <p className="text-rose-600 text-xs font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-100" id="reg-error-msg">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  id="submit-register-team"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Daftarkan Anggota Baru</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-200/80 p-5 rounded-2xl space-y-4 sticky top-24">
              <div className="flex items-center space-x-2.5 text-amber-800">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider">Akses Terbatas</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Akun Anda saat ini login sebagai <span className="text-indigo-600 font-extrabold">{currentUser.name} ({currentUser.role})</span>.
              </p>
              <div className="h-px bg-amber-200/50"></div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Hanya akun dengan peran <span className="font-extrabold text-slate-700">SUPERADMIN</span> yang dapat menambahkan, mengedit, atau menghapus kredensial pengguna baru. Peran Anda saat ini hanya diperbolehkan untuk memantau aktivitas tim.
              </p>
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="lg:col-span-2" id="team-list-card">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Daftar Akun Tim ({filteredMembers.length})
                </h4>
                {isSuperAdmin && onResetTeam && (
                  <button
                    onClick={() => {
                      if (confirm("PERINGATAN: Apakah Anda yakin ingin mereset database tim marketing?\nSemua akun tim (AE, Marketing Lapangan, Manager) akan dihapus, dan HANYA Super Admin (superadmin / admin123) yang akan disisakan.")) {
                        onResetTeam();
                      }
                    }}
                    title="Reset Database Tim (Sisakan Super Admin)"
                    className="flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reset Tim (Sisa Super Admin)</span>
                  </button>
                )}
              </div>
              
              {/* Quick Filters */}
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setRoleFilter('SUPERADMIN')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'SUPERADMIN'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => setRoleFilter('MANAGER')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'MANAGER'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Manager
                </button>
                <button
                  onClick={() => setRoleFilter('AE')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'AE'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  AE
                </button>
                <button
                  onClick={() => setRoleFilter('MARKETING_LAPANGAN')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'MARKETING_LAPANGAN'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Lap.
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                id="team-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari anggota berdasarkan nama atau username..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
              />
            </div>

            {/* Members Grid / List */}
            {filteredMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="members-list-grid">
                {filteredMembers.map((member) => {
                  const assignedCount = getAssignedCount(member);
                  const regionBadge = formatRegionBadgeText(member);
                  const isRestricted = (member.assignedProvinces?.length || 0) > 0 || (member.assignedCities?.length || 0) > 0;
                  
                  // Role label color setup
                  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (member.role === 'SUPERADMIN') badgeStyle = 'bg-indigo-50 border-indigo-100 text-indigo-700 font-extrabold';
                  else if (member.role === 'MANAGER') badgeStyle = 'bg-violet-50 border-violet-100 text-violet-700';
                  else if (member.role === 'AE') badgeStyle = 'bg-amber-50 border-amber-100 text-amber-700';
                  else if (member.role === 'MARKETING_LAPANGAN') badgeStyle = 'bg-emerald-50 border-emerald-100 text-emerald-700';

                  return (
                    <div
                      key={member.id}
                      id={`team-card-${member.id}`}
                      className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex flex-col justify-between transition-all group shadow-2xs hover:shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 max-w-[85%]">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0 ${
                            member.role === 'SUPERADMIN' || member.role === 'MANAGER'
                              ? 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                              : member.role === 'AE'
                              ? 'bg-amber-50 border border-amber-100 text-amber-700'
                              : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                          }`}>
                            {member.name.substring(0, 2)}
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 text-xs leading-none truncate">{member.name}</p>
                            
                            {/* Username Display */}
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium font-mono">
                              <Key className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">@{member.username}</span>
                              <span className="text-[9px] text-slate-300">|</span>
                              <span>pass: {member.password || 'password123'}</span>
                            </div>

                            <div className="flex items-center space-x-1.5 mt-2 flex-wrap gap-y-1">
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                                {member.role === 'SUPERADMIN' ? 'ADMIN' : member.role === 'MARKETING_LAPANGAN' ? 'LAPANGAN' : member.role}
                              </span>
                              {(member.role === 'AE' || member.role === 'MARKETING_LAPANGAN') && (
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {assignedCount} Prospek
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {isManagerOrAdmin && onUpdateMember && (
                            <button
                              onClick={() => handleOpenEdit(member)}
                              title="Edit Pengguna & Hak Akses Wilayah"
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => setMemberToDelete(member)}
                              title="Hapus Anggota Tim"
                              id={`btn-delete-member-${member.id}`}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-100/60 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Region Access Badge Display */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-1.5 text-slate-500 truncate">
                          <MapPin className={`h-3 w-3 shrink-0 ${isRestricted ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className={`truncate font-semibold ${isRestricted ? 'text-indigo-900 font-bold' : 'text-slate-500'}`}>
                            {regionBadge}
                          </span>
                        </div>
                        {isRestricted && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">
                            Checkpoint Assigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 border border-slate-200 border-dashed rounded-2xl" id="no-members-found">
                <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-bold">Tidak ada anggota tim yang cocok</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-0.5">
                  Gunakan form pendaftaran di samping untuk mendaftarkan pengguna baru dengan peran khusus.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Member & Region Access Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-4.5 w-4.5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Edit Anggota & Hak Akses Wilayah</h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Nama Anggota</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role / Peran</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="AE">Account Executive (AE)</option>
                    <option value="MARKETING_LAPANGAN">Marketing Lapangan</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SUPERADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Password Login</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Region Checkpoint Selector */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Batasan Hak Akses Wilayah Checkpoint
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditIsCustomRegion(false)}
                    className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      !editIsCustomRegion
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Akses Penuh (Semua Wilayah)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsCustomRegion(true)}
                    className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      editIsCustomRegion
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Batasi Hak Akses Checkpoint
                  </button>
                </div>

                {editIsCustomRegion && (
                  <RegionCheckpointSelector
                    assignedProvinces={editAssignedProvinces}
                    assignedCities={editAssignedCities}
                    onChangeProvinces={setEditAssignedProvinces}
                    onChangeCities={setEditAssignedCities}
                  />
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>Simpan Perubahan Hak Akses</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Delete Verification Modal for Team Members */}
      {memberToDelete && (() => {
        const assignedSchoolsCount = schools.filter(s =>
          (memberToDelete.role === 'AE' && s.picMarketing?.toLowerCase() === memberToDelete.name.toLowerCase()) ||
          (memberToDelete.role === 'MARKETING_LAPANGAN' && s.marketingLapangan?.toLowerCase() === memberToDelete.name.toLowerCase())
        ).length;
        const isSelf = memberToDelete.id === currentUser.id;

        let warning = `Penghapusan akun "${memberToDelete.name}" bersifat permanen.`;
        if (assignedSchoolsCount > 0) {
          warning += ` Anggota ini saat ini ditugaskan di ${assignedSchoolsCount} sekolah prospek. Menghapus akun ini akan mengosongkan status penugasannya di sekolah-sekolah tersebut.`;
        }
        if (isSelf) {
          warning += ` PERINGATAN KONTINUITAS: Anda sedang menghapus akun Anda sendiri yang sedang aktif digunakan saat ini. Anda akan otomatis dikeluarkan (logout) dari sistem setelah penghapusan.`;
        }

        return (
          <ConfirmDeleteModal
            isOpen={!!memberToDelete}
            title="Konfirmasi Hapus Akun Tim"
            itemName={memberToDelete.name}
            itemDetails={`Role: ${memberToDelete.role === 'SUPERADMIN' ? 'Super Admin' : memberToDelete.role === 'MARKETING_LAPANGAN' ? 'Marketing Lapangan' : memberToDelete.role} | Username: @${memberToDelete.username}`}
            warningMessage={warning}
            confirmText="Ya, Hapus Akun Ini"
            cancelText="Batal"
            onClose={() => setMemberToDelete(null)}
            onConfirm={() => {
              onDeleteMember(memberToDelete.id);
              setMemberToDelete(null);
            }}
          />
        );
      })()}
    </div>
  );
}
