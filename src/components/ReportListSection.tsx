import React, { useState, useEffect } from 'react';
import { ReportItem, ResolutionPath } from '../types';
import { PathBadge, PriorityBadge } from './PathBadge';
import { AnalysisCard } from './AnalysisCard';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Eye,
  CheckCircle2,
  Building,
  Clock,
  Flame,
  ArrowUpDown,
  Sparkles,
  Camera,
  Layers,
  Trash2
} from 'lucide-react';

interface ReportListSectionProps {
  reports: ReportItem[];
  userRole: 'citizen' | 'official';
  onJoinVolunteer: (reportId: string, name: string) => void;
  onApproveByOfficial: (reportId: string, notes: string) => void;
  onAssignDepartment: (reportId: string, dept: string) => void;
  onSelectCase: (code: string) => void;
  onOpenResolutionModal?: (report: ReportItem) => void;
  onShowOnMap?: (report: ReportItem) => void;
  isAdmin?: boolean;
  onDeleteReport?: (reportId: string) => void;
  focusedReportId?: string | null;
}

export const ReportListSection: React.FC<ReportListSectionProps> = ({
  reports,
  userRole,
  onJoinVolunteer,
  onApproveByOfficial,
  onAssignDepartment,
  onSelectCase,
  onOpenResolutionModal,
  onShowOnMap,
  isAdmin,
  onDeleteReport,
  focusedReportId
}) => {
  const [selectedPath, setSelectedPath] = useState<ResolutionPath | 'all'>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'urgency' | 'newest' | 'volunteers'>('urgency');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [blurStates, setBlurStates] = useState<Record<string, boolean>>({});

  // Auto-expand and scroll to focused report from map or notification
  useEffect(() => {
    if (focusedReportId) {
      setExpandedReportId(focusedReportId);
      setTimeout(() => {
        const el = document.getElementById(`report-${focusedReportId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [focusedReportId]);

  const toggleBlur = (reportId: string, defaultBlur: boolean) => {
    setBlurStates((prev) => ({
      ...prev,
      [reportId]: prev[reportId] !== undefined ? !prev[reportId] : !defaultBlur,
    }));
  };

  const isBlurred = (report: ReportItem) => {
    if (blurStates[report.id] !== undefined) {
      return blurStates[report.id];
    }
    return Boolean(report.analysis?.contains_personal_data);
  };

  // Filter & Sort logic
  const filteredAndSortedReports = reports
    .filter((r) => {
      if (selectedPath !== 'all' && (r.analysis?.path || 'blue') !== selectedPath) return false;
      if (selectedNeighborhood !== 'all' && r.neighborhood !== selectedNeighborhood) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          (r.title || '').toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.location || '').toLowerCase().includes(q) ||
          (r.ticketNumber || '').toLowerCase().includes(q) ||
          (r.analysis?.category || '').toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'urgency') {
        const scoreA = a.analysis?.urgencyScore ?? (a.analysis?.priority === 'спешен' ? 95 : a.analysis?.priority === 'висок' ? 80 : 50);
        const scoreB = b.analysis?.urgencyScore ?? (b.analysis?.priority === 'спешен' ? 95 : b.analysis?.priority === 'висок' ? 80 : 50);
        return scoreB - scoreA;
      }
      if (sortBy === 'volunteers') {
        return (b.volunteersCount || 0) - (a.volunteersCount || 0);
      }
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  const neighborhoods = Array.from(new Set(reports.map((r) => r.neighborhood))).filter(Boolean);

  const getStatusBadge = (status: ReportItem['status']) => {
    const config = {
      нови: { label: 'Нов сигнал', bg: 'bg-slate-700/80 text-slate-300' },
      прегледан: { label: 'Прегледан', bg: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
      одобрен: { label: 'Одобрен за акция', bg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
      в_изпълнение: { label: 'В изпълнение', bg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
      решен: { label: 'Решен проблем ✓', bg: 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40' }
    }[status] || { label: status, bg: 'bg-slate-800 text-slate-300' };

    return (
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Търси сигнал по номер, счупено осветление, дупка, улица във Враца..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* AI Urgency Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400">Сортиране:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="urgency" className="bg-slate-900 text-amber-300">
                  🔥 AI Наложителност (100 → 1)
                </option>
                <option value="newest" className="bg-slate-900 text-white">
                  🕒 Най-нови първо
                </option>
                <option value="volunteers" className="bg-slate-900 text-white">
                  👥 Най-много доброволци
                </option>
              </select>
            </div>

            {/* Neighborhood filter */}
            <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">Всички квартали във Враца</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n} className="bg-slate-900">
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Path Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Път към решение:
          </span>
          <button
            type="button"
            onClick={() => setSelectedPath('all')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedPath === 'all'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Всички ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedPath('red')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              selectedPath === 'red'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'bg-red-950/40 text-red-300 hover:bg-red-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>🔴 Само компетентна служба ({reports.filter((r) => r.analysis?.path === 'red').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPath('yellow')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              selectedPath === 'yellow'
                ? 'bg-amber-600 text-white font-semibold shadow-sm'
                : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>🟡 Община + граждани ({reports.filter((r) => r.analysis?.path === 'yellow').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPath('blue')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              selectedPath === 'blue'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'bg-blue-950/40 text-blue-300 hover:bg-blue-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>🔵 Гражданска инициатива ({reports.filter((r) => r.analysis?.path === 'blue').length})</span>
          </button>
        </div>
      </div>

      {/* Reports Grid / Cards */}
      {filteredAndSortedReports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <p className="text-base font-semibold text-slate-300">
            Няма намерени сигнали по избраните критерии.
          </p>
          <p className="text-xs">
            Опитайте с друг филтър или изчистете търсенето.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedReports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const blurred = isBlurred(report);
            const urgencyScore = report.analysis?.urgencyScore ?? (report.analysis?.priority === 'спешен' ? 95 : 60);

            return (
              <div
                key={report.id}
                id={`report-${report.id}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all touch-pan-y"
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Photo thumbnail & Signal Details */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 flex-1 w-full min-w-0">
                    <div className="relative w-full sm:w-28 h-44 sm:h-28 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                      <img
                        src={report.status === 'решен' && report.resolvedImageUrl ? report.resolvedImageUrl : report.imageUrl}
                        alt={report.title}
                        className={`w-full h-full object-cover transition-all ${
                          blurred ? 'blur-md scale-105' : ''
                        }`}
                      />
                      {report.analysis?.contains_personal_data && (
                        <button
                          type="button"
                          onClick={() => toggleBlur(report.id, Boolean(report.analysis?.contains_personal_data))}
                          className="absolute bottom-1 right-1 bg-black/80 hover:bg-black text-amber-300 p-1 rounded-md text-[10px] flex items-center gap-1 z-10"
                          title="Превключи замъгляване на лични данни"
                        >
                          {blurred ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                      {report.status === 'решен' && (
                        <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          РЕШЕН ✓
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0 w-full select-text">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-emerald-400 font-bold tabular-nums">
                          {report.ticketNumber}
                        </span>
                        {getStatusBadge(report.status)}
                        <PriorityBadge priority={report.analysis?.priority || 'нормален'} />

                        {/* AI Urgency Pill Tag */}
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                          <Flame className={`w-3.5 h-3.5 ${
                            urgencyScore >= 80 ? 'text-red-400' : urgencyScore >= 50 ? 'text-amber-400' : 'text-blue-400'
                          }`} />
                          <span className="text-slate-400">Наложителност:</span>
                          <span className={`font-bold tabular-nums ${
                            urgencyScore >= 80 ? 'text-red-400' : urgencyScore >= 50 ? 'text-amber-400' : 'text-blue-400'
                          }`}>
                            {urgencyScore}/100
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-white text-base leading-snug break-words">
                        {report.title}
                      </h4>

                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="break-words">{report.location}</span>
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span className="text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded text-[11px]">{report.neighborhood}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{report.createdAt}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side path and action button */}
                  <div className="flex items-center sm:flex-col items-end gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                    <PathBadge path={report.analysis?.path || 'blue'} size="sm" />

                    <div className="flex items-center gap-2">
                      {report.status !== 'решен' && report.analysis?.path !== 'red' && onOpenResolutionModal && (
                        <button
                          type="button"
                          onClick={() => onOpenResolutionModal(report)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Заснеми & Точки</span>
                        </button>
                      )}

                      {isAdmin && onDeleteReport && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Админ: Сигурни ли сте, че искате да изтриете сигнал ${report.ticketNumber} "${report.title}"?`)) {
                              onDeleteReport(report.id);
                            }
                          }}
                          className="bg-red-950/70 hover:bg-red-900 text-red-200 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-red-800/40 transition flex items-center gap-1 font-bold cursor-pointer"
                          title="Администраторско премахване на сигнал"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>Изтрий</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1 font-medium"
                      >
                        <span>{isExpanded ? 'Скрий' : 'Детайли & AI План'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* If resolved: Before & After comparison card */}
                {report.status === 'решен' && report.resolvedImageUrl && (
                  <div className="bg-emerald-950/20 border-t border-b border-emerald-900/40 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800 shrink-0">
                        <img src={report.imageUrl} alt="Преди" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-slate-500 font-bold">➔</span>
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-500/40 shrink-0">
                        <img src={report.resolvedImageUrl} alt="След" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-emerald-300 block">Преди и След ремонт</span>
                        <span className="text-[11px] text-slate-400">
                          {report.resolvedByVolunteer ? `от ${report.resolvedByVolunteer}` : 'Решено от доброволец'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        AI Оценка на трудността:
                      </span>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        ★ {report.resolutionVerification?.difficultyRating || 3}/5 звезди
                        <span className="text-slate-400 font-normal">
                          · Бонус бързина: +{report.resolutionVerification?.speedBonusPercent || 25}%
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-mono font-extrabold text-amber-400 tabular-nums block">
                        +{report.resolutionVerification?.totalPointsAwarded || 180} т.
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        Начислени за седмичната класация
                      </span>
                    </div>
                  </div>
                )}

                {/* Expanded AI details & Action card */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/70 p-4 sm:p-6 space-y-6">
                    {/* Description quote */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1 select-text touch-pan-y">
                      <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                        Подадено описание от гражданин:
                      </span>
                      <p className="text-sm text-slate-200 leading-relaxed break-words">{report.description}</p>
                    </div>

                    {/* Official assigned department (if any) */}
                    {report.assignedDepartment && (
                      <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                        <Building className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          <strong>Възложено на:</strong> {report.assignedDepartment}
                        </span>
                      </div>
                    )}

                    {/* Full Analysis Card */}
                    <AnalysisCard
                      analysis={report.analysis}
                      report={report}
                      imageUrl={report.imageUrl}
                      onJoinVolunteer={onJoinVolunteer}
                      onApproveByOfficial={onApproveByOfficial}
                      onAssignDepartment={onAssignDepartment}
                      userRole={userRole}
                      onSelectCase={onSelectCase}
                    />

                    {/* Audit / Action history log */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        История на сигнала и действията:
                      </span>
                      <div className="space-y-1.5 text-xs">
                        {report.historyLog.map((log, lIdx) => (
                          <div
                            key={lIdx}
                            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-200">{log.actor}</span>
                              <p className="text-slate-400">{log.action}</p>
                            </div>
                            <span className="text-slate-500 text-[11px] shrink-0 font-mono">
                              {log.timestamp}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
