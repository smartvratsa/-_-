import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap
} from '@vis.gl/react-google-maps';
import { ReportItem } from '../types';
import { VRATSA_DISTRICTS } from '../data/mockReports';
import { VratsaLeafletMap } from './VratsaLeafletMap';
import {
  MapPin,
  Flame,
  AlertTriangle,
  Users,
  CheckCircle2,
  Crosshair,
  Filter,
  Layers,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Check,
  ChevronDown,
  X,
  Clock,
  CheckCircle
} from 'lucide-react';

interface VratsaInteractiveMapProps {
  reports: ReportItem[];
  selectedReportId?: string | null;
  onSelectReport: (reportId: string) => void;
  onMapClickNewSignal?: (coords: { lat: number; lng: number; districtName: string }) => void;
  onVolunteerAction?: (reportId: string) => void;
  onResolveAction?: (reportId: string) => void;
  userRole?: 'citizen' | 'official';
  currentVolunteerName?: string;
}

// Sub-component to manage map camera movements via useMap hook
const MapCameraController: React.FC<{
  targetDistrict: typeof VRATSA_DISTRICTS[0] | null;
  selectedReportCoords: { lat: number; lng: number } | null;
}> = ({ targetDistrict, selectedReportCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedReportCoords) {
      map.panTo(selectedReportCoords);
      map.setZoom(16);
    } else if (targetDistrict) {
      map.panTo({ lat: targetDistrict.lat, lng: targetDistrict.lng });
      map.setZoom(targetDistrict.zoom);
    }
  }, [map, targetDistrict, selectedReportCoords]);

  return null;
};

export const VratsaInteractiveMap: React.FC<VratsaInteractiveMapProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  onMapClickNewSignal,
  onVolunteerAction,
  onResolveAction,
  currentVolunteerName
}) => {
  const [activeDistrictId, setActiveDistrictId] = useState('all');
  const [targetDistrict, setTargetDistrict] = useState<typeof VRATSA_DISTRICTS[0] | null>(null);
  const [filterPath, setFilterPath] = useState<'all' | 'red' | 'yellow' | 'blue' | 'solved'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Dropdown menus state
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const [isPinModeActive, setIsPinModeActive] = useState(false);
  const [activePopupReport, setActivePopupReport] = useState<ReportItem | null>(null);
  const [droppedPinCoords, setDroppedPinCoords] = useState<{ lat: number; lng: number } | null>(null);

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Google Maps Platform API key from secrets / env
  const rawApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const apiKey = rawApiKey.trim();

  // If no Google Maps API key is configured or if loading fails, use the OpenStreetMap Leaflet engine
  const [mapLoadFailed, setMapLoadFailed] = useState<boolean>(!apiKey);
  const [mapEngine, setMapEngine] = useState<'google' | 'osm'>(() => (apiKey ? 'google' : 'osm'));

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setIsFilterMenuOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected report coordinates for auto-centering
  const selectedReport = reports.find((r) => r.id === selectedReportId);
  const selectedReportCoords = selectedReport?.coordinates
    ? { lat: selectedReport.coordinates.lat, lng: selectedReport.coordinates.lng }
    : null;

  // Filter categories list
  const CATEGORY_OPTIONS = [
    { id: 'all', label: 'Всички категории', icon: '🌐' },
    { id: 'осветление', label: 'Осветление и кабели', icon: '💡' },
    { id: 'дупки', label: 'Дупки и пътна настилка', icon: '🕳️' },
    { id: 'чистота', label: 'Чистота и отпадъци', icon: '🧹' },
    { id: 'градско обзавеждане', label: 'Градско обзавеждане (пейки)', icon: '🪑' },
    { id: 'зелени площи', label: 'Зелени площи и паркове', icon: '🌿' },
    { id: 'детски площадки', label: 'Детски площадки', icon: '🎠' },
    { id: 'графити', label: 'Графити и фасади', icon: '🎨' },
    { id: 'вик', label: 'ВиК и шахти', icon: '💧' }
  ];

  // Filter statuses list
  const STATUS_OPTIONS = [
    { id: 'all', label: 'Всички статуси', color: 'bg-slate-400' },
    { id: 'нови', label: 'Нови сигнали', color: 'bg-slate-300' },
    { id: 'одобрен', label: 'Одобрени за акция', color: 'bg-emerald-400' },
    { id: 'решен', label: 'Решени проблеми', color: 'bg-emerald-500' },
    { id: 'в_изпълнение', label: 'В изпълнение', color: 'bg-amber-400' },
    { id: 'прегледан', label: 'Прегледани', color: 'bg-blue-400' }
  ];

  // Helper function to check if a report matches a category
  const matchesCategory = (r: ReportItem, catId: string): boolean => {
    if (catId === 'all') return true;
    const cat = (r.analysis?.category || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();

    if (catId === 'осветление') {
      return (
        cat.includes('осветление') ||
        title.includes('осветление') ||
        desc.includes('осветление') ||
        desc.includes('кабел') ||
        desc.includes('стълб') ||
        desc.includes('лампа') ||
        title.includes('лампа') ||
        title.includes('кабел')
      );
    } else if (catId === 'дупки') {
      return (
        cat.includes('път') ||
        cat.includes('тротоар') ||
        title.includes('дупка') ||
        desc.includes('дупка') ||
        desc.includes('асфалт') ||
        desc.includes('павет') ||
        desc.includes('настилка') ||
        desc.includes('тротоар') ||
        title.includes('павета') ||
        title.includes('асфалт')
      );
    } else if (catId === 'чистота') {
      return (
        cat.includes('чистота') ||
        title.includes('боклук') ||
        desc.includes('боклук') ||
        desc.includes('отпад') ||
        desc.includes('смет') ||
        desc.includes('контейнер') ||
        title.includes('смет') ||
        title.includes('контейнер') ||
        title.includes('бутилки')
      );
    } else {
      return (
        cat.includes(catId.toLowerCase()) ||
        title.toLowerCase().includes(catId.toLowerCase()) ||
        desc.toLowerCase().includes(catId.toLowerCase())
      );
    }
  };

  // Helper function to check if a report matches a status
  const matchesStatus = (r: ReportItem, stId: string): boolean => {
    if (stId === 'all') return true;
    if (stId === 'нови') return r.status === 'нови';
    if (stId === 'одобрен' || stId === 'одобрени') return r.status === 'одобрен';
    if (stId === 'решен' || stId === 'решени') return r.status === 'решен';
    if (stId === 'в_изпълнение') return r.status === 'в_изпълнение';
    if (stId === 'прегледан') return r.status === 'прегледан';
    return r.status === stId;
  };

  // Calculate live matching counts for dropdown options
  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return reports.length;
    return reports.filter((r) => matchesCategory(r, catId)).length;
  };

  const getStatusCount = (stId: string) => {
    if (stId === 'all') return reports.length;
    return reports.filter((r) => matchesStatus(r, stId)).length;
  };

  // Active filters count
  const activeFiltersCount =
    (filterCategory !== 'all' ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0) +
    (filterPath !== 'all' ? 1 : 0) +
    (activeDistrictId !== 'all' ? 1 : 0);

  // Filter reports
  const filteredReports = reports.filter((r) => {
    // 1. District filter
    if (activeDistrictId !== 'all') {
      const matchesDistrict =
        r.neighborhood?.toLowerCase().includes(activeDistrictId.toLowerCase()) ||
        r.location?.toLowerCase().includes(activeDistrictId.toLowerCase());
      if (!matchesDistrict) return false;
    }

    // 2. Path quick filter
    if (filterPath === 'solved' && r.status !== 'решен') return false;
    if (filterPath === 'red' && ((r.analysis?.path || 'blue') !== 'red' || r.status === 'решен')) return false;
    if (filterPath === 'yellow' && ((r.analysis?.path || 'blue') !== 'yellow' || r.status === 'решен')) return false;
    if (filterPath === 'blue' && ((r.analysis?.path || 'blue') !== 'blue' || r.status === 'решен')) return false;

    // 3. Category dropdown filter
    if (!matchesCategory(r, filterCategory)) return false;

    // 4. Status dropdown filter
    if (!matchesStatus(r, filterStatus)) return false;

    return true;
  });

  const handleSelectDistrict = (district: typeof VRATSA_DISTRICTS[0]) => {
    setActiveDistrictId(district.id);
    setTargetDistrict(district);
  };

  const handleResetAllFilters = () => {
    setActiveDistrictId('all');
    setTargetDistrict(VRATSA_DISTRICTS[0]);
    setFilterPath('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setIsFilterMenuOpen(false);
    setIsCategoryDropdownOpen(false);
    setIsStatusDropdownOpen(false);
  };

  const handleMapClick = (e: any) => {
    if (!e.detail?.latLng) return;
    const lat = e.detail.latLng.lat;
    const lng = e.detail.latLng.lng;

    setDroppedPinCoords({ lat, lng });

    // Determine nearest district
    let nearestDistrict = 'Център';
    let minDistance = Infinity;
    VRATSA_DISTRICTS.forEach((d) => {
      if (d.id === 'all') return;
      const dist = Math.hypot(d.lat - lat, d.lng - lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestDistrict = d.name;
      }
    });

    if (onMapClickNewSignal) {
      onMapClickNewSignal({ lat, lng, districtName: nearestDistrict });
    }
  };

  const currentCategoryObj = CATEGORY_OPTIONS.find((c) => c.id === filterCategory) || CATEGORY_OPTIONS[0];
  const currentStatusObj = STATUS_OPTIONS.find((s) => s.id === filterStatus) || STATUS_OPTIONS[0];

  return (
    <div className="space-y-4">
      {/* Top Map Controls Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-slate-900/95 border border-slate-800 p-3 rounded-2xl shadow-lg">
        {/* District Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs scrollbar-thin">
          <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium mr-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Район:
          </span>
          {VRATSA_DISTRICTS.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSelectDistrict(d)}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium text-xs ${
                activeDistrictId === d.id
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Dropdown Filters Toolbar */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* 1. Dedicated Category Dropdown Menu */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                setIsStatusDropdownOpen(false);
                setIsFilterMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                filterCategory !== 'all' || isCategoryDropdownOpen
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white'
              }`}
              title="Филтрирай по категория на проблема"
            >
              <Tag className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="text-slate-300 font-normal">Категория:</span>
              <span className="font-bold flex items-center gap-1">
                <span>{currentCategoryObj.icon}</span>
                <span className="max-w-[130px] truncate">{currentCategoryObj.label.split(' ')[0]}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Category Dropdown List Menu */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 xl:left-auto xl:right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-scaleIn">
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5 text-white">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Падащо меню: Категория
                  </span>
                  {filterCategory !== 'all' && (
                    <button
                      onClick={() => {
                        setFilterCategory('all');
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300"
                    >
                      Нулирай
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-0.5 py-1">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const count = getCategoryCount(cat.id);
                    const isSelected = filterCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setFilterCategory(cat.id);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left ${
                          isSelected
                            ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                            isSelected ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Dedicated Status Dropdown Menu */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsStatusDropdownOpen(!isStatusDropdownOpen);
                setIsCategoryDropdownOpen(false);
                setIsFilterMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                filterStatus !== 'all' || isStatusDropdownOpen
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-950/40'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white'
              }`}
              title="Филтрирай по статус на проблема"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span className="text-slate-300 font-normal">Статус:</span>
              <span className="font-bold flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${currentStatusObj.color}`} />
                <span className="max-w-[120px] truncate">{currentStatusObj.label}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Status Dropdown List Menu */}
            {isStatusDropdownOpen && (
              <div className="absolute left-0 xl:left-auto xl:right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-scaleIn">
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    Падащо меню: Статус
                  </span>
                  {filterStatus !== 'all' && (
                    <button
                      onClick={() => {
                        setFilterStatus('all');
                        setIsStatusDropdownOpen(false);
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300"
                    >
                      Нулирай
                    </button>
                  )}
                </div>

                <div className="space-y-0.5 py-1">
                  {STATUS_OPTIONS.map((st) => {
                    const count = getStatusCount(st.id);
                    const isSelected = filterStatus === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => {
                          setFilterStatus(st.id);
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left ${
                          isSelected
                            ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${st.color} shrink-0`} />
                          <span>{st.label}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                            isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. All-In-One Advanced Filter Dropdown Menu Trigger */}
          <div className="relative" ref={filterMenuRef}>
            <button
              onClick={() => {
                setIsFilterMenuOpen(!isFilterMenuOpen);
                setIsCategoryDropdownOpen(false);
                setIsStatusDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                activeFiltersCount > 0 || isFilterMenuOpen
                  ? 'bg-slate-800 text-white border-amber-500/60 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
              }`}
              title="Всички филтри на картата"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Всички филтри</span>
              {activeFiltersCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popup Modal */}
            {isFilterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                    Падащо меню с всички филтри
                  </span>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleResetAllFilters}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors font-medium"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Нулирай всички
                    </button>
                  )}
                </div>

                {/* 1. Category Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      Филтрирай по Категория:
                    </span>
                    {filterCategory !== 'all' && (
                      <span className="text-[10px] text-emerald-400 font-bold">Активен: {currentCategoryObj.label}</span>
                    )}
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                        {cat.icon} {cat.label} ({getCategoryCount(cat.id)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Status Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      Филтрирай по Статус:
                    </span>
                    {filterStatus !== 'all' && (
                      <span className="text-[10px] text-blue-400 font-bold">Активен: {currentStatusObj.label}</span>
                    )}
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st.id} value={st.id} className="bg-slate-900 text-white">
                        {st.label} ({getStatusCount(st.id)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Path / Urgency Quick Toggles */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <label className="text-[11px] font-semibold text-slate-400 block">
                    Път към решение / Наложителност:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterPath(filterPath === 'red' ? 'all' : 'red')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                        filterPath === 'red'
                          ? 'bg-red-500/30 text-red-200 border-red-500'
                          : 'bg-slate-950 border-slate-800 text-red-400 hover:bg-slate-800'
                      }`}
                    >
                      🔴 Аварии / 112
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterPath(filterPath === 'yellow' ? 'all' : 'yellow')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                        filterPath === 'yellow'
                          ? 'bg-amber-500/30 text-amber-200 border-amber-500'
                          : 'bg-slate-950 border-slate-800 text-amber-400 hover:bg-slate-800'
                      }`}
                    >
                      🟡 Ремонти
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterPath(filterPath === 'blue' ? 'all' : 'blue')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                        filterPath === 'blue'
                          ? 'bg-blue-500/30 text-blue-200 border-blue-500'
                          : 'bg-slate-950 border-slate-800 text-blue-400 hover:bg-slate-800'
                      }`}
                    >
                      🔵 Доброволчески
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterPath(filterPath === 'solved' ? 'all' : 'solved')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                        filterPath === 'solved'
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500'
                          : 'bg-slate-950 border-slate-800 text-emerald-400 hover:bg-slate-800'
                      }`}
                    >
                      ✓ Решени
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Резултати на картата: <strong className="text-white font-mono">{filteredReports.length}</strong> от {reports.length}
                  </span>
                  <button
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
                  >
                    Приложи
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pin Drop Mode Toggle */}
          <button
            onClick={() => setIsPinModeActive(!isPinModeActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isPinModeActive
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isPinModeActive ? 'Кликнете на картата' : 'Постави сигнал с клик'}</span>
            <span className="md:hidden">Постави пин</span>
          </button>
        </div>
      </div>

      {/* Active Filter Chips Strip (if any active) */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl shadow-inner">
          <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-400" />
            Активни филтри:
          </span>

          {filterCategory !== 'all' && (
            <span className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-[11px] font-medium">
              <span>{currentCategoryObj.icon}</span>
              <span>Категория: {currentCategoryObj.label}</span>
              <button
                onClick={() => setFilterCategory('all')}
                className="hover:text-white ml-0.5 text-emerald-400 hover:bg-emerald-800/50 rounded-full p-0.5"
                title="Премахни филтъра по категория"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterStatus !== 'all' && (
            <span className="bg-blue-950/70 border border-blue-500/40 text-blue-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-[11px] font-medium">
              <span className={`w-2 h-2 rounded-full ${currentStatusObj.color}`} />
              <span>Статус: {currentStatusObj.label}</span>
              <button
                onClick={() => setFilterStatus('all')}
                className="hover:text-white ml-0.5 text-blue-400 hover:bg-blue-800/50 rounded-full p-0.5"
                title="Премахни филтъра по статус"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterPath !== 'all' && (
            <span className="bg-amber-950/70 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-[11px] font-medium">
              <span>Път: {filterPath === 'red' ? '🔴 Аварии' : filterPath === 'yellow' ? '🟡 Ремонти' : filterPath === 'blue' ? '🔵 Доброволчески' : '✓ Решени'}</span>
              <button
                onClick={() => setFilterPath('all')}
                className="hover:text-white ml-0.5 text-amber-400 hover:bg-amber-800/50 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeDistrictId !== 'all' && (
            <span className="bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-[11px] font-medium">
              <span>Квартал: {activeDistrictId}</span>
              <button
                onClick={() => setActiveDistrictId('all')}
                className="hover:text-white ml-0.5 text-slate-400 hover:bg-slate-700 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-mono">
              Показани: <strong className="text-white">{filteredReports.length}</strong> от {reports.length}
            </span>
            <button
              onClick={handleResetAllFilters}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
            >
              Изчисти всички
            </button>
          </div>
        </div>
      )}

      {/* Main Map Box */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 h-[480px] lg:h-[540px]">
        {apiKey && !mapLoadFailed && mapEngine === 'google' ? (
          <APIProvider
            apiKey={apiKey}
            libraries={['marker']}
            onError={(err) => {
              console.warn('Google Maps API failed to load, switching to OpenStreetMap layer.', err);
              setMapLoadFailed(true);
              setMapEngine('osm');
            }}
          >
            <Map
              style={{ width: '100%', height: '100%' }}
              defaultCenter={{ lat: 43.2047, lng: 23.5477 }}
              defaultZoom={13.5}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="cooperative"
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={false}
              onClick={handleMapClick}
            >
              <MapCameraController
                targetDistrict={targetDistrict}
                selectedReportCoords={selectedReportCoords}
              />

              {/* Dropped Pin from User Click */}
              {droppedPinCoords && (
                <AdvancedMarker position={droppedPinCoords} title="Посочена нова локация за сигнал">
                  <Pin
                    background="#10B981"
                    borderColor="#065F46"
                    glyphColor="#FFFFFF"
                    scale={1.3}
                  >
                    <span className="text-xs font-bold text-white">+</span>
                  </Pin>
                </AdvancedMarker>
              )}

              {/* Reports Markers with AdvancedMarker */}
              {filteredReports.map((report) => {
                const lat = report.coordinates?.lat || 43.2047;
                const lng = report.coordinates?.lng || 23.5477;
                const isSelected = selectedReportId === report.id;

                let pinBg = '#3B82F6';
                let pinBorder = '#1D4ED8';
                let glyphText = '🔵';

                if (report.status === 'решен') {
                  pinBg = '#10B981';
                  pinBorder = '#047857';
                  glyphText = '✓';
                } else if (report.analysis?.path === 'red') {
                  pinBg = '#EF4444';
                  pinBorder = '#B91C1C';
                  glyphText = '⚠';
                } else if (report.analysis?.path === 'yellow') {
                  pinBg = '#F59E0B';
                  pinBorder = '#B45309';
                  glyphText = '🛠';
                }

                return (
                  <AdvancedMarker
                    key={report.id}
                    position={{ lat, lng }}
                    onClick={() => {
                      setActivePopupReport(report);
                      onSelectReport(report.id);
                    }}
                    title={`${report.ticketNumber}: ${report.title}`}
                  >
                    <Pin
                      background={pinBg}
                      borderColor={isSelected ? '#FFFFFF' : pinBorder}
                      glyphColor="#FFFFFF"
                      scale={isSelected ? 1.35 : 1.1}
                    >
                      <span className="text-[11px] font-bold text-white">{glyphText}</span>
                    </Pin>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>
        ) : (
          <VratsaLeafletMap
            reports={filteredReports}
            selectedReportId={selectedReportId}
            targetDistrict={targetDistrict}
            selectedReportCoords={selectedReportCoords}
            droppedPinCoords={droppedPinCoords}
            onSelectReport={onSelectReport}
            onMarkerClick={(report) => {
              setActivePopupReport(report);
            }}
            onMapClickNewSignal={(coords) => {
              setDroppedPinCoords({ lat: coords.lat, lng: coords.lng });
              if (onMapClickNewSignal) onMapClickNewSignal(coords);
            }}
          />
        )}

        {/* Legend Overlay at Top Left */}
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-2 text-xs shadow-lg space-y-1.5 pointer-events-auto max-w-[260px] sm:max-w-none">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {apiKey && !mapLoadFailed && mapEngine === 'google'
                ? 'Google Maps · Враца'
                : 'Интерактивна карта · Враца'}
            </span>
            <div className="flex items-center gap-1.5">
              {apiKey && !mapLoadFailed && (
                <button
                  type="button"
                  onClick={() => setMapEngine(mapEngine === 'google' ? 'osm' : 'google')}
                  className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700 transition"
                  title="Превключи между Google Maps и OpenStreetMap"
                >
                  {mapEngine === 'google' ? 'Към OSM' : 'Към Google'}
                </button>
              )}
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {filteredReports.length} {filteredReports.length === 1 ? 'сигнал' : 'сигнала'}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              🔴 Аварии / 112 (Осветление, дупки, кабели)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              🟡 Ремонти с Общината (Пейки, настилки)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              🔵 Граждански акции (Чистота, зелени площи)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              ✓ Решен проблем (Верифициран с AI снимка)
            </span>
          </div>
        </div>

        {/* Floating Quick Dropdown Filter Trigger directly on the Map (Top Right) */}
        <div className="absolute top-3 right-3 z-10 pointer-events-auto hidden sm:block">
          <button
            onClick={() => setIsFilterMenuOpen(true)}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/60 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium shadow-lg flex items-center gap-2 transition"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {filterCategory !== 'all' ? currentCategoryObj.label : 'Всички категории'} ·{' '}
              {filterStatus !== 'all' ? currentStatusObj.label : 'Всички статуси'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Empty State Banner if no reports match selected filters */}
        {filteredReports.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-none">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-md text-center space-y-3 pointer-events-auto animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Няма намерени сигнали на картата</h4>
              <p className="text-xs text-slate-300">
                За избраната комбинация от филтри:
                {filterCategory !== 'all' && (
                  <span className="block font-semibold text-emerald-300 mt-1">
                    • Категория: {currentCategoryObj.label}
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="block font-semibold text-blue-300">
                    • Статус: {currentStatusObj.label}
                  </span>
                )}
                {activeDistrictId !== 'all' && (
                  <span className="block font-semibold text-slate-300">
                    • Квартал: {activeDistrictId}
                  </span>
                )}
              </p>
              <button
                onClick={handleResetAllFilters}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Покажи всички сигнали
              </button>
            </div>
          </div>
        )}

        {/* Pin mode guide bar if active */}
        {isPinModeActive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-emerald-700/95 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl border border-emerald-400 flex items-center gap-2 animate-bounce pointer-events-auto">
            <Crosshair className="w-4 h-4 text-emerald-200" />
            Кликнете където и да е върху Google Maps, за да зададете координатите на нов проблем
          </div>
        )}

        {/* Selected / Clicked Report Detail Modal Drawer on map */}
        {activePopupReport && (
          <div className="absolute inset-x-2 bottom-2 top-2 sm:inset-x-auto sm:right-3 sm:bottom-3 sm:top-3 w-auto sm:w-96 z-20 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-4 flex flex-col justify-between overflow-y-auto pointer-events-auto">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {activePopupReport.ticketNumber} · {activePopupReport.neighborhood}
                  </span>
                  <h4 className="text-sm font-bold text-white line-clamp-2">
                    {activePopupReport.title}
                  </h4>
                </div>
                <button
                  onClick={() => setActivePopupReport(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Urgency Badge & Status */}
              <div className="flex items-center justify-between text-xs bg-slate-950/80 border border-slate-800 p-2 rounded-xl">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  AI Наложителност:
                </span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    (activePopupReport.analysis?.urgencyScore ?? 50) >= 80
                      ? 'text-red-400'
                      : (activePopupReport.analysis?.urgencyScore ?? 50) >= 50
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}
                >
                  {activePopupReport.analysis?.urgencyScore ?? 50}/100
                </span>
              </div>

              {/* Photo preview */}
              <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-800 bg-slate-950">
                <img
                  src={
                    activePopupReport.status === 'решен' && activePopupReport.resolvedImageUrl
                      ? activePopupReport.resolvedImageUrl
                      : activePopupReport.imageUrl
                  }
                  alt={activePopupReport.title}
                  className="w-full h-full object-cover"
                />
                {activePopupReport.status === 'решен' && (
                  <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Решено от доброволец
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 line-clamp-3">
                {activePopupReport.description}
              </p>

              {/* Path and requirements */}
              <div className="text-xs space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">
                  Път:{' '}
                  <strong className="text-slate-200">
                    {(activePopupReport.analysis?.path === 'blue' || !activePopupReport.analysis?.path) &&
                      'Гражданска инициатива (Безопасно за доброволци)'}
                    {activePopupReport.analysis?.path === 'yellow' &&
                      'Община + Граждани (Нужни са летви/материали)'}
                    {activePopupReport.analysis?.path === 'red' &&
                      'Само компетентна служба (Аварийно/Опасно)'}
                  </strong>
                </div>
                {activePopupReport.analysis?.path !== 'red' && (
                  <div className="text-[11px] text-slate-400">
                    Доброволци:{' '}
                    <span className="font-semibold text-emerald-400">
                      {activePopupReport.volunteersCount} записани
                    </span>
                  </div>
                )}
              </div>

              {/* AI Verification notes if solved */}
              {activePopupReport.resolutionVerification && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    AI Оценка на ремонта: +
                    {activePopupReport.resolutionVerification.totalPointsAwarded} т.
                  </div>
                  <p className="text-[11px] text-emerald-400/90">
                    {activePopupReport.resolutionVerification.feedback}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom action buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              {activePopupReport.status !== 'решен' &&
                activePopupReport.analysis?.path !== 'red' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (onVolunteerAction) onVolunteerAction(activePopupReport.id);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Включи се
                    </button>
                    <button
                      onClick={() => {
                        if (onResolveAction) onResolveAction(activePopupReport.id);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Завърши & Снимка
                    </button>
                  </div>
                )}

              <button
                onClick={() => {
                  onSelectReport(activePopupReport.id);
                  setActivePopupReport(null);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
              >
                Виж пълен детайл в списъка
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
