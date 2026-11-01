import React, { useState } from 'react';
import {
  Award,
  Shield,
  Trophy,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  Edit3,
  LogOut,
  ArrowRight,
  Flame,
  Camera,
  Check,
  AlertTriangle,
  User,
  Wrench,
  ChevronRight,
  Settings,
  Upload,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { VolunteerProfile, ReportItem, VolunteerRank } from '../types';
import { VRATSA_DISTRICTS } from '../data/mockReports';
import { AccountSettingsModal } from './AccountSettingsModal';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveUserProfileToFirestore } from '../lib/firestoreService';

interface VolunteerProfileDashboardProps {
  volunteer: VolunteerProfile;
  reports: ReportItem[];
  onUpdateProfile: (updated: VolunteerProfile) => void;
  onLogout: () => void;
  onDeleteAccount?: () => void;
  onResolveReport: (report: ReportItem) => void;
  onNavigateToMap: () => void;
  onNavigateToGuide?: () => void;
}

const RANK_THRESHOLDS: { rank: VolunteerRank; minPoints: number; badgeColor: string; icon: string }[] = [
  { rank: 'Новак доброволец', minPoints: 0, badgeColor: 'bg-slate-700 text-slate-200 border-slate-600', icon: '⭐' },
  { rank: 'Квартален пазител', minPoints: 200, badgeColor: 'bg-blue-600/30 text-blue-300 border-blue-500/50', icon: '🛡️' },
  { rank: 'Градски майстор', minPoints: 500, badgeColor: 'bg-amber-600/30 text-amber-300 border-amber-500/50', icon: '🏆' },
  { rank: 'Почетен гражданин', minPoints: 1000, badgeColor: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50', icon: '👑' },
  { rank: 'Легенда на Враца', minPoints: 2000, badgeColor: 'bg-purple-600/30 text-purple-300 border-purple-500/50', icon: '🌟' },
];

export const VolunteerProfileDashboard: React.FC<VolunteerProfileDashboardProps> = ({
  volunteer,
  reports,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onResolveReport,
  onNavigateToMap,
  onNavigateToGuide
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(volunteer.name || '');
  const [editEmail, setEditEmail] = useState(volunteer.emailOrPhone || '');
  const [editPhotoURL, setEditPhotoURL] = useState(volunteer.photoURL || '');
  const [editNeighborhood, setEditNeighborhood] = useState(volunteer.neighborhood || 'Център');
  const [editPhone, setEditPhone] = useState(volunteer.phone || '');
  const [editSkills, setEditSkills] = useState(volunteer.skills || '');
  const [editAvailability, setEditAvailability] = useState(volunteer.availability || 'Уикенди (събота / неделя)');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleDashboardPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Снимката трябва да бъде до 10MB.');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      let finalUrl = '';
      try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `profiles/${volunteer.id}/${Date.now()}_${cleanFileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        finalUrl = await getDownloadURL(snapshot.ref);
      } catch (storageErr) {
        console.warn('Storage upload fallback to DataURL:', storageErr);
        // Fallback to base64 DataURL
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setEditPhotoURL(finalUrl);

      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        photoURL: finalUrl,
      };

      // Direct Firestore persistence
      await saveUserProfileToFirestore(updatedProfile).catch((err) => {
        console.warn('Could not save user photo to Firestore:', err);
      });

      onUpdateProfile(updatedProfile);
      setSaveSuccessMsg('Профилната снимка беше успешно обновена!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);

      // Optional backend sync
      fetch(`/api/users/profile/${volunteer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoURL: finalUrl }),
      }).catch(() => {});
    } catch (err: any) {
      console.warn('Dashboard upload error:', err);
      alert('Грешка при качване на снимка: ' + (err.message || 'Опитайте отново'));
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Find reports assigned to this volunteer
  const assignedReports = reports.filter(
    (r) =>
      volunteer.activeAssignments.includes(r.id) ||
      (Array.isArray(r.volunteers) && r.volunteers.includes(volunteer.name))
  );

  // Find reports resolved by this volunteer
  const resolvedReports = reports.filter(
    (r) => r.status === 'решен' && (r.resolvedByVolunteer === volunteer.name || r.resolvedByVolunteer === volunteer.id)
  );

  // Next rank calculation
  const currentThresholdIndex = RANK_THRESHOLDS.findIndex((t) => t.rank === volunteer.rank);
  const nextThreshold = currentThresholdIndex >= 0 && currentThresholdIndex < RANK_THRESHOLDS.length - 1
    ? RANK_THRESHOLDS[currentThresholdIndex + 1]
    : null;

  const currentRankInfo = RANK_THRESHOLDS.find((t) => t.rank === volunteer.rank) || RANK_THRESHOLDS[0];
  const progressPercent = nextThreshold
    ? Math.min(100, Math.round(((volunteer.totalPoints - currentRankInfo.minPoints) / (nextThreshold.minPoints - currentRankInfo.minPoints)) * 100))
    : 100;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        name: editName,
        emailOrPhone: editEmail,
        photoURL: editPhotoURL,
        neighborhood: editNeighborhood,
        phone: editPhone,
        skills: editSkills,
        availability: editAvailability,
      };

      // Direct Firestore update
      await saveUserProfileToFirestore(updatedProfile).catch((err) => {
        console.warn('Could not save profile to Firestore:', err);
      });

      onUpdateProfile(updatedProfile);
      setIsEditing(false);
      setSaveSuccessMsg('Данните бяха успешно обновени в базата данни!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);

      // Optional backend sync
      fetch(`/api/users/profile/${volunteer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          emailOrPhone: editEmail,
          photoURL: editPhotoURL,
          neighborhood: editNeighborhood,
          phone: editPhone,
          skills: editSkills,
          availability: editAvailability,
        }),
      }).catch(() => {});
    } catch (err: any) {
      console.warn('Profile save notice:', err);
      const updatedLocal: VolunteerProfile = {
        ...volunteer,
        name: editName,
        emailOrPhone: editEmail,
        photoURL: editPhotoURL,
        neighborhood: editNeighborhood,
        phone: editPhone,
        skills: editSkills,
        availability: editAvailability,
      };
      onUpdateProfile(updatedLocal);
      setIsEditing(false);
      setSaveSuccessMsg('Данните бяха обновени!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner / Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/60 border border-slate-700/80 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Volunteer Avatar */}
            <div className="relative group">
              {volunteer.photoURL ? (
                <img
                  src={volunteer.photoURL}
                  alt={volunteer.name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-xl shadow-emerald-950/60"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-emerald-950/60 border-2 border-emerald-300">
                  {volunteer.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-2 -right-2 text-xl bg-slate-900 rounded-full p-1 border border-slate-700 shadow z-10">
                {currentRankInfo.icon}
              </span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="absolute -top-1.5 -left-1.5 p-1.5 rounded-xl bg-slate-900/90 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-slate-700 hover:border-emerald-500 transition cursor-pointer shadow-md"
                title="Смени снимка от телефона"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            {/* Name and Rank Details */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${currentRankInfo.badgeColor}`}>
                  <span>{currentRankInfo.icon}</span>
                  <span>{volunteer.rank}</span>
                </span>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                  Доброволец на Враца
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {volunteer.name}
              </h1>
              <p className="text-xs md:text-sm text-slate-300 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400">
                  <MapPin className="w-3.5 h-3.5" />
                  кв. {volunteer.neighborhood}
                </span>
                <span>•</span>
                <span className="text-slate-400">Член от: {volunteer.joinedDate}</span>
                {volunteer.gmail && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400 truncate max-w-[200px]">{volunteer.gmail}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {onNavigateToGuide && (
              <button
                type="button"
                onClick={onNavigateToGuide}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-emerald-500/40 transition cursor-pointer shadow-sm"
                title="Отвори правилата и регламента за безопасност"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Правила и безопасност</span>
              </button>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-blue-500/40 transition cursor-pointer shadow-sm"
              title="Настройки на профила и свързани методи за вход"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Настройки на акаунта</span>
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEditing ? 'Отказ' : 'Редактирай данни'}</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-200 text-xs font-bold border border-red-800/50 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Изход</span>
            </button>
          </div>
        </div>

        {/* Success toast if updated */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Inline Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Име и фамилия:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Имейл адрес:</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Профилна снимка (от телефона):</label>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">
                  {editPhotoURL ? (
                    <img src={editPhotoURL} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{editName.charAt(0).toUpperCase() || 'Д'}</span>
                  )}
                </div>
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-850 active:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px]">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{isUploadingPhoto ? 'Качване...' : 'Качи от телефон'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingPhoto}
                    onChange={handleDashboardPhotoUpload}
                  />
                </label>
                {editPhotoURL && (
                  <button
                    type="button"
                    onClick={() => setEditPhotoURL('')}
                    className="px-2.5 py-2 text-xs bg-slate-900 hover:bg-red-950/80 text-slate-400 hover:text-red-300 border border-slate-700 rounded-xl transition cursor-pointer min-h-[38px]"
                    title="Премахни снимката"
                  >
                    Изтрий
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Район / Квартал във Враца:</label>
              <select
                value={editNeighborhood}
                onChange={(e) => setEditNeighborhood(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {VRATSA_DISTRICTS.filter((d) => d.id !== 'all').map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Телефонен номер:</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="напр. 0888 123 456"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Специфични умения / оборудване:</label>
              <input
                type="text"
                value={editSkills}
                onChange={(e) => setEditSkills(e.target.value)}
                placeholder="напр. винтоверт, дърводелство, бояджийство"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Времева наличност:</label>
              <input
                type="text"
                value={editAvailability}
                onChange={(e) => setEditAvailability(e.target.value)}
                placeholder="напр. Уикенди, Делнични дни след 18:00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold"
              >
                Отказ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isSaving ? 'Запазване...' : 'Запази промените в базата данни'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Weekly Points */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Седмични точки</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono tabular-nums">
            {volunteer.weeklyPoints}
          </div>
          <p className="text-[10px] text-slate-400">Участват в седмичната класация на Враца</p>
        </div>

        {/* Total Points */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Общо точки</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-400 font-mono tabular-nums">
            {volunteer.totalPoints}
          </div>
          <p className="text-[10px] text-slate-400">Постоянен опит и прогрес</p>
        </div>

        {/* Resolved Tasks */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Решени сигнали</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-blue-400 font-mono tabular-nums">
            {volunteer.resolvedTasksCount}
          </div>
          <p className="text-[10px] text-slate-400">Одобрени след AI верификация</p>
        </div>

        {/* Active Assignments */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Поети задачи</span>
            <Wrench className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-cyan-400 font-mono tabular-nums">
            {assignedReports.length}
          </div>
          <p className="text-[10px] text-slate-400">Текущи акции на терен</p>
        </div>
      </div>

      {/* Rank Progression Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Прогрес на доброволческия ранг:
          </span>
          {nextThreshold ? (
            <span className="text-slate-400">
              Следващ ранг: <strong className="text-amber-300">{nextThreshold.rank}</strong> ({volunteer.totalPoints}/{nextThreshold.minPoints} т.)
            </span>
          ) : (
            <span className="text-emerald-400 font-bold">Достигнат максимален ранг! 🌟</span>
          )}
        </div>

        {/* Bar */}
        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>{currentRankInfo.rank} ({currentRankInfo.minPoints} т.)</span>
          {nextThreshold && <span>{nextThreshold.rank} ({nextThreshold.minPoints} т.)</span>}
        </div>
      </div>

      {/* Two Column Section: Active Tasks vs Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Active Tasks (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              <span>Моите текущи поети задачи</span>
              <span className="text-xs bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                {assignedReports.length}
              </span>
            </h2>
            <button
              onClick={onNavigateToMap}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Поеми нов сигнал от картата</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {assignedReports.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Нямате неприключени поети задачи</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                В момента няма активни сигнали, записани на ваше име. Разгледайте картата на Враца и запишете първата си гражданска акция!
              </p>
              <button
                onClick={onNavigateToMap}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Отвори картата на Враца</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {report.ticketNumber}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                          кв. {report.neighborhood}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-300 flex items-center gap-0.5 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                          <Flame className="w-3 h-3 text-amber-400" />
                          Наложителност: {report.analysis?.urgencyScore || 50}/100
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{report.title}</h4>
                      <p className="text-xs text-slate-300 line-clamp-2">{report.description}</p>
                    </div>

                    {report.imageUrl && (
                      <img
                        src={report.imageUrl}
                        alt={report.title}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                    )}
                  </div>

                  {/* Plan steps preview if yellow/blue */}
                  {report.analysis?.plan?.steps && report.analysis.plan.steps.length > 0 && (
                    <div className="bg-slate-950/80 rounded-xl p-2.5 text-xs text-slate-300 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Препоръчани стъпки за решение:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                        {report.analysis.plan.steps.slice(0, 2).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      {report.createdAt}
                    </span>

                    <button
                      onClick={() => onResolveReport(report)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition text-xs shadow-md shadow-emerald-950 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Приключи и качи снимка</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Solved Reports by this volunteer */}
          {resolvedReports.length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Успешно решени от мен сигнали ({resolvedReports.length})</span>
              </h3>
              <div className="space-y-2">
                {resolvedReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                        ✓
                      </span>
                      <div>
                        <div className="font-semibold text-white">{r.title}</div>
                        <div className="text-[10px] text-slate-400">кв. {r.neighborhood} · {r.resolvedAt || 'Наскоро'}</div>
                      </div>
                    </div>
                    {r.resolutionVerification && (
                      <span className="font-mono text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                        +{r.resolutionVerification.totalPointsAwarded} т.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Badges & Details (1 Col) */}
        <div className="space-y-4">
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Значки и постижения</span>
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            {volunteer.badges && volunteer.badges.length > 0 ? (
              <div className="space-y-2.5">
                {volunteer.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-base shrink-0">
                      🏆
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{badge.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{badge.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Няма спечелени значки към момента.</p>
            )}

            {/* Next badge hints */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                Предстоящи значки:
              </span>
              <div className="text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>🛡️ Пазител на Враца</span>
                  <span className="font-mono text-amber-400 text-[10px]">200 т.</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>⏱️ Светкавична реакция</span>
                  <span className="font-mono text-emerald-400 text-[10px]">Решение &lt; 2ч</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🌿 Майстор на парковете</span>
                  <span className="font-mono text-cyan-400 text-[10px]">3 зелени площи</span>
                </div>
              </div>
            </div>
          </div>

          {/* Volunteer Skills & Equipment info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2.5">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              Моите умения &amp; наличност
            </h3>
            <div className="text-xs space-y-1.5 text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px]">Умения:</span>
                <span className="font-medium">{volunteer.skills || 'Общи доброволчески дейности'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">График:</span>
                <span className="font-medium">{volunteer.availability || 'Уикенди'}</span>
              </div>
              {volunteer.phone && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Телефон за връзка:</span>
                  <span className="font-medium font-mono text-emerald-300">{volunteer.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings & Multi-Provider Linking Modal */}
      <AccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        volunteer={volunteer}
        onUpdateProfile={onUpdateProfile}
        onDeleteAccount={onDeleteAccount}
      />
    </div>
  );
};
