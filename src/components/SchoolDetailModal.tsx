import { useState, useEffect, useMemo } from 'react';
import { SchoolRecord, MarketingStatus, ClosingProbability, TeamMember } from '../types';
import { SURVEYED_DATABASE } from '../data/surveyedSchools';
import { INDONESIAN_PROVINCES_DATA, formatCityName, isSameCity } from '../data/indonesiaData';
import { 
  X, 
  Instagram, 
  Phone, 
  MessageSquare, 
  Save, 
  Trash2, 
  Plus, 
  Calendar, 
  User, 
  BookOpen, 
  Clipboard, 
  Sparkles, 
  Check, 
  MapPin, 
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';
import { generateWhatsAppLink, extractPhoneNumber } from '../lib/phoneUtils';

const SERVICE_OPTIONS = [
  'Yearbook Digital',
  'Yearbook Cetak',
  'Video Angkatan',
  'Event Makrab',
  'Graduation',
  'Promnight',
  'Sesi Foto Only'
];

interface SchoolDetailModalProps {
  school: SchoolRecord | null;
  teamMembers?: TeamMember[];
  academicYears?: string[];
  defaultPeriode?: string;
  onClose: () => void;
  onSave: (updatedSchool: SchoolRecord) => void;
  onDelete?: (schoolNo: number, schoolName?: string) => void;
  mergedDatabase?: Record<string, Record<string, any[]>>;
  currentUser: TeamMember;
}

export default function SchoolDetailModal({ 
  school, 
  teamMembers = [], 
  academicYears = ['2027/2028', '2026/2027', '2025/2026', '2024/2025'],
  defaultPeriode = '2026/2027',
  onClose, 
  onSave, 
  onDelete,
  mergedDatabase = SURVEYED_DATABASE,
  currentUser
}: SchoolDetailModalProps) {
  // Roles authority rules
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isManager = currentUser.role === 'MANAGER';
  const isAE = currentUser.role === 'AE';
  const isMarketingLapangan = currentUser.role === 'MARKETING_LAPANGAN';

  const isNewSchool = !school;
  
  // - Core fields (Provinsi, Kota, Nama Sekolah, Handles)
  //   Can edit if admin/manager/AE OR if it's a new school being scouted on the field
  const disableCoreFields = isMarketingLapangan && !isNewSchool;

  // - Status / pipeline level
  //   Only admin/manager/AE can change the formal pipeline status
  const disableStatusField = isMarketingLapangan;

  // - PIC Marketing assignment
  //   Only admin/manager/AE can change assigned PIC
  const disablePicAssignment = isMarketingLapangan;

  // - Secondary details (Layanan, Probability, Tanggal Kontak)
  const disableSecondaryFields = isMarketingLapangan && !isNewSchool;

  // Local form states
  const [namaSekolah, setNamaSekolah] = useState('');
  const [isCustomSchoolName, setIsCustomSchoolName] = useState(true);
  const [provinsi, setProvinsi] = useState('');
  const [isCustomProv, setIsCustomProv] = useState(false);
  const [customProvInput, setCustomProvInput] = useState('');
  const [kota, setKota] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityType, setCustomCityType] = useState<'KOTA' | 'KABUPATEN'>('KOTA');
  const [customCityInput, setCustomCityInput] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [picMarketing, setPicMarketing] = useState('');
  const [marketingLapangan, setMarketingLapangan] = useState('');
  const [status, setStatus] = useState<MarketingStatus>('BARU');
  const [periode, setPeriode] = useState('2026/2027');
  const [kontakPic1, setKontakPic1] = useState('');
  const [kontakPic2, setKontakPic2] = useState('');
  const [kontakPic3, setKontakPic3] = useState('');
  const [kontakPic4, setKontakPic4] = useState('');
  const [tanggalKontakAwal, setTanggalKontakAwal] = useState('');
  const [jenisLayanan, setJenisLayanan] = useState('');
  const [catatanAwal, setCatatanAwal] = useState('');
  const [tanggalFollowUpTerakhir, setTanggalFollowUpTerakhir] = useState('');
  const [kemungkinanClosing, setKemungkinanClosing] = useState<ClosingProbability>('');
  const [updates, setUpdates] = useState<string[]>([]);
  
  // New single update to push
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync state with selected school
  useEffect(() => {
    if (school) {
      setNamaSekolah(school.namaSekolah || '');
      setIsCustomSchoolName(true);
      const p = school.provinsi || '';
      const k = school.kota || '';
      setProvinsi(p);
      setKota(k);

      if (p && !provinceOptions.includes(p)) {
        setIsCustomProv(true);
        setCustomProvInput(p);
      } else {
        setIsCustomProv(false);
        setCustomProvInput('');
      }

      if (k && !cityOptions.includes(k)) {
        setIsCustomCity(true);
        if (k.toUpperCase().startsWith('KOTA ')) {
          setCustomCityType('KOTA');
          setCustomCityInput(k.substring(5));
        } else if (k.toUpperCase().startsWith('KABUPATEN ')) {
          setCustomCityType('KABUPATEN');
          setCustomCityInput(k.substring(10));
        } else if (k.toUpperCase().startsWith('KAB ')) {
          setCustomCityType('KABUPATEN');
          setCustomCityInput(k.substring(4));
        } else {
          setCustomCityType('KOTA');
          setCustomCityInput(k);
        }
      } else {
        setIsCustomCity(false);
        setCustomCityInput('');
      }

      setInstagramHandle(school.instagramHandle || '');
      setTiktokHandle(school.tiktokHandle || '');
      setPicMarketing(school.picMarketing || '');
      setMarketingLapangan(school.marketingLapangan || '');
      let initialStatus: MarketingStatus = 'BARU';
      if (school.status) {
        if ((school.status as string) === 'CLOSED') initialStatus = 'DEAL';
        else if ((school.status as string) === 'CLOSING') initialStatus = 'PROSPEK';
        else if ((school.status as string) === 'GAGAL') initialStatus = 'LOST';
        else initialStatus = school.status;
      }
      setStatus(initialStatus);
      setPeriode(school.periode || defaultPeriode || '2026/2027');
      setKontakPic1(school.kontakPic1 || '');
      setKontakPic2(school.kontakPic2 || '');
      setKontakPic3(school.kontakPic3 || '');
      setKontakPic4(school.kontakPic4 || '');
      setTanggalKontakAwal(school.tanggalKontakAwal || '');
      setJenisLayanan(school.jenisLayanan || '');
      setCatatanAwal(school.catatanAwal || '');
      setTanggalFollowUpTerakhir(school.tanggalFollowUpTerakhir || '');
      setKemungkinanClosing(school.kemungkinanClosing || '');
      setUpdates(school.updates || []);
      setNewUpdateText('');
    } else {
      // Empty template for new schools
      setNamaSekolah('');
      setIsCustomSchoolName(true);
      setProvinsi('');
      setIsCustomProv(false);
      setCustomProvInput('');
      setKota('');
      setIsCustomCity(false);
      setCustomCityType('KOTA');
      setCustomCityInput('');
      setInstagramHandle('');
      setTiktokHandle('');
      // Auto-populate PIC Marketing if user is an AE
      setPicMarketing(currentUser.role === 'AE' ? currentUser.name : '');
      // Auto-populate Marketing Lapangan if user is Marketing Lapangan
      setMarketingLapangan(currentUser.role === 'MARKETING_LAPANGAN' ? currentUser.name : '');
      setStatus('BARU');
      setPeriode(defaultPeriode || '2026/2027');
      setKontakPic1('');
      setKontakPic2('');
      setKontakPic3('');
      setKontakPic4('');
      setTanggalKontakAwal(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
      setJenisLayanan('');
      setCatatanAwal('');
      setTanggalFollowUpTerakhir('');
      setKemungkinanClosing('');
      setUpdates([]);
      setNewUpdateText('');
    }
  }, [school, currentUser]);

  // Dynamic Province & City Options combining pre-surveyed DB and standard Indonesian data
  const provinceOptions = useMemo(() => {
    const mergedKeys = Object.keys(mergedDatabase || {});
    const dataKeys = Object.keys(INDONESIAN_PROVINCES_DATA || {});
    const set = new Set([...mergedKeys, ...dataKeys]);
    if (provinsi && !set.has(provinsi)) set.add(provinsi);
    return Array.from(set).sort();
  }, [mergedDatabase, provinsi]);

  const cityOptions = useMemo(() => {
    if (!provinsi) return [];
    const upperP = provinsi.toUpperCase().trim();
    const dataCities = INDONESIAN_PROVINCES_DATA[upperP] || [];
    const mergedCities = Object.keys((mergedDatabase || {})[provinsi] || (mergedDatabase || {})[upperP] || {});
    const set = new Set<string>();
    dataCities.forEach(c => set.add(formatCityName(c, upperP)));
    mergedCities.forEach(c => set.add(formatCityName(c, upperP)));
    if (kota) set.add(formatCityName(kota, upperP));
    return Array.from(set).filter(Boolean).sort();
  }, [mergedDatabase, provinsi, kota]);

  const surveyedForCurrentCity = useMemo(() => {
    if (!mergedDatabase || !provinsi || !kota) return [];
    const upperP = provinsi.toUpperCase().trim();
    const upperC = kota.toUpperCase().trim();
    const provData = (mergedDatabase || {})[provinsi] || (mergedDatabase || {})[upperP];
    if (!provData) return [];
    if (provData[kota]) return provData[kota];
    if (provData[upperC]) return provData[upperC];
    const matchedKey = Object.keys(provData).find(k => isSameCity(k, kota, upperP));
    if (matchedKey) return provData[matchedKey];
    return [];
  }, [mergedDatabase, provinsi, kota]);

  // Service options multi-select helper
  const isServiceSelected = (svc: string) => {
    if (!jenisLayanan) return false;
    return jenisLayanan.toLowerCase().includes(svc.toLowerCase());
  };

  const toggleService = (svc: string) => {
    let currentList = jenisLayanan ? jenisLayanan.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (isServiceSelected(svc)) {
      currentList = currentList.filter(s => s.toLowerCase() !== svc.toLowerCase());
    } else {
      currentList.push(svc);
    }
    setJenisLayanan(currentList.join(', '));
  };

  // Convert string/date to YYYY-MM-DD for <input type="date">
  const toInputDateValue = (str: string) => {
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return str;
  };

  if (school === undefined) return null; // Only render when triggered

  const handlePushUpdate = () => {
    if (!newUpdateText.trim()) return;
    
    const timestamp = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long'
    });
    
    const formattedUpdate = `${timestamp}: ${newUpdateText.trim()}`;
    const nextUpdates = [...updates, formattedUpdate];
    setUpdates(nextUpdates);
    
    // Automatically update the "Last Follow Up Date" to today
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    setTanggalFollowUpTerakhir(todayStr);
    
    // If they write an update, transition status out of BARU automatically!
    if (status === 'BARU') {
      setStatus('DIHUBUNGI');
    }
    
    setNewUpdateText('');
  };

  const handleSave = () => {
    const trimmedName = namaSekolah.trim();
    if (!trimmedName || trimmedName === '__custom__') {
      alert('Nama Sekolah tidak boleh kosong');
      return;
    }

    onSave({
      no: school ? school.no : 0, // 0 triggers backend/App.tsx auto-increment assignment
      namaSekolah: trimmedName,
      provinsi: provinsi.trim(),
      kota: kota.trim(),
      instagramHandle: instagramHandle.trim(),
      tiktokHandle: tiktokHandle.trim(),
      picMarketing: picMarketing.trim(),
      marketingLapangan: marketingLapangan.trim(),
      status,
      kontakPic1: kontakPic1.trim(),
      kontakPic2: kontakPic2.trim(),
      kontakPic3: kontakPic3.trim(),
      kontakPic4: kontakPic4.trim(),
      tanggalKontakAwal: tanggalKontakAwal.trim(),
      jenisLayanan: jenisLayanan.trim(),
      catatanAwal: catatanAwal.trim(),
      tanggalFollowUpTerakhir: tanggalFollowUpTerakhir.trim(),
      kemungkinanClosing,
      updates: updates || [],
      periode: periode || defaultPeriode || '2026/2027',
    });
    onClose();
  };

  const copyDetailsToClipboard = () => {
    const text = `PROSPEK MARKETING: ${namaSekolah}
Provinsi: ${provinsi || '-'}
Kota/Kabupaten: ${kota || '-'}
Instagram: ${instagramHandle || 'Tidak ada'}
TikTok: ${tiktokHandle || 'Tidak ada'}
Status: ${status}
PIC Marketing (AE): ${picMarketing || 'Belum ada'}
Marketing Lapangan: ${marketingLapangan || 'Belum ada'}
Kontak 1: ${kontakPic1 || '-'}
Kontak 2: ${kontakPic2 || '-'}
Jenis Layanan: ${jenisLayanan || '-'}
Catatan Akhir: ${updates.length > 0 ? updates[updates.length - 1] : catatanAwal || '-'}`;
    
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto" id="school-detail-modal">
      <div className="bg-white w-full h-full sm:h-auto max-w-4xl sm:rounded-2xl border-x sm:border border-slate-200 shadow-xl overflow-hidden flex flex-col sm:my-8 max-h-full sm:max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold font-mono text-sm shadow-xs">
              {school ? `N${school.no}` : '+'}
            </div>
            <div>
              <h3 className="text-base font-extrabold line-clamp-1 tracking-tight">{namaSekolah || 'Tambah Sekolah Baru'}</h3>
              <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
                {school ? 'Edit Detail Prospek & Log CRM' : 'Masukkan Data Target Sekolah Baru'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            id="modal-close-btn"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          
          {/* Quick Actions Panel */}
          {school && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs">
              <div className="flex items-center space-x-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>Quick Actions AE:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Instagram Quick DM */}
                {instagramHandle && (
                  <a
                    href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    <span>Kirim DM Instagram</span>
                  </a>
                )}

                {/* WhatsApp Quick Link */}
                {extractPhoneNumber(kontakPic1) && (
                  <a
                    href={generateWhatsAppLink(kontakPic1, namaSekolah, status)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp Follow-up</span>
                  </a>
                )}

                {/* Copy Info Button */}
                <button
                  onClick={copyDetailsToClipboard}
                  id="modal-copy-details-btn"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  <span>{isCopied ? 'Tersalin!' : 'Salin Info Prospek'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Core Fields */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-900 text-[10px] uppercase tracking-widest border-b border-slate-100 pb-2.5 flex items-center">
                <Layers className="h-4.5 w-4.5 mr-2 text-indigo-500" /> Informasi Dasar Sekolah
              </h4>

              {/* Provinsi */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
                  <MapPin className="h-3 w-3 mr-1 text-slate-400" /> Provinsi
                </label>
                <select
                  id="modal-school-province"
                  value={isCustomProv ? '__custom_prov__' : provinsi}
                  disabled={disableCoreFields}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom_prov__') {
                      setIsCustomProv(true);
                      setProvinsi(customProvInput.toUpperCase());
                    } else {
                      setIsCustomProv(false);
                      setProvinsi(val);
                    }
                    setIsCustomCity(false);
                    setKota('');
                    setCustomCityInput('');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Pilih Provinsi --</option>
                  {provinceOptions.map((provName) => (
                    <option key={provName} value={provName}>{provName}</option>
                  ))}
                  <option value="__custom_prov__">+ Ketik Provinsi Manual...</option>
                </select>

                {isCustomProv && (
                  <input
                    type="text"
                    placeholder="Masukkan Nama Provinsi..."
                    disabled={disableCoreFields}
                    value={customProvInput}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCustomProvInput(val);
                      setProvinsi(val);
                    }}
                    className="mt-2 w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  />
                )}
              </div>

              {/* Kota / Kabupaten */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
                  <MapPin className="h-3 w-3 mr-1 text-slate-400" /> Kota / Kabupaten
                </label>
                <select
                  id="modal-school-city"
                  value={isCustomCity ? '__custom_city__' : kota}
                  disabled={disableCoreFields}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom_city__') {
                      setIsCustomCity(true);
                      const prefix = customCityType === 'KOTA' ? 'KOTA ' : 'KABUPATEN ';
                      let clean = customCityInput.trim();
                      if (clean.toUpperCase().startsWith('KOTA ')) clean = clean.substring(5);
                      else if (clean.toUpperCase().startsWith('KABUPATEN ')) clean = clean.substring(10);
                      else if (clean.toUpperCase().startsWith('KAB ')) clean = clean.substring(4);
                      setKota(clean ? (prefix + clean).toUpperCase() : '');
                    } else {
                      setIsCustomCity(false);
                      setKota(val);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Pilih Kota / Kabupaten --</option>
                  {cityOptions.map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                  <option value="__custom_city__">+ Ketik Kota/Kabupaten Manual...</option>
                </select>

                {isCustomCity && (
                  <div className="mt-2 space-y-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tipe Wilayah</span>
                      <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomCityType('KOTA');
                            let clean = customCityInput.trim();
                            if (clean.toUpperCase().startsWith('KOTA ')) clean = clean.substring(5);
                            else if (clean.toUpperCase().startsWith('KABUPATEN ')) clean = clean.substring(10);
                            else if (clean.toUpperCase().startsWith('KAB ')) clean = clean.substring(4);
                            setKota(clean ? 'KOTA ' + clean.toUpperCase() : '');
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                            customCityType === 'KOTA'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Kota
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomCityType('KABUPATEN');
                            let clean = customCityInput.trim();
                            if (clean.toUpperCase().startsWith('KOTA ')) clean = clean.substring(5);
                            else if (clean.toUpperCase().startsWith('KABUPATEN ')) clean = clean.substring(10);
                            else if (clean.toUpperCase().startsWith('KAB ')) clean = clean.substring(4);
                            setKota(clean ? 'KABUPATEN ' + clean.toUpperCase() : '');
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                            customCityType === 'KABUPATEN'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Kabupaten
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={`Contoh: ${customCityType === 'KOTA' ? 'SURABAYA' : 'BADUNG'}`}
                        disabled={disableCoreFields}
                        value={customCityInput}
                        onChange={(e) => {
                          const raw = e.target.value.toUpperCase();
                          setCustomCityInput(raw);
                          const prefix = customCityType === 'KOTA' ? 'KOTA ' : 'KABUPATEN ';
                          let clean = raw.trim();
                          if (clean.startsWith('KOTA ')) clean = clean.substring(5);
                          else if (clean.startsWith('KABUPATEN ')) clean = clean.substring(10);
                          else if (clean.startsWith('KAB ')) clean = clean.substring(4);
                          setKota(clean ? (prefix + clean).trim() : '');
                        }}
                        className="w-full pl-24 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 uppercase"
                      />
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">
                        {customCityType}
                      </div>
                    </div>
                    {customCityInput && (
                      <p className="text-[10px] text-slate-500 font-medium">
                        Tersimpan sebagai: <span className="text-indigo-600 font-extrabold">{kota}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pilih Nama Sekolah (Pre-surveyed) */}
              {provinsi && kota && !isCustomProv && !isCustomCity && surveyedForCurrentCity.length > 0 && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Pilih Sekolah Hasil Survey ({kota})
                  </label>
                  <select
                    id="modal-select-surveyed-school"
                    value={isCustomSchoolName ? '__custom__' : namaSekolah}
                    disabled={disableCoreFields}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (selectedVal === '__custom__') {
                        setIsCustomSchoolName(true);
                        setNamaSekolah('');
                      } else {
                        setIsCustomSchoolName(false);
                        setNamaSekolah(selectedVal);
                        
                        // Pre-populate instagram handle if exists
                        const matched = surveyedForCurrentCity.find(s => s.name === selectedVal);
                        if (matched && matched.instagram) {
                          setInstagramHandle(matched.instagram);
                        }
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih dari database survey --</option>
                    {surveyedForCurrentCity.map((sch, idx) => (
                      <option key={`${sch.name}-${idx}`} value={sch.name}>{sch.name}</option>
                    ))}
                    <option value="__custom__">Atau ketik nama manual...</option>
                  </select>
                </div>
              )}

              {/* School Name Manual Input */}
              {(!provinsi || !kota || isCustomProv || isCustomCity || isCustomSchoolName || surveyedForCurrentCity.length === 0) && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nama Sekolah / Akun (Ketik Manual)
                  </label>
                  <input
                    type="text"
                    id="modal-school-name"
                    value={namaSekolah}
                    disabled={disableCoreFields}
                    onChange={(e) => setNamaSekolah(e.target.value)}
                    placeholder="Contoh: SMAK St. Louis 1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {/* Instagram & TikTok handles */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Instagram Handle</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                    <input
                      type="text"
                      id="modal-instagram-handle"
                      value={instagramHandle.replace('@', '')}
                      disabled={disableCoreFields}
                      onChange={(e) => setInstagramHandle('@' + e.target.value)}
                      placeholder="osisluqmanalhakim"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">TikTok Handle</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                    <input
                      type="text"
                      id="modal-tiktok-handle"
                      value={tiktokHandle.replace('@', '')}
                      disabled={disableCoreFields}
                      onChange={(e) => setTiktokHandle('@' + e.target.value)}
                      placeholder="osisluqman_tiktok"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* PIC AE & Marketing Lapangan Dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Assigned AE / PIC</label>
                  <select
                    id="modal-pic-marketing"
                    value={picMarketing}
                    disabled={disablePicAssignment}
                    onChange={(e) => setPicMarketing(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Belum Ditugaskan</option>
                    {teamMembers.filter(m => m.role === 'AE').map((ae) => (
                      <option key={ae.id} value={ae.name}>{ae.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Marketing Lapangan</label>
                  <select
                    id="modal-marketing-lapangan"
                    value={marketingLapangan}
                    onChange={(e) => setMarketingLapangan(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  >
                    <option value="">Belum Ditugaskan</option>
                    {teamMembers.filter(m => m.role === 'MARKETING_LAPANGAN').map((ml) => (
                      <option key={ml.id} value={ml.name}>{ml.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Layanan Ditawarkan - Multi-select radio/button toggles */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Layanan Ditawarkan (Dapat Pilih Beberapa)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SERVICE_OPTIONS.map((svc) => {
                    const active = isServiceSelected(svc);
                    return (
                      <button
                        key={svc}
                        type="button"
                        disabled={disableSecondaryFields}
                        onClick={() => toggleService(svc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          active 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Plus className="h-3.5 w-3.5 opacity-60" />}
                        {svc}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  id="modal-jenis-layanan"
                  value={jenisLayanan}
                  disabled={disableSecondaryFields}
                  onChange={(e) => setJenisLayanan(e.target.value)}
                  placeholder="Atau ketik detail layanan manual..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Periode Academic Year */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-indigo-500" /> Periode Tahun Ajaran
                  </label>
                  <select
                    id="modal-periode-academic-year"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-indigo-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-black transition-all cursor-pointer"
                  >
                    {academicYears.map((ayName) => (
                      <option key={ayName} value={ayName}>
                        Periode {ayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Status Prospek</label>
                  <select
                    id="modal-status"
                    value={status}
                    disabled={disableStatusField}
                    onChange={(e) => setStatus(e.target.value as MarketingStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="BARU">BARU</option>
                    <option value="DIHUBUNGI">DIHUBUNGI</option>
                    <option value="FOLLOW UP">FOLLOW UP</option>
                    <option value="PROSPEK">PROSPEK</option>
                    <option value="MEETING / VISIT">MEETING / VISIT</option>
                    <option value="DEAL">DEAL</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>

                {/* Closing Probability */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Kemungkinan Closing</label>
                  <select
                    id="modal-closing-chance"
                    value={kemungkinanClosing}
                    disabled={disableSecondaryFields}
                    onChange={(e) => setKemungkinanClosing(e.target.value as ClosingProbability)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Belum Ditentukan</option>
                    <option value="LOW">Rendah (Low)</option>
                    <option value="MEDIUM">Sedang (Medium)</option>
                    <option value="HIGH">Tinggi (High)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Initial Contact Date */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-indigo-500" /> Tanggal Kontak Awal
                  </label>
                  <input
                    type="date"
                    id="modal-tanggal-kontak-awal"
                    value={toInputDateValue(tanggalKontakAwal)}
                    disabled={disableSecondaryFields}
                    onChange={(e) => setTanggalKontakAwal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                  />
                </div>

                {/* Last Follow Up Date */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-amber-500" /> Terakhir Follow Up
                  </label>
                  <input
                    type="date"
                    id="modal-tanggal-follow-up"
                    value={toInputDateValue(tanggalFollowUpTerakhir)}
                    disabled={disableSecondaryFields}
                    onChange={(e) => setTanggalFollowUpTerakhir(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                  />
                </div>
              </div>

              {/* Initial Notes */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Catatan Awal / Deskripsi Singkat</label>
                <textarea
                  id="modal-catatan-awal"
                  value={catatanAwal}
                  disabled={disableSecondaryFields}
                  onChange={(e) => setCatatanAwal(e.target.value)}
                  placeholder="Konteks awal atau tanggapan pertama..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all resize-none disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Right Column: CRM Contacts & Chronological Updates Timeline */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-900 text-[10px] uppercase tracking-widest border-b border-slate-100 pb-2.5 flex items-center">
                <Phone className="h-4.5 w-4.5 mr-2 text-indigo-500" /> Kontak & Hubungan Sekolah
              </h4>

              {/* Contact list inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Kontak Utama (PIC 1)</label>
                  <input
                    type="text"
                    id="modal-kontak-1"
                    value={kontakPic1}
                    onChange={(e) => setKontakPic1(e.target.value)}
                    placeholder="Nama - Jabatan (No HP)"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Kontak Cadangan (PIC 2)</label>
                  <input
                    type="text"
                    id="modal-kontak-2"
                    value={kontakPic2}
                    onChange={(e) => setKontakPic2(e.target.value)}
                    placeholder="Nama - Jabatan (No HP)"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Kontak Lain (PIC 3)</label>
                  <input
                    type="text"
                    id="modal-kontak-3"
                    value={kontakPic3}
                    onChange={(e) => setKontakPic3(e.target.value)}
                    placeholder="Nama - Jabatan (No HP)"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Kontak Lain (PIC 4)</label>
                  <input
                    type="text"
                    id="modal-kontak-4"
                    value={kontakPic4}
                    onChange={(e) => setKontakPic4(e.target.value)}
                    placeholder="Nama - Jabatan (No HP)"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>
              </div>

              {/* Timeline Updates */}
              <h4 className="font-extrabold text-slate-900 text-[10px] uppercase tracking-widest border-b border-slate-100 pb-2.5 pt-2 flex items-center">
                <Clipboard className="h-4.5 w-4.5 mr-2 text-indigo-500" /> Log Progress & Timeline CRM (Up to 7 Updates)
              </h4>

              {/* Add New Timeline Update */}
              <div className="flex gap-2">
                <input
                  type="text"
                  id="modal-new-update-input"
                  value={newUpdateText}
                  onChange={(e) => setNewUpdateText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePushUpdate();
                    }
                  }}
                  placeholder="Tambahkan catatan follow up baru hari ini..."
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                />
                <button
                  onClick={handlePushUpdate}
                  id="modal-push-update-btn"
                  className="px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold text-xs transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Updates List Rendering */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl max-h-[160px] overflow-y-auto space-y-2">
                {updates && updates.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {updates.map((upd, index) => {
                      // Separate timestamp if present (Indonesia format "D Month: msg")
                      const parts = upd.split(': ');
                      const hasTimestamp = parts.length > 1;
                      const dateText = hasTimestamp ? parts[0] : '';
                      const msgText = hasTimestamp ? parts.slice(1).join(': ') : upd;

                      return (
                        <div key={index} className="bg-white p-2.5 rounded-xl border border-slate-200 relative group/update shadow-2xs">
                          <div className="flex items-center justify-between mb-1.5 text-[9px] font-extrabold text-slate-400">
                            <span>UPDATE #{index + 1}</span>
                            {dateText && <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold text-slate-500">{dateText}</span>}
                          </div>
                          <p className="text-slate-700 italic font-medium">"{msgText}"</p>
                          
                          {/* Option to delete updates */}
                          <button
                            onClick={() => {
                              const next = updates.filter((_, idx) => idx !== index);
                              setUpdates(next);
                            }}
                            className="absolute top-1 right-1 opacity-0 group-hover/update:opacity-100 p-1 text-slate-300 hover:text-rose-600 transition-all rounded-md cursor-pointer"
                            title="Hapus log ini"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs italic font-semibold">
                    Belum ada update. Silakan tambahkan catatan di atas untuk memulai log CRM.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex justify-center sm:justify-start">
            {school && onDelete && (currentUser.role === 'SUPERADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'AE') && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-xl border border-rose-200 animate-fade-in">
                  <span className="text-xs font-bold text-rose-800 px-1">Yakin hapus prospek ini?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(school.no, school.namaSekolah || namaSekolah);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  id="modal-delete-school-btn"
                  className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center space-x-1.5 text-xs font-bold transition-all border border-rose-100 cursor-pointer animate-fade-in"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus Prospek</span>
                </button>
              )
            )}
          </div>

          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={onClose}
              id="modal-cancel-btn"
              className="flex-1 sm:flex-initial px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              id="modal-save-btn"
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center space-x-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer text-center font-mono-none"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
