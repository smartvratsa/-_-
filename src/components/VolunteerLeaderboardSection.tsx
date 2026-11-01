import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Medal,
  Clock,
  CheckCircle2,
  Sparkles,
  UserPlus,
  LogIn,
  Flame,
  Star,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  MapPin,
  Camera,
  Layers
} from 'lucide-react';
import { VolunteerProfile, LeaderboardUser } from '../types';
import { fetchLeaderboardFromFirestore } from '../lib/firestoreService';
import { MOCK_LEADERBOARD_VOLUNTEERS, VRATSA_DISTRICTS } from '../data/mockReports';
import { LOGO_PATH, handleImageError } from '../constants/assets';

interface VolunteerLeaderboardSectionProps {
  currentVolunteer: VolunteerProfile | null;
  onRegisterVolunteer: (profile: VolunteerProfile) => void;
  onOpenReport?: (reportId: string) => void;
  onOpenRegisterModal?: () => void;
  onOpenLogin?: () => void;
  onOpenSignUp?: () => void;
}

export const VolunteerLeaderboardSection: React.FC<VolunteerLeaderboardSectionProps> = ({
  currentVolunteer,
  onRegisterVolunteer,
  onOpenRegisterModal,
  onOpenLogin,
  onOpenSignUp
}) => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regNeighborhood, setRegNeighborhood] = useState('Център');
  const [regSkills, setRegSkills] = useState('Почистване, боядисване, основни инструменти');

  // Weekly countdown timer calculation to next Sunday 23:59:59
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 3,
    hours: 14,
    minutes: 22,
    seconds: 40
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfWeek = new Date();
      // Distance to Sunday (day 0)
      const day = now.getDay();
      const diffToSunday = (7 - day) % 7;
      endOfWeek.setDate(now.getDate() + diffToSunday);
      endOfWeek.setHours(23, 59, 59, 999);

      const diff = endOfWeek.getTime() - now.getTime();
      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const [sqlLeaderboard, setSqlLeaderboard] = useState<LeaderboardUser[]>([]);

  // Fetch real-time leaderboard from Firestore & backend
  useEffect(() => {
    fetchLeaderboardFromFirestore()
      .then((users) => {
        if (Array.isArray(users) && users.length > 0) {
          setSqlLeaderboard(users);
        }
      })
      .catch(() => {});

    fetch('/api/leaderboard')
      .then((res) => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSqlLeaderboard(data);
        }
      })
      .catch(() => {});
  }, [currentVolunteer?.weeklyPoints, currentVolunteer?.totalPoints]);

  // Compute leaderboard from Cloud SQL (with mock fallback) with current volunteer included
  const baseList: LeaderboardUser[] = sqlLeaderboard.length > 0 ? [...sqlLeaderboard] : [...MOCK_LEADERBOARD_VOLUNTEERS];
  const leaderboardList: LeaderboardUser[] = [...baseList];

  if (currentVolunteer) {
    const existingIndex = leaderboardList.findIndex(
      (u) =>
        u.id === currentVolunteer.id ||
        u.name.toLowerCase() === currentVolunteer.name.toLowerCase()
    );
    if (existingIndex >= 0) {
      leaderboardList[existingIndex] = {
        ...leaderboardList[existingIndex],
        weeklyPoints: currentVolunteer.weeklyPoints,
        totalPoints: currentVolunteer.totalPoints,
        tasksResolvedThisWeek: currentVolunteer.resolvedTasksCount,
        rank: currentVolunteer.rank,
        isCurrentUser: true
      };
    } else {
      leaderboardList.push({
        id: currentVolunteer.id,
        name: currentVolunteer.name,
        neighborhood: currentVolunteer.neighborhood,
        avatarSeed: currentVolunteer.name,
        rank: currentVolunteer.rank,
        weeklyPoints: currentVolunteer.weeklyPoints,
        totalPoints: currentVolunteer.totalPoints,
        tasksResolvedThisWeek: currentVolunteer.resolvedTasksCount,
        avgResolutionTimeHours: 2.5,
        badgesCount: currentVolunteer.badges.length,
        featuredBadge: currentVolunteer.badges[0]?.name || 'Нов участник ⭐',
        isCurrentUser: true
      });
    }
  }

  // Sort descending by weekly points
  leaderboardList.sort((a, b) => b.weeklyPoints - a.weeklyPoints);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    const newProfile: VolunteerProfile = {
      id: 'vol-' + Date.now(),
      name: regName.trim(),
      emailOrPhone: regContact.trim() || 'не е посочен',
      neighborhood: regNeighborhood,
      joinedDate: 'Днес',
      weeklyPoints: 50, // Welcome points
      totalPoints: 50,
      resolvedTasksCount: 0,
      activeAssignments: [],
      rank: 'Новак доброволец',
      badges: [
        {
          id: 'welcome',
          name: 'Активен гражданин 🤝',
          icon: 'Users',
          description: 'Регистриран за доброволчески акции във Враца'
        }
      ]
    };

    onRegisterVolunteer(newProfile);
    setIsRegisterOpen(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header with Countdown */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 max-w-xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white border-2 border-amber-400/80 shadow-2xl p-1 shrink-0">
              <img
                src={LOGO_PATH}
                alt="Доброволци Враца - Платформа на ПТГ Н. Й. Вапцаров"
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Trophy className="w-4 h-4" />
                <span>Доброволци Враца • ПТГ „Н. Й. Вапцаров“</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Решавай проблеми, трупай точки с AI и води града
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Всеки решен проблем и качена снимка се верифицират от изкуствен интелект. Печелите точки според трудността на ремонта и бързината, с която сте се справили.
              </p>
            </div>
          </div>

          {/* Weekly Countdown Box */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 shrink-0 shadow-xl backdrop-blur-sm">
            <div className="text-[11px] font-semibold text-amber-300/90 mb-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Край на седмичната класация:
              </span>
              <span className="font-mono text-[10px] text-slate-400">Неделя 23:59</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="block text-lg sm:text-xl font-mono font-extrabold text-white tabular-nums">
                  {timeLeft.days}
                </span>
                <span className="text-[10px] text-slate-400">дни</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="block text-lg sm:text-xl font-mono font-extrabold text-white tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-400">часа</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="block text-lg sm:text-xl font-mono font-extrabold text-white tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-400">мин</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="block text-lg sm:text-xl font-mono font-extrabold text-amber-400 tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-400">сек</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current User Bar / Register CTA */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {currentVolunteer ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-extrabold shadow-md">
                {currentVolunteer.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{currentVolunteer.name}</span>
                  <span className="text-xs text-emerald-400 font-semibold font-mono">
                    · {currentVolunteer.rank}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{currentVolunteer.neighborhood}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums text-amber-300 font-bold">
                    {currentVolunteer.weeklyPoints} т. за седмицата
                  </span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{currentVolunteer.resolvedTasksCount} решени</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Все още не сте регистриран като доброволец за град Враца.</span>
            </div>
          )}

          {!currentVolunteer ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => (onOpenLogin ? onOpenLogin() : onOpenRegisterModal ? onOpenRegisterModal() : setIsRegisterOpen(true))}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold border border-slate-700 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Вход (Login)</span>
              </button>
              <button
                type="button"
                onClick={() => (onOpenSignUp ? onOpenSignUp() : onOpenRegisterModal ? onOpenRegisterModal() : setIsRegisterOpen(true))}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-100" />
                <span>Регистрация (Sign Up) • +50 т.</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => (onOpenRegisterModal ? onOpenRegisterModal() : setIsRegisterOpen(true))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Дигитална карта и профил
            </button>
          )}
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Топ Доброволци за текущата седмица
              </h3>
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                На живо в реално време
              </span>
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4 text-center w-16">Място</th>
                <th className="py-3 px-4">Доброволец</th>
                <th className="py-3 px-4">Район / Квартал</th>
                <th className="py-3 px-4">Постоянно ниво</th>
                <th className="py-3 px-4 text-center">Решени задачи</th>
                <th className="py-3 px-4 text-center">Ср. скорост</th>
                <th className="py-3 px-4 text-right">Седмични точки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {leaderboardList.map((user, idx) => {
                const rankNum = idx + 1;
                const isGold = rankNum === 1;
                const isSilver = rankNum === 2;
                const isBronze = rankNum === 3;

                return (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-slate-800/50 ${
                      user.isCurrentUser ? 'bg-emerald-950/20 border-l-2 border-emerald-500' : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {isGold ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-sm border border-amber-500/40">
                          🥇
                        </span>
                      ) : isSilver ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-200 font-extrabold text-sm border border-slate-400/40">
                          🥈
                        </span>
                      ) : isBronze ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-400 font-extrabold text-sm border border-amber-700/40">
                          🥉
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400 font-bold tabular-nums">
                          #{rankNum}
                        </span>
                      )}
                    </td>

                    {/* Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                          {user.name.slice(0, 1)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 flex items-center gap-1.5">
                            {user.name}
                            {user.isCurrentUser && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                                Вие
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-amber-300/90 font-medium">
                            {user.featuredBadge}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Neighborhood */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {user.neighborhood}
                      </span>
                    </td>

                    {/* Persistent Rank */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        {user.rank}
                      </span>
                    </td>

                    {/* Tasks Solved */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200 tabular-nums">
                      {user.tasksResolvedThisWeek}
                    </td>

                    {/* Avg Speed */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300 tabular-nums">
                      {user.avgResolutionTimeHours} ч.
                    </td>

                    {/* Weekly Points */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono text-sm font-extrabold text-amber-300 tabular-nums">
                        {user.weeklyPoints} т.
                      </span>
                      <span className="block text-[10px] font-mono text-slate-400 tabular-nums">
                        общо {user.totalPoints} т.
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules & Badges Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            1
          </div>
          <h4 className="text-sm font-bold text-white">Избери проблем от картата</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Разгледайте сигналите за Враца със син или жълт статус. Запишете се за почистване, озеленяване или ремонт на пейки и съоръжения.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            2
          </div>
          <h4 className="text-sm font-bold text-white">Заснеми решеното място</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            След като проблемът е отстранен, качете актуална снимка. Изкуственият интелект я анализира и потвърждава свършената работа.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            3
          </div>
          <h4 className="text-sm font-bold text-white">AI точкуване & седмична награда</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gemini оценява трудността (1-5 звезди) и начислява бонус за бърза реакция. Всяка неделя най-активните доброволци получават отличие.
          </p>
        </div>
      </div>

      {/* Volunteer Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Регистрация на доброволец
                </h3>
                <p className="text-xs text-slate-400">
                  Включете се в градските инициативи на Враца
                </p>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Вашето име и фамилия</label>
                <input
                  type="text"
                  required
                  placeholder="напр. Стефан Димитров"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Телефон или имейл за връзка</label>
                <input
                  type="text"
                  placeholder="напр. 0888 123 456 или email@domain.bg"
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Предпочитан квартал във Враца</label>
                <select
                  value={regNeighborhood}
                  onChange={(e) => setRegNeighborhood(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {VRATSA_DISTRICTS.filter((d) => d.id !== 'all').map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Умения и налични инструменти</label>
                <textarea
                  rows={2}
                  value={regSkills}
                  onChange={(e) => setRegSkills(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="напр. винтоверт, четки за боя, чували, свободно време в събота"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Запази и стани доброволец
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
