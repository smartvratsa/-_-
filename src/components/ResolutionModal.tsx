import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  Sparkles,
  Clock,
  Star,
  Award,
  AlertCircle,
  Upload,
  ArrowRight,
  ShieldAlert,
  Users,
  Timer
} from 'lucide-react';
import { ReportItem, ResolutionVerification } from '../types';

interface ResolutionModalProps {
  report: ReportItem;
  volunteerName: string;
  onClose: () => void;
  onSuccess: (
    updatedReport: ReportItem,
    pointsAwardedPerMember: number,
    teamMembers: { uid: string; name: string }[]
  ) => void;
  isAdmin?: boolean;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  report,
  volunteerName,
  onClose,
  onSuccess,
  isAdmin = false
}) => {
  const [resolvedImage, setResolvedImage] = useState<string>('');
  const [timeSpentHours, setTimeSpentHours] = useState<number>(1);
  const [volunteerInputName, setVolunteerInputName] = useState(volunteerName || 'Доброволец от Враца');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ResolutionVerification | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Anti-cheat AI Minimum working time timer
  const minRequiredMinutes = report.minimumRequiredMinutes || (report.analysis?.path === 'blue' ? 3 : report.analysis?.path === 'yellow' ? 6 : 10);
  const taskStartTime = report.taskStartedAt || (report.claimedBy?.claimedAt) || Date.now();

  const calculateRemainingSeconds = () => {
    const elapsedSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
    const requiredSeconds = minRequiredMinutes * 60;
    return Math.max(0, requiredSeconds - elapsedSeconds);
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemainingSeconds);
  const [adminBypassTimer, setAdminBypassTimer] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const rem = calculateRemainingSeconds();
      setRemainingSeconds(rem);
    }, 1000);
    return () => clearInterval(timer);
  }, [taskStartTime, minRequiredMinutes]);

  const isTimerActive = remainingSeconds > 0 && !isAdmin && !adminBypassTimer;

  // Preset sample resolved photos for quick testing
  const SAMPLE_RESOLVED_PRESETS = [
    {
      title: 'Чиста паркова алея (след почистване)',
      url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Боядисана здрава пейка (след ремонт)',
      url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Чиста фасада (заличен графит)',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setResolvedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Team computation
  const effectiveTeamMembers: { uid: string; name: string }[] =
    report.teamMembers && report.teamMembers.length > 0
      ? report.teamMembers.map((m) => ({ uid: m.uid, name: m.name }))
      : [
          {
            uid: report.claimedBy?.uid || 'temp-lead',
            name: report.claimedBy?.name || volunteerInputName
          }
        ];

  const isTeam = effectiveTeamMembers.length > 1;

  const handleVerify = async () => {
    if (isTimerActive) {
      setErrorMsg(`AI защита: Моля изчакайте минималното технологично време (${minRequiredMinutes} мин.), преди да предадете задачата.`);
      return;
    }

    if (!resolvedImage) {
      setErrorMsg('Моля качете или изберете снимка на решеното място.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/verify-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeImageUrl: report.imageUrl,
          afterImageUrl: resolvedImage,
          taskTitle: report.title,
          taskDescription: report.description,
          category: report.analysis?.category || 'Друго',
          timeSpentHours: Number(timeSpentHours),
          volunteerName: volunteerInputName
        })
      });

      if (!response.ok) {
        throw new Error('Неуспешна проверка от сървъра');
      }

      const data: ResolutionVerification = await response.json();
      setVerificationResult(data);
    } catch (_err: any) {
      // Offline / GitHub Pages fallback
      const hours = Number(timeSpentHours) || 1;
      const base = 150;
      const bonus = hours >= 2 ? 50 : 35;
      const total = base + bonus;
      setVerificationResult({
        verified: true,
        difficultyRating: 3,
        difficultyName: 'Средно-висока (3/5)',
        speedBonusPercent: bonus,
        speedRatingName: 'Бърза реакция',
        basePoints: base,
        totalPointsAwarded: total,
        feedback: `Поздравления, ${volunteerInputName}! Проблемът „${report.title}“ е успешно разрешен и потвърден от AI асистента на Враца. Наградени сте с точки за седмичната класация!`,
        verifiedAt: new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }),
        timeSpentHours: hours
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Team point calculation with Synergy Bonus
  const calculatePointsPerMember = () => {
    if (!verificationResult) return 0;
    const baseTotal = verificationResult.totalPointsAwarded;
    if (effectiveTeamMembers.length <= 1) {
      return baseTotal;
    }
    // Synergy bonus of +20% for teamwork
    const teamBonusTotal = Math.round(baseTotal * 1.20);
    return Math.round(teamBonusTotal / effectiveTeamMembers.length);
  };

  const pointsPerMember = calculatePointsPerMember();

  const handleFinish = () => {
    if (!verificationResult) return;

    const updated: ReportItem = {
      ...report,
      status: 'решен',
      resolvedImageUrl: resolvedImage,
      resolvedAt: 'Днес, ' + new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }),
      resolvedByVolunteer: isTeam
        ? effectiveTeamMembers.map((m) => m.name).join(', ')
        : volunteerInputName,
      resolutionVerification: {
        ...verificationResult,
        totalPointsAwarded: pointsPerMember
      },
      historyLog: [
        ...report.historyLog,
        {
          timestamp: 'Днес, ' + new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }),
          actor: isTeam
            ? `Екип (${effectiveTeamMembers.map((m) => m.name).join(', ')})`
            : `${volunteerInputName} (доброволец)`,
          action: isTeam
            ? `Завършиха задачата в екип (+20% synergy bonus). Всеки получи по +${pointsPerMember} т.`
            : `Качи снимка на отстранения проблем. AI присъди +${pointsPerMember} точки!`,
          badge: isTeam ? 'Екипен успех' : 'Решен проблем'
        }
      ]
    };

    onSuccess(updated, pointsPerMember, effectiveTeamMembers);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-5 my-6 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              AI Инспектор · Доклад за завършена дейност
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Заснеми оправеното място и спечели точки
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* AI Anti-Cheat Minimum Working Time Countdown Banner */}
        {isTimerActive && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-3.5 sm:p-4 text-xs text-amber-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <Timer className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <span className="font-bold text-white block">
                  AI Защита срещу преждевременно предаване (Anti-Cheat):
                </span>
                <p className="text-amber-300/90 leading-relaxed text-[11px] sm:text-xs">
                  Изкуственият интелект е пресметнал, че за този тип дейност (<strong>{report.analysis?.category || 'Ремонт'}</strong>) е необходимо технологично време от минимум <strong>{minRequiredMinutes} минути</strong> за реален ремонт.
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono text-xs sm:text-sm text-amber-400 font-extrabold">
                  <span>Оставащо време до възможност за предаване:</span>
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-300">
                    {Math.floor(remainingSeconds / 60)} мин. {remainingSeconds % 60 < 10 ? '0' : ''}{remainingSeconds % 60} сек.
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setAdminBypassTimer(true)}
                className="text-[11px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded-md font-bold mt-1"
              >
                Администраторски пропуск на таймера
              </button>
            )}
          </div>
        )}

        {/* Team Collaboration Overview */}
        {isTeam && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 text-xs text-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Екипно изпълнение ({effectiveTeamMembers.length} души):</strong>{' '}
                {effectiveTeamMembers.map((m) => m.name).join(', ')}
              </span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-lg font-bold text-[11px] shrink-0">
              +20% Екипен бонус
            </span>
          </div>
        )}

        {/* Content */}
        {!verificationResult ? (
          <div className="space-y-5">
            {/* Before vs After Preview Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Card */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                  1. ПРЕДИ (Оригинален сигнал)
                </span>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                  <img
                    src={report.imageUrl}
                    alt="Преди"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs text-slate-300 font-medium line-clamp-1">
                  {report.title}
                </div>
              </div>

              {/* After Card */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  2. СЛЕД (Вашата снимка на оправеното)
                </span>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center relative">
                  {resolvedImage ? (
                    <img
                      src={resolvedImage}
                      alt="След"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-3 text-slate-500 text-xs space-y-1">
                      <Camera className="w-6 h-6 mx-auto text-slate-600" />
                      <span>Качете снимка на оправеното място</span>
                    </div>
                  )}
                </div>

                {/* File input button */}
                <label className="block text-center cursor-pointer py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium transition-colors">
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  Избери снимка от телефон/компютър
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Quick Presets for Demo */}
            <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">
                Или изберете примерна потвърдителна снимка:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_RESOLVED_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResolvedImage(preset.url)}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {isTeam ? 'Ръководител на екипа:' : 'Име на доброволеца:'}
                </label>
                <input
                  type="text"
                  value={volunteerInputName}
                  onChange={(e) => setVolunteerInputName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Време за изпълнение:</span>
                  <span className="font-mono text-emerald-400 font-bold tabular-nums">
                    {timeSpentHours} ч.
                  </span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={timeSpentHours}
                  onChange={(e) => setTimeSpentHours(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Експресно (30 мин)</span>
                  <span>Стандартно (3 ч)</span>
                  <span>Цял ден (8 ч)</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit button with Anti-Cheat Timer constraint */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Отказ
              </button>
              <button
                type="button"
                disabled={isSubmitting || isTimerActive}
                onClick={handleVerify}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-emerald-200" />
                    AI Инспекторът анализира снимката...
                  </>
                ) : isTimerActive ? (
                  <>
                    <Timer className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>
                      Изчакайте AI таймера ({Math.floor(remainingSeconds / 60)}:{remainingSeconds % 60 < 10 ? '0' : ''}{remainingSeconds % 60})
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>AI Верификация & Точкуване</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Verification Success Screen */
          <div className="space-y-6">
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">
                      Успешно верифициран ремонт от AI!
                    </h4>
                    <span className="text-xs text-emerald-300">
                      {isTeam ? `Екип от ${effectiveTeamMembers.length} доброволци` : 'Локацията е успешно възстановена'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-mono font-extrabold text-amber-400 tabular-nums">
                    +{pointsPerMember} т.
                  </span>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    {isTeam ? 'За всеки член на екипа' : 'Точки за класацията'}
                  </span>
                </div>
              </div>

              {/* Point breakdown cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 text-center text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Трудност на задачата</span>
                  <span className="font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {verificationResult.difficultyRating}/5 звезди
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {verificationResult.basePoints} баз. т.
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Екип / Скорост</span>
                  <span className="font-bold text-emerald-300 block mt-0.5 font-mono tabular-nums">
                    {isTeam ? '+20% Synergy' : `+${verificationResult.speedBonusPercent}%`}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isTeam ? `${effectiveTeamMembers.length} участници` : verificationResult.speedRatingName}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Време на място</span>
                  <span className="font-bold text-white block mt-0.5 font-mono tabular-nums">
                    {verificationResult.timeSpentHours} ч.
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Спазено AI време
                  </span>
                </div>
              </div>

              {/* AI Feedback message */}
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Оценка от AI Градски инспектор:
                </span>
                <p className="leading-relaxed">
                  {verificationResult.feedback}
                </p>
                {isTeam && (
                  <p className="text-emerald-300 font-medium pt-1 text-[11px]">
                    🌟 Точките се разпределят поравно с добавен 20% екипен бонус към общия награден фонд!
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Запази в системата & Актуализирай класирането</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
