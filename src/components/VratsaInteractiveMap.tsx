import React, { useState, useEffect, useRef } from 'react';
import { ReportItem } from '../types';
import { VRATSA_DISTRICTS } from '../data/mockReports';
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
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Navigation,
  ExternalLink,
  ShieldAlert,
  Eye
} from 'lucide-react';

interface VratsaInteractiveMapProps {
  reports: ReportItem[];
  selectedReportId?: string | null;
  onSelectReport?: (reportId: string) => void;
  onNavigateToReportList?: (reportId: string) => void;
  onMapClickNewSignal?: (coords: { lat: number; lng: number; districtName: string }) => void;
  onVolunteerAction?: (reportId: string) => void;
  onResolveAction?: (reportId: string) => void;
  userRole?: 'citizen' | 'official';
  currentVolunteerName?: string;
}

export type MapLayerType = 'roadmap' | 'satellite' | 'dark' | 'terrain';

// Geographic bounds for Vratsa
const BOUNDS = {
  north: 43.2500,
  south: 43.1600,
  west: 23.4700,
  east: 23.6300
};

export const VratsaInteractiveMap: React.FC<VratsaInteractiveMapProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  onNavigateToReportList,
  onMapClickNewSignal,
  onVolunteerAction,
  onResolveAction
}) => {
  const [activeDistrictId, setActiveDistrictId] = useState('all');
  const [targetDistrict, setTargetDistrict] = useState<typeof VRATSA_DISTRICTS[0] | null>(null);
  const [filterPath, setFilterPath] = useState<'all' | 'red' | 'yellow' | 'blue' | 'solved'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('dark');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);

  // Map Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Pin Drop Mode
  const [isPinModeActive, setIsPinModeActive] = useState(false);
  const [activePopupReport, setActivePopupReport] = useState<ReportItem | null>(null);
  const [droppedPinCoords, setDroppedPinCoords] = useState<{ lat: number; lng: number; districtName?: string; x?: number; y?: number } | null>(null);

  // User live geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationToast, setLocationToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setIsFilterMenuOpen(false);
      }
      if (layerMenuRef.current && !layerMenuRef.current.contains(target)) {
        setIsLayerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync selected report
  useEffect(() => {
    if (selectedReportId) {
      const target = reports.find((r) => r.id === selectedReportId);
      if (target) {
        setActivePopupReport(target);
        if (target.coordinates) {
          const coords = latLngToPercent(target.coordinates.lat, target.coordinates.lng);
          // center on target
        }
      }
    }
  }, [selectedReportId, reports]);

  const CATEGORY_OPTIONS = [
    { id: 'all', label: 'Всички категории', icon: '🌐' },
    { id: 'осветление', label: 'Осветление и кабели', icon: '💡' },
    { id: 'дупки', label: 'Дупки и пътна настилка', icon: '🕳️' },
    { id: 'чистота', label: 'Чистота и отпадъци', icon: '🧹' },
    { id: 'градско обзавеждане', label: 'Градско обзавеждане', icon: '🪑' },
    { id: 'зелени площи', label: 'Зелени площи и паркове', icon: '🌿' },
    { id: 'детски площадки', label: 'Детски площадки', icon: '🎠' },
    { id: 'графити', label: 'Графити и фасади', icon: '🎨' },
    { id: 'вик', label: 'ВиК и шахти', icon: '💧' }
  ];

  const STATUS_OPTIONS = [
    { id: 'all', label: 'Всички статуси', color: 'bg-slate-400' },
    { id: 'нови', label: 'Нови сигнали', color: 'bg-slate-300' },
    { id: 'одобрен', label: 'Одобрени за акция', color: 'bg-emerald-400' },
    { id: 'решен', label: 'Решени проблеми', color: 'bg-emerald-500' },
    { id: 'в_изпълнение', label: 'В изпълнение', color: 'bg-amber-400' },
    { id: 'прегледан', label: 'Прегледани', color: 'bg-blue-400' }
  ];

  const LAYER_OPTIONS: { id: MapLayerType; label: string; icon: string; desc: string }[] = [
    { id: 'dark', label: 'Нощен / Контрастен', icon: '🌙', desc: 'Тъмна тактическа карта с неонови пинове' },
    { id: 'roadmap', label: 'Уличен план', icon: '🗺️', desc: 'Стандартна светла карта на града' },
    { id: 'satellite', label: 'Сателитен изглед', icon: '🛰️', desc: 'Снимки с висока резолюция' },
    { id: 'terrain', label: 'Релеф & Вратцата', icon: '🏔️', desc: 'Топографски изглед на Балкана' }
  ];

  const matchesCategory = (r: ReportItem, catId: string): boolean => {
    if (catId === 'all') return true;
    const cat = (r.analysis?.category || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    return cat.includes(catId.toLowerCase()) || title.includes(catId.toLowerCase()) || desc.includes(catId.toLowerCase());
  };

  const matchesStatus = (r: ReportItem, stId: string): boolean => {
    if (stId === 'all') return true;
    if (stId === 'нови') return r.status === 'нови';
    if (stId === 'одобрен') return r.status === 'одобрен';
    if (stId === 'решен') return r.status === 'решен';
    if (stId === 'в_изпълнение') return r.status === 'в_изпълнение';
    if (stId === 'прегледан') return r.status === 'прегледан';
    return r.status === stId;
  };

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return reports.length;
    return reports.filter((r) => matchesCategory(r, catId)).length;
  };

  const getStatusCount = (stId: string) => {
    if (stId === 'all') return reports.length;
    return reports.filter((r) => matchesStatus(r, stId)).length;
  };

  const activeFiltersCount =
    (filterCategory !== 'all' ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0) +
    (filterPath !== 'all' ? 1 : 0) +
    (activeDistrictId !== 'all' ? 1 : 0);

  const filteredReports = reports.filter((r) => {
    if (activeDistrictId !== 'all') {
      const matchesDistrict =
        r.neighborhood?.toLowerCase().includes(activeDistrictId.toLowerCase()) ||
        r.location?.toLowerCase().includes(activeDistrictId.toLowerCase());
      if (!matchesDistrict) return false;
    }

    if (filterPath === 'solved' && r.status !== 'решен') return false;
    if (filterPath === 'red' && ((r.analysis?.path || 'blue') !== 'red' || r.status === 'решен')) return false;
    if (filterPath === 'yellow' && ((r.analysis?.path || 'blue') !== 'yellow' || r.status === 'решен')) return false;
    if (filterPath === 'blue' && ((r.analysis?.path || 'blue') !== 'blue' || r.status === 'решен')) return false;

    if (!matchesCategory(r, filterCategory)) return false;
    if (!matchesStatus(r, filterStatus)) return false;

    return true;
  });

  const getDistrictReportCount = (districtName: string) => {
    if (districtName === 'all') return reports.length;
    return reports.filter(
      (r) =>
        r.neighborhood?.toLowerCase().includes(districtName.toLowerCase()) ||
        r.location?.toLowerCase().includes(districtName.toLowerCase())
    ).length;
  };

  // Convert Lat/Lng to percentage (0% to 100%) within Vratsa bounds
  const latLngToPercent = (lat: number, lng: number) => {
    const x = ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 100;
    // Invert Y because latitude goes north (top)
    const y = ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * 100;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y))
    };
  };

  const handleSelectDistrict = (district: typeof VRATSA_DISTRICTS[0]) => {
    setActiveDistrictId(district.id);
    setTargetDistrict(district);
    setZoomLevel(1.4);
    if (district.id === 'all') {
      setPanOffset({ x: 0, y: 0 });
      setZoomLevel(1);
    } else {
      const pt = latLngToPercent(district.lat, district.lng);
      setPanOffset({
        x: (50 - pt.x) * 4,
        y: (50 - pt.y) * 4
      });
    }
  };

  const handleResetAllFilters = () => {
    setActiveDistrictId('all');
    setTargetDistrict(VRATSA_DISTRICTS[0]);
    setFilterPath('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setIsFilterMenuOpen(false);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationToast('Браузърът не поддържа геолокация.');
      setTimeout(() => setLocationToast(null), 3500);
      return;
    }

    setIsLocating(true);
    setLocationToast('Търсене на текуща GPS локация...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const pt = latLngToPercent(lat, lng);

        setUserLocation({ lat, lng, x: pt.x, y: pt.y });
        setIsLocating(false);
        setZoomLevel(1.6);
        setPanOffset({
          x: (50 - pt.x) * 5,
          y: (50 - pt.y) * 5
        });

        let nearest = 'Враца';
        let minDist = Infinity;
        VRATSA_DISTRICTS.forEach((d) => {
          if (d.id === 'all') return;
          const dist = Math.hypot(d.lat - lat, d.lng - lng);
          if (dist < minDist) {
            minDist = dist;
            nearest = d.name;
          }
        });

        setLocationToast(`📍 Локализирани сте успешно (близо до ${nearest})`);
        setTimeout(() => setLocationToast(null), 4000);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsLocating(false);
        setLocationToast('Не можахме да определим локацията (проверете GPS правата).');
        setTimeout(() => setLocationToast(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Click on interactive map canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;

    // Convert percent back to lat/lng
    const lng = BOUNDS.west + (xPercent / 100) * (BOUNDS.east - BOUNDS.west);
    const lat = BOUNDS.north - (yPercent / 100) * (BOUNDS.north - BOUNDS.south);

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

    if (isPinModeActive) {
      setDroppedPinCoords({ lat, lng, districtName: nearestDistrict, x: xPercent, y: yPercent });
    }
  };

  const handleConfirmDroppedPin = () => {
    if (droppedPinCoords && onMapClickNewSignal) {
      onMapClickNewSignal({
        lat: droppedPinCoords.lat,
        lng: droppedPinCoords.lng,
        districtName: droppedPinCoords.districtName || 'Център'
      });
      setDroppedPinCoords(null);
      setIsPinModeActive(false);
    }
  };

  const currentCategoryObj = CATEGORY_OPTIONS.find((c) => c.id === filterCategory) || CATEGORY_OPTIONS[0];
  const currentStatusObj = STATUS_OPTIONS.find((s) => s.id === filterStatus) || STATUS_OPTIONS[0];
  const currentLayerObj = LAYER_OPTIONS.find((l) => l.id === activeLayer) || LAYER_OPTIONS[0];

  // Layer background style
  const getLayerBackgroundStyle = () => {
    switch (activeLayer) {
      case 'roadmap':
        return 'bg-slate-100 text-slate-900';
      case 'satellite':
        return 'bg-emerald-950 text-white';
      case 'terrain':
        return 'bg-stone-900 text-stone-100';
      case 'dark':
      default:
        return 'bg-slate-950 text-white';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`space-y-3 transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-slate-950/98 backdrop-blur-xl flex flex-col justify-between overflow-hidden' : ''
      }`}
    >
      {/* 1. TOP INTERACTIVE TOOLBAR */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 p-2.5 sm:p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-thin scrollbar-thumb-slate-700">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Квартали:</span>
          </span>

          {VRATSA_DISTRICTS.map((d) => {
            const isSelected = activeDistrictId === d.id;
            const count = getDistrictReportCount(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelectDistrict(d)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950 scale-[1.02]'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                }`}
                title={`Покажи сигнали в ${d.name}`}
              >
                <span>{d.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap justify-end shrink-0">
          {/* Layer Switcher */}
          <div className="relative" ref={layerMenuRef}>
            <button
              type="button"
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 transition shadow-sm cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentLayerObj.icon} {currentLayerObj.label}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isLayerMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Изглед на картата
                </div>
                {LAYER_OPTIONS.map((layer) => {
                  const isSelected = activeLayer === layer.id;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => {
                        setActiveLayer(layer.id);
                        setIsLayerMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition text-left cursor-pointer ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{layer.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{layer.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{layer.desc}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              activeFiltersCount > 0 || isFilterMenuOpen
                ? 'bg-amber-500/25 text-amber-200 border-amber-500/60 shadow-md'
                : 'bg-slate-800/90 hover:bg-slate-750 text-slate-200 border-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Филтри</span>
            {activeFiltersCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              showHotspots
                ? 'bg-red-500/25 text-red-200 border-red-500/60 shadow-md shadow-red-950'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showHotspots ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden md:inline">Горещи зони</span>
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-blue-600/90 hover:bg-blue-500 text-white border border-blue-400/40 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Намери ме</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPinModeActive(!isPinModeActive);
              if (isPinModeActive) setDroppedPinCoords(null);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              isPinModeActive
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isPinModeActive ? 'Кликни на картата' : 'Постави пин с клик'}</span>
            <span className="md:hidden">Пин</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. FILTER & PATH CHIPS STRIP */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs bg-slate-900/80 border border-slate-800/90 px-3 py-2 rounded-xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-400" />
            Наложителност:
          </span>

          <button
            type="button"
            onClick={() => setFilterPath('all')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
              filterPath === 'all' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Всички ({reports.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterPath(filterPath === 'red' ? 'all' : 'red')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
              filterPath === 'red' ? 'bg-red-500/30 text-red-200 border-red-500' : 'bg-slate-950 text-red-400 border-slate-800 hover:bg-red-950/40'
            }`}
          >
            🔴 Аварии / 112
          </button>

          <button
            type="button"
            onClick={() => setFilterPath(filterPath === 'yellow' ? 'all' : 'yellow')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
              filterPath === 'yellow' ? 'bg-amber-500/30 text-amber-200 border-amber-500' : 'bg-slate-950 text-amber-400 border-slate-800 hover:bg-amber-950/40'
            }`}
          >
            🟡 Ремонти
          </button>

          <button
            type="button"
            onClick={() => setFilterPath(filterPath === 'blue' ? 'all' : 'blue')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
              filterPath === 'blue' ? 'bg-blue-500/30 text-blue-200 border-blue-500' : 'bg-slate-950 text-blue-400 border-slate-800 hover:bg-blue-950/40'
            }`}
          >
            🔵 Доброволчески
          </button>

          <button
            type="button"
            onClick={() => setFilterPath(filterPath === 'solved' ? 'all' : 'solved')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
              filterPath === 'solved' ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500' : 'bg-slate-950 text-emerald-400 border-slate-800 hover:bg-emerald-950/40'
            }`}
          >
            ✓ Решени
          </button>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[11px] text-slate-400 font-mono">
            Показани: <strong className="text-emerald-400 font-bold">{filteredReports.length}</strong> от {reports.length}
          </span>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Нулирай филтри
            </button>
          )}
        </div>
      </div>

      {/* FILTER MODAL DRAWER */}
      {isFilterMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn"
          onClick={() => setIsFilterMenuOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-slideUp sm:animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Филтри на сигналите</h3>
                {activeFiltersCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-full">
                    {activeFiltersCount} активни
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Изчисти</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Категория:</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold">{currentCategoryObj.label}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = filterCategory === cat.id;
                  const count = getCategoryCount(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFilterCategory(cat.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between gap-1 transition cursor-pointer border ${
                        isSelected ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500 shadow-sm' : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded-full shrink-0">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Статус на изпълнение:</span>
                </span>
                <span className="text-[11px] text-blue-400 font-semibold">{currentStatusObj.label}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map((st) => {
                  const isSelected = filterStatus === st.id;
                  const count = getStatusCount(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterStatus(st.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between gap-1 transition cursor-pointer border ${
                        isSelected ? 'bg-blue-600/30 text-blue-200 border-blue-500 shadow-sm' : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className={`w-2.5 h-2.5 rounded-full ${st.color} shrink-0`} />
                        <span className="truncate">{st.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded-full shrink-0">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Квартал във Враца:</span>
                </span>
                <span className="text-[11px] text-amber-400 font-semibold">{activeDistrictId === 'all' ? 'Всички квартали' : activeDistrictId}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {VRATSA_DISTRICTS.map((d) => {
                  const isSelected = activeDistrictId === d.id;
                  const count = getDistrictReportCount(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSelectDistrict(d)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between gap-1 transition cursor-pointer border ${
                        isSelected ? 'bg-amber-600/30 text-amber-200 border-amber-500 shadow-sm' : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded-full shrink-0">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-mono">
                Резултати: <strong className="text-white font-bold">{filteredReports.length}</strong> от {reports.length}
              </span>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen(false)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950 cursor-pointer active:scale-95"
              >
                Приложи филтрите ({filteredReports.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROBUST INTERACTIVE VECTOR MAP CONTAINER */}
      <div
        className={`relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all select-none ${
          isFullscreen ? 'flex-1 h-full min-h-[500px]' : 'h-[500px] lg:h-[580px]'
        } ${getLayerBackgroundStyle()}`}
      >
        {locationToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-blue-900/95 text-white border border-blue-400/80 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce pointer-events-none flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-blue-300" />
            <span>{locationToast}</span>
          </div>
        )}

        {/* Map Interactive Canvas */}
        <div
          className="w-full h-full relative cursor-crosshair overflow-hidden"
          onClick={handleCanvasClick}
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center',
            transition: 'transform 0.3s ease-out'
          }}
        >
          {/* Grid lines / Map Background pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Vratsa City Map Graphics & Districts */}
          <div className="absolute inset-8 flex items-center justify-center pointer-events-none opacity-20">
            <div className="text-center space-y-2">
              <div className="text-6xl font-black tracking-widest uppercase">ВРАЦА</div>
              <div className="text-sm font-mono">Интерактивна градска карта на активните сигнали</div>
            </div>
          </div>

          {/* District Pins / Labels on Map */}
          {VRATSA_DISTRICTS.filter(d => d.id !== 'all').map((d) => {
            const pt = latLngToPercent(d.lat, d.lng);
            const isSelected = activeDistrictId === d.id;
            return (
              <div
                key={d.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform hover:scale-110 cursor-pointer"
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectDistrict(d);
                }}
              >
                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow-md border flex items-center gap-1 ${
                  isSelected ? 'bg-emerald-600 text-white border-emerald-400 scale-110' : 'bg-slate-950/90 text-slate-300 border-slate-700'
                }`}>
                  <Compass className="w-3 h-3 text-emerald-400" />
                  <span>{d.name}</span>
                </div>
              </div>
            );
          })}

          {/* User GPS Location Marker */}
          {userLocation && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
              style={{ left: `${userLocation.x}%`, top: `${userLocation.y}%` }}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/40 animate-ping absolute" />
                <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg relative" />
              </div>
            </div>
          )}

          {/* Dropped Pin */}
          {droppedPinCoords && droppedPinCoords.x !== undefined && droppedPinCoords.y !== undefined && (
            <div
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-30 animate-bounce"
              style={{ left: `${droppedPinCoords.x}%`, top: `${droppedPinCoords.y}%` }}
            >
              <div className="bg-emerald-600 border-2 border-white text-white font-black rounded-full w-8 h-8 flex items-center justify-center shadow-xl text-lg">
                📍
              </div>
            </div>
          )}

          {/* Report Markers */}
          {filteredReports.map((report) => {
            const lat = report.coordinates?.lat || 43.2047;
            const lng = report.coordinates?.lng || 23.5477;
            const pt = latLngToPercent(lat, lng);
            const isSelected = (selectedReportId === report.id) || (activePopupReport?.id === report.id);
            const urgency = report.analysis?.urgencyScore ?? 50;
            const isCritical = urgency >= 80 || report.analysis?.path === 'red';

            let pinBg = 'bg-blue-600 border-blue-400';
            let glyphText = '🔵';

            if (report.status === 'решен') {
              pinBg = 'bg-emerald-600 border-emerald-400';
              glyphText = '✓';
            } else if (report.analysis?.path === 'red') {
              pinBg = 'bg-red-600 border-red-400';
              glyphText = '⚠';
            } else if (report.analysis?.path === 'yellow') {
              pinBg = 'bg-amber-500 border-amber-300';
              glyphText = '🛠';
            }

            return (
              <div
                key={report.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 cursor-pointer group"
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopupReport(report);
                  if (onSelectReport) onSelectReport(report.id);
                }}
              >
                <div className="relative flex items-center justify-center">
                  {isCritical && report.status !== 'решен' && showHotspots && (
                    <div className="w-12 h-12 rounded-full bg-red-500/40 animate-ping absolute" />
                  )}
                  <div className={`w-8 h-8 rounded-full border-2 text-white font-bold flex items-center justify-center shadow-lg transition-transform group-hover:scale-125 ${pinBg} ${isSelected ? 'scale-125 ring-4 ring-white/80' : ''}`}>
                    <span className="text-xs">{glyphText}</span>
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 border border-slate-700 text-white text-[10px] px-2.5 py-1.5 rounded-xl shadow-2xl whitespace-nowrap z-40 pointer-events-none">
                    <div className="font-bold">{report.ticketNumber}: {report.title}</div>
                    <div className="text-slate-400">📍 {report.neighborhood} · Наложителност: {urgency}/100</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Map Zoom & Controls Toolbar */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.25))}
            className="w-9 h-9 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-xl flex items-center justify-center shadow-lg transition cursor-pointer"
            title="Увеличи мащаба"
          >
            <ZoomIn className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.25))}
            className="w-9 h-9 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-xl flex items-center justify-center shadow-lg transition cursor-pointer"
            title="Намали мащаба"
          >
            <ZoomOut className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={handleResetAllFilters}
            className="w-9 h-9 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-xl flex items-center justify-center shadow-lg transition cursor-pointer"
            title="Центрирай картата"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* Legend Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-xs shadow-lg space-y-1 max-w-[240px] sm:max-w-none pointer-events-auto">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Интерактивна карта Враца</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              🔴 Аварии / 112 (Спешни)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              🟡 Ремонти с Общината
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              🔵 Граждански акции
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              ✓ Решен проблем
            </span>
          </div>
        </div>

        {/* Dropped Pin Action Card */}
        {droppedPinCoords && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-emerald-500/70 p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideDown pointer-events-auto max-w-sm sm:max-w-md w-[92%]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xl font-black">
              📍
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                Посочена точка: {droppedPinCoords.districtName || 'Враца'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {droppedPinCoords.lat.toFixed(4)}, {droppedPinCoords.lng.toFixed(4)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleConfirmDroppedPin}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <span>Подай сигнал (+50т.)</span>
              </button>
              <button
                type="button"
                onClick={() => setDroppedPinCoords(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Премахни маркираната точка"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Pin mode guide bar */}
        {isPinModeActive && !droppedPinCoords && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-emerald-700/95 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl border border-emerald-400 flex items-center gap-2 animate-bounce pointer-events-auto">
            <Crosshair className="w-4 h-4 text-emerald-200" />
            Кликнете където и да е върху картата, за да маркирате точната локация на проблем
          </div>
        )}

        {/* Selected Report Detail Modal Drawer */}
        {activePopupReport && (
          <div className="absolute inset-x-2 bottom-2 top-auto sm:inset-x-auto sm:right-3 sm:bottom-3 sm:top-3 sm:w-96 max-h-[85%] z-20 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-4 flex flex-col justify-between overflow-y-auto pointer-events-auto animate-scaleIn">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold tabular-nums">
                    {activePopupReport.ticketNumber} · {activePopupReport.neighborhood}
                  </span>
                  <h4 className="text-sm font-bold text-white line-clamp-2">
                    {activePopupReport.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupReport(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    AI Наложителност:
                  </span>
                  <span
                    className={`font-mono font-black ${
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
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (activePopupReport.analysis?.urgencyScore ?? 50) >= 80
                        ? 'bg-red-500'
                        : (activePopupReport.analysis?.urgencyScore ?? 50) >= 50
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${activePopupReport.analysis?.urgencyScore ?? 50}%` }}
                  />
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-800 bg-slate-950 group">
                <img
                  src={
                    activePopupReport.status === 'решен' && activePopupReport.resolvedImageUrl
                      ? activePopupReport.resolvedImageUrl
                      : activePopupReport.imageUrl
                  }
                  alt={activePopupReport.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {activePopupReport.status === 'решен' && (
                  <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3 h-3" />
                    Решено от доброволец
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-300 line-clamp-3">
                {activePopupReport.description}
              </p>

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
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              {activePopupReport.status !== 'решен' &&
                activePopupReport.analysis?.path !== 'red' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onVolunteerAction) onVolunteerAction(activePopupReport.id);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Включи се
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onResolveAction) onResolveAction(activePopupReport.id);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Завърши & Снимка
                    </button>
                  </div>
                )}

              {activePopupReport.coordinates && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activePopupReport.coordinates.lat},${activePopupReport.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 bg-slate-850 hover:bg-slate-800 text-blue-300 hover:text-blue-200 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 border border-slate-700/60"
                >
                  <Navigation className="w-3 h-3 text-blue-400" />
                  <span>Навигирай до тук (Google Maps)</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToReportList) {
                    onNavigateToReportList(activePopupReport.id);
                  } else if (onSelectReport) {
                    onSelectReport(activePopupReport.id);
                  }
                  setActivePopupReport(null);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Виж пълен детайл в списъка</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
