import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Sparkles,
  MapPin,
  BookOpen,
  HelpCircle,
  Trophy,
  Map,
  Menu,
  X,
  ArrowUp,
  Check,
  LogIn,
  UserPlus,
  LogOut,
  Phone,
  AlertCircle,
  Award,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { VolunteerProfile } from '../types';
import { LOGO_PATH, handleImageError } from '../constants/assets';
import { isAdminUser } from '../constants/admin';

interface HeaderProps {
  activeTab: 'map' | 'submit' | 'reports' | 'leaderboard' | 'solved' | 'guide' | 'profile';
  setActiveTab: (tab: 'map' | 'submit' | 'reports' | 'leaderboard' | 'solved' | 'guide' | 'profile') => void;
  userRole: 'citizen' | 'official';
  setUserRole: (role: 'citizen' | 'official') => void;
  reportsCount: number;
  currentVolunteer?: VolunteerProfile | null;
  onOpenRegisterModal?: () => void;
  onOpenLogin?: () => void;
  onOpenSignUp?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  reportsCount,
  currentVolunteer,
  onOpenRegisterModal,
  onOpenLogin,
  onOpenSignUp,
  onOpenProfile,
  onLogout
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on Escape key & manage body scroll lock on mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  const handleSelectTab = (tab: HeaderProps['activeTab']) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const tabOptions = [
    {
      id: 'map' as const,
      label: 'Карта на Враца',
      shortLabel: 'Карта',
      icon: Map,
      description: 'Интерактивна карта със сигнали и доброволчески зони',
      color: 'text-emerald-400'
    },
    {
      id: 'submit' as const,
      label: 'Подай сигнал',
      shortLabel: 'Сигнал',
      icon: Sparkles,
      description: 'AI анализ на снимка и автоматичен път към решение',
      color: 'text-emerald-400'
    },
    {
      id: 'reports' as const,
      label: 'Списък със сигнали',
      shortLabel: 'Сигнали',
      icon: AlertCircle,
      badge: reportsCount,
      description: 'Всички активни сигнали, класирани по AI наложителност',
      color: 'text-blue-400'
    },
    {
      id: 'leaderboard' as const,
      label: 'Седмична класация',
      shortLabel: 'Класация',
      icon: Trophy,
      description: 'Доброволци на Враца, седмични точки и значки',
      color: 'text-amber-400'
    },
    {
      id: 'solved' as const,
      label: 'Решени практики',
      shortLabel: 'Архив',
      icon: BookOpen,
      description: 'Завършени ремонти и снимки преди/след',
      color: 'text-cyan-400'
    },
    {
      id: 'guide' as const,
      label: 'Правила и безопасност',
      shortLabel: 'Правила',
      icon: HelpCircle,
      description: 'Наръчник за доброволци и регламент за сигурност',
      color: 'text-slate-300'
    },
    ...(currentVolunteer
      ? [
          {
            id: 'profile' as const,
            label: isAdminUser(currentVolunteer) ? 'Администраторски Дашборд' : 'Моят профил',
            shortLabel: isAdminUser(currentVolunteer) ? 'Админ' : 'Профил',
            icon: isAdminUser(currentVolunteer) ? ShieldCheck : UserCheck,
            description: isAdminUser(currentVolunteer)
              ? 'Управление на потребители, база данни и триене на сигнали'
              : 'Личен доброволчески панел, поети задачи и спечелени точки',
            color: isAdminUser(currentVolunteer) ? 'text-emerald-400' : 'text-amber-400',
            badge: isAdminUser(currentVolunteer) ? 'АДМИН' : `${currentVolunteer.weeklyPoints} т.`
          }
        ]
      : [])
  ];

  return (
    <>
      {/* =========================================================================
          1. TOP CIVIC ANNOUNCEMENT STRIP
          ========================================================================= */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 px-4 py-1.5 text-xs text-slate-300 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 animate-pulse" />
            <span className="font-semibold text-emerald-300">
              Умна Враца • Платформа на ПТГ „Н. Й. Вапцаров“
            </span>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <span className="text-slate-400 hidden sm:inline">
              Интерактивна карта, AI анализ на сигнали и седмична доброволческа класация
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 shrink-0">
            <span className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Враца, България</span>
            </span>
            <a
              href="tel:092624581"
              className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[11px] text-amber-300 border border-amber-500/20 font-mono tabular-nums transition-colors"
              title="Обади се на дежурния по община"
            >
              Дежурен: 092 / 62 45 81
            </a>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MAIN FULL HEADER (CLASSIC & STABLE, NO JUMPING)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/98 backdrop-blur-md border-b border-slate-800 w-full shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
          
          {/* Brand & Official Logo */}
          <div
            onClick={() => {
              setActiveTab('map');
              scrollToTop();
            }}
            className="flex items-center gap-3 cursor-pointer group shrink-0 select-none"
            title="Умна Враца - Към началната карта"
          >
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white border-2 border-emerald-400/80 shadow-md shadow-emerald-950/60 p-0.5 shrink-0 group-hover:scale-105 transition-transform duration-300">
              <img
                src={LOGO_PATH}
                alt="Умна Враца - Платформа на ПТГ Н. Й. Вапцаров"
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  УМНА <span className="text-emerald-400">ВРАЦА</span>
                </h1>
              </div>
              <p className="text-[11px] font-semibold text-slate-300">
                Платформа на ПТГ „Н. Й. Вапцаров“
              </p>
            </div>
          </div>

          {/* Navigation Tabs (desktop and tablets: lg and above) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs sm:text-sm">
            {tabOptions.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="bg-slate-800 text-emerald-300 px-1.5 py-0.2 rounded-full text-[11px] font-bold font-mono">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right side controls:
              - Desktop (sm:flex): User Profile/Login buttons & Admin role switcher
              - Phone (sm:hidden): Kept clean without user name/login buttons crowding the top (already in bottom nav!)
              - Menu Button: ALWAYS on the far right on ALL screen sizes! */}
          <div className="flex items-center gap-2 ml-auto">
            
            {/* Desktop User / Auth controls */}
            <div className="hidden sm:flex items-center gap-2">
              {currentVolunteer ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                      activeTab === 'profile'
                        ? isAdminUser(currentVolunteer)
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-950/50'
                          : 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-md shadow-amber-950/50'
                        : isAdminUser(currentVolunteer)
                          ? 'bg-slate-950 border-emerald-500/40 text-white hover:border-emerald-400'
                          : 'bg-slate-950 border-amber-500/30 text-white hover:border-amber-400'
                    }`}
                    title={isAdminUser(currentVolunteer) ? 'Отвори Администраторски Дашборд' : 'Отвори доброволчески профил'}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                      isAdminUser(currentVolunteer) ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {isAdminUser(currentVolunteer) ? '👑' : '★'}
                    </div>
                    <span className="font-bold text-white">{currentVolunteer.name.split(' ')[0]}</span>
                    {isAdminUser(currentVolunteer) ? (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded text-[10px] font-bold">
                        АДМИН
                      </span>
                    ) : (
                      <span className="font-mono text-amber-400 font-bold tabular-nums">
                        {currentVolunteer.weeklyPoints} т.
                      </span>
                    )}
                  </button>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Изход от профила"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenLogin || onOpenRegisterModal}
                    className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shadow-sm"
                    title="Вход в акаунт (Login)"
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Login</span>
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(Вход)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenSignUp || onOpenRegisterModal}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/80 cursor-pointer"
                    title="Регистрация на доброволец (Sign Up)"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-100" />
                    <span>Sign Up</span>
                    <span className="text-[10px] text-emerald-200 font-medium hidden sm:inline">(Регистрация)</span>
                  </button>
                </div>
              )}

              {/* Role Switcher - EXCLUSIVELY for Admin user CNVGNLTvMdeDh9J2LYkofozpmQ42 */}
              {isAdminUser(currentVolunteer) && (
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-emerald-500/40 shadow-sm" title="Администраторски преглед на платформата">
                  <span className="text-[10px] text-emerald-400 font-bold px-1.5 uppercase font-mono">Админ роля:</span>
                  <button
                    onClick={() => setUserRole('citizen')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      userRole === 'citizen'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Гражданин</span>
                  </button>
                  <button
                    onClick={() => setUserRole('official')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      userRole === 'official'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Община</span>
                  </button>
                </div>
              )}
            </div>

            {/* TOP-RIGHT MENU BUTTON - Positioned on far right */}
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm select-none shrink-0 ${
                isMenuOpen
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950 ring-2 ring-emerald-400/40'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-600'
              }`}
              aria-label="Главно меню"
              title="Отвори главното меню"
            >
              {isMenuOpen ? (
                <>
                  <X className="w-4 h-4 text-white" />
                  <span>Затвори</span>
                </>
              ) : (
                <>
                  <Menu className="w-4 h-4 text-emerald-400" />
                  <span>Меню</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          3. RIGHT SLIDE-OVER DRAWER MENU (PINNED TO FAR RIGHT, NO DEMO ACCOUNTS)
          ========================================================================= */}
      
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-xs z-[1250] transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Right Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[26rem] max-w-full bg-slate-900 border-l border-slate-800 shadow-2xl z-[1300] flex flex-col transform transition-transform duration-300 ease-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Главно меню"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-emerald-400 p-0.5 overflow-hidden shrink-0 shadow-sm">
              <img
                src={LOGO_PATH}
                alt="Умна Враца"
                className="w-full h-full object-contain rounded-full"
                onError={handleImageError}
              />
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                <span>УМНА ВРАЦА</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold block -mt-0.5">
                Главно навигационно меню
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Затвори менюто"
            aria-label="Затвори менюто"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          
          {/* Volunteer Status / Authentication Card (NO DEMO ACCOUNTS!) */}
          {currentVolunteer ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Влязъл профил
                </span>
                {isAdminUser(currentVolunteer) ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                    👑 АДМИНИСТРАТОР
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                    {currentVolunteer.weeklyPoints} т.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
                  isAdminUser(currentVolunteer)
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isAdminUser(currentVolunteer) ? '👑' : '★'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">
                    {currentVolunteer.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {isAdminUser(currentVolunteer) ? 'Главен администратор' : currentVolunteer.rank} • {currentVolunteer.neighborhood || 'Враца'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectTab('profile')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAdminUser(currentVolunteer) ? 'Админ панел' : 'Моят профил'}</span>
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors border border-red-500/20 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Изход</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 shadow-md space-y-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Доброволческа лига на Враца
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Влезте в профила си, за да трупате точки при решаване на проблеми и да участвате в седмичната класация.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onOpenLogin) onOpenLogin();
                    else onOpenRegisterModal?.();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-sm active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Login (Вход)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onOpenSignUp) onOpenSignUp();
                    else onOpenRegisterModal?.();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-emerald-100" />
                  <span>Sign Up (+50 т.)</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin Role Switcher - EXCLUSIVELY for Admin user CNVGNLTvMdeDh9J2LYkofozpmQ42 */}
          {isAdminUser(currentVolunteer) && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>Преглед на платформата като:</span>
                <span className="font-mono text-[9px] bg-emerald-500/20 px-1.5 py-0.2 rounded text-emerald-300">АДМИН</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserRole('citizen');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    userRole === 'citizen'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Гражданин</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserRole('official');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    userRole === 'official'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Община</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tab Links */}
          <div className="space-y-1 pt-1">
            <div className="px-1 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Основни раздели</span>
              <span className="text-slate-500 font-mono text-[10px]">{tabOptions.length} секции</span>
            </div>

            {tabOptions.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/80 border border-emerald-500'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isActive
                          ? 'bg-white text-emerald-700 font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-emerald-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                        <span className={isActive ? 'text-white' : 'text-slate-200'}>
                          {tab.label}
                        </span>
                        {tab.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              isActive
                                ? 'bg-emerald-950 text-emerald-200 border border-emerald-400/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      {tab.description && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isActive ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {tab.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {isActive ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Civic Emergency Contacts & Quick Actions */}
          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Спешни контакти
            </div>
            
            <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Дежурен по Община Враца:
                </span>
                <a
                  href="tel:092624581"
                  className="text-amber-300 font-mono font-bold hover:underline"
                >
                  092 / 62 45 81
                </a>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-red-400" />
                  Единен спешен телефон:
                </span>
                <a
                  href="tel:112"
                  className="text-red-400 font-mono font-bold hover:underline"
                >
                  112
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer border border-slate-800"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Към началото на страницата</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
