import { useMemo } from 'react';
import { SchoolRecord, MarketingStatus } from '../types';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  BarChart3, 
  Percent, 
  Briefcase, 
  Smile, 
  Frown,
  Sparkles,
  Layers
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
  Cell, 
  Legend 
} from 'recharts';

interface DashboardProps {
  schools: SchoolRecord[];
  onSelectSchool: (school: SchoolRecord) => void;
  onFilterStatus: (status: MarketingStatus | '') => void;
  onFilterPic: (pic: string | '') => void;
}

export default function Dashboard({ schools, onSelectSchool, onFilterStatus, onFilterPic }: DashboardProps) {
  const stats = useMemo(() => {
    let total = schools.length;
    let baru = 0;
    let dihubungi = 0;
    let followUp = 0;
    let closing = 0;
    let closed = 0;
    let gagal = 0;

    const picCounts: Record<string, number> = {};
    const probabilityCounts = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      UNASSIGNED: 0,
    };

    schools.forEach((s) => {
      // Status
      if (s.status === 'BARU') baru++;
      else if (s.status === 'DIHUBUNGI') dihubungi++;
      else if (s.status === 'FOLLOW UP') followUp++;
      else if (s.status === 'CLOSING') closing++;
      else if (s.status === 'CLOSED') closed++;
      else if (s.status === 'GAGAL') gagal++;

      // PIC
      if (s.picMarketing) {
        picCounts[s.picMarketing] = (picCounts[s.picMarketing] || 0) + 1;
      } else {
        picCounts['Belum Ada PIC'] = (picCounts['Belum Ada PIC'] || 0) + 1;
      }

      // Probability
      if (s.kemungkinanClosing === 'HIGH') probabilityCounts.HIGH++;
      else if (s.kemungkinanClosing === 'MEDIUM') probabilityCounts.MEDIUM++;
      else if (s.kemungkinanClosing === 'LOW') probabilityCounts.LOW++;
      else probabilityCounts.UNASSIGNED++;
    });

    const activeMarketingCount = schools.filter(s => s.status !== 'BARU' && s.status !== 'GAGAL').length;

    return {
      total,
      baru,
      dihubungi,
      followUp,
      closing,
      closed,
      gagal,
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
      .slice(0, 8); // Top 8 PICs
  }, [stats.picCounts]);

  // Transform probability data for Recharts
  const probabilityChartData = useMemo(() => {
    return [
      { name: 'Tinggi (High)', value: stats.probabilityCounts.HIGH, color: '#10B981' },
      { name: 'Sedang (Medium)', value: stats.probabilityCounts.MEDIUM, color: '#F59E0B' },
      { name: 'Rendah (Low)', value: stats.probabilityCounts.LOW, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [stats.probabilityCounts]);

  // Funnel calculations
  const totalInteracted = stats.total - stats.baru;
  const conversionRate = stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : '0';
  const interactionRate = stats.total > 0 ? ((totalInteracted / stats.total) * 100).toFixed(1) : '0';

  const statusCards = [
    { 
      title: 'BARU', 
      count: stats.baru, 
      color: 'border-slate-300 text-slate-700 bg-slate-50', 
      tag: 'BARU',
      description: 'Belum dihubungi'
    },
    { 
      title: 'DIHUBUNGI', 
      count: stats.dihubungi, 
      color: 'border-blue-400 text-blue-700 bg-blue-50', 
      tag: 'DIHUBUNGI',
      description: 'Sudah kontak awal'
    },
    { 
      title: 'FOLLOW UP', 
      count: stats.followUp, 
      color: 'border-amber-400 text-amber-700 bg-amber-50', 
      tag: 'FOLLOW UP',
      description: 'Sedang ditindaklanjuti'
    },
    { 
      title: 'CLOSING STAGE', 
      count: stats.closing, 
      color: 'border-purple-400 text-purple-700 bg-purple-50', 
      tag: 'CLOSING',
      description: 'Negosiasi akhir'
    },
    { 
      title: 'DEAL CLOSED', 
      count: stats.closed, 
      color: 'border-emerald-400 text-emerald-700 bg-emerald-50', 
      tag: 'CLOSED',
      description: 'Sukses closing!'
    },
    { 
      title: 'GAGAL', 
      count: stats.gagal, 
      color: 'border-rose-400 text-rose-700 bg-rose-50', 
      tag: 'GAGAL',
      description: 'Ditolak/Batal'
    },
  ];

  // Pick some recent active updates
  const recentUpdates = useMemo(() => {
    return schools
      .filter(s => s.updates && s.updates.length > 0 && s.status !== 'BARU')
      .map(s => ({
        no: s.no,
        namaSekolah: s.namaSekolah,
        lastUpdate: s.updates[s.updates.length - 1],
        status: s.status,
        pic: s.picMarketing || 'Tanpa PIC',
        tanggal: s.tanggalFollowUpTerakhir || s.tanggalKontakAwal || 'Hari ini'
      }))
      .slice(0, 5);
  }, [schools]);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Overview KPI Cards */}
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

      {/* Sales Pipeline funnel visualizer */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs" id="pipeline-funnel">
        <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider flex items-center">
          <Sparkles className="h-4.5 w-4.5 text-indigo-500 mr-2" /> Pipeline Status & Progress Marketing
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusCards.map((card) => (
            <button
              key={card.title}
              id={`funnel-card-${card.title.toLowerCase().replace(' ', '-')}`}
              onClick={() => onFilterStatus(card.tag as MarketingStatus)}
              className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-indigo-300 hover:shadow-md cursor-pointer group flex flex-col justify-between min-h-[100px] sm:min-h-[110px]"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{card.title}</span>
                <span className={`w-2 h-2 rounded-full ${
                  card.tag === 'CLOSED' ? 'bg-emerald-500' :
                  card.tag === 'CLOSING' ? 'bg-purple-500' :
                  card.tag === 'FOLLOW UP' ? 'bg-amber-500' :
                  card.tag === 'DIHUBUNGI' ? 'bg-blue-500' :
                  card.tag === 'GAGAL' ? 'bg-rose-500' : 'bg-slate-400'
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
        {/* PIC Performance */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[300px] sm:h-[350px] min-w-0">
          <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider flex items-center">
            <Briefcase className="h-4.5 w-4.5 text-indigo-500 mr-2" /> Kontribusi Account Executive (AE)
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
                  <Bar dataKey="Jumlah" fill="#002bf7" radius={[4, 4, 0, 0]} onClick={(data) => {
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

        {/* Probability and Closing Quality */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-auto min-h-[350px] lg:h-[350px] min-w-0">
          <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider flex items-center">
            <Smile className="h-4.5 w-4.5 text-indigo-500 mr-2" /> Analisa Kualitas Peluang (Closing Probability)
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
                  <div className="pt-2 text-[10px] text-slate-500 italic text-center">
                    Membantu AE memprioritaskan sekolah dengan potensi tinggi.
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-center py-6">Belum ada data kemungkinan closing. Atur tingkat closing pada detail sekolah.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent updates timeline */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs" id="recent-crm-updates">
        <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wider flex items-center">
          <BarChart3 className="h-4.5 w-4.5 text-indigo-500 mr-2" /> Aktivitas Marketing Terbaru
        </h3>
        {recentUpdates.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-8">
              {recentUpdates.map((update, idx) => (
                <li key={idx} id={`recent-update-item-${idx}`}>
                  <div className="relative pb-8">
                    {idx !== recentUpdates.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3.5">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white shadow-2xs ${
                          update.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          update.status === 'FOLLOW UP' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          update.status === 'DIHUBUNGI' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          update.status === 'CLOSING' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                          'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-xs text-slate-800">
                            <span className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => {
                              const match = schools.find(s => s.no === update.no);
                              if (match) onSelectSchool(match);
                            }}>
                              {update.namaSekolah}
                            </span>
                            {' '} - <span className="font-semibold text-indigo-600">{update.pic}</span> memperbarui status menjadi <span className="px-2 py-0.5 text-[10px] rounded-md font-bold bg-slate-100 border border-slate-200 text-slate-700 uppercase tracking-wider">{update.status}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1 italic">
                            "{update.lastUpdate}"
                          </p>
                        </div>
                        <div className="text-right text-[10px] font-semibold text-slate-400">
                          {update.tanggal}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            Belum ada log aktivitas. Ubah status atau buat catatan follow-up di daftar sekolah.
          </div>
        )}
      </div>
    </div>
  );
}
