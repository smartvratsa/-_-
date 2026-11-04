import React, { useState, useEffect } from 'react';
import { ReportItem, ResolutionPath, VolunteerProfile } from '../types';
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
  Trash2,
  Shield,
  KeyRound,
  UserCheck,
  UserPlus,
  Timer,
  AlertTriangle,
  X,
  Lock,
  Unlock,
  Check
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
  currentVolunteer?: VolunteerProfile | null;
  onOpenLogin?: () => void;
  onClaimTask?: (reportId: string, isPrivate: boolean, inviteCode?: string) => void;
  onJoinTeam?: (reportId: string, inviteCodeInput?: string) => void;
  onReleaseTask?: (reportId: string) => void;
}

// Live timer component for active claimed tasks
const LiveTaskCountdown: React.FC<{ startedAt?: number; requiredMinutes?: number }> = ({
  startedAt,
  requiredMinutes = 5
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!startedAt) return requiredMinutes * 60;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, requiredMinutes * 60 - elapsed);
  });

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const rem = Math.max(0, requiredMinutes * 60 - elapsed);
      setSecondsLeft(rem);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, requiredMinutes]);

  if (secondsLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
        <Check className="w-3 h-3 text-emerald-400" />
        <span>AI време: Изпълнено</span>
      </span>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 font-bold bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg">
      <Timer className="w-3 h-3 text-amber-400 animate-pulse" />
      <span>AI таймер: {mins}:{secs < 10 ? '0' : ''}{secs}</span>
    </span>
  );
};

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
  focusedReportId,
  currentVolunteer,
  onOpenLogin,
  onClaimTask,
  onJoinTeam,
  onReleaseTask
}) => {
  const [selectedPath, setSelectedPath] = useState<ResolutionPath | 'all'>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'urgency' | 'newest' | 'volunteers'>('urgency');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [blurStates, setBlurStates] = useState<Record<string, boolean>>({});
  const [reportPendingDelete, setReportPendingDelete] = useState<string | null>(null);

  // Claim Dialog modal state
  const [claimModalReport, setClaimModalReport] = useState<ReportItem | null>(null);
  const [claimIsPrivate, setClaimIsPrivate] = useState<boolean>(false);
  const [claimInviteCode, setClaimInviteCode] = useState<string>('');

  // Join Dialog modal state (for protected tasks)
  const [joinModalReport, setJoinModalReport] = useState<ReportItem | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);

  // Alert message for 1-task limit
  const [taskLimitNotice, setTaskLimitNotice] = useState<string | null>(null);

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
      в_изпълнение: { label: 'В изпълнение (Екип)', bg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold' },
      решен: { label: 'Решен проблем ✓', bg: 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40' }
    }[status] || { label: status, bg: 'bg-slate-800 text-slate-300' };

    return (
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  // Open Claim modal handler with 1-active-task rule
  const handleInitiateClaim = (report: ReportItem) => {
    if (!currentVolunteer) {
      onOpenLogin?.();
      return;
    }

    // Check single active claimed task rule
    if (
      currentVolunteer.activeClaimedTaskId &&
      currentVolunteer.activeClaimedTaskId !== report.id
    ) {
      setTaskLimitNotice(
        `Вече имате една активна поета задача като ръководител! Правилата позволяват воденето само на 1 задача едновременно. Завършете я или я освободете, преди да поемете нова.`
      );
      setTimeout(() => setTaskLimitNotice(null), 6000);
      return;
    }

    // Generate random 4-digit invite code
    const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
    setClaimInviteCode(generatedCode);
    setClaimIsPrivate(false);
    setClaimModalReport(report);
  };

  const handleConfirmClaim = () => {
    if (!claimModalReport) return;
    onClaimTask?.(
      claimModalReport.id,
      claimIsPrivate,
      claimIsPrivate ? claimInviteCode : undefined
    );
    setClaimModalReport(null);
  };

  // Join Task handler
  const handleInitiateJoin = (report: ReportItem) => {
    if (!currentVolunteer) {
      onOpenLogin?.();
      return;
    }

    // Check team capacity
    const currentMembers = report.teamMembers || [];
    const maxCapacity = report.maxTeamSize || report.analysis?.plan?.people || 3;
    if (currentMembers.length >= maxCapacity) {
      alert(`Екипът за тази задача е вече пълен (макс. ${maxCapacity} доброволци според плана на AI).`);
      return;
    }

    // Check if task is private with invite code
    if (report.claimedBy?.isPrivate && report.claimedBy?.inviteCode) {
      setJoinCodeInput('');
      setJoinCodeError(null);
      setJoinModalReport(report);
      return;
    }

    // Directly join open task
    onJoinTeam?.(report.id);
  };

  const handleConfirmJoinCode = () => {
    if (!joinModalReport) return;
    const requiredCode = joinModalReport.claimedBy?.inviteCode;
    if (joinCodeInput.trim() !== requiredCode) {
      setJoinCodeError('Невалиден код за достъп! Поискайте точния код от ръководителя на екипа.');
      return;
    }
    onJoinTeam?.(joinModalReport.id, joinCodeInput.trim());
    setJoinModalReport(null);
  };

  return (
    <div className="space-y-6">
      {/* 1 Active Task Limit Alert banner */}
      {taskLimitNotice && (
        <div className="bg-amber-950/90 border-2 border-amber-500 rounded-2xl p-4 text-xs text-amber-200 flex items-start justify-between gap-3 shadow-2xl animate-scaleIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white text-sm block">
                Ограничение: 1 активна поета задача
              </span>
              <p className="leading-relaxed">{taskLimitNotice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTaskLimitNotice(null)}
            className="text-amber-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                <option value="urgency" className="bg-slate-900">По AI Наложителност (1-100)</option>
                <option value="volunteers" className="bg-slate-900">По брой доброволци</option>
                <option value="newest" className="bg-slate-900">Най-нови сигнали</option>
              </select>
            </div>

            {/* Neighborhood Dropdown Filter */}
            {neighborhoods.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-400">Квартал:</span>
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="all" className="bg-slate-900">Всички квартали</option>
                  {neighborhoods.map((n) => (
                    <option key={n} value={n} className="bg-slate-900">
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Path Filter Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedPath('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${
              selectedPath === 'all'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Всички сигнали ({reports.length})
          </button>
          <button
            onClick={() => setSelectedPath('blue')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${
              selectedPath === 'blue'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🔵 Доброволчески ({reports.filter((r) => (r.analysis?.path || 'blue') === 'blue').length})
          </button>
          <button
            onClick={() => setSelectedPath('yellow')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${
              selectedPath === 'yellow'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🟡 Смесени ({reports.filter((r) => r.analysis?.path === 'yellow').length})
          </button>
          <button
            onClick={() => setSelectedPath('red')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${
              selectedPath === 'red'
                ? 'bg-red-600 text-white font-bold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🔴 Община/Спешни ({reports.filter((r) => r.analysis?.path === 'red').length})
          </button>
        </div>
      </div>

      {/* Reports List */}
      {filteredAndSortedReports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <p className="text-slate-400 text-sm">Няма намерени сигнали по избраните критерии.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedReports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const blurred = isBlurred(report);
            const urgencyScore = report.analysis?.urgencyScore ?? 50;

            const isClaimed = Boolean(report.claimedBy?.uid);
            const isLead = Boolean(currentVolunteer && report.claimedBy?.uid === currentVolunteer.id);
            const isMember = Boolean(
              currentVolunteer &&
              (report.teamMembers || []).some((m) => m.uid === currentVolunteer.id)
            );
            const isParticipant = isLead || isMember;

            const teamCount = report.teamMembers?.length || (isClaimed ? 1 : 0);
            const maxTeam = report.maxTeamSize || report.analysis?.plan?.people || 3;
            const isTeamFull = teamCount >= maxTeam;

            return (
              <div
                key={report.id}
                id={`report-${report.id}`}
                className={`bg-slate-900 border rounded-2xl transition-all overflow-hidden ${
                  focusedReportId === report.id
                    ? 'border-emerald-500 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/30'
                    : 'border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Thumbnail with privacy blur option */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 group">
                      <img
                        src={report.imageUrl}
                        alt={report.title}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          blurred ? 'filter blur-md scale-110' : ''
                        }`}
                      />
                      {report.analysis?.contains_personal_data && (
                        <button
                          type="button"
                          onClick={() => toggleBlur(report.id, true)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white"
                          title={blurred ? 'Покажи оригинал' : 'Замъгли лични данни'}
                        >
                          {blurred ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-emerald-400 font-bold tabular-nums">
                          {report.ticketNumber}
                        </span>
                        {getStatusBadge(report.status)}
                        <PriorityBadge priority={report.analysis?.priority || 'нормален'} />

                        {/* AI Urgency Pill Tag */}
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                          <Flame
                            className={`w-3.5 h-3.5 ${
                              urgencyScore >= 80 ? 'text-red-400' : urgencyScore >= 50 ? 'text-amber-400' : 'text-blue-400'
                            }`}
                          />
                          <span className="text-slate-400">Наложителност:</span>
                          <span
                            className={`font-bold tabular-nums ${
                              urgencyScore >= 80 ? 'text-red-400' : urgencyScore >= 50 ? 'text-amber-400' : 'text-blue-400'
                            }`}
                          >
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
                        <span className="text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded text-[11px]">
                          {report.neighborhood}
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{report.createdAt}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side path and ACTION BUTTONS (REPLACED "Заснеми & Точки" with "Поеми" & "Присъедини се") */}
                  <div className="flex flex-col sm:items-end gap-2.5 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                    <PathBadge path={report.analysis?.path || 'blue'} size="sm" />

                    {/* Actions container (CSS Selector 1) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {report.status !== 'решен' && report.analysis?.path !== 'red' && (
                        <>
                          {/* Case A: Task NOT claimed yet -> Show "Поеми" and "Присъедини се" */}
                          {!isClaimed ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* "Поеми" Button: Claim as leader */}
                              <button
                                type="button"
                                onClick={() => handleInitiateClaim(report)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors cursor-pointer"
                                title="Поеми задачата като ръководител (с опция за код или свободен достъп)"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Поеми</span>
                              </button>

                              {/* "Присъедини се" Button: Join open task */}
                              <button
                                type="button"
                                onClick={() => handleInitiateJoin(report)}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-blue-950 transition-colors cursor-pointer"
                                title="Присъедини се към тази задача"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Присъедини се</span>
                              </button>
                            </div>
                          ) : (
                            /* Case B: Task is already claimed by someone */
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isParticipant ? (
                                /* Current user is the Leader or Member -> Can Finish with Proof */
                                <div className="flex items-center gap-2">
                                  <LiveTaskCountdown
                                    startedAt={report.taskStartedAt}
                                    requiredMinutes={report.minimumRequiredMinutes || 5}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onOpenResolutionModal?.(report)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors cursor-pointer"
                                    title="Завърши задачата и качи снимково доказателство"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Завърши & Докладвай</span>
                                  </button>

                                  {/* Leader can release task if needed */}
                                  {isLead && onReleaseTask && (
                                    <button
                                      type="button"
                                      onClick={() => onReleaseTask(report.id)}
                                      className="text-[11px] text-slate-400 hover:text-red-300 px-1.5 py-1"
                                      title="Освободи задачата, за да може друг доброволец да я поеме"
                                    >
                                      Освободи
                                    </button>
                                  )}
                                </div>
                              ) : !isTeamFull ? (
                                /* Current user is not in team, but team is not full -> Can Join */
                                <button
                                  type="button"
                                  onClick={() => handleInitiateJoin(report)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-blue-950 transition-colors cursor-pointer"
                                  title="Присъедини се към екипа на задачата"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Присъедини се ({teamCount}/{maxTeam})</span>
                                </button>
                              ) : (
                                /* Team is full */
                                <span className="text-[11px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-medium">
                                  Екипът е запълнен ({teamCount}/{maxTeam})
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Admin Delete Action */}
                      {isAdmin && onDeleteReport && (
                        reportPendingDelete === report.id ? (
                          <div className="flex items-center gap-1 animate-fadeIn bg-red-950/80 p-1 rounded-lg border border-red-500/60">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteReport(report.id);
                                setReportPendingDelete(null);
                              }}
                              className="bg-red-600 hover:bg-red-500 text-white text-[11px] px-2 py-1 rounded font-bold transition flex items-center gap-1 shadow cursor-pointer"
                              title="Потвърди окончателно изтриване"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Изтрий</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportPendingDelete(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-1.5 py-1 rounded cursor-pointer"
                            >
                              Отказ
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReportPendingDelete(report.id)}
                            className="bg-red-950/70 hover:bg-red-900 text-red-200 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-red-800/40 transition flex items-center gap-1 font-bold cursor-pointer"
                            title="Администраторско премахване на сигнал"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Изтрий</span>
                          </button>
                        )
                      )}

                      {/* Expand / Details Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <span>{isExpanded ? 'Скрий' : 'Детайли & AI План'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Claimed Collaboration Ribbon */}
                {isClaimed && report.status !== 'решен' && (
                  <div className="bg-slate-950/90 border-t border-slate-800/80 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        Поета от: {report.claimedBy?.name}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        Екип ({teamCount}/{maxTeam}):{' '}
                        <strong className="text-white">
                          {(report.teamMembers && report.teamMembers.length > 0)
                            ? report.teamMembers.map((m) => m.name).join(', ')
                            : report.claimedBy?.name}
                        </strong>
                      </span>
                      {report.claimedBy?.isPrivate && (
                        <span className="bg-amber-950/50 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Частна (с код)</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Мин. технологично време: {report.minimumRequiredMinutes || 5} мин.
                    </div>
                  </div>
                )}

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
                          · Бонус: +{report.resolutionVerification?.speedBonusPercent || 25}%
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

                    {/* CSS Selector 2: Audit / Action history log - GATED BEHIND isAdmin ONLY!
                        Normal citizens do not see this demo block! */}
                    {isAdmin && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            История на сигнала и действията (Административен одит):
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Видим само за администратори
                          </span>
                        </div>
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Claim Modal Dialog */}
      {claimModalReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Ръководство на задача
                </span>
                <h3 className="text-base font-bold text-white">
                  Поемане на задачата
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setClaimModalReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="font-semibold text-white text-sm">
                {claimModalReport.title}
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Препоръчан екип от AI: до {claimModalReport.maxTeamSize || claimModalReport.analysis?.plan?.people || 3} души</span>
                </div>
                <div className="text-[11px] text-amber-300 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Минимално AI време: {claimModalReport.minimumRequiredMinutes || 5} мин.</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="font-bold text-white block">Кой може да се присъедини към екипа?</span>

                {/* Option 1: Open */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors bg-slate-950 border-slate-800 hover:border-emerald-500/50">
                  <input
                    type="radio"
                    name="accessType"
                    checked={!claimIsPrivate}
                    onChange={() => setClaimIsPrivate(false)}
                    className="mt-0.5 text-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      Отворен екип (Препоръчано)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Всеки доброволец от Враца може да се включи с бутона „Присъедини се“.
                    </p>
                  </div>
                </label>

                {/* Option 2: Private Code */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors bg-slate-950 border-slate-800 hover:border-emerald-500/50">
                  <input
                    type="radio"
                    name="accessType"
                    checked={claimIsPrivate}
                    onChange={() => setClaimIsPrivate(true)}
                    className="mt-0.5 text-emerald-500"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Защитена с код (Само за приятели)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Само хора, на които дадете 4-цифрения код, ще могат да се присъединят.
                    </p>

                    {claimIsPrivate && (
                      <div className="mt-2.5 p-2 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Код за достъп:</span>
                        <input
                          type="text"
                          maxLength={6}
                          value={claimInviteCode}
                          onChange={(e) => setClaimInviteCode(e.target.value.toUpperCase())}
                          className="w-24 text-center font-mono font-bold text-amber-400 bg-slate-950 border border-slate-600 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setClaimModalReport(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={handleConfirmClaim}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950 flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Потвърди и поеме задачата</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Protected Task Modal */}
      {joinModalReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Защитен екип
                </span>
                <h3 className="text-base font-bold text-white">Въведете код за достъп</h3>
              </div>
              <button
                type="button"
                onClick={() => setJoinModalReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Ръководителят <strong>{joinModalReport.claimedBy?.name}</strong> е заключил задачата само за поканени приятели.
              </p>
              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Код за достъп:</label>
                <input
                  type="text"
                  placeholder="напр. 7249"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.trim().toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center font-mono text-base font-bold text-white focus:outline-none focus:border-emerald-500 tracking-widest"
                />
              </div>

              {joinCodeError && (
                <div className="p-2 bg-red-950/60 border border-red-500/50 rounded-lg text-red-300 text-[11px]">
                  {joinCodeError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setJoinModalReport(null)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={handleConfirmJoinCode}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Присъедини се</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
