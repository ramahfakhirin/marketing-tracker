import { useState, useMemo, FormEvent } from 'react';
import { SchoolRecord, MarketingStatus, TeamMember, ActivityLog, UserRole, ActivityActionType } from '../types';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  BarChart3, 
  Percent, 
  Briefcase, 
  Smile, 
  Activity,
  Layers,
  Calendar,
  Clock,
  Filter,
  Plus,
  Zap,
  PhoneCall,
  MapPin,
  Award,
  ChevronRight,
  UserCheck,
  MessageSquare,
  Sparkles,
  Search,
  X,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardProps {
  schools: SchoolRecord[];
  teamMembers?: TeamMember[];
  activities?: ActivityLog[];
  onAddActivity?: (activity: Omit<ActivityLog, 'id'>) => void;
  onDeleteActivity?: (id: string) => void;
  onSelectSchool: (school: SchoolRecord) => void;
  onFilterStatus: (status: MarketingStatus | '') => void;
  onFilterPic: (pic: string | '') => void;
  currentUser?: TeamMember | null;
}

type TimeframeOption = 'HARIAN' | 'MINGGUAN' | 'BULANAN' | 'SEMUA';

export default function Dashboard({ 
  schools, 
  teamMembers = [], 
  activities = [],
  onAddActivity,
  onDeleteActivity,
  onSelectSchool, 
  onFilterStatus, 
  onFilterPic,
  currentUser
}: DashboardProps) {
  // Time period filter state for KPI & Activity Logs
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('MINGGUAN');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('SEMUA');
  const [searchLogQuery, setSearchLogQuery] = useState<string>('');

  // Delete Log Modal State
  const [logToDelete, setLogToDelete] = useState<ActivityLog | null>(null);

  // Manual Activity Modal State
  const [isAddActivityOpen, setIsAddActivityOpen] = useState<boolean>(false);
  const [newLogSchool, setNewLogSchool] = useState<string>('');
  const [newLogAction, setNewLogAction] = useState<ActivityActionType>('UPDATE_CATATAN');
  const [newLogDesc, setNewLogDesc] = useState<string>('');

  // Core Pipeline Stats
  const stats = useMemo(() => {
    let total = schools.length;
    let baru = 0;
    let dihubungi = 0;
    let followUp = 0;
    let prospek = 0;
    let meetingVisit = 0;
    let deal = 0;
    let lost = 0;

    const picCounts: Record<string, number> = {};
    const probabilityCounts = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      UNASSIGNED: 0,
    };

    schools.forEach((s) => {
      if (s.status === 'BARU') baru++;
      else if (s.status === 'DIHUBUNGI') dihubungi++;
      else if (s.status === 'FOLLOW UP') followUp++;
      else if (s.status === 'PROSPEK' || (s.status as string) === 'CLOSING') prospek++;
      else if (s.status === 'MEETING / VISIT') meetingVisit++;
      else if (s.status === 'DEAL' || (s.status as string) === 'CLOSED') deal++;
      else if (s.status === 'LOST' || (s.status as string) === 'GAGAL') lost++;

      if (s.picMarketing) {
        picCounts[s.picMarketing] = (picCounts[s.picMarketing] || 0) + 1;
      } else {
        picCounts['Belum Ada PIC'] = (picCounts['Belum Ada PIC'] || 0) + 1;
      }

      if (s.kemungkinanClosing === 'HIGH') probabilityCounts.HIGH++;
      else if (s.kemungkinanClosing === 'MEDIUM') probabilityCounts.MEDIUM++;
      else if (s.kemungkinanClosing === 'LOW') probabilityCounts.LOW++;
      else probabilityCounts.UNASSIGNED++;
    });

    const activeMarketingCount = schools.filter(s => s.status !== 'BARU' && s.status !== 'LOST' && (s.status as string) !== 'GAGAL').length;

    return {
      total,
      baru,
      dihubungi,
      followUp,
      prospek,
      meetingVisit,
      deal,
      lost,
      activeMarketingCount,
      picCounts,
      probabilityCounts,
    };
  }, [schools]);

  // Transform PIC data for Recharts
  const picChartData = useMemo(() => {
    return Object.entries(stats.picCounts)
      .map(([name, count]) => ({ name, Jumlah: Number(count) }))
      .sort((a, b) => b.Jumlah - a.Jumlah)
      .slice(0, 8);
  }, [stats.picCounts]);

  // Transform probability data for Recharts
  const probabilityChartData = useMemo(() => {
    return [
      { name: 'Tinggi (High)', value: stats.probabilityCounts.HIGH, color: '#10B981' },
      { name: 'Sedang (Medium)', value: stats.probabilityCounts.MEDIUM, color: '#F59E0B' },
      { name: 'Rendah (Low)', value: stats.probabilityCounts.LOW, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [stats.probabilityCounts]);

  const conversionRate = stats.total > 0 ? ((stats.deal / stats.total) * 100).toFixed(1) : '0';
  const interactionRate = stats.total > 0 ? (((stats.total - stats.baru) / stats.total) * 100).toFixed(1) : '0';

  const statusCards = [
    { title: 'BARU', count: stats.baru, tag: 'BARU', description: 'Belum dihubungi' },
    { title: 'DIHUBUNGI', count: stats.dihubungi, tag: 'DIHUBUNGI', description: 'Sudah kontak awal' },
    { title: 'FOLLOW UP', count: stats.followUp, tag: 'FOLLOW UP', description: 'Sedang ditindaklanjuti' },
    { title: 'PROSPEK', count: stats.prospek, tag: 'PROSPEK', description: 'Potensi prospek' },
    { title: 'MEETING / VISIT', count: stats.meetingVisit, tag: 'MEETING / VISIT', description: 'Pertemuan/Kunjungan' },
    { title: 'DEAL', count: stats.deal, tag: 'DEAL', description: 'Sukses closing!' },
    { title: 'LOST', count: stats.lost, tag: 'LOST', description: 'Ditolak/Batal' },
  ];

  // Date filter helper function
  const isDateInTimeframe = (dateString: string, timeframe: TimeframeOption) => {
    if (timeframe === 'SEMUA') return true;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return true;

    const now = new Date();
    if (timeframe === 'HARIAN') {
      return date.toDateString() === now.toDateString();
    }
    if (timeframe === 'MINGGUAN') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= sevenDaysAgo;
    }
    if (timeframe === 'BULANAN') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= thirtyDaysAgo;
    }
    return true;
  };

  // Filtered activity logs for timeline feed
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchesTimeframe = isDateInTimeframe(act.timestamp, selectedTimeframe);
      const matchesUser = selectedUserFilter === 'SEMUA' || act.userName.toLowerCase() === selectedUserFilter.toLowerCase();
      const matchesQuery = !searchLogQuery || 
        act.schoolName.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
        act.userName.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
        act.description.toLowerCase().includes(searchLogQuery.toLowerCase());

      return matchesTimeframe && matchesUser && matchesQuery;
    });
  }, [activities, selectedTimeframe, selectedUserFilter, searchLogQuery]);

  // Aggregate User KPI Performance Metrics by Timeframe (AE & Marketing Lapangan only)
  const userKpiSummaries = useMemo(() => {
    const summaryMap: Record<string, {
      name: string;
      role: UserRole;
      totalLogs: number;
      scoutedSchools: number;
      followUps: number;
      meetings: number;
      closings: number;
      lastActiveISO: string | null;
    }> = {};

    // First populate from registered team members whose role is AE or MARKETING_LAPANGAN
    teamMembers.forEach(m => {
      if (m.role === 'AE' || m.role === 'MARKETING_LAPANGAN') {
        summaryMap[m.name] = {
          name: m.name,
          role: m.role,
          totalLogs: 0,
          scoutedSchools: 0,
          followUps: 0,
          meetings: 0,
          closings: 0,
          lastActiveISO: null
        };
      }
    });

    // Process logs in selected timeframe
    activities.forEach(act => {
      if (!isDateInTimeframe(act.timestamp, selectedTimeframe)) return;

      const matchedMember = teamMembers.find(tm => tm.name.toLowerCase() === act.userName.toLowerCase());
      const role = matchedMember ? matchedMember.role : (act.userRole || 'AE');

      // Only include if user is AE or MARKETING_LAPANGAN (exclude SUPERADMIN / MANAGER)
      if (role !== 'AE' && role !== 'MARKETING_LAPANGAN') return;

      if (!summaryMap[act.userName]) {
        summaryMap[act.userName] = {
          name: act.userName,
          role: role,
          totalLogs: 0,
          scoutedSchools: 0,
          followUps: 0,
          meetings: 0,
          closings: 0,
          lastActiveISO: null
        };
      }

      const userStat = summaryMap[act.userName];
      userStat.totalLogs++;

      if (act.actionType === 'TAMBAH_SEKOLAH') userStat.scoutedSchools++;
      else if (act.actionType === 'FOLLOW_UP') userStat.followUps++;
      else if (act.actionType === 'MEETING_VISIT') userStat.meetings++;
      else if (act.actionType === 'CLOSING_DEAL') userStat.closings++;

      if (!userStat.lastActiveISO || new Date(act.timestamp) > new Date(userStat.lastActiveISO)) {
        userStat.lastActiveISO = act.timestamp;
      }
    });

    return Object.values(summaryMap)
      .filter(u => u.role === 'AE' || u.role === 'MARKETING_LAPANGAN')
      .sort((a, b) => b.totalLogs - a.totalLogs);
  }, [teamMembers, activities, selectedTimeframe]);

  const handleCreateManualLog = (e: FormEvent) => {
    e.preventDefault();
    if (!newLogSchool.trim() || !newLogDesc.trim()) return;

    if (onAddActivity) {
      onAddActivity({
        userName: currentUser?.name || 'Super Admin',
        userRole: currentUser?.role || 'SUPERADMIN',
        actionType: newLogAction,
        schoolName: newLogSchool.trim(),
        timestamp: new Date().toISOString(),
        description: newLogDesc.trim(),
      });
    }

    setNewLogSchool('');
    setNewLogDesc('');
    setIsAddActivityOpen(false);
  };

  const getActionBadge = (action: ActivityActionType) => {
    switch (action) {
      case 'CLOSING_DEAL':
        return { label: 'CLOSING DEAL 🎉', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: Award };
      case 'MEETING_VISIT':
        return { label: 'VISIT / MEETING 🤝', bg: 'bg-purple-100 text-purple-800 border-purple-300', icon: Users };
      case 'TAMBAH_SEKOLAH':
        return { label: 'SCOUTING BARU 📍', bg: 'bg-sky-100 text-sky-800 border-sky-300', icon: MapPin };
      case 'FOLLOW_UP':
        return { label: 'FOLLOW UP 📞', bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: PhoneCall };
      case 'UPDATE_CATATAN':
        return { label: 'UPDATE CATATAN 📝', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: MessageSquare };
      case 'UBAH_STATUS':
        return { label: 'UBAH STATUS 🔄', bg: 'bg-slate-100 text-slate-800 border-slate-300', icon: Activity };
      default:
        return { label: 'LOG AKTIVITAS ⚡', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Zap };
    }
  };

  const getTimeAgoText = (isoString: string) => {
    if (!isoString) return 'Baru saja';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Baru saja';

    const diffSec = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Sales Pipeline Funnel visualizer */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs" id="pipeline-funnel">
        <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider flex items-center">
          <Activity className="h-4.5 w-4.5 text-indigo-500 mr-2" /> Sales Pipeline Status Sekolah
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {statusCards.map((card) => (
            <button
              key={card.title}
              id={`funnel-card-${card.title.toLowerCase().replace(/[\s\/]+/g, '-')}`}
              onClick={() => onFilterStatus(card.tag as MarketingStatus)}
              className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-indigo-300 hover:shadow-md cursor-pointer group flex flex-col justify-between min-h-[100px] sm:min-h-[110px]"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{card.title}</span>
                <span className={`w-2 h-2 rounded-full ${
                  card.tag === 'DEAL' || card.tag === 'CLOSED' ? 'bg-emerald-500' :
                  card.tag === 'MEETING / VISIT' ? 'bg-purple-500' :
                  card.tag === 'PROSPEK' || card.tag === 'CLOSING' ? 'bg-indigo-500' :
                  card.tag === 'FOLLOW UP' ? 'bg-amber-500' :
                  card.tag === 'DIHUBUNGI' ? 'bg-blue-500' :
                  card.tag === 'LOST' || card.tag === 'GAGAL' ? 'bg-rose-500' : 'bg-slate-400'
                }`} />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{card.count}</div>
                <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-charts">
        {/* PIC Performance Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[300px] sm:h-[350px] min-w-0">
          <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider flex items-center">
            <Briefcase className="h-4.5 w-4.5 text-indigo-500 mr-2" /> Distribusi Sekolah Per Account Executive (AE)
          </h3>
          <div className="flex-1 w-full text-xs">
            {picChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={picChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#64748B' }} />
                  <YAxis tick={{ fill: '#64748B' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#FFF' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Jumlah" fill="#4F46E5" radius={[4, 4, 0, 0]} onClick={(data) => {
                    if (data && data.name) {
                      onFilterPic(data.name === 'Belum Ada PIC' ? 'Belum Ada PIC' : data.name);
                    }
                  }}>
                    {picChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} cursor="pointer" className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Belum ada data AE</div>
            )}
          </div>
        </div>

        {/* Probability Donut Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-auto min-h-[350px] lg:h-[350px] min-w-0">
          <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider flex items-center">
            <Smile className="h-4.5 w-4.5 text-indigo-500 mr-2" /> Kualitas Potensi Closing (Closing Probability)
          </h3>
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center text-xs gap-4">
            {probabilityChartData.length > 0 ? (
              <>
                <div className="w-full md:w-1/2 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={probabilityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {probabilityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2 px-1 sm:px-4">
                  {probabilityChartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="font-semibold text-slate-700 text-xs">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 text-xs">{item.value} Sekolah</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-center py-6">Belum ada data kemungkinan closing.</div>
            )}
          </div>
        </div>
      </div>

      {/* Overview KPI Totals Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="kpi-grid">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[130px] sm:min-h-[140px] hover:border-slate-300 transition-all duration-200" id="kpi-total">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Target</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Layers className="h-4.5 w-4.5" /></div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{stats.total}</h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Database sekolah sasaran</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[130px] sm:min-h-[140px] hover:border-slate-300 transition-all duration-200" id="kpi-active">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Sedang Diproses</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><TrendingUp className="h-4.5 w-4.5" /></div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{stats.activeMarketingCount}</h2>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Hubungan & negosiasi aktif</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[130px] sm:min-h-[140px] hover:border-slate-300 transition-all duration-200" id="kpi-conversion">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Rasio Closing</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Percent className="h-4.5 w-4.5" /></div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{conversionRate}%</h2>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(conversionRate))}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[130px] sm:min-h-[140px] hover:border-slate-300 transition-all duration-200" id="kpi-assigned">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tingkat Penjajakan</span>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600"><Users className="h-4.5 w-4.5" /></div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{interactionRate}%</h2>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(interactionRate))}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header & Timeframe Switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4" id="dashboard-timeframe-header">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Dashboard & Rekap KPI User
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Live Logs
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau log aktivitas harian, mingguan, dan bulanan masing-masing tim marketing & AE.
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe selector tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto" id="timeframe-selector-tabs">
          {[
            { id: 'HARIAN', label: 'Harian' },
            { id: 'MINGGUAN', label: 'Mingguan (7H)' },
            { id: 'BULANAN', label: 'Bulanan (30H)' },
            { id: 'SEMUA', label: 'Semua Data' },
          ].map(tf => (
            <button
              key={tf.id}
              id={`tf-tab-${tf.id.toLowerCase()}`}
              onClick={() => setSelectedTimeframe(tf.id as TimeframeOption)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTimeframe === tf.id
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Per User Section */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs" id="kpi-per-user-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="h-4.5 w-4.5 text-indigo-600" />
              Rekapitulasi Kinerja & KPI Tim ({selectedTimeframe === 'HARIAN' ? 'Hari Ini' : selectedTimeframe === 'MINGGUAN' ? '7 Hari Terakhir' : selectedTimeframe === 'BULANAN' ? '30 Hari Terakhir' : 'Semua Periode'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Statistik pencapaian update, penambahan sekolah, meeting, dan closing per individu.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
            Total Anggota: <span className="font-bold text-indigo-600">{userKpiSummaries.length} Orang</span>
          </div>
        </div>

        {/* User Cards Grid */}
        {userKpiSummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="user-kpi-cards-grid">
            {userKpiSummaries.map((u, idx) => {
              // Determine KPI Performance Badge
              let kpiBadge = { label: 'Perlu Tingkatkan ⚠️', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
              if (u.totalLogs >= 4 || u.closings > 0) {
                kpiBadge = { label: 'Sangat Aktif ⚡', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
              } else if (u.totalLogs >= 1) {
                kpiBadge = { label: 'Aktif 👍', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
              }

              return (
                <div 
                  key={u.name} 
                  id={`user-kpi-card-${idx}`}
                  className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 hover:border-indigo-300 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-extrabold flex items-center justify-center text-sm shadow-2xs">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{u.name}</h4>
                          <span className="text-[10px] px-2 py-0.2 bg-slate-200 text-slate-700 rounded-md font-bold uppercase tracking-wider">
                            {u.role}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kpiBadge.bg}`}>
                        {kpiBadge.label}
                      </span>
                    </div>

                    {/* Summary Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 my-3">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Total Update</div>
                        <div className="text-lg font-black text-slate-800">{u.totalLogs} <span className="text-xs font-medium text-slate-400">log</span></div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <div className="text-[10px] text-sky-600 font-bold uppercase">Scouting Baru</div>
                        <div className="text-lg font-black text-sky-700">{u.scoutedSchools} <span className="text-xs font-medium text-slate-400">sekolah</span></div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <div className="text-[10px] text-purple-600 font-bold uppercase">Visit / Meeting</div>
                        <div className="text-lg font-black text-purple-700">{u.meetings} <span className="text-xs font-medium text-slate-400">kali</span></div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <div className="text-[10px] text-emerald-600 font-bold uppercase">Closing Deal</div>
                        <div className="text-lg font-black text-emerald-700">{u.closings} <span className="text-xs font-medium text-slate-400">deal</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Terakhir Aktif:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {u.lastActiveISO ? getTimeAgoText(u.lastActiveISO) : 'Belum ada log'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50 text-indigo-500" />
            <p className="text-xs font-bold text-slate-600">Belum Ada User AE atau Marketing Lapangan</p>
            <p className="text-[11px] text-slate-400 mt-1">Gunakan menu Tim Marketing untuk mendaftarkan akun AE atau Marketing Lapangan.</p>
          </div>
        )}
      </div>

      {/* Main Activity Timeline Feed & Log Cards */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs" id="activity-log-feed">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Riwayat Activity Logs & Updates Lapangan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan kronologis tindakan, kunjungan, dan update status dari seluruh tim marketing.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
            {/* Filter by user */}
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="SEMUA">👥 Semua Anggota Tim</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.name}>👤 {m.name} ({m.role})</option>
              ))}
            </select>

            {/* Quick search */}
            <div className="relative w-full sm:w-auto flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari sekolah/update..."
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => setIsAddActivityOpen(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Log Manual</span>
            </button>
          </div>
        </div>

        {/* Activity Feed Cards List */}
        {filteredActivities.length > 0 ? (
          <div className="space-y-3" id="activity-cards-list">
            {filteredActivities.map((act) => {
              const badge = getActionBadge(act.actionType);
              const BadgeIcon = badge.icon;
              const canDelete = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'MANAGER';

              return (
                <div 
                  key={act.id} 
                  id={`activity-log-item-${act.id}`}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 hover:bg-white hover:shadow-xs transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                      {act.userName.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {act.userName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-bold uppercase">
                          {act.userRole}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg}`}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline cursor-pointer flex-wrap" onClick={() => {
                        const match = schools.find(s => s.namaSekolah.toLowerCase() === act.schoolName.toLowerCase());
                        if (match) onSelectSchool(match);
                      }}>
                        <BuildingIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{act.schoolName}</span>
                        {(act.city || act.province) && (
                          <span className="text-slate-400 font-normal">
                            ({[act.city, act.province].filter(Boolean).join(', ')})
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 mt-1.5 bg-white p-2.5 rounded-xl border border-slate-200/70 italic break-words">
                        "{act.description}"
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 text-[11px] text-slate-400 font-semibold gap-2">
                    <div className="flex sm:flex-col items-center sm:items-end gap-0.5 sm:gap-1">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {getTimeAgoText(act.timestamp)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(act.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>

                    {canDelete && onDeleteActivity && (
                      <button
                        onClick={() => setLogToDelete(act)}
                        id={`btn-delete-log-${act.id}`}
                        title="Hapus Activity Log Ini"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        <span className="sm:hidden text-[10px] text-rose-600 font-bold">Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-600">Belum ada data log aktivitas untuk filter ini</p>
            <p className="text-[11px] text-slate-400 mt-1">Coba ubah filter rentang waktu atau lakukan update pada daftar sekolah.</p>
          </div>
        )}
      </div>

      {/* Manual Add Activity Log Modal */}
      {isAddActivityOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">Tambah Log Aktivitas Manual</h3>
              </div>
              <button 
                onClick={() => setIsAddActivityOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Sekolah Target <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: SMA Negeri 1 Surabaya"
                  value={newLogSchool}
                  onChange={(e) => setNewLogSchool(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Aktivitas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newLogAction}
                  onChange={(e) => setNewLogAction(e.target.value as ActivityActionType)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
                >
                  <option value="UPDATE_CATATAN">📝 Update Catatan / Follow Up</option>
                  <option value="MEETING_VISIT">🤝 Visit / Meeting Tatap Muka</option>
                  <option value="CLOSING_DEAL">🎉 Closing Deal / Penandatanganan SPK</option>
                  <option value="TAMBAH_SEKOLAH">📍 Scouting Sekolah Baru</option>
                  <option value="FOLLOW_UP">📞 Kontak Awal / Telepon</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detail / Catatan Aktivitas <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan secara singkat hasil aktivitas atau kesepakatan..."
                  value={newLogDesc}
                  onChange={(e) => setNewLogDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                >
                  Simpan Activity Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Log Confirmation Modal */}
      {logToDelete && (
        <ConfirmDeleteModal
          isOpen={!!logToDelete}
          title="Konfirmasi Hapus Log Aktivitas"
          itemName={logToDelete.schoolName}
          itemDetails={`Aktivitas oleh: ${logToDelete.userName} (${logToDelete.userRole}) | Waktu: ${new Date(logToDelete.timestamp).toLocaleString('id-ID')}`}
          warningMessage="Apakah Anda yakin ingin menghapus log aktivitas ini dari catatan kronologis? Tindakan ini tidak dapat dibatalkan."
          confirmText="Ya, Hapus Log Ini"
          cancelText="Batal"
          onClose={() => setLogToDelete(null)}
          onConfirm={() => {
            if (onDeleteActivity) {
              onDeleteActivity(logToDelete.id);
            }
            setLogToDelete(null);
          }}
        />
      )}
    </div>
  );
}

function BuildingIcon(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}
