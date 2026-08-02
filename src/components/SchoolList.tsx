import React, { useState, useMemo, useEffect } from 'react';
import { SchoolRecord, MarketingStatus, ClosingProbability } from '../types';
import { SURVEYED_DATABASE } from '../data/surveyedSchools';
import { INDONESIAN_PROVINCES_DATA, formatCityName, isSameCity } from '../data/indonesiaData';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Instagram, 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MoreHorizontal,
  CheckCircle2,
  Calendar,
  User,
  ExternalLink,
  MessageSquare,
  MapPin,
  Layers,
  Sparkles,
  TrendingUp,
  Trash2,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { generateWhatsAppLink, extractPhoneNumber } from '../lib/phoneUtils';

interface SchoolListProps {
  schools: SchoolRecord[];
  onSelectSchool: (school: SchoolRecord) => void;
  onAddSchool: () => void;
  selectedAcademicYearFilter?: string;
  selectedStatusFilter: MarketingStatus | 'BELUM AKTIF' | '';
  selectedPicFilter: string | '';
  setSelectedStatusFilter: (status: MarketingStatus | 'BELUM AKTIF' | '') => void;
  setSelectedPicFilter: (pic: string | '') => void;
  mergedDatabase?: Record<string, Record<string, any[]>>;
  customDatabase?: Record<string, Record<string, any[]>>;
  onUpdateCustomDatabase?: (newDb: Record<string, Record<string, any[]>>) => void;
  viewMode: 'database' | 'prospects';
  selectedProvince?: string;
  selectedCity?: string;
  setSelectedProvince?: (prov: string) => void;
  setSelectedCity?: (city: string) => void;
}

export default function SchoolList({ 
  schools, 
  onSelectSchool, 
  onAddSchool,
  selectedAcademicYearFilter,
  selectedStatusFilter,
  selectedPicFilter,
  setSelectedStatusFilter,
  setSelectedPicFilter,
  mergedDatabase = SURVEYED_DATABASE,
  customDatabase = {},
  onUpdateCustomDatabase,
  viewMode,
  selectedProvince: propSelectedProvince,
  selectedCity: propSelectedCity,
  setSelectedProvince: propSetSelectedProvince,
  setSelectedCity: propSetSelectedCity
}: SchoolListProps) {
  // Navigation Flow State
  const [localProvince, setLocalProvince] = useState<string>('JAWA TIMUR');
  const [localCity, setLocalCity] = useState<string>('SURABAYA');

  const selectedProvince = propSelectedProvince ?? localProvince;
  const selectedCity = propSelectedCity ?? localCity;

  const setSelectedProvince = propSetSelectedProvince ?? setLocalProvince;
  const setSelectedCity = propSetSelectedCity ?? setLocalCity;

  // Local filter states
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'SMA' | 'SMK' | 'SMP' | 'MAN'>('ALL');
  const [probabilityFilter, setProbabilityFilter] = useState<ClosingProbability | 'ALL'>('ALL');
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  
  // Sorting states
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'pic' | 'update'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- REGION & TARGET SCHOOL EXPANSION STATES ---
  const [isExpanding, setIsExpanding] = useState(false);
  
  // Province & City custom inputs
  const [newProvMode, setNewProvMode] = useState<'select' | 'custom'>('select');
  const [customProvInput, setCustomProvInput] = useState('');
  
  const [newCityMode, setNewCityMode] = useState<'select' | 'custom'>('select');
  const [customCityInput, setCustomCityInput] = useState('');
  const [cityType, setCityType] = useState<'KOTA' | 'KABUPATEN'>('KOTA');
  
  // Table state for schools
  const [newSchoolsTable, setNewSchoolsTable] = useState<Array<{ name: string; instagram: string; tiktok: string }>>([
    { name: '', instagram: '', tiktok: '' }
  ]);
  const [batchPasteInput, setBatchPasteInput] = useState('');
  const [showBatchPaste, setShowBatchPaste] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleApplyBatchPaste = () => {
    if (!batchPasteInput.trim()) return;
    
    const lines = batchPasteInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
      
    if (lines.length === 0) return;
    
    const parsedRows = lines.map(name => ({
      name: name,
      instagram: '',
      tiktok: ''
    }));
    
    let updatedTable = [...newSchoolsTable];
    if (updatedTable.length === 1 && updatedTable[0].name === '') {
      updatedTable = parsedRows;
    } else {
      updatedTable = [...updatedTable, ...parsedRows];
    }
    
    setNewSchoolsTable(updatedTable);
    setBatchPasteInput('');
    setShowBatchPaste(false);
  };

  const handleSaveExpansion = () => {
    const finalProv = (newProvMode === 'custom' ? customProvInput : selectedProvince).toUpperCase().trim();
    
    let finalCity = '';
    if (newCityMode === 'custom' || newProvMode === 'custom') {
      let cityClean = customCityInput.trim();
      if (!cityClean) {
        alert('Nama kota atau kabupaten tidak boleh kosong!');
        return;
      }
      
      const prefix = cityType === 'KOTA' ? 'KOTA ' : 'KABUPATEN ';
      if (cityClean.toUpperCase().startsWith('KOTA ')) {
        cityClean = cityClean.substring(5);
      } else if (cityClean.toUpperCase().startsWith('KABUPATEN ')) {
        cityClean = cityClean.substring(10);
      } else if (cityClean.toUpperCase().startsWith('KAB ')) {
        cityClean = cityClean.substring(4);
      }
      
      finalCity = (prefix + cityClean).toUpperCase().trim();
    } else {
      finalCity = selectedCity.toUpperCase().trim();
    }

    if (!finalProv) {
      alert('Provinsi tidak boleh kosong!');
      return;
    }
    if (!finalCity) {
      alert('Kota/Kabupaten tidak boleh kosong!');
      return;
    }

    const validSchools = newSchoolsTable
      .map(s => ({
        name: s.name.toUpperCase().trim(),
        instagram: s.instagram.trim() ? (s.instagram.startsWith('@') ? s.instagram : '@' + s.instagram) : undefined,
        tiktok: s.tiktok.trim() ? (s.tiktok.startsWith('@') ? s.tiktok : '@' + s.tiktok) : undefined
      }))
      .filter(s => s.name !== '');

    const updatedCustomDb = { ...customDatabase };
    
    if (!updatedCustomDb[finalProv]) {
      updatedCustomDb[finalProv] = {};
    }
    if (!updatedCustomDb[finalProv][finalCity]) {
      updatedCustomDb[finalProv][finalCity] = [];
    }

    const existingSchoolNames = new Set(updatedCustomDb[finalProv][finalCity].map(s => s.name.toUpperCase().trim()));
    
    if (SURVEYED_DATABASE[finalProv]?.[finalCity]) {
      SURVEYED_DATABASE[finalProv][finalCity].forEach(s => {
        existingSchoolNames.add(s.name.toUpperCase().trim());
      });
    }

    validSchools.forEach(sch => {
      if (!existingSchoolNames.has(sch.name)) {
        updatedCustomDb[finalProv][finalCity].push(sch);
        existingSchoolNames.add(sch.name);
      }
    });

    if (onUpdateCustomDatabase) {
      onUpdateCustomDatabase(updatedCustomDb);
    }

    setSelectedProvince(finalProv);
    setSelectedCity(finalCity);
    
    setSuccessMsg(`Berhasil menambahkan ${validSchools.length} sekolah ke ${finalCity}, ${finalProv}!`);
    setTimeout(() => setSuccessMsg(''), 5000);
    
    setCustomProvInput('');
    setCustomCityInput('');
    setNewSchoolsTable([{ name: '', instagram: '', tiktok: '' }]);
    setBatchPasteInput('');
    setShowBatchPaste(false);
    setIsExpanding(false);
  };

  // List of available provinces (mergedDatabase + INDONESIAN_PROVINCES_DATA + schools)
  const provinces = useMemo(() => {
    const provSet = new Set<string>();
    
    // Add from mergedDatabase
    Object.keys(mergedDatabase).forEach(prov => {
      provSet.add(prov.toUpperCase().trim());
    });

    // Add from INDONESIAN_PROVINCES_DATA
    Object.keys(INDONESIAN_PROVINCES_DATA).forEach(prov => {
      provSet.add(prov.toUpperCase().trim());
    });
    
    // Add from active prospects
    schools.forEach(s => {
      if (s.provinsi) {
        provSet.add(s.provinsi.toUpperCase().trim());
      }
    });
    
    return Array.from(provSet).sort();
  }, [mergedDatabase, schools]);

  // List of available cities under selected province or all provinces
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    if (selectedProvince) {
      const upperProv = selectedProvince.toUpperCase().trim();
      
      // Add from mergedDatabase
      if (mergedDatabase[upperProv]) {
        Object.keys(mergedDatabase[upperProv]).forEach(city => {
          citySet.add(formatCityName(city, upperProv));
        });
      }

      // Add from INDONESIAN_PROVINCES_DATA
      const standardCities = INDONESIAN_PROVINCES_DATA[upperProv] || [];
      standardCities.forEach(c => {
        citySet.add(formatCityName(c, upperProv));
      });
      
      // Add from active prospects in this province
      schools.forEach(s => {
        if (s.provinsi?.toUpperCase().trim() === upperProv && s.kota) {
          citySet.add(formatCityName(s.kota, upperProv));
        }
      });
    } else {
      // All cities across all provinces
      Object.entries(mergedDatabase).forEach(([prov, cityObj]) => {
        Object.keys(cityObj).forEach(city => {
          citySet.add(formatCityName(city, prov));
        });
      });
      schools.forEach(s => {
        if (s.kota) {
          citySet.add(formatCityName(s.kota, s.provinsi || ''));
        }
      });
    }
    
    return Array.from(citySet).filter(Boolean).sort();
  }, [selectedProvince, mergedDatabase, schools]);

  // Extract all unique PICs for the filter dropdown (prospect mode)
  const uniquePics = useMemo(() => {
    const pics = new Set<string>();
    schools.forEach(s => {
      if (s.picMarketing) pics.add(s.picMarketing);
    });
    return Array.from(pics).sort();
  }, [schools]);

  // Handle Province selection change
  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setSelectedCity('');
    setCurrentPage(1);
  };

  // Handle Status Card click from Akumulasi Status Wilayah
  const handleStatusCardClick = (statusKey: MarketingStatus | 'BELUM AKTIF' | '') => {
    if (statusKey === '') {
      setSelectedStatusFilter('');
    } else if (selectedStatusFilter === statusKey) {
      setSelectedStatusFilter('');
    } else {
      setSelectedStatusFilter(statusKey);
    }
    setCurrentPage(1);
  };

  const getActiveRegionLabel = () => {
    if (selectedProvince && selectedCity) {
      return `${selectedCity}, ${selectedProvince}`;
    }
    if (selectedProvince && !selectedCity) {
      return `Semua Kota/Kab, ${selectedProvince}`;
    }
    if (!selectedProvince && selectedCity) {
      return `${selectedCity}, Semua Provinsi`;
    }
    return `Semua Wilayah (Nasional)`;
  };

  // Helper styles for badges
  const getStatusBadgeStyle = (status: MarketingStatus | string) => {
    switch (status) {
      case 'BARU':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'DIHUBUNGI':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FOLLOW UP':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PROSPEK':
      case 'CLOSING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'MEETING / VISIT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DEAL':
      case 'CLOSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOST':
      case 'GAGAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getProbabilityBadgeStyle = (prob: ClosingProbability) => {
    switch (prob) {
      case 'HIGH':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'MEDIUM':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'LOW':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      default:
        return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const hasPhoneContact = (school: SchoolRecord) => {
    return !!(
      extractPhoneNumber(school.kontakPic1) ||
      extractPhoneNumber(school.kontakPic2) ||
      extractPhoneNumber(school.kontakPic3) ||
      extractPhoneNumber(school.kontakPic4)
    );
  };

  const getFirstContactPhone = (school: SchoolRecord) => {
    const p1 = extractPhoneNumber(school.kontakPic1);
    if (p1) return { num: p1, label: school.kontakPic1 };
    const p2 = extractPhoneNumber(school.kontakPic2);
    if (p2) return { num: p2, label: school.kontakPic2 };
    const p3 = extractPhoneNumber(school.kontakPic3);
    if (p3) return { num: p3, label: school.kontakPic3 };
    const p4 = extractPhoneNumber(school.kontakPic4);
    if (p4) return { num: p4, label: school.kontakPic4 };
    return null;
  };

  const parseDateToTimestamp = (dateStr?: string | null): number => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const str = dateStr.trim();
    if (!str) return 0;

    const MONTHS_MAP: Record<string, number> = {
      januari: 0, jan: 0, january: 0,
      februari: 1, feb: 1, february: 1,
      maret: 2, mar: 2, march: 2,
      april: 3, apr: 3,
      mei: 4, may: 4,
      juni: 5, jun: 5, june: 5,
      juli: 6, jul: 6, july: 6,
      agustus: 7, ags: 7, agt: 7, august: 7,
      september: 8, sep: 8, sept: 8,
      oktober: 9, okt: 9, oct: 9, october: 9,
      november: 10, nov: 10,
      desember: 11, des: 11, december: 11
    };

    // Format A: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const idNumericMatch = str.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (idNumericMatch) {
      const d = parseInt(idNumericMatch[1], 10);
      const m = parseInt(idNumericMatch[2], 10) - 1;
      const y = parseInt(idNumericMatch[3], 10);
      return new Date(y, m, d).getTime();
    }

    // Format B: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = str.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      const d = parseInt(isoMatch[3], 10);
      return new Date(y, m, d).getTime();
    }

    // Format C: "27 Juli 2026" or "27 Juli 2026, 14:30" or "27-Juli-2026"
    const idTextMatch = str.match(/(\d{1,2})[\s/.-]+([a-zA-Z]+)[\s/.-]+(\d{4})/);
    if (idTextMatch) {
      const d = parseInt(idTextMatch[1], 10);
      const mStr = idTextMatch[2].toLowerCase();
      const y = parseInt(idTextMatch[3], 10);
      if (mStr in MONTHS_MAP) {
        return new Date(y, MONTHS_MAP[mStr], d).getTime();
      }
    }

    // Format D: "27 Juli" (without year, assume current year)
    const idTextNoYearMatch = str.match(/(\d{1,2})[\s/.-]+([a-zA-Z]+)/);
    if (idTextNoYearMatch) {
      const d = parseInt(idTextNoYearMatch[1], 10);
      const mStr = idTextNoYearMatch[2].toLowerCase();
      if (mStr in MONTHS_MAP) {
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, MONTHS_MAP[mStr], d).getTime();
      }
    }

    const parsed = Date.parse(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getStatusWeight = (status?: string | null): number => {
    if (!status || status === 'BELUM AKTIF' || status === 'BELUM DIPROSPEK') return 90;
    const s = status.toUpperCase().trim();
    switch (s) {
      case 'BARU':
        return 10;
      case 'DIHUBUNGI':
        return 20;
      case 'FOLLOW UP':
        return 30;
      case 'MEETING / VISIT':
      case 'MEETING':
      case 'VISIT':
        return 40;
      case 'PROSPEK':
        return 50;
      case 'CLOSING':
        return 60;
      case 'DEAL':
      case 'CLOSED':
        return 70;
      case 'LOST':
      case 'GAGAL':
        return 80;
      default:
        return 85;
    }
  };

  const getUpdateTimestamp = (item: any, isDbMode: boolean): number => {
    let activeRecord: SchoolRecord | null = null;
    if (isDbMode) {
      activeRecord = item.active as SchoolRecord | null;
    } else {
      activeRecord = item as SchoolRecord;
    }

    if (!activeRecord) return 0;

    if (activeRecord.tanggalFollowUpTerakhir) {
      const ts = parseDateToTimestamp(activeRecord.tanggalFollowUpTerakhir);
      if (ts > 0) return ts;
    }

    if (activeRecord.updates && activeRecord.updates.length > 0) {
      const lastUpdateStr = activeRecord.updates[activeRecord.updates.length - 1];
      const ts = parseDateToTimestamp(lastUpdateStr);
      if (ts > 0) return ts;
    }

    if (activeRecord.tanggalKontakAwal) {
      const ts = parseDateToTimestamp(activeRecord.tanggalKontakAwal);
      if (ts > 0) return ts;
    }

    return 0;
  };

  // --- DATABASE MODE LOGIC ---
  const databaseSchools = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    let surveyedListWithRegion: Array<{
      surveyed: { name: string; instagram?: string; tiktok?: string };
      prov: string;
      city: string;
    }> = [];

    if (selectedProvince && selectedCity) {
      const upperProv = selectedProvince.toUpperCase().trim();
      const upperCity = selectedCity.toUpperCase().trim();
      let surveyed = mergedDatabase[upperProv]?.[upperCity] || [];
      if (surveyed.length === 0 && mergedDatabase[upperProv]) {
        const matchKey = Object.keys(mergedDatabase[upperProv]).find(c => isSameCity(c, upperCity, upperProv));
        if (matchKey) {
          surveyed = mergedDatabase[upperProv][matchKey] || [];
        }
      }
      surveyedListWithRegion = surveyed.map(s => ({ surveyed: s, prov: upperProv, city: upperCity }));
    } else if (selectedProvince && !selectedCity) {
      // Province selected, all cities in this province
      const upperProv = selectedProvince.toUpperCase().trim();
      const cityMap = mergedDatabase[upperProv] || {};
      Object.entries(cityMap).forEach(([cName, schList]) => {
        schList.forEach(s => {
          surveyedListWithRegion.push({ surveyed: s, prov: upperProv, city: cName });
        });
      });
    } else if (!selectedProvince && selectedCity) {
      // All provinces, specific city selected
      const upperCity = selectedCity.toUpperCase().trim();
      Object.entries(mergedDatabase).forEach(([pName, cityObj]) => {
        Object.entries(cityObj).forEach(([cName, schList]) => {
          if (isSameCity(cName, upperCity, pName)) {
            schList.forEach(s => {
              surveyedListWithRegion.push({ surveyed: s, prov: pName, city: cName });
            });
          }
        });
      });
    } else {
      // All provinces and all cities
      Object.entries(mergedDatabase).forEach(([pName, cityObj]) => {
        Object.entries(cityObj).forEach(([cName, schList]) => {
          schList.forEach(s => {
            surveyedListWithRegion.push({ surveyed: s, prov: pName, city: cName });
          });
        });
      });
    }

    // Active prospects in the scoped region(s)
    const activeProspects = schools.filter(s => {
      if (selectedProvince && s.provinsi?.toUpperCase().trim() !== selectedProvince.toUpperCase().trim()) {
        return false;
      }
      if (selectedCity && !isSameCity(s.kota, selectedCity, selectedProvince)) {
        return false;
      }
      return true;
    });

    // Map surveyed schools and join with active prospect records
    const mapped = surveyedListWithRegion.map(({ surveyed, prov, city }) => {
      const activeRecord = activeProspects.find(s => 
        ((!selectedProvince || s.provinsi?.toUpperCase().trim() === prov) && (!selectedCity || isSameCity(s.kota, city, prov))) &&
        ((s.originalName && s.originalName.toLowerCase().trim() === surveyed.name.toLowerCase().trim()) ||
         (s.namaSekolah && s.namaSekolah.toLowerCase().trim() === surveyed.name.toLowerCase().trim()))
      );

      return {
        surveyed,
        prov,
        city,
        active: activeRecord || null,
        isMatched: !!activeRecord
      };
    });

    // Also, find active prospects that are NOT in the surveyed list and append them
    const surveyedKeys = new Set(surveyedListWithRegion.map(item => `${item.prov}_${item.city}_${item.surveyed.name.toLowerCase().trim()}`));
    activeProspects.forEach((s) => {
      const prov = s.provinsi?.toUpperCase().trim() || '';
      const city = s.kota?.toUpperCase().trim() || '';
      const keyOriginal = `${prov}_${city}_${s.originalName?.toLowerCase().trim()}`;
      const keyName = `${prov}_${city}_${s.namaSekolah?.toLowerCase().trim()}`;

      if (!surveyedKeys.has(keyOriginal) && !surveyedKeys.has(keyName)) {
        mapped.push({
          surveyed: {
            name: s.namaSekolah,
            instagram: s.instagramHandle,
            tiktok: s.tiktokHandle
          },
          prov,
          city,
          active: s,
          isMatched: true
        });
      }
    });

    // Apply filters
    return mapped.filter(item => {
      // 1. Search Filter
      if (searchLower) {
        const nameMatch = (item.surveyed.name || '').toLowerCase().includes(searchLower);
        const igMatch = (item.surveyed.instagram || '').toLowerCase().includes(searchLower);
        const tiktokMatch = (item.surveyed.tiktok || '').toLowerCase().includes(searchLower);
        const cityMatch = (item.city || '').toLowerCase().includes(searchLower);
        const provMatch = (item.prov || '').toLowerCase().includes(searchLower);
        
        let activeMatch = false;
        if (item.active) {
          activeMatch = 
            (item.active.namaSekolah || '').toLowerCase().includes(searchLower) ||
            (item.active.picMarketing || '').toLowerCase().includes(searchLower) ||
            (item.active.marketingLapangan || '').toLowerCase().includes(searchLower) ||
            (item.active.catatanAwal || '').toLowerCase().includes(searchLower) ||
            (item.active.instagramHandle || '').toLowerCase().includes(searchLower) ||
            (item.active.tiktokHandle || '').toLowerCase().includes(searchLower) ||
            (item.active.kontakPic1 || '').toLowerCase().includes(searchLower) ||
            (item.active.kontakPic2 || '').toLowerCase().includes(searchLower) ||
            (item.active.kontakPic3 || '').toLowerCase().includes(searchLower) ||
            (item.active.kontakPic4 || '').toLowerCase().includes(searchLower);
        }

        if (!nameMatch && !igMatch && !tiktokMatch && !cityMatch && !provMatch && !activeMatch) return false;
      }

      // 2. Jenjang Filter
      if (levelFilter !== 'ALL') {
        const nameUpper = (item.surveyed.name || '').toUpperCase();
        if (levelFilter === 'SMA') {
          if (!nameUpper.includes('SMA') && !nameUpper.includes('MA ')) return false;
        } else if (levelFilter === 'SMK') {
          if (!nameUpper.includes('SMK')) return false;
        } else if (levelFilter === 'SMP') {
          if (!nameUpper.includes('SMP') && !nameUpper.includes('MTS')) return false;
        } else if (levelFilter === 'MAN') {
          if (!nameUpper.includes('MAN') && !nameUpper.includes('MA SURABAYA')) return false;
        }
      }

      // 3. Status Filter (For Database mode)
      if (selectedStatusFilter) {
        if ((selectedStatusFilter as string) === 'BELUM AKTIF') {
          if (item.active) return false;
        } else if (!item.active || item.active.status !== selectedStatusFilter) {
          return false;
        }
      } else {
        // Tab "DATABASE SEKOLAH" default status: { BELUM AKTIF, BARU, DIHUBUNGI, FOLLOW UP, LOST }
        if (item.active && ['PROSPEK', 'MEETING / VISIT', 'DEAL', 'CLOSING', 'CLOSED'].includes(item.active.status)) {
          return false;
        }
      }

      return true;
    });
  }, [schools, selectedProvince, selectedCity, search, levelFilter, selectedStatusFilter, mergedDatabase]);

  // Statistics for selected region with full pipeline breakdown
  const cityStats = useMemo(() => {
    // 1. Get surveyed target schools in selected region
    let surveyedInScope: Array<{ name: string; prov: string; city: string }> = [];
    if (selectedProvince && selectedCity) {
      const upperP = selectedProvince.toUpperCase().trim();
      const upperC = selectedCity.toUpperCase().trim();
      let surveyed = mergedDatabase[upperP]?.[upperC] || [];
      if (surveyed.length === 0 && mergedDatabase[upperP]) {
        const matchKey = Object.keys(mergedDatabase[upperP]).find(c => isSameCity(c, upperC, upperP));
        if (matchKey) surveyed = mergedDatabase[upperP][matchKey] || [];
      }
      surveyedInScope = surveyed.map(s => ({ name: s.name, prov: upperP, city: upperC }));
    } else if (selectedProvince && !selectedCity) {
      const upperP = selectedProvince.toUpperCase().trim();
      const cityMap = mergedDatabase[upperP] || {};
      Object.entries(cityMap).forEach(([cName, schList]) => {
        schList.forEach(s => surveyedInScope.push({ name: s.name, prov: upperP, city: cName }));
      });
    } else if (!selectedProvince && selectedCity) {
      const upperC = selectedCity.toUpperCase().trim();
      Object.entries(mergedDatabase).forEach(([pName, cityObj]) => {
        Object.entries(cityObj).forEach(([cName, schList]) => {
          if (isSameCity(cName, upperC, pName)) {
            schList.forEach(s => surveyedInScope.push({ name: s.name, prov: pName, city: cName }));
          }
        });
      });
    } else {
      Object.entries(mergedDatabase).forEach(([pName, cityObj]) => {
        Object.entries(cityObj).forEach(([cName, schList]) => {
          schList.forEach(s => surveyedInScope.push({ name: s.name, prov: pName, city: cName }));
        });
      });
    }

    // 2. Get active schools in scope
    const activeInScope = schools.filter(s => {
      if (selectedProvince && s.provinsi?.toUpperCase().trim() !== selectedProvince.toUpperCase().trim()) return false;
      if (selectedCity && !isSameCity(s.kota, selectedCity, selectedProvince)) return false;
      return true;
    });

    const total = Math.max(surveyedInScope.length, activeInScope.length);
    const activeCount = activeInScope.length;

    let baru = 0;
    let dihubungi = 0;
    let followUp = 0;
    let prospek = 0;
    let meetingVisit = 0;
    let deal = 0;
    let lost = 0;

    activeInScope.forEach((s) => {
      const status = s.status;
      if (status === 'BARU') baru++;
      else if (status === 'DIHUBUNGI') dihubungi++;
      else if (status === 'FOLLOW UP') followUp++;
      else if (status === 'PROSPEK' || (status as string) === 'CLOSING') prospek++;
      else if (status === 'MEETING / VISIT') meetingVisit++;
      else if (status === 'DEAL' || (status as string) === 'CLOSED') deal++;
      else if (status === 'LOST' || (status as string) === 'GAGAL') lost++;
    });

    const pendingCount = Math.max(0, total - activeCount);

    return { 
      total, 
      activeCount, 
      pendingCount,
      baru,
      dihubungi,
      followUp,
      prospek,
      meetingVisit,
      deal,
      lost
    };
  }, [schools, selectedProvince, selectedCity, mergedDatabase]);


  // --- PROSPECT MODE LOGIC (Active Leads Flat List) ---
  const activeFilteredSchools = useMemo(() => {
    return schools.filter((school) => {
      // Tab "DAFTAR SEKOLAH PROSPEK": Only include schools in status { PROSPEK, MEETING / VISIT, DEAL }
      const isProspectStage = ['PROSPEK', 'MEETING / VISIT', 'DEAL', 'CLOSING', 'CLOSED'].includes(school.status);
      if (!isProspectStage) {
        return false;
      }

      // 1. Text Search
      if (search.trim()) {
        const searchLower = search.toLowerCase().trim();
        const nameMatch = (school.namaSekolah || '').toLowerCase().includes(searchLower);
        const cityMatch = (school.kota || '').toLowerCase().includes(searchLower);
        const provMatch = (school.provinsi || '').toLowerCase().includes(searchLower);
        const igMatch = (school.instagramHandle || '').toLowerCase().includes(searchLower);
        const tiktokMatch = (school.tiktokHandle || '').toLowerCase().includes(searchLower);
        const picMatch = (school.picMarketing || '').toLowerCase().includes(searchLower);
        const mlMatch = (school.marketingLapangan || '').toLowerCase().includes(searchLower);
        const contactMatch = ((school.kontakPic1 || '') + (school.kontakPic2 || '') + (school.kontakPic3 || '') + (school.kontakPic4 || ''))
          .toLowerCase()
          .includes(searchLower);
        const notesMatch = (school.catatanAwal || '').toLowerCase().includes(searchLower) || 
          (school.updates && school.updates.some(u => (u || '').toLowerCase().includes(searchLower)));

        if (!nameMatch && !cityMatch && !provMatch && !igMatch && !tiktokMatch && !picMatch && !mlMatch && !contactMatch && !notesMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (selectedStatusFilter && school.status !== selectedStatusFilter) {
        return false;
      }

      // 3. PIC Filter
      if (selectedPicFilter) {
        if (selectedPicFilter === 'Belum Ada PIC' && school.picMarketing !== '') {
          return false;
        }
        if (selectedPicFilter !== 'Belum Ada PIC' && school.picMarketing !== selectedPicFilter) {
          return false;
        }
      }

      // 4. Probability Filter
      if (probabilityFilter !== 'ALL') {
        if (probabilityFilter === '' && school.kemungkinanClosing !== '') return false;
        if (probabilityFilter !== '' && school.kemungkinanClosing !== probabilityFilter) return false;
      }

      // 5. School Level Filter
      if (levelFilter !== 'ALL') {
        const nameUpper = (school.namaSekolah || '').toUpperCase();
        if (levelFilter === 'SMA') {
          if (!nameUpper.includes('SMA') && !nameUpper.includes('MA ')) return false;
        } else if (levelFilter === 'SMK') {
          if (!nameUpper.includes('SMK')) return false;
        } else if (levelFilter === 'SMP') {
          if (!nameUpper.includes('SMP') && !nameUpper.includes('MTS')) return false;
        } else if (levelFilter === 'MAN') {
          if (!nameUpper.includes('MAN') && !nameUpper.includes('MA SURABAYA')) return false;
        }
      }

      // 6. Province & City Filter (Sync across views)
      if (selectedProvince) {
        const schoolProv = school.provinsi?.toUpperCase().trim() || '';
        if (schoolProv !== selectedProvince.toUpperCase().trim()) {
          return false;
        }
      }
      if (selectedCity) {
        const schoolCity = school.kota?.toUpperCase().trim() || '';
        if (!isSameCity(schoolCity, selectedCity, selectedProvince)) {
          return false;
        }
      }

      return true;
    });
  }, [schools, search, selectedStatusFilter, selectedPicFilter, probabilityFilter, levelFilter, selectedProvince, selectedCity]);

  // --- SORTING COMPUTATIONS ---
  const sortedDatabaseSchools = useMemo(() => {
    const list = [...databaseSchools];
    list.sort((a, b) => {
      const nameA = (a.surveyed?.name || a.active?.namaSekolah || '').trim();
      const nameB = (b.surveyed?.name || b.active?.namaSekolah || '').trim();
      const nameCompare = nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });

      let comparison = 0;

      if (sortBy === 'name') {
        comparison = nameCompare;
      } else if (sortBy === 'status') {
        const statusA = a.active?.status || 'BELUM AKTIF';
        const statusB = b.active?.status || 'BELUM AKTIF';
        const weightA = getStatusWeight(statusA);
        const weightB = getStatusWeight(statusB);
        comparison = weightA - weightB;
        if (comparison === 0) {
          comparison = nameCompare;
        }
      } else if (sortBy === 'pic') {
        const picA = (a.active?.picMarketing || '').trim();
        const picB = (b.active?.picMarketing || '').trim();

        if (!picA && picB) return 1;  // Unassigned PIC always at bottom
        if (picA && !picB) return -1; // Unassigned PIC always at bottom
        if (!picA && !picB) {
          comparison = nameCompare;
        } else {
          comparison = picA.localeCompare(picB, 'id', { sensitivity: 'base' });
          if (comparison === 0) {
            comparison = nameCompare;
          }
        }
      } else if (sortBy === 'update') {
        const timeA = getUpdateTimestamp(a, true);
        const timeB = getUpdateTimestamp(b, true);

        if (timeA === 0 && timeB > 0) return 1;  // Items without update date always at bottom
        if (timeA > 0 && timeB === 0) return -1; // Items without update date always at bottom
        if (timeA === 0 && timeB === 0) {
          comparison = nameCompare;
        } else {
          comparison = timeA - timeB;
          if (comparison === 0) {
            comparison = nameCompare;
          }
        }
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return list;
  }, [databaseSchools, sortBy, sortOrder]);

  const sortedActiveFilteredSchools = useMemo(() => {
    const list = [...activeFilteredSchools];
    list.sort((a, b) => {
      const nameA = (a.namaSekolah || '').trim();
      const nameB = (b.namaSekolah || '').trim();
      const nameCompare = nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });

      let comparison = 0;

      if (sortBy === 'name') {
        comparison = nameCompare;
      } else if (sortBy === 'status') {
        const weightA = getStatusWeight(a.status);
        const weightB = getStatusWeight(b.status);
        comparison = weightA - weightB;
        if (comparison === 0) {
          comparison = nameCompare;
        }
      } else if (sortBy === 'pic') {
        const picA = (a.picMarketing || '').trim();
        const picB = (b.picMarketing || '').trim();

        if (!picA && picB) return 1;  // Unassigned PIC always at bottom
        if (picA && !picB) return -1; // Unassigned PIC always at bottom
        if (!picA && !picB) {
          comparison = nameCompare;
        } else {
          comparison = picA.localeCompare(picB, 'id', { sensitivity: 'base' });
          if (comparison === 0) {
            comparison = nameCompare;
          }
        }
      } else if (sortBy === 'update') {
        const timeA = getUpdateTimestamp(a, false);
        const timeB = getUpdateTimestamp(b, false);

        if (timeA === 0 && timeB > 0) return 1;  // Items without update date always at bottom
        if (timeA > 0 && timeB === 0) return -1; // Items without update date always at bottom
        if (timeA === 0 && timeB === 0) {
          comparison = nameCompare;
        } else {
          comparison = timeA - timeB;
          if (comparison === 0) {
            comparison = nameCompare;
          }
        }
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return list;
  }, [activeFilteredSchools, sortBy, sortOrder]);

  const totalProspectsCount = useMemo(() => {
    return schools.filter(s => ['PROSPEK', 'MEETING / VISIT', 'DEAL', 'CLOSING', 'CLOSED'].includes(s.status)).length;
  }, [schools]);

  // Reset pagination on filter or mode or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, viewMode, selectedProvince, selectedCity, selectedStatusFilter, selectedPicFilter, probabilityFilter, levelFilter, sortBy, sortOrder]);

  // Paginated items depending on the viewMode
  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const items = viewMode === 'database' ? sortedDatabaseSchools : sortedActiveFilteredSchools;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [viewMode, sortedDatabaseSchools, sortedActiveFilteredSchools, currentPage]);

  const totalPages = Math.ceil(
    (viewMode === 'database' ? sortedDatabaseSchools.length : sortedActiveFilteredSchools.length) / itemsPerPage
  );

  // Trigger creating a new active prospect based on target surveyed school
  const handleActivateProspect = (sch: { name: string; instagram?: string; tiktok?: string }) => {
    const partialSchool: SchoolRecord = {
      no: -1, // Tells App.tsx this is a new entry
      namaSekolah: sch.name,
      originalName: sch.name,
      provinsi: selectedProvince,
      kota: selectedCity,
      instagramHandle: sch.instagram || undefined,
      tiktokHandle: sch.tiktok || undefined,
      picMarketing: '',
      marketingLapangan: '',
      status: 'BARU',
      kontakPic1: '',
      kontakPic2: '',
      kontakPic3: '',
      kontakPic4: '',
      tanggalKontakAwal: new Date().toLocaleDateString('id-ID'),
      jenisLayanan: '',
      catatanAwal: '',
      tanggalFollowUpTerakhir: '',
      kemungkinanClosing: '',
      updates: []
    };
    onSelectSchool(partialSchool);
  };

  return (
    <div className="space-y-5" id="school-list-container">
      
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            {viewMode === 'prospects' ? (
              <>
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <span>Daftar Prospek Sekolah Aktif</span>
              </>
            ) : (
              <>
                <Layers className="h-5 w-5 text-indigo-600" />
                <span>Eksplorasi Database Sekolah Sasaran</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {viewMode === 'prospects' 
              ? 'Pantau progress, kelola relasi, dan update pipeline status CRM prospek aktif.' 
              : 'Jelajahi database sekolah terdaftar per wilayah atau tambah wilayah ekspansi baru.'}
          </p>
        </div>

        {viewMode === 'prospects' && (
          <button
            onClick={onAddSchool}
            id="list-add-new-school-trigger"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center space-x-2 text-xs font-bold transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>+ Tambah Prospek Manual</span>
          </button>
        )}
      </div>

      {/* Unified Regional Selection Bar - Controls both Active Prospects list and Target Database */}
      <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 p-5 rounded-2xl border border-indigo-100/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4" id="database-mode-controls">
        <div>
          <label className="block text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider mb-1.5 flex items-center">
            <Sparkles className="h-3 w-3 mr-1 text-indigo-500 animate-pulse" /> Pilih Provinsi
          </label>
          <select
            id="province-db-select"
            value={selectedProvince}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="w-full p-2.5 bg-white border border-indigo-200/60 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
          >
            <option value="">-- SEMUA PROVINSI --</option>
            {provinces.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider mb-1.5 flex items-center">
            <MapPin className="h-3 w-3 mr-1 text-indigo-500" /> Pilih Kota / Kabupaten
          </label>
          <select
            id="city-db-select"
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-2.5 bg-white border border-indigo-200/60 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
          >
            <option value="">-- SEMUA KOTA/KABUPATEN --</option>
            {cities.map(ct => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 pt-3 border-t border-indigo-100/40 flex justify-between items-center flex-wrap gap-2">
          <p className="text-[11px] text-slate-500 font-medium">
            {viewMode === 'database' 
              ? '* Pilih wilayah untuk menjelajahi database sekolah target, atau buat wilayah ekspansi baru.'
              : '* Pilih wilayah untuk memfilter daftar prospek aktif secara real-time dan melihat akumulasi status.'}
          </p>
          {viewMode === 'database' && (
            <button
              onClick={() => {
                setIsExpanding(!isExpanding);
                if (!isExpanding) {
                  // Prepopulate state
                  setNewProvMode('select');
                  setNewCityMode('select');
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isExpanding 
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200/50'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isExpanding ? 'Tutup Formulir Ekspansi' : '+ Ekspansi Wilayah / Target Baru'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Accumulative Pipeline Status Panel for Selected Region / All Regions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4" id="database-region-pipeline-panel">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500 animate-pulse" /> Akumulasi Status Wilayah
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Wilayah aktif: <span className="text-indigo-600 font-black">{getActiveRegionLabel()}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedStatusFilter && (
              <button
                onClick={() => handleStatusCardClick('')}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                title="Hapus filter status"
              >
                <X className="h-3 w-3" />
                <span>Reset Filter Status</span>
              </button>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {viewMode === 'prospects' 
                ? `${cityStats.prospek + cityStats.meetingVisit + cityStats.deal} prospek aktif`
                : `${cityStats.activeCount} dari ${cityStats.total} sedang diprospek`}
            </span>
          </div>
        </div>

        {selectedStatusFilter && (
          <div className="flex items-center justify-between gap-2 bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs font-bold px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-indigo-600" />
              <span>Filtering aktif berdasarkan status: <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide">{selectedStatusFilter}</span></span>
            </div>
            <button
              onClick={() => handleStatusCardClick('')}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Tampilkan Semua</span>
            </button>
          </div>
        )}

        <div className={viewMode === 'prospects' ? "grid grid-cols-2 sm:grid-cols-4 gap-2" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2"} id="region-pipeline-grid">
          {viewMode === 'database' && (
            <>
              {/* Total Target */}
              <button
                type="button"
                onClick={() => handleStatusCardClick('')}
                title="Klik untuk menampilkan semua database"
                className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
                  selectedStatusFilter === ''
                    ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-sm scale-[1.02]'
                    : 'bg-slate-50 border border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === '' ? 'text-slate-300' : 'text-slate-400'}`}>Total Database</span>
                  {selectedStatusFilter === '' && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`text-lg font-black ${selectedStatusFilter === '' ? 'text-white' : 'text-slate-900'}`}>{cityStats.total}</span>
                  <span className={`text-[8px] font-medium ${selectedStatusFilter === '' ? 'text-slate-300' : 'text-slate-400'}`}>Sekolah</span>
                </div>
              </button>

              {/* Belum Diprospek */}
              <button
                type="button"
                onClick={() => handleStatusCardClick('BELUM AKTIF')}
                title="Klik untuk menyaring status Belum Aktif"
                className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
                  selectedStatusFilter === 'BELUM AKTIF'
                    ? 'bg-slate-800 text-white border-2 border-slate-800 ring-2 ring-slate-400/50 shadow-sm scale-[1.02]'
                    : 'bg-slate-50/50 border border-dashed border-slate-300 hover:bg-slate-100/80 hover:border-slate-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'BELUM AKTIF' ? 'text-slate-300' : 'text-slate-400'}`}>Belum Aktif</span>
                  {selectedStatusFilter === 'BELUM AKTIF' && <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`text-lg font-black ${selectedStatusFilter === 'BELUM AKTIF' ? 'text-white' : 'text-slate-500'}`}>{cityStats.pendingCount}</span>
                  <span className={`text-[8px] font-medium ${selectedStatusFilter === 'BELUM AKTIF' ? 'text-slate-300' : 'text-slate-400'}`}>Target</span>
                </div>
              </button>

              {/* BARU */}
              <button
                type="button"
                onClick={() => handleStatusCardClick('BARU')}
                title="Klik untuk menyaring status Baru"
                className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
                  selectedStatusFilter === 'BARU'
                    ? 'bg-slate-700 text-white border-2 border-slate-700 ring-2 ring-slate-400/50 shadow-sm scale-[1.02]'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'BARU' ? 'text-slate-300' : 'text-slate-400'}`}>Baru</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStatusFilter === 'BARU' ? 'bg-white' : 'bg-slate-400'}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`text-lg font-black ${selectedStatusFilter === 'BARU' ? 'text-white' : 'text-slate-800'}`}>{cityStats.baru}</span>
                  <span className={`text-[8px] font-medium ${selectedStatusFilter === 'BARU' ? 'text-slate-300' : 'text-slate-500'}`}>Prospek</span>
                </div>
              </button>

              {/* DIHUBUNGI */}
              <button
                type="button"
                onClick={() => handleStatusCardClick('DIHUBUNGI')}
                title="Klik untuk menyaring status Dihubungi"
                className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
                  selectedStatusFilter === 'DIHUBUNGI'
                    ? 'bg-blue-600 text-white border-2 border-blue-600 ring-2 ring-blue-300 shadow-sm scale-[1.02]'
                    : 'bg-blue-50/30 border border-blue-100 hover:bg-blue-50 hover:border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'DIHUBUNGI' ? 'text-blue-100' : 'text-blue-500'}`}>Dihubungi</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStatusFilter === 'DIHUBUNGI' ? 'bg-white' : 'bg-blue-500'}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`text-lg font-black ${selectedStatusFilter === 'DIHUBUNGI' ? 'text-white' : 'text-blue-700'}`}>{cityStats.dihubungi}</span>
                  <span className={`text-[8px] font-medium ${selectedStatusFilter === 'DIHUBUNGI' ? 'text-blue-100' : 'text-blue-500'}`}>Prospek</span>
                </div>
              </button>

              {/* FOLLOW UP */}
              <button
                type="button"
                onClick={() => handleStatusCardClick('FOLLOW UP')}
                title="Klik untuk menyaring status Follow Up"
                className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
                  selectedStatusFilter === 'FOLLOW UP'
                    ? 'bg-amber-600 text-white border-2 border-amber-600 ring-2 ring-amber-300 shadow-sm scale-[1.02]'
                    : 'bg-amber-50/30 border border-amber-100 hover:bg-amber-50 hover:border-amber-200'
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'FOLLOW UP' ? 'text-amber-100' : 'text-amber-500'}`}>Follow Up</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStatusFilter === 'FOLLOW UP' ? 'bg-white' : 'bg-amber-500'}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`text-lg font-black ${selectedStatusFilter === 'FOLLOW UP' ? 'text-white' : 'text-amber-700'}`}>{cityStats.followUp}</span>
                  <span className={`text-[8px] font-medium ${selectedStatusFilter === 'FOLLOW UP' ? 'text-amber-100' : 'text-amber-500'}`}>Prospek</span>
                </div>
              </button>
            </>
          )}

          {viewMode === 'prospects' && (
            /* Total Prospect Card for Prospects View Mode */
            <button
              type="button"
              onClick={() => handleStatusCardClick('')}
              title="Klik untuk menampilkan semua prospek aktif"
              className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
                selectedStatusFilter === ''
                  ? 'bg-indigo-900 text-white border-2 border-indigo-900 shadow-sm scale-[1.02]'
                  : 'bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-100/70 hover:border-indigo-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === '' ? 'text-indigo-200' : 'text-indigo-500'}`}>Total Prospek</span>
                {selectedStatusFilter === '' && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className={`text-lg font-black ${selectedStatusFilter === '' ? 'text-white' : 'text-indigo-900'}`}>{cityStats.prospek + cityStats.meetingVisit + cityStats.deal}</span>
                <span className={`text-[8px] font-medium ${selectedStatusFilter === '' ? 'text-indigo-200' : 'text-indigo-500'}`}>Prospek</span>
              </div>
            </button>
          )}

          {/* PROSPEK */}
          <button
            type="button"
            onClick={() => handleStatusCardClick('PROSPEK')}
            title="Klik untuk menyaring status Prospek"
            className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
              selectedStatusFilter === 'PROSPEK'
                ? 'bg-indigo-600 text-white border-2 border-indigo-600 ring-2 ring-indigo-300 shadow-sm scale-[1.02]'
                : 'bg-indigo-50/30 border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200'
            }`}
          >
            <div className="flex justify-between items-start gap-1">
              <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'PROSPEK' ? 'text-indigo-100' : 'text-indigo-500'}`}>Prospek</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStatusFilter === 'PROSPEK' ? 'bg-white' : 'bg-indigo-500'}`} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`text-lg font-black ${selectedStatusFilter === 'PROSPEK' ? 'text-white' : 'text-indigo-700'}`}>{cityStats.prospek}</span>
              <span className={`text-[8px] font-medium ${selectedStatusFilter === 'PROSPEK' ? 'text-indigo-100' : 'text-indigo-500'}`}>Prospek</span>
            </div>
          </button>

          {/* MEETING / VISIT */}
          <button
            type="button"
            onClick={() => handleStatusCardClick('MEETING / VISIT')}
            title="Klik untuk menyaring status Meeting / Visit"
            className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
              selectedStatusFilter === 'MEETING / VISIT'
                ? 'bg-purple-600 text-white border-2 border-purple-600 ring-2 ring-purple-300 shadow-sm scale-[1.02]'
                : 'bg-purple-50/30 border border-purple-100 hover:bg-purple-50 hover:border-purple-200'
            }`}
          >
            <div className="flex justify-between items-start gap-1">
              <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'MEETING / VISIT' ? 'text-purple-100' : 'text-purple-500'}`}>Meeting / Visit</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStatusFilter === 'MEETING / VISIT' ? 'bg-white' : 'bg-purple-500'}`} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`text-lg font-black ${selectedStatusFilter === 'MEETING / VISIT' ? 'text-white' : 'text-purple-700'}`}>{cityStats.meetingVisit}</span>
              <span className={`text-[8px] font-medium ${selectedStatusFilter === 'MEETING / VISIT' ? 'text-purple-100' : 'text-purple-500'}`}>Kunjungan</span>
            </div>
          </button>

          {/* DEAL */}
          <button
            type="button"
            onClick={() => handleStatusCardClick('DEAL')}
            title="Klik untuk menyaring status Deal"
            className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
              selectedStatusFilter === 'DEAL'
                ? 'bg-emerald-600 text-white border-2 border-emerald-600 ring-2 ring-emerald-300 shadow-sm scale-[1.02]'
                : 'bg-emerald-50/30 border border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200'
            }`}
          >
            <div className="flex justify-between items-start gap-1">
              <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'DEAL' ? 'text-emerald-100' : 'text-emerald-500'}`}>Deal</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStatusFilter === 'DEAL' ? 'bg-white' : 'bg-emerald-500'}`} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`text-lg font-black ${selectedStatusFilter === 'DEAL' ? 'text-white' : 'text-emerald-700'}`}>{cityStats.deal}</span>
              <span className={`text-[8px] font-medium ${selectedStatusFilter === 'DEAL' ? 'text-emerald-100' : 'text-emerald-500'}`}>Sukses</span>
            </div>
          </button>

          {viewMode === 'database' && (
            /* LOST */
            <button
              type="button"
              onClick={() => handleStatusCardClick('LOST')}
              title="Klik untuk menyaring status Lost"
              className={`p-2.5 rounded-xl text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer select-none ${
                selectedStatusFilter === 'LOST'
                  ? 'bg-rose-600 text-white border-2 border-rose-600 ring-2 ring-rose-300 shadow-sm scale-[1.02]'
                  : 'bg-rose-50/30 border border-rose-100 hover:bg-rose-50 hover:border-rose-200'
              }`}
            >
              <div className="flex justify-between items-start gap-1">
                <span className={`text-[8px] font-extrabold uppercase tracking-widest ${selectedStatusFilter === 'LOST' ? 'text-rose-100' : 'text-rose-500'}`}>Lost</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStatusFilter === 'LOST' ? 'bg-white' : 'bg-rose-500'}`} />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className={`text-lg font-black ${selectedStatusFilter === 'LOST' ? 'text-white' : 'text-rose-700'}`}>{cityStats.lost}</span>
                <span className={`text-[8px] font-medium ${selectedStatusFilter === 'LOST' ? 'text-rose-100' : 'text-rose-500'}`}>Batal</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3.5 rounded-xl flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Region & Target School Expansion Workspace Card */}
      {viewMode === 'database' && isExpanding && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6 animate-slide-up" id="expansion-workspace">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-500 animate-pulse" /> Ekspansi Wilayah & Database Target Baru
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Tambah provinsi baru, kota/kabupaten baru, dan daftar sekolah target secara massal.</p>
            </div>
            <button 
              onClick={() => {
                setIsExpanding(false);
                setNewProvMode('select');
                setNewCityMode('select');
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form: Location Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PROVINCE SECTION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Provinsi Target</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = newProvMode === 'select' ? 'custom' : 'select';
                    setNewProvMode(nextMode);
                    if (nextMode === 'custom') {
                      setNewCityMode('custom'); // Custom province requires custom city
                    }
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  {newProvMode === 'select' ? '+ Buat Provinsi Baru' : '← Pilih Provinsi Terdaftar'}
                </button>
              </div>
              
              {newProvMode === 'select' ? (
                <select
                  value={selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs cursor-pointer animate-fade-in"
                >
                  {provinces.map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customProvInput}
                  onChange={(e) => setCustomProvInput(e.target.value)}
                  placeholder="Contoh: BALI, JAWA TENGAH"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-slate-400 uppercase animate-fade-in"
                />
              )}
            </div>

            {/* CITY / REGENCY SECTION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Kota / Kabupaten Target</label>
                {newProvMode === 'select' && (
                  <button
                    type="button"
                    onClick={() => setNewCityMode(newCityMode === 'select' ? 'custom' : 'select')}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    {newCityMode === 'select' ? '+ Buat Kota/Kab Baru' : '← Pilih Kota/Kab Terdaftar'}
                  </button>
                )}
              </div>
              
              {newCityMode === 'select' && newProvMode === 'select' ? (
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs cursor-pointer animate-fade-in"
                >
                  {cities.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  {/* Toggle Switch */}
                  <div className="flex items-center justify-between bg-white px-3 py-1.5 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Tipe Wilayah</span>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCityType('KOTA')}
                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                          cityType === 'KOTA' 
                            ? 'bg-white text-indigo-600 shadow-2xs' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Kota
                      </button>
                      <button
                        type="button"
                        onClick={() => setCityType('KABUPATEN')}
                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                          cityType === 'KABUPATEN' 
                            ? 'bg-white text-indigo-600 shadow-2xs' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Kabupaten
                      </button>
                    </div>
                  </div>
                  
                  {/* Input with visual indicator */}
                  <div className="relative">
                    <input
                      type="text"
                      value={customCityInput}
                      onChange={(e) => setCustomCityInput(e.target.value)}
                      placeholder={`Contoh: ${cityType === 'KOTA' ? 'DENPASAR' : 'BADUNG'}`}
                      className="w-full pl-24 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all uppercase placeholder-slate-400"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      {cityType}
                    </div>
                  </div>
                  
                  {customCityInput && (
                    <p className="text-[10px] text-slate-500 font-semibold px-1">
                      Hasil simpan: <span className="text-indigo-600 font-extrabold">{cityType} {customCityInput.toUpperCase()}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Table: Target School Names */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Daftar Nama Sekolah yang Ingin Ditambahkan</label>
            </div>

            {/* Batch Paste section */}
            {showBatchPaste && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-indigo-900">Paste Nama Sekolah (Satu baris per sekolah)</h4>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowBatchPaste(false);
                      setBatchPasteInput('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
                <textarea
                  value={batchPasteInput}
                  onChange={(e) => setBatchPasteInput(e.target.value)}
                  placeholder="SMA NEGERI 1 DENPASAR&#10;SMA NEGERI 2 DENPASAR&#10;SMK NEGERI 1 DENPASAR"
                  rows={4}
                  className="w-full p-2.5 bg-white border border-indigo-200/50 rounded-xl text-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={handleApplyBatchPaste}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  Terapkan Hasil Paste
                </button>
              </div>
            )}

            {/* Schools Interactive Input Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-black border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Sekolah Target</th>
                      <th className="py-3 px-4 w-48">Instagram Handle (Opsional)</th>
                      <th className="py-3 px-4 w-48">TikTok Handle (Opsional)</th>
                      <th className="py-3 px-4 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {newSchoolsTable.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => {
                              const updated = [...newSchoolsTable];
                              updated[index].name = e.target.value;
                              setNewSchoolsTable(updated);
                            }}
                            placeholder="Contoh: SMA NEGERI 1 DENPASAR"
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.instagram}
                            onChange={(e) => {
                              const updated = [...newSchoolsTable];
                              updated[index].instagram = e.target.value;
                              setNewSchoolsTable(updated);
                            }}
                            placeholder="@username"
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.tiktok}
                            onChange={(e) => {
                              const updated = [...newSchoolsTable];
                              updated[index].tiktok = e.target.value;
                              setNewSchoolsTable(updated);
                            }}
                            placeholder="@username"
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (newSchoolsTable.length > 1) {
                                setNewSchoolsTable(newSchoolsTable.filter((_, i) => i !== index));
                              } else {
                                const updated = [...newSchoolsTable];
                                updated[0] = { name: '', instagram: '', tiktok: '' };
                                setNewSchoolsTable(updated);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSchoolsTable([...newSchoolsTable, { name: '', instagram: '', tiktok: '' }])}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Tambah Baris</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBatchPaste(!showBatchPaste)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{showBatchPaste ? 'Sembunyikan Paste Massal' : 'Paste Massal'}</span>
                  </button>
                </div>
                
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Total Input: {newSchoolsTable.filter(s => s.name !== '').length} Sekolah Valid
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsExpanding(false);
                setNewProvMode('select');
                setNewCityMode('select');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer animate-fade-in"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveExpansion}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5 animate-fade-in"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simpan ke Database Target</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Main Filter Controls Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="filters-panel">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              id="schools-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                viewMode === 'database'
                  ? "Cari nama sekolah target atau handle instagram..."
                  : "Cari nama sekolah, instagram, nama PIC, kontak, atau catatan..."
              }
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Layout Switcher (Grid vs List) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200" id="view-layout-toggle-group">
              <button
                type="button"
                id="view-layout-grid-btn"
                onClick={() => setLayoutMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Tampilan Grid Layout"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid Layout</span>
              </button>
              <button
                type="button"
                id="view-layout-list-btn"
                onClick={() => setLayoutMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Tampilan List Layout"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List Layout</span>
              </button>
            </div>

            {/* Hide/Show Advanced Filters option only relevant in Prospect Mode */}
            {viewMode === 'prospects' && (
              <button
                onClick={() => setShowAdvanceFilters(!showAdvanceFilters)}
                id="toggle-advance-filters"
                className={`px-3.5 py-2 rounded-xl border flex items-center justify-center space-x-1.5 text-xs font-bold transition-all cursor-pointer ${
                  showAdvanceFilters 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filter Lanjutan</span>
              </button>
            )}
          </div>
        </div>

        {/* Level Filters Quick Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100" id="quick-level-chips">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-2">Jenjang:</span>
          {(['ALL', 'SMA', 'SMK', 'SMP', 'MAN'] as const).map((lvl) => (
            <button
              key={lvl}
              id={`level-chip-${lvl.toLowerCase()}`}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                levelFilter === lvl
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {lvl === 'ALL' ? 'Semua' : lvl}
            </button>
          ))}
        </div>

        {/* Sort Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100" id="sort-controls-bar">
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Urutkan Berdasarkan:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sort:</span>
              <select
                id="sort-by-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'pic' | 'update')}
                className="bg-transparent text-slate-800 text-xs font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="name">Nama Sekolah Target</option>
                <option value="status">Status Marketing</option>
                <option value="pic">PIC Marketing / AE</option>
                <option value="update">Update Terakhir / Follow Up</option>
              </select>
            </div>

            <button
              type="button"
              id="sort-order-toggle-btn"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="py-1 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title={sortOrder === 'asc' ? 'Urutan Terendah/Awal ke Tertinggi/Akhir' : 'Urutan Tertinggi/Akhir ke Terendah/Awal'}
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{sortBy === 'update' ? 'Terlama Pertama' : 'A → Z'}</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{sortBy === 'update' ? 'Terbaru Pertama' : 'Z → A'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters (Only for Active prospects mode) */}
        {viewMode === 'prospects' && showAdvanceFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100" id="advanced-filters-grid">
            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Status Prospek</label>
              <select
                id="status-filter-select"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as MarketingStatus | '')}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              >
                <option value="">Semua Status Prospek</option>
                <option value="PROSPEK">PROSPEK</option>
                <option value="MEETING / VISIT">MEETING / VISIT</option>
                <option value="DEAL">DEAL</option>
              </select>
            </div>

            {/* AE/PIC Filter */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Account Executive (AE)</label>
              <select
                id="pic-filter-select"
                value={selectedPicFilter}
                onChange={(e) => setSelectedPicFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              >
                <option value="">Semua PIC</option>
                <option value="Belum Ada PIC">Belum Ditugaskan</option>
                {uniquePics.map(pic => (
                  <option key={pic} value={pic}>{pic}</option>
                ))}
              </select>
            </div>

            {/* Closing Chance */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Kemungkinan Closing</label>
              <select
                id="prob-filter-select"
                value={probabilityFilter}
                onChange={(e) => setProbabilityFilter(e.target.value as ClosingProbability | 'ALL')}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              >
                <option value="ALL">Semua Peluang</option>
                <option value="HIGH">Tinggi (High)</option>
                <option value="MEDIUM">Sedang (Medium)</option>
                <option value="LOW">Rendah (Low)</option>
                <option value="">Belum Ditentukan</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Descriptive Headers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 px-1 gap-1" id="filter-stats-text">
        {viewMode === 'database' ? (
          <span>
            Ditemukan <b className="text-indigo-600 font-extrabold">{cityStats.total}</b> sekolah target
            {selectedProvince && selectedCity && <> di <b>{selectedCity}</b>, <b>{selectedProvince}</b></>}
            {selectedProvince && !selectedCity && <> di <b>{selectedProvince}</b> (Semua Kota/Kabupaten)</>}
            {!selectedProvince && selectedCity && <> di <b>{selectedCity}</b></>}
            {!selectedProvince && !selectedCity && <> secara keseluruhan (Semua Wilayah)</>}
            : {' '}<b className="text-emerald-600 font-bold">{cityStats.activeCount} aktif diprospek</b>, {cityStats.pendingCount} belum dihubungi.
          </span>
        ) : (
          <span>
            Menampilkan <b className="text-slate-800 font-bold">{activeFilteredSchools.length}</b> dari {totalProspectsCount} prospek aktif
            {selectedProvince && <> di <b className="text-indigo-600">{selectedProvince}</b></>}
            {selectedCity && <>, <b className="text-indigo-600">{selectedCity}</b></>}
          </span>
        )}

        {(search || selectedStatusFilter || selectedPicFilter || levelFilter !== 'ALL' || probabilityFilter !== 'ALL') && (
          <button 
            onClick={() => {
              setSearch('');
              setSelectedStatusFilter('');
              setSelectedPicFilter('');
              setLevelFilter('ALL');
              setProbabilityFilter('ALL');
            }}
            id="reset-all-filters-btn"
            className="text-indigo-600 font-bold hover:text-indigo-500 cursor-pointer"
          >
            Reset Filter Pencarian
          </button>
        )}
      </div>

      {/* Main Container: Grid or List Layout depending on layoutMode */}
      {paginatedSchools.length === 0 ? (
        !selectedAcademicYearFilter ? (
          <div className="bg-amber-50/50 border-2 border-dashed border-amber-200/80 rounded-2xl p-10 text-center space-y-3 shadow-2xs" id="no-periode-empty">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Calendar className="h-6 w-6" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-base">Periode Belum Dipilih</h4>
            <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
              Silakan tentukan <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Periode (Tahun Ajaran)</span> pada menu filter di kanan atas header untuk mulai menampilkan & mengelola data sekolah target.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-2xs" id="no-schools-empty">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>
            <h4 className="font-extrabold text-slate-700 text-sm">Tidak Ada Sekolah Target Ditemukan</h4>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Tidak ada sekolah target yang cocok dengan filter atau kriteria wilayah yang Anda pilih pada periode ini.
            </p>
          </div>
        )
      ) : layoutMode === 'grid' ? (
        /* --- GRID LAYOUT MODE --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="schools-grid">
          {viewMode === 'database' ? (
            paginatedSchools.map((item: any, idx: number) => {
              const sch = item.surveyed;
              const activeRecord: SchoolRecord | null = item.active;
              const isMatched = item.isMatched;

              return (
                <div
                  key={`db-${sch.name}-${item.city || ''}-${activeRecord?.no || idx}-${idx}`}
                  id={`target-card-${sch.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isMatched 
                      ? 'bg-white border-slate-200/80 shadow-2xs hover:border-indigo-200 hover:shadow-xs' 
                      : 'bg-slate-50/50 border-dashed border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Status Banner */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center">
                        <MapPin className="h-2.5 w-2.5 mr-1 text-slate-400" />
                        {item.city || selectedCity}
                      </span>
                      {isMatched && activeRecord ? (
                        <div className="flex space-x-1.5">
                          {activeRecord.kemungkinanClosing && (
                            <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${getProbabilityBadgeStyle(activeRecord.kemungkinanClosing)}`}>
                              {activeRecord.kemungkinanClosing}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${getStatusBadgeStyle(activeRecord.status)}`}>
                            {activeRecord.status}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold border border-slate-200 text-slate-400 bg-white rounded-md uppercase tracking-wider">
                          Belum Diprospek
                        </span>
                      )}
                    </div>

                    {/* School Name */}
                    <h3 className="text-base font-extrabold text-slate-800 line-clamp-1">
                      {sch.name}
                    </h3>

                    {/* Social Media Link */}
                    <div className="mt-2.5 flex items-center space-x-1.5">
                      {sch.instagram ? (
                        <a
                          href={`https://instagram.com/${sch.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-rose-600 font-semibold hover:underline"
                        >
                          <Instagram className="h-3.5 w-3.5" />
                          <span>{sch.instagram}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Akun IG belum disurvey</p>
                      )}
                    </div>

                    {/* Assigned PIC and last comment if active */}
                    {isMatched && activeRecord ? (
                      <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="h-5 w-5 rounded bg-indigo-50 text-[9px] font-bold text-indigo-600 flex items-center justify-center border border-indigo-100">
                            {activeRecord.picMarketing ? activeRecord.picMarketing.substring(0, 2).toUpperCase() : '??'}
                          </div>
                          <p className="text-[11px] text-slate-600 font-semibold">
                            PIC: <span className="font-extrabold text-slate-800">{activeRecord.picMarketing || 'Belum ditugaskan'}</span>
                          </p>
                        </div>

                        {activeRecord.updates && activeRecord.updates.length > 0 ? (
                          <p className="text-xs text-slate-500 italic line-clamp-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            "{activeRecord.updates[activeRecord.updates.length - 1]}"
                          </p>
                        ) : activeRecord.catatanAwal ? (
                          <p className="text-xs text-slate-500 italic line-clamp-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            "{activeRecord.catatanAwal}"
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-slate-100/60">
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                          Sekolah ini tersedia di database survey. Klik tombol di bawah untuk mulai memprospek sekolah ini.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Buttons */}
                  <div className="mt-5">
                    {isMatched && activeRecord ? (
                      <button
                        onClick={() => onSelectSchool(activeRecord)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>Update Progress (AE)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateProspect(sch)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-2xs hover:shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer active:scale-97"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Mulai Prospek (Aktifkan)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            paginatedSchools.map((school: any, idx: number) => {
              const mainContact = getFirstContactPhone(school);
              const hasInsta = !!school.instagramHandle;
              const lastUpdate = school.updates && school.updates.length > 0 
                ? school.updates[school.updates.length - 1] 
                : null;

              return (
                <div
                  key={`prospect-${school.no || idx}-${school.namaSekolah}-${idx}`}
                  id={`school-card-${school.no}`}
                  onClick={() => onSelectSchool(school)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header: NO & Status Badge */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        NO. {school.no}
                      </span>
                      <div className="flex space-x-1.5">
                        {school.kemungkinanClosing && (
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${getProbabilityBadgeStyle(school.kemungkinanClosing)}`}>
                            {school.kemungkinanClosing}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${getStatusBadgeStyle(school.status)}`}>
                          {school.status}
                        </span>
                      </div>
                    </div>

                    {/* School Name */}
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {school.namaSekolah}
                    </h3>

                    {school.kota && (
                      <span className="inline-flex items-center text-[9px] text-indigo-600 font-extrabold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md mt-1 mb-2.5 uppercase tracking-wider">
                        <MapPin className="h-2.5 w-2.5 mr-1" />
                        {school.kota}
                      </span>
                    )}

                    {/* Instagram & TikTok Handles & Direct Launch */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {hasInsta ? (
                        <a
                          href={`https://instagram.com/${school.instagramHandle?.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-xs text-rose-600 font-semibold hover:underline"
                        >
                          <Instagram className="h-3.5 w-3.5" />
                          <span>{school.instagramHandle}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : null}

                      {school.tiktokHandle ? (
                        <a
                          href={`https://tiktok.com/@${school.tiktokHandle?.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-xs text-slate-800 font-semibold hover:underline"
                        >
                          <span className="font-bold text-[10px] bg-slate-900 text-white px-1 rounded-sm">T</span>
                          <span>{school.tiktokHandle}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : null}

                      {!hasInsta && !school.tiktokHandle && (
                        <p className="text-[11px] text-slate-400 italic font-medium">Sosial Media Kosong</p>
                      )}
                    </div>

                    {/* AE / PIC & Marketing Lapangan assignment */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="flex items-center space-x-2 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                        <div className="h-6 w-6 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 uppercase shadow-2xs shrink-0">
                          {school.picMarketing ? school.picMarketing.substring(0, 2) : '??'}
                        </div>
                        <div className="text-[10px] min-w-0">
                          <p className="text-slate-400 text-[8px] uppercase tracking-wider font-extrabold truncate">AE / PIC</p>
                          <p className="text-slate-700 font-bold truncate">{school.picMarketing || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                        <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 uppercase shadow-2xs shrink-0">
                          {school.marketingLapangan ? school.marketingLapangan.substring(0, 2) : '??'}
                        </div>
                        <div className="text-[10px] min-w-0">
                          <p className="text-slate-400 text-[8px] uppercase tracking-wider font-extrabold truncate">Mkt Lapangan</p>
                          <p className="text-slate-700 font-bold truncate">{school.marketingLapangan || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Last Update Snippet */}
                    {lastUpdate ? (
                      <div className="mt-4 border-l-2 border-indigo-500 pl-3">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-indigo-500" /> Update Terakhir
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 italic">
                          "{lastUpdate}"
                        </p>
                      </div>
                    ) : school.catatanAwal ? (
                      <div className="mt-4 border-l-2 border-slate-300 pl-3">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Catatan Awal</p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          "{school.catatanAwal}"
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Footer: Quick Contacts & Date */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>
                      {school.tanggalFollowUpTerakhir ? `F/U: ${school.tanggalFollowUpTerakhir}` : school.tanggalKontakAwal ? `Awal: ${school.tanggalKontakAwal}` : 'Belum kontak'}
                    </span>

                    <div className="flex space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* WhatsApp Launcher */}
                      {mainContact && (
                        <a
                          href={generateWhatsAppLink(mainContact.num, school.namaSekolah, school.status)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Hubungi ${mainContact.label}`}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-100 transition-all shadow-2xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      )}

                      {/* Manual Quick Copy */}
                      {mainContact && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(mainContact.label);
                            alert(`Nomor disalin: ${mainContact.label}`);
                          }}
                          title="Salin nomor kontak"
                          className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg border border-sky-100 transition-all shadow-2xs cursor-pointer"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* --- LIST LAYOUT MODE (TABLE VIEW) --- */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs" id="schools-list-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">
                    {viewMode === 'database' ? 'No & Wilayah' : 'No & Status'}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => {
                      if (sortBy === 'name') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('name'); setSortOrder('asc'); }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Nama Sekolah Target</span>
                      {sortBy === 'name' && (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">Social Media</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => {
                      const targetField = viewMode === 'database' ? 'status' : 'pic';
                      if (sortBy === targetField) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortBy(targetField); setSortOrder('asc'); }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{viewMode === 'database' ? 'Status Marketing' : 'PIC / AE Marketing'}</span>
                      {sortBy === (viewMode === 'database' ? 'status' : 'pic') && (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => {
                      if (sortBy === 'update') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('update'); setSortOrder('desc'); }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{viewMode === 'database' ? 'PIC & Update Terakhir' : 'Update Terakhir'}</span>
                      {sortBy === 'update' && (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : <ArrowDown className="h-3 w-3 text-indigo-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {viewMode === 'database' ? (
                  paginatedSchools.map((item: any, idx: number) => {
                    const sch = item.surveyed;
                    const activeRecord: SchoolRecord | null = item.active;
                    const isMatched = item.isMatched;
                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <tr key={`db-row-${sch.name}-${item.city || ''}-${activeRecord?.no || idx}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-500 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{rowNum}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center">
                              <MapPin className="h-2.5 w-2.5 mr-1 text-slate-400" />
                              {item.city || selectedCity}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          {sch.name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {sch.instagram ? (
                            <a
                              href={`https://instagram.com/${sch.instagram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs text-rose-600 font-semibold hover:underline"
                            >
                              <Instagram className="h-3.5 w-3.5" />
                              <span>{sch.instagram}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isMatched && activeRecord ? (
                            <div className="flex items-center space-x-1.5">
                              {activeRecord.kemungkinanClosing && (
                                <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase ${getProbabilityBadgeStyle(activeRecord.kemungkinanClosing)}`}>
                                  {activeRecord.kemungkinanClosing}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase ${getStatusBadgeStyle(activeRecord.status)}`}>
                                {activeRecord.status}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-bold border border-slate-200 text-slate-400 bg-slate-50 rounded-md uppercase">
                              Belum Diprospek
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isMatched && activeRecord ? (
                            <div className="space-y-0.5 max-w-xs">
                              <p className="text-[11px] font-bold text-slate-800">
                                PIC: {activeRecord.picMarketing || 'Belum Ditugaskan'}
                              </p>
                              {activeRecord.updates && activeRecord.updates.length > 0 ? (
                                <p className="text-[10px] text-slate-500 italic truncate">
                                  "{activeRecord.updates[activeRecord.updates.length - 1]}"
                                </p>
                              ) : activeRecord.catatanAwal ? (
                                <p className="text-[10px] text-slate-500 italic truncate">
                                  "{activeRecord.catatanAwal}"
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isMatched && activeRecord ? (
                            <button
                              onClick={() => onSelectSchool(activeRecord)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Calendar className="h-3 w-3 text-slate-500" />
                              <span>Update</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateProspect(sch)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-2xs inline-flex items-center space-x-1 cursor-pointer active:scale-95"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Mulai Prospek</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  paginatedSchools.map((school: any, idx: number) => {
                    const mainContact = getFirstContactPhone(school);
                    const hasInsta = !!school.instagramHandle;
                    const lastUpdate = school.updates && school.updates.length > 0 
                      ? school.updates[school.updates.length - 1] 
                      : null;

                    return (
                      <tr 
                        key={`prospect-row-${school.no || idx}-${school.namaSekolah}-${idx}`}
                        onClick={() => onSelectSchool(school)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              NO. {school.no}
                            </span>
                            <div className="flex items-center space-x-1">
                              {school.kemungkinanClosing && (
                                <span className={`px-1.5 py-0.5 text-[8px] font-bold border rounded uppercase ${getProbabilityBadgeStyle(school.kemungkinanClosing)}`}>
                                  {school.kemungkinanClosing}
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 text-[8px] font-bold border rounded uppercase ${getStatusBadgeStyle(school.status)}`}>
                                {school.status}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-900 hover:text-indigo-600 transition-colors">
                            {school.namaSekolah}
                          </p>
                          {school.kota && (
                            <span className="inline-flex items-center text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 uppercase">
                              <MapPin className="h-2.5 w-2.5 mr-0.5" />
                              {school.kota}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            {hasInsta ? (
                              <a
                                href={`https://instagram.com/${school.instagramHandle?.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center space-x-1 text-xs text-rose-600 font-semibold hover:underline"
                              >
                                <Instagram className="h-3 w-3" />
                                <span>{school.instagramHandle}</span>
                              </a>
                            ) : null}

                            {school.tiktokHandle ? (
                              <a
                                href={`https://tiktok.com/@${school.tiktokHandle?.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center space-x-1 text-xs text-slate-800 font-semibold hover:underline"
                              >
                                <span className="font-bold text-[9px] bg-slate-900 text-white px-1 rounded-xs">T</span>
                                <span>{school.tiktokHandle}</span>
                              </a>
                            ) : null}

                            {!hasInsta && !school.tiktokHandle && (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800">
                              {school.picMarketing || 'Belum Ada PIC'}
                            </p>
                            {school.marketingLapangan && (
                              <p className="text-[10px] text-slate-500">
                                Lap: <span className="font-semibold text-slate-700">{school.marketingLapangan}</span>
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400">
                              {school.tanggalFollowUpTerakhir ? `F/U: ${school.tanggalFollowUpTerakhir}` : school.tanggalKontakAwal ? `Awal: ${school.tanggalKontakAwal}` : '-'}
                            </p>
                            {lastUpdate ? (
                              <p className="text-xs text-slate-600 italic truncate">
                                "{lastUpdate}"
                              </p>
                            ) : school.catatanAwal ? (
                              <p className="text-xs text-slate-500 italic truncate">
                                "{school.catatanAwal}"
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            {mainContact && (
                              <a
                                href={generateWhatsAppLink(mainContact.num, school.namaSekolah, school.status)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Hubungi WA (${mainContact.label})`}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-100 transition-all shadow-2xs"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {mainContact && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(mainContact.label);
                                  alert(`Nomor disalin: ${mainContact.label}`);
                                }}
                                title="Salin kontak"
                                className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg border border-sky-100 transition-all shadow-2xs cursor-pointer"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onSelectSchool(school)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 transition-all cursor-pointer"
                            >
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No results placeholder */}
      {((viewMode === 'database' ? databaseSchools.length : activeFilteredSchools.length) === 0) && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs" id="no-schools-match">
          <SlidersHorizontal className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Tidak ada sekolah target yang cocok</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Coba ubah kata kunci pencarian atau matikan beberapa filter/jenjang yang Anda pasang.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedStatusFilter('');
              setSelectedPicFilter('');
              setLevelFilter('ALL');
              setProbabilityFilter('ALL');
            }}
            id="clear-filters-large-btn"
            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Bersihkan Semua Filter
          </button>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs" id="pagination-panel">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            id="prev-page-btn"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:hover:bg-white flex items-center transition-all cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Sebelumnya
          </button>

          <span className="text-xs text-slate-500 font-bold">
            Halaman {currentPage} dari {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            id="next-page-btn"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:hover:bg-white flex items-center transition-all cursor-pointer"
          >
            Berikutnya
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
