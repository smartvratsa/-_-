import React, { useState } from 'react';
import { AnalysisResult, ReportItem } from '../types';
import { PathBadge, PriorityBadge, ConfidenceBadge } from './PathBadge';
import {
  AlertTriangle,
  Clock,
  Users,
  Wrench,
  Package,
  ListOrdered,
  EyeOff,
  Eye,
  CheckCircle2,
  FileCheck2,
  PhoneCall,
  Send,
  HelpCircle,
  ExternalLink,
  Info
} from 'lucide-react';

interface AnalysisCardProps {
  analysis: AnalysisResult;
  report?: ReportItem;
  imageUrl?: string;
  onJoinVolunteer?: (reportId: string, name: string) => void;
  onApproveByOfficial?: (reportId: string, notes: string) => void;
  onAssignDepartment?: (reportId: string, dept: string) => void;
  userRole?: 'citizen' | 'official';
  onSelectCase?: (caseCode: string) => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  analysis,
  report,
  imageUrl,
  onJoinVolunteer,
  onApproveByOfficial,
  onAssignDepartment,
  userRole = 'citizen',
  onSelectCase,
}) => {
  const [blurImage, setBlurImage] = useState<boolean>(analysis.contains_personal_data);
  const [volunteerName, setVolunteerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [officialNotes, setOfficialNotes] = useState('');
  const [selectedDept, setSelectedDept] = useState('ОП „БКС Враца“');

  const handleVolunteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteerName.trim() || !report) return;
    onJoinVolunteer?.(report.id, volunteerName.trim());
    setHasJoined(true);
    setVolunteerName('');
  };

  const isRed = analysis.path === 'red';
  const isYellow = analysis.path === 'yellow';
  const isBlue = analysis.path === 'blue';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
      {/* Top Banner indicating human review condition */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong>Предложение на AI:</strong> Не е окончателно решение, подлежи на преглед от човек.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={analysis.confidence} />
          {analysis.needs_approval ? (
            <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
              Изисква съгласуване с Общината
            </span>
          ) : (
            <span className="text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
              Директна гражданска инициатива
            </span>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Core Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                Категория: {analysis.category}
              </span>
              <PriorityBadge priority={analysis.priority} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {analysis.problem}
            </h3>
          </div>

          <div className="shrink-0">
            <PathBadge path={analysis.path} size="lg" />
          </div>
        </div>

        {/* Path Reason Quote */}
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
          isRed
            ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
            : isYellow
            ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
            : 'bg-blue-950/20 border-blue-900/40 text-blue-200'
        }`}>
          <div className="mt-0.5 shrink-0">
            {isRed ? <AlertTriangle className="w-5 h-5 text-rose-400" /> : <Info className="w-5 h-5 text-current" />}
          </div>
          <div>
            <span className="font-semibold block mb-0.5">Обосновка за избора на път:</span>
            <p className="leading-relaxed opacity-95">{analysis.path_reason}</p>
          </div>
        </div>

        {/* Critical Safety Warning (if any, e.g. 112) */}
        {analysis.safety_warning && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/70 text-red-200 flex items-start gap-3 shadow-lg shadow-red-950/50 animate-pulse">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-red-100 flex items-center gap-2">
                <span>ЗАДЪЛЖИТЕЛНО ПРЕДУПРЕЖДЕНИЕ ЗА БЕЗОПАСНОСТ</span>
                {analysis.priority === 'спешен' && (
                  <span className="bg-red-600 text-white text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Спешен случай!
                  </span>
                )}
              </span>
              <p className="text-sm font-medium leading-relaxed">{analysis.safety_warning}</p>
              {analysis.safety_warning.includes('112') && (
                <div className="pt-2">
                  <a
                    href="tel:112"
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-md"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Обади се на тел. 112</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Personal data alert */}
        {analysis.contains_personal_data && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Защита на личните данни:</strong> На снимката са разпознати лица или регистрационни номера. Активирано е автоматично замъгляване за защита на гражданите.
              </span>
            </div>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setBlurImage(!blurImage)}
                className="shrink-0 flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded text-xs transition"
              >
                {blurImage ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{blurImage ? 'Покажи оригинал' : 'Замъгли'}</span>
              </button>
            )}
          </div>
        )}

        {/* Clarifying question if confidence is low */}
        {analysis.clarifying_question && (
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-sm space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Уточняващ въпрос от AI асистента</span>
            </div>
            <p className="italic">„{analysis.clarifying_question}“</p>
          </div>
        )}

        {/* Action Plan */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-semibold text-white text-base flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-emerald-400" />
              <span>Предложен план за действие</span>
            </h4>
            {!isRed && (
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ориентировъчно: <strong>{analysis.plan.people} души</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Време: <strong>{analysis.plan.time || 'около 1 час'}</strong></span>
                </span>
              </div>
            )}
          </div>

          {/* If Yellow or Blue: Materials & Tools */}
          {!isRed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>Необходими материали:</span>
                </div>
                {analysis.plan.materials && analysis.plan.materials.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    {analysis.plan.materials.map((mat, i) => (
                      <li key={i}>{mat}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic">Не са необходими специални консумативи</p>
                )}
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  <span>Препоръчителни инструменти:</span>
                </div>
                {analysis.plan.tools && analysis.plan.tools.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    {analysis.plan.tools.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic">Не са нужни специализирани инструменти</p>
                )}
              </div>
            </div>
          )}

          {/* Step by step list */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
              {isRed ? 'Стъпки за безопасност и подаване на сигнал към служба:' : 'Последователни стъпки за изпълнение:'}
            </span>
            <div className="space-y-2">
              {analysis.plan.steps && analysis.plan.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                    isRed
                      ? 'bg-rose-950/10 border-rose-900/30 text-rose-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-200'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isRed ? 'bg-rose-600 text-white' : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Solved Cases References */}
        {analysis.based_on_cases && analysis.based_on_cases.length > 0 && (
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-cyan-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Учене от добри практики:</strong> Планът се опира на реален завършен опит от Враца:
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {analysis.based_on_cases.map((caseCode) => (
                <button
                  key={caseCode}
                  type="button"
                  onClick={() => onSelectCase?.(caseCode)}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1 transition"
                  title="Виж детайли за този приключен случай"
                >
                  <span>{caseCode}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes (if any) */}
        {analysis.notes && (
          <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <strong className="text-slate-300">Бележки на AI асистента:</strong> {analysis.notes}
          </div>
        )}

        {/* Human in the loop action block */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Човешки преглед и действие ({userRole === 'official' ? 'Режим Община Враца' : 'Режим Гражданин'})</span>
            </span>
            <span className="text-xs text-slate-500">
              {userRole === 'official' ? 'Правомощия на общински координатор' : 'Доброволческо участие'}
            </span>
          </div>

          {/* Citizen Mode Actions */}
          {userRole === 'citizen' && (
            <div className="space-y-3">
              {(isBlue || isYellow) ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="text-slate-300 font-medium">
                      Искаш ли да се включиш като доброволец в тази инициатива?
                    </span>
                    {report && (
                      <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {report.volunteersCount} записани доброволци
                      </span>
                    )}
                  </div>

                  {!hasJoined ? (
                    <form onSubmit={handleVolunteerSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Твоето име / телефон или псевдоним"
                        value={volunteerName}
                        onChange={(e) => setVolunteerName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!volunteerName.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5 shrink-0"
                      >
                        <Users className="w-4 h-4" />
                        <span>Запиши се</span>
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Благодарим! Записан си успешно като доброволец за тази градска акция.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-950/20 p-3.5 rounded-xl border border-rose-900/40 text-xs text-rose-200 flex items-center justify-between gap-3">
                  <span>
                    Този проблем е опасен (Път Червен). Гражданите не предприемат ремонт. Сигналът автоматично се препраща към аварийните служби на Враца.
                  </span>
                  <span className="bg-rose-600 text-white px-2.5 py-1 rounded font-semibold shrink-0">
                    Сигнал заведен
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Municipal Official Actions */}
          {userRole === 'official' && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-amber-300 block">
                Общинска резолюция & Насочване:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (report) {
                      onApproveByOfficial?.(report.id, officialNotes || 'Одобрено за изпълнение');
                    }
                  }}
                  className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Одобри плана {isYellow && '+ осигури материали'}</span>
                </button>

                <div className="flex gap-1.5">
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1.5 text-white focus:outline-none"
                  >
                    <option value="ОП „БКС Враца“">ОП „БКС Враца“</option>
                    <option value="Звено „Озеленяване“">Звено „Озеленяване“</option>
                    <option value="ВиК Враца">ВиК Враца</option>
                    <option value="ЕРМ Запад (ЧЕЗ)">ЕРМ Запад (ЧЕЗ)</option>
                    <option value="Общински инспекторат">Общински инспекторат</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (report) {
                        onAssignDepartment?.(report.id, selectedDept);
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>Възложи</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
