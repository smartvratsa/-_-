import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  AlertTriangle,
  Trash2,
  Eye,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Trophy,
  Award,
  MapPin,
  Mail,
  Phone,
  Flame,
  Camera,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { VolunteerProfile, ReportItem, VolunteerRank } from '../types';
import { fetchAllUsersFromFirestore, deleteUserFromFirestore, deleteReportFromFirestore } from '../lib/firestoreService';
import { ADMIN_USER_ID } from '../constants/admin';
import { VRATSA_DISTRICTS } from '../data/mockReports';

interface AdminDashboardProps {
  currentVolunteer: VolunteerProfile;
  reports: ReportItem[];
  onDeleteReport: (reportId: string) => Promise<void> | void;
  userRole: 'citizen' | 'official';
  setUserRole: (role: 'citizen' | 'official') => void;
  onLogout: () => void;
  onNavigateToMap: () => void;
  onSwitchToVolunteerDashboard?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentVolunteer,
  reports,
  onDeleteReport,
  userRole,
  setUserRole,
  onLogout,
  onNavigateToMap,
  onSwitchToVolunteerDashboard
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'reports'>('users');
  const [users, setUsers] = useState<VolunteerProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedRank, setSelectedRank] = useState<string>('all');

  // Reports tab filters
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');

  // Selected user for inspecting resolved reports
  const [inspectUser, setInspectUser] = useState<VolunteerProfile | null>(null);

  // Deletion modals state
  const [userToDelete, setUserToDelete] = useState<VolunteerProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [reportToDelete, setReportToDelete] = useState<ReportItem | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState(false);

  // Notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  // Load all users from Firestore
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const fetched = await fetchAllUsersFromFirestore();
      // Ensure the admin profile is present in the list even if fresh
      const existingAdmin = fetched.find((u) => u.id === currentVolunteer.id);
      let mergedUsers = fetched;
      if (!existingAdmin) {
        mergedUsers = [currentVolunteer, ...fetched];
      }
      setUsers(mergedUsers);
    } catch (err) {
      console.warn('Error loading users:', err);
      setUsers([currentVolunteer]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.emailOrPhone && u.emailOrPhone.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.gmail && u.gmail.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.phone && u.phone.includes(userSearchTerm)) ||
        (u.neighborhood && u.neighborhood.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        u.id.toLowerCase().includes(userSearchTerm.toLowerCase());

      const matchesDistrict = selectedDistrict === 'all' || u.neighborhood === selectedDistrict;
      const matchesRank = selectedRank === 'all' || u.rank === selectedRank;

      return matchesSearch && matchesDistrict && matchesRank;
    });
  }, [users, userSearchTerm, selectedDistrict, selectedRank]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        r.ticketNumber.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        r.neighborhood.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(reportSearchTerm.toLowerCase());

      const matchesStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, reportSearchTerm, reportStatusFilter]);

  // Find resolved reports for inspected user
  const inspectedUserResolutions = useMemo(() => {
    if (!inspectUser) return [];
    return reports.filter(
      (r) =>
        r.status === 'решен' &&
        (r.resolvedByVolunteer === inspectUser.name ||
          r.resolvedByVolunteer === inspectUser.id ||
          (Array.isArray(r.volunteers) && r.volunteers.includes(inspectUser.name)))
    );
  }, [reports, inspectUser]);

  // Handle confirm delete user
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === ADMIN_USER_ID) {
      alert('Главното администраторско ID не може да бъде изтрито!');
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      await deleteUserFromFirestore(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showNotice(`Потребител "${userToDelete.name}" беше изтрит от Firebase базата данни.`);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert('Възникна грешка при триене на профила: ' + (err.message || 'Опитайте отново'));
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Handle confirm delete report
  const handleConfirmDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeletingReport(true);
    try {
      await deleteReportFromFirestore(reportToDelete.id);
      await onDeleteReport(reportToDelete.id);
      showNotice(`Сигнал ${reportToDelete.ticketNumber} беше успешно премахнат от системата!`);
      setReportToDelete(null);
    } catch (err: any) {
      console.error('Error deleting report:', err);
      alert('Възникна грешка при изтриване на сигнала: ' + (err.message || 'Опитайте отново'));
    } finally {
      setIsDeletingReport(false);
    }
  };

  // System stats
  const totalPointsCount = users.reduce((acc, u) => acc + (u.totalPoints || 0), 0);
  const resolvedReportsCount = reports.filter((r) => r.status === 'решен').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed top-20 right-4 z-[1300] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Main Admin Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/80 border border-emerald-500/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ГЛАВЕН АДМИНИСТРАТОР
              </span>
              <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                ADMIN UID: {ADMIN_USER_ID}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2">
              Администраторски Дашборд • <span className="text-emerald-400">Умна Враца</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Пълен контрол върху платформата: преглед на всички потребители от Firebase Firestore, техните точки, контакти и значки, инспекция на решени сигнали със снимки преди/след, както и изтриване на профили и сигнали.
            </p>
          </div>

          {/* Quick Admin Actions & Platform Role Switch */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
            {/* Exclusive Role Switcher for Admin */}
            <div className="bg-slate-950/90 p-1.5 rounded-2xl border border-emerald-500/30 flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold px-2 uppercase font-mono">
                Тест поглед:
              </span>
              <button
                type="button"
                onClick={() => {
                  setUserRole('citizen');
                  showNotice('Преминахте в тестов изглед: Гражданин');
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  userRole === 'citizen'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Гражданин</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserRole('official');
                  showNotice('Преминахте в тестов изглед: Община Враца');
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  userRole === 'official'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Община</span>
              </button>
            </div>

            {onSwitchToVolunteerDashboard && (
              <button
                type="button"
                onClick={onSwitchToVolunteerDashboard}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                title="Отвори стандартния доброволчески изглед за редакция на личния профил"
              >
                Доброволчески профил
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-200 text-xs font-bold rounded-xl border border-red-800/40 transition cursor-pointer"
            >
              Изход
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Всички потребители (Firestore)</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {users.length}
          </div>
          <p className="text-[10px] text-slate-400">Регистрирани в базата данни</p>
        </div>

        {/* Total Points */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Общо доброволчески точки</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
            {totalPointsCount}
          </div>
          <p className="text-[10px] text-slate-400">Спечелени от общността</p>
        </div>

        {/* Total Reports */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Всички сигнали на картата</span>
            <AlertTriangle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono tabular-nums">
            {reports.length}
          </div>
          <p className="text-[10px] text-slate-400">Градски проблеми във Враца</p>
        </div>

        {/* Resolved Reports */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Решени със снимка</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-400 font-mono tabular-nums">
            {resolvedReportsCount}
          </div>
          <p className="text-[10px] text-slate-400">Верифицирани ремонти</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeAdminTab === 'users'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Потребители на Firebase ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeAdminTab === 'reports'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Управление на сигнали ({reports.length})</span>
        </button>

        <button
          type="button"
          onClick={loadUsers}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition cursor-pointer"
          title="Презареди данни от Firebase Firestore"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="hidden sm:inline">Опресни</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: USERS DIRECTORY & MANAGEMENT
          ========================================================================= */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Търси по име, имейл, тел, район, ID..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {userSearchTerm && (
                <button
                  type="button"
                  onClick={() => setUserSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Neighborhood / District Filter */}
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Всички квартали във Враца</option>
                {VRATSA_DISTRICTS.filter((d) => d.id !== 'all').map((d) => (
                  <option key={d.id} value={d.name}>
                    кв. {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rank / Level Filter */}
            <div className="relative">
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Всички нива и рангове</option>
                <option value="Новак доброволец">Новак доброволец (0-199 т.)</option>
                <option value="Квартален пазител">Квартален пазител (200-499 т.)</option>
                <option value="Градски майстор">Градски майстор (500-999 т.)</option>
                <option value="Почетен гражданин">Почетен гражданин (1000-1999 т.)</option>
                <option value="Легенда на Враца">Легенда на Враца (2000+ т.)</option>
              </select>
            </div>
          </div>

          {/* Results count banner */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Показани <strong>{filteredUsers.length}</strong> от общо <strong>{users.length}</strong> потребители
            </span>
            {(userSearchTerm || selectedDistrict !== 'all' || selectedRank !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setUserSearchTerm('');
                  setSelectedDistrict('all');
                  setSelectedRank('all');
                }}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Изчисти филтрите
              </button>
            )}
          </div>

          {/* Users Table / List */}
          {isLoadingUsers ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Зареждане на потребителите от Firebase...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Users className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Няма намерени потребители по зададените критерии.</p>
              <button
                type="button"
                onClick={() => {
                  setUserSearchTerm('');
                  setSelectedDistrict('all');
                  setSelectedRank('all');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Изчисти филтрите
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredUsers.map((u) => {
                const isSuperAdmin = u.id === ADMIN_USER_ID;
                const userResolutions = reports.filter(
                  (r) =>
                    r.status === 'решен' &&
                    (r.resolvedByVolunteer === u.name ||
                      r.resolvedByVolunteer === u.id ||
                      (Array.isArray(r.volunteers) && r.volunteers.includes(u.name)))
                );

                return (
                  <div
                    key={u.id}
                    className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 transition-all shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                      isSuperAdmin
                        ? 'border-emerald-500/60 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* User Identity & Avatar */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.name}
                            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                          />
                        ) : (
                          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-emerald-400">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isSuperAdmin && (
                          <span
                            className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-slate-900 shadow"
                            title="Главен администратор"
                          >
                            ADMIN
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                            {u.name}
                          </h3>
                          {/* Rank / Level Badge */}
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <span>⭐</span>
                            <span>{u.rank}</span>
                          </span>
                          {isSuperAdmin && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded font-mono font-bold">
                              Защитен акаунт
                            </span>
                          )}
                        </div>

                        {/* Contacts & Location */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          {/* Location (от къде е) */}
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <MapPin className="w-3.5 h-3.5" />
                            кв. {u.neighborhood || 'Център'}
                          </span>

                          {/* Email */}
                          <span className="flex items-center gap-1 text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-mono text-[11px]">
                              {u.gmail || u.googleEmail || (u.emailOrPhone?.includes('@') ? u.emailOrPhone : 'Няма посочен имейл')}
                            </span>
                          </span>

                          {/* Phone */}
                          <span className="flex items-center gap-1 text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-mono text-[11px]">
                              {u.phone || (u.emailOrPhone?.startsWith('0') || u.emailOrPhone?.startsWith('+') ? u.emailOrPhone : 'Няма телефон')}
                            </span>
                          </span>
                        </div>

                        {/* Badges preview row */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Значки ({u.badges?.length || 0}):
                          </span>
                          {u.badges && u.badges.length > 0 ? (
                            u.badges.map((b) => (
                              <span
                                key={b.id}
                                className="text-[10px] bg-slate-800/90 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1"
                                title={b.description}
                              >
                                <span>🏆</span>
                                <span>{b.name}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Няма спечелени значки</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800 shrink-0">
                      {/* Points block */}
                      <div className="text-left lg:text-right pr-2">
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-slate-400">Общо точки:</div>
                          <span className="font-mono text-base font-extrabold text-amber-400 tabular-nums">
                            {u.totalPoints || 0} т.
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Седмични: <strong className="text-emerald-400 font-mono">{u.weeklyPoints || 0} т.</strong> · Решени: <strong className="text-blue-300 font-mono">{userResolutions.length}</strong>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Inspect Resolved Reports Button */}
                        <button
                          type="button"
                          onClick={() => setInspectUser(u)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 hover:border-emerald-500/50 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Преглед на сигналите, които този потребител е решил със снимка"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Решени ({userResolutions.length})</span>
                        </button>

                        {/* Delete User Button */}
                        {!isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/40 transition cursor-pointer"
                            title="Изтрий този потребителски профил от Firebase базата данни"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div
                            className="p-2 text-slate-400 bg-slate-950 rounded-xl border border-slate-800 cursor-not-allowed"
                            title="Главен администратор не може да бъде изтрит"
                          >
                            <Shield className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: REPORTS MANAGEMENT (Delete reports)
          ========================================================================= */}
      {activeAdminTab === 'reports' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={reportSearchTerm}
                onChange={(e) => setReportSearchTerm(e.target.value)}
                placeholder="Търси сигнал по номер, заглавие, локация..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {reportSearchTerm && (
                <button
                  type="button"
                  onClick={() => setReportSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Всички статуси на сигнали</option>
                <option value="нови">Нови сигнали</option>
                <option value="прегледан">Прегледани</option>
                <option value="одобрен">Одобрени от общината</option>
                <option value="в_изпълнение">В изпълнение</option>
                <option value="решен">Решени със снимка</option>
              </select>
            </div>
          </div>

          {/* Results count banner */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Показани <strong>{filteredReports.length}</strong> от общо <strong>{reports.length}</strong> сигнала
            </span>
            {(reportSearchTerm || reportStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setReportSearchTerm('');
                  setReportStatusFilter('all');
                }}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Изчисти филтрите
              </button>
            )}
          </div>

          {/* Reports Grid */}
          {filteredReports.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Няма намерени сигнали по тези критерии.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-md flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                      <img
                        src={report.imageUrl}
                        alt={report.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      {report.resolvedImageUrl && (
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded">
                          ✓ РЕШЕН
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {report.ticketNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                          report.status === 'решен'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : report.status === 'одобрен'
                            ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}>
                          {report.status}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          кв. {report.neighborhood}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white line-clamp-1">{report.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{report.description}</p>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Наложителност:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {report.analysis?.urgencyScore || 50}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateToMap();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                      >
                        Виж карта
                      </button>

                      {/* Delete Report Button */}
                      <button
                        type="button"
                        onClick={() => setReportToDelete(report)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-200 hover:text-white border border-red-800/40 text-xs font-bold transition cursor-pointer"
                        title="Премахни този сигнал от базата данни"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Изтрий</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: USER RESOLUTIONS INSPECTION WITH BEFORE & AFTER PHOTOS
          ========================================================================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-[1250] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                {inspectUser.photoURL ? (
                  <img
                    src={inspectUser.photoURL}
                    alt={inspectUser.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center">
                    {inspectUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{inspectUser.name}</h3>
                    <span className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">
                      {inspectUser.rank}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Решени сигнали и качени снимки като доказателство за извършен ремонт
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resolutions list */}
            {inspectedUserResolutions.length === 0 ? (
              <div className="bg-slate-950 rounded-2xl p-8 text-center space-y-2 border border-slate-800">
                <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">
                  Този доброволец все още няма завършени сигнали с качена снимка
                </h4>
                <p className="text-xs text-slate-400">
                  Когато потребителят поеме задача и качи снимка за доказателство, тя ще се визуализира тук за преглед от администратора.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inspectedUserResolutions.map((report) => (
                  <div
                    key={report.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {report.ticketNumber}
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                          кв. {report.neighborhood}
                        </span>
                        <span className="text-xs text-slate-400">
                          {report.resolvedAt ? `Завършен: ${report.resolvedAt}` : 'Статус: Решен'}
                        </span>
                      </div>

                      {report.resolutionVerification && (
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 rounded">
                          +{report.resolutionVerification.totalPointsAwarded} присъдени точки
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white">{report.title}</h4>
                    <p className="text-xs text-slate-300">{report.description}</p>

                    {/* PHOTO COMPARISON: BEFORE vs AFTER */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {/* Before Photo */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                          <span>📸</span> Снимка ПРЕДИ (Подаден сигнал):
                        </span>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-red-500/30">
                          <img
                            src={report.imageUrl}
                            alt="Преди ремонт"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* After Photo */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <span>✅</span> Снимка СЛЕД (Качена от {inspectUser.name}):
                        </span>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-emerald-500/40">
                          {report.resolvedImageUrl ? (
                            <img
                              src={report.resolvedImageUrl}
                              alt="След ремонт"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-500 p-4 text-center">
                              <Camera className="w-6 h-6 mb-1 text-slate-600" />
                              <span>Няма качена снимка след ремонт</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI Feedback or notes if present */}
                    {report.resolutionVerification?.feedback && (
                      <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs text-slate-300">
                        <strong className="text-emerald-400 block mb-0.5">Обратна връзка от верификацията:</strong>
                        <span>{report.resolutionVerification.feedback}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRM DELETE USER MODAL
          ========================================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-xl">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Изтриване на потребителски профил</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Сигурни ли сте, че искате да изтриете профила на{' '}
                <strong className="text-white">"{userToDelete.name}"</strong>?
              </p>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-left text-[11px] font-mono text-slate-400 space-y-0.5 mt-2">
                <div>ID: {userToDelete.id}</div>
                <div>Имейл/Тел: {userToDelete.emailOrPhone || 'няма'}</div>
                <div>Точки: {userToDelete.totalPoints} т.</div>
              </div>
              <p className="text-[11px] text-red-400 font-semibold pt-1">
                Това действие ще премахне потребителя директно от Firebase базата данни!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingUser ? 'Изтриване...' : 'Да, изтрий профила'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRM DELETE REPORT MODAL
          ========================================================================= */}
      {reportToDelete && (
        <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Премахване на сигнал</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Потвърждавате ли изтриването на сигнал{' '}
                <strong className="text-white">
                  {reportToDelete.ticketNumber} – "{reportToDelete.title}"
                </strong>
                ?
              </p>
              <p className="text-[11px] text-red-400 font-semibold pt-1">
                Сигналът ще бъде премахнат от картата и от Firebase Firestore базата данни.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                disabled={isDeletingReport}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteReport}
                disabled={isDeletingReport}
                className="py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingReport ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingReport ? 'Премахване...' : 'Да, изтрий сигнала'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
