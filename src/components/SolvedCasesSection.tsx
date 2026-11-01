import React, { useState } from 'react';
import { SolvedCase, ResolutionPath } from '../types';
import { VRATSA_SOLVED_CASES } from '../data/solvedCases';
import { PathBadge } from './PathBadge';
import {
  BookOpen,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Users,
  Wrench,
  Package,
  Sparkles,
  Info
} from 'lucide-react';

interface SolvedCasesSectionProps {
  selectedCaseCode?: string | null;
  onClearSelection?: () => void;
}

export const SolvedCasesSection: React.FC<SolvedCasesSectionProps> = ({
  selectedCaseCode,
  onClearSelection,
}) => {
  const [filterPath, setFilterPath] = useState<ResolutionPath | 'all'>('all');

  const filteredCases = VRATSA_SOLVED_CASES.filter((c) => {
    if (filterPath !== 'all' && c.path !== filterPath) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-semibold text-cyan-300">
          <BookOpen className="w-3.5 h-3.5" />
          <span>База знания за град Враца: Учене от добри практики</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Решени градски случаи и приключени инициативи (#VRZ)
        </h2>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          Когато гражданите подават нов проблем, AI асистентът „Градски помощник Враца“ търси прилики с
          вече успешни акции на територията на града. Така оценката за необходими доброволци, време и
          материали стъпва на реален доказан опит във Враца.
        </p>

        {selectedCaseCode && (
          <div className="pt-3 flex items-center gap-3">
            <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Фокусиран случай от AI анализ: <strong>{selectedCaseCode}</strong></span>
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Покажи всички
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterPath('all')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
            filterPath === 'all'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Всички практики ({VRATSA_SOLVED_CASES.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterPath('blue')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
            filterPath === 'blue'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-950/40 text-blue-300 border border-blue-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>🔵 Граждански инициативи</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterPath('yellow')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
            filterPath === 'yellow'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-950/40 text-amber-300 border border-amber-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>🟡 Община + граждани</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterPath('red')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
            filterPath === 'red'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <span>🔴 Специализирани служби</span>
        </button>
      </div>

      {/* Grid of Solved Cases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCases.map((c) => {
          const isSelected = selectedCaseCode === c.code;

          return (
            <div
              key={c.id}
              className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl transition-all ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-900/90'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800/50">
                      {c.code}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {c.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {c.title}
                  </h3>
                </div>
                <PathBadge path={c.path} size="sm" />
              </div>

              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{c.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Приключен на: {c.dateCompleted}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                {c.summary}
              </p>

              {/* Applied Plan specs */}
              {c.path !== 'red' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Участвали: <strong>{c.planApplied.people} доброволци</strong></span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Времетраене: <strong>{c.planApplied.time}</strong></span>
                  </div>
                </div>
              )}

              {/* Applied steps */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                  Изпълнени стъпки:
                </span>
                <ul className="space-y-1">
                  {c.planApplied.steps.map((st, sIdx) => (
                    <li key={sIdx} className="text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">{sIdx + 1}.</span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcome */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-emerald-300">Резултат:</strong>
                  <span>{c.outcome}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
