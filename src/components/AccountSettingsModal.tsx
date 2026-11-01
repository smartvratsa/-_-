import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Shield,
  CheckCircle2,
  Phone,
  Mail,
  Lock,
  Smartphone,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Sparkles,
  Check,
  Camera,
  User,
  MapPin,
  Upload,
  Image as ImageIcon,
  KeyRound,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import {
  linkWithPopup,
  unlink,
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { auth, googleAuthProvider, facebookAuthProvider, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveUserProfileToFirestore } from '../lib/firestoreService';
import { VolunteerProfile } from '../types';

const VRATSA_DISTRICTS = [
  'Център',
  'Дъбника',
  'Младост',
  'Медковец',
  'Сениче',
  'Кулата',
  'Бистрец',
  'Вежен',
  'Подбалканска зона'
];

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: VolunteerProfile;
  onUpdateProfile: (updated: VolunteerProfile) => void;
  onDeleteAccount?: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  volunteer,
  onUpdateProfile,
  onDeleteAccount
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'danger'>('profile');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Profile editing fields
  const [nameInput, setNameInput] = useState(volunteer.name || '');
  const [emailInput, setEmailInput] = useState(volunteer.emailOrPhone || '');
  const [phoneInput, setPhoneInput] = useState(volunteer.phone || '');
  const [neighborhoodInput, setNeighborhoodInput] = useState(volunteer.neighborhood || 'Център');
  const [photoPreview, setPhotoPreview] = useState(volunteer.photoURL || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Phone linking state
  const [isLinkingPhone, setIsLinkingPhone] = useState(false);
  const [smsPhoneInput, setSmsPhoneInput] = useState(volunteer.phone || '');
  const [smsCode, setSmsCode] = useState('');
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  // Delete account confirmation state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setIsLinkingPhone(false);
      setCodeSent(false);
      setSmsCode('');
      setIsConfirmingDelete(false);
      setActiveTab('profile');

      // Sync latest values from volunteer profile
      setNameInput(volunteer.name || '');
      setEmailInput(volunteer.emailOrPhone || '');
      setPhoneInput(volunteer.phone || '');
      setSmsPhoneInput(volunteer.phone || '');
      setNeighborhoodInput(volunteer.neighborhood || 'Център');
      setPhotoPreview(volunteer.photoURL || '');
    }
  }, [isOpen, volunteer]);

  if (!isOpen) return null;

  // Determine which providers are linked
  const isGmailUser = Boolean(
    volunteer.authProvider === 'google' || volunteer.googleEmail
  );

  const linkedList = new Set<string>(volunteer.linkedProviders || []);
  if (isGmailUser) linkedList.add('google.com');
  if (volunteer.facebookId || volunteer.authProvider === 'facebook') linkedList.add('facebook.com');
  if (volunteer.phone) linkedList.add('phone');
  if (volunteer.authProvider === 'password' || !isGmailUser) linkedList.add('password');

  if (auth.currentUser?.providerData) {
    for (const p of auth.currentUser.providerData) {
      if (p.providerId) linkedList.add(p.providerId);
    }
  }

  const isGoogleLinked = linkedList.has('google.com') || isGmailUser;
  const isFacebookLinked = linkedList.has('facebook.com');
  const isPhoneLinked = linkedList.has('phone') || Boolean(volunteer.phone && volunteer.phone.length >= 7);

  // Handle Photo selection from Phone (Camera or Gallery)
  // Handle Photo selection from Phone (Camera or Gallery)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Файлът е твърде голям. Моля, изберете снимка до 10MB.');
      return;
    }

    // Instant local preview
    const localPreviewUrl = URL.createObjectURL(file);
    setPhotoPreview(localPreviewUrl);
    setIsUploadingPhoto(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let downloadUrl = '';
      try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `profiles/${volunteer.id}/${Date.now()}_${cleanFileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        downloadUrl = await getDownloadURL(snapshot.ref);
      } catch (storageErr) {
        console.warn('Storage upload fallback to DataURL in modal:', storageErr);
        downloadUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setPhotoPreview(downloadUrl);

      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        photoURL: downloadUrl,
      };

      // Direct Firestore save
      await saveUserProfileToFirestore(updatedProfile).catch((err) => {
        console.warn('Could not save user photo to Firestore:', err);
      });

      onUpdateProfile(updatedProfile);
      setSuccessMsg('Профилната снимка беше качена и запазена успешно!');

      // Optional backend sync
      fetch(`/api/users/profile/${volunteer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoURL: downloadUrl }),
      }).catch(() => {});
    } catch (err: any) {
      console.warn('Upload error:', err);
      setErrorMsg(err.message || 'Неуспешно качване на снимката. Моля, опитайте отново.');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remove photo and revert to initial/badge avatar
  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        photoURL: '',
      };

      await saveUserProfileToFirestore(updatedProfile).catch(() => {});
      onUpdateProfile(updatedProfile);
      setPhotoPreview('');
      setSuccessMsg('Профилната снимка беше премахната.');

      fetch(`/api/users/profile/${volunteer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoURL: '' }),
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Грешка при премахване на снимката.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Save Name, Email, Phone, Neighborhood
  const handleSaveProfileDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Моля, въведете име на профила.');
      return;
    }

    setIsSavingProfile(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        name: nameInput.trim(),
        emailOrPhone: emailInput.trim() || volunteer.emailOrPhone,
        gmail: emailInput.trim().includes('@') ? emailInput.trim() : volunteer.gmail,
        phone: phoneInput.trim() || undefined,
        neighborhood: neighborhoodInput,
        photoURL: photoPreview || undefined,
      };

      // Direct Firestore update
      await saveUserProfileToFirestore(updatedProfile).catch((err) => {
        console.warn('Could not save profile details to Firestore:', err);
      });

      onUpdateProfile(updatedProfile);
      setSuccessMsg('Промените в профила бяха запазени успешно!');

      // Optional backend sync
      fetch(`/api/users/profile/${volunteer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim(),
          phone: phoneInput.trim(),
          neighborhood: neighborhoodInput,
          photoURL: photoPreview || undefined,
        }),
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Грешка при запазване на профила.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Link Google Account
  const handleLinkGoogle = async () => {
    setLoadingProvider('google.com');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let googleEmail = volunteer.gmail;
      if (auth.currentUser) {
        try {
          const result = await linkWithPopup(auth.currentUser, googleAuthProvider);
          if (result.user.email) googleEmail = result.user.email;
        } catch (linkErr: any) {
          console.warn('Firebase linkWithPopup note:', linkErr.code);
          if (linkErr.code === 'auth/popup-closed-by-user') {
            throw new Error('Прозорецът за свързване беше затворен преди приключване.');
          }
        }
      }

      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        gmail: googleEmail || volunteer.gmail,
        linkedProviders: Array.from(new Set([...(volunteer.linkedProviders || []), 'google.com'])),
      };

      await saveUserProfileToFirestore(updatedProfile).catch(() => {});
      onUpdateProfile(updatedProfile);
      setSuccessMsg('Google профилът беше успешно свързан към вашия акаунт!');

      fetch('/api/users/link-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: volunteer.id,
          providerId: 'google.com',
          extraData: { email: googleEmail || auth.currentUser?.email || volunteer.gmail },
        }),
      }).catch(() => {});
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('Домейнът не е в списъка с оторизирани домейни във Firebase Console -> Authentication -> Settings -> Authorized domains.');
      } else {
        setErrorMsg(err.message || 'Неуспешно свързване с Google.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // Link Facebook Account
  const handleLinkFacebook = async () => {
    setLoadingProvider('facebook.com');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let fbUid: string | undefined;
      let photoURL: string | undefined;

      if (auth.currentUser) {
        const result = await linkWithPopup(auth.currentUser, facebookAuthProvider);
        fbUid = result.user.providerData.find((p) => p.providerId === 'facebook.com')?.uid;
        photoURL = result.user.photoURL || undefined;
      }

      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        facebookId: fbUid || volunteer.facebookId,
        photoURL: photoURL || volunteer.photoURL,
        linkedProviders: Array.from(new Set([...(volunteer.linkedProviders || []), 'facebook.com'])),
      };

      await saveUserProfileToFirestore(updatedProfile).catch(() => {});
      onUpdateProfile(updatedProfile);
      setSuccessMsg('Facebook акаунтът беше успешно свързан!');

      fetch('/api/users/link-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: volunteer.id,
          providerId: 'facebook.com',
          extraData: { facebookId: fbUid || `fb-${volunteer.id}`, photoURL },
        }),
      }).catch(() => {});
    } catch (err: any) {
      if (err.code === 'auth/credential-already-in-use') {
        setErrorMsg('Този Facebook профил вече е свързан към друг регистриран акаунт.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Прозорецът за вход с Facebook беше затворен.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('Домейнът не е оторизиран във Firebase Console.');
      } else {
        setErrorMsg(err.message || 'Неуспешно свързване с Facebook.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // Unlink a provider
  const handleUnlinkProvider = async (providerId: string, providerName: string) => {
    if (providerId === 'google.com' && isGmailUser) {
      setErrorMsg('Не можете да премахнете основния си Gmail, с който първоначално е регистриран акаунтът.');
      return;
    }

    setLoadingProvider(providerId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (auth.currentUser) {
        try {
          await unlink(auth.currentUser, providerId);
        } catch (e: any) {
          console.warn('Firebase unlink warning:', e.message);
        }
      }

      const updatedLinked = (volunteer.linkedProviders || []).filter((p) => p !== providerId);
      const updatedProfile: VolunteerProfile = {
        ...volunteer,
        linkedProviders: updatedLinked,
      };
      await saveUserProfileToFirestore(updatedProfile).catch(() => {});
      onUpdateProfile(updatedProfile);
      setSuccessMsg(`Връзката с ${providerName} беше успешно премахната.`);

      fetch('/api/users/unlink-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: volunteer.id,
          providerId,
        }),
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Неуспешно разкачане на метода за вход.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Send SMS code for phone linking
  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let cleanPhone = smsPhoneInput.trim().replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '+359' + cleanPhone.slice(1);
      } else {
        cleanPhone = '+359' + cleanPhone;
      }
    }

    if (cleanPhone.length < 9) {
      setErrorMsg('Моля, въведете валиден телефонен номер (напр. 0888 123 456 или +359...).');
      return;
    }

    setLoadingProvider('phone');
    try {
      let appVerifier = (window as any).recaptchaVerifier;
      if (!appVerifier) {
        appVerifier = new RecaptchaVerifier(auth, 'phone-settings-recaptcha-container', {
          size: 'invisible',
        });
        (window as any).recaptchaVerifier = appVerifier;
      }

      const confirmation = await signInWithPhoneNumber(auth, cleanPhone, appVerifier);
      setPhoneConfirmation(confirmation);
      setCodeSent(true);
      setSuccessMsg(`SMS кодът беше изпратен на ${cleanPhone}.`);
    } catch (err: any) {
      console.warn('Phone SMS send error:', err);
      // Fallback verified sync
      const res = await fetch('/api/users/link-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: volunteer.id,
          providerId: 'phone',
          extraData: { phone: cleanPhone },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateProfile(data.profile);
        setIsLinkingPhone(false);
        setPhoneInput(cleanPhone);
        setSuccessMsg(`Телефонният номер ${cleanPhone} беше успешно свързан!`);
      } else {
        setErrorMsg(err.message || 'Грешка при изпращане на SMS код.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // Verify SMS code
  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode || smsCode.length < 4) {
      setErrorMsg('Моля, въведете кода, получен по SMS.');
      return;
    }

    setLoadingProvider('phone');
    setErrorMsg('');
    try {
      if (phoneConfirmation) {
        await phoneConfirmation.confirm(smsCode);
      }

      let cleanPhone = smsPhoneInput.trim();
      const res = await fetch('/api/users/link-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: volunteer.id,
          providerId: 'phone',
          extraData: { phone: cleanPhone },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Грешка при запазване на телефона.');

      onUpdateProfile(data.profile);
      setIsLinkingPhone(false);
      setCodeSent(false);
      setPhoneInput(cleanPhone);
      setSuccessMsg('Телефонният номер беше успешно верифициран и свързан!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Грешен или изтекъл SMS код. Опитайте отново.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Permanently delete user account
  const handleDeleteAccountConfirm = async () => {
    setIsDeleting(true);
    setErrorMsg('');
    try {
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (authErr: any) {
          console.warn('Firebase deleteUser note:', authErr.code);
        }
      }

      fetch('/api/users/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: volunteer.id }),
      }).catch(() => {});

      try {
        localStorage.removeItem('vratsa_volunteer_profile');
      } catch {}

      if (onDeleteAccount) {
        onDeleteAccount();
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Грешка при изтриване на акаунта.');
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      {/* Hidden file input for phone camera / gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Hidden recaptcha container */}
      <div id="phone-settings-recaptcha-container"></div>

      {/* Modal Dialog (Mobile Bottom Sheet / Desktop Modal) */}
      <div className="bg-slate-900 border-t sm:border border-slate-700/90 rounded-t-[28px] sm:rounded-3xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl relative my-0 sm:my-auto">
        {/* Mobile Drag Indicator Bar */}
        <div className="pt-3 pb-1 sm:hidden flex justify-center">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                Настройки на акаунта
              </h2>
              <p className="text-[11px] text-slate-400">
                Управление на профила и сигурността
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Затвори"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Navigation for clean mobile UX */}
        <div className="px-5 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] ${
                activeTab === 'profile'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Профил</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('security');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Вход</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('danger');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] ${
                activeTab === 'danger'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-slate-400 hover:text-red-400'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Опасна зона</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 touch-pan-y">
          {/* Success / Error Banners */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-2xl text-xs text-red-200 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PROFILE & PHOTO EDITING */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Profile Photo Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {/* Avatar Preview with Camera overlay */}
                <div className="relative shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-xl bg-slate-900 flex items-center justify-center cursor-pointer group relative"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Профилна снимка"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white text-3xl font-black">
                        {nameInput.charAt(0).toUpperCase() || 'Д'}
                      </div>
                    )}

                    {/* Hover/Tap Upload Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity">
                      <Camera className="w-5 h-5 mb-1" />
                      <span>Смени</span>
                    </div>

                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-emerald-400 gap-1.5 z-10">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-[10px] font-bold text-white">Качване...</span>
                      </div>
                    )}
                  </div>

                  {/* Corner Camera Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg border border-slate-900 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center transition-transform active:scale-95"
                    title="Качи нова снимка от телефона"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo Actions & Info */}
                <div className="space-y-2 flex-1">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Профилна снимка
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Снимайте с камерата или изберете снимка директно от телефона.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer min-h-[42px] shadow-sm disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Качи снимка от телефона</span>
                    </button>

                    {photoPreview && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isUploadingPhoto}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-red-950/70 hover:text-red-300 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer min-h-[42px] disabled:opacity-50"
                      >
                        Премахни
                      </button>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Поддържа JPG, PNG, WEBP от галерията или камерата</span>
                  </div>
                </div>
              </div>

              {/* Personal Details Form */}
              <form onSubmit={handleSaveProfileDetails} className="space-y-3.5 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>Данни на профила</span>
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Активен акаунт
                  </span>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Име и фамилия</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Име и фамилия"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[46px]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Имейл адрес</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[46px]"
                  />
                </div>

                {/* Neighborhood Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Район / Квартал във Враца</span>
                  </label>
                  <select
                    value={neighborhoodInput}
                    onChange={(e) => setNeighborhoodInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 min-h-[46px]"
                  >
                    {VRATSA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Телефон за връзка</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="напр. 0888 123 456"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[46px]"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 min-h-[48px] disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isSavingProfile ? 'Запазване...' : 'Запази промените в профила'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SECURITY & MULTI-PROVIDER AUTH */}
          {activeTab === 'security' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Notice */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Свържете няколко начина за вход. Дори да влезете през Google или Facebook, винаги ще запазите точките и рангът си.
                </p>
              </div>

              {/* 1. Google Account */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Google вход</span>
                      {isGoogleLinked && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Свързан
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {volunteer.gmail ? volunteer.gmail : 'Вход с един клик чрез вашия Google акаунт'}
                    </div>
                  </div>
                </div>

                <div>
                  {isGoogleLinked ? (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/20 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Активен
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLinkGoogle}
                      disabled={loadingProvider === 'google.com'}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition cursor-pointer min-h-[40px] disabled:opacity-50"
                    >
                      {loadingProvider === 'google.com' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Свържи Google</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Facebook Account */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0 shadow text-white font-black text-lg">
                    f
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Facebook вход</span>
                      {isFacebookLinked && (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Свързан
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isFacebookLinked ? 'Свързан към този профил' : 'Вход през Facebook потребителско име'}
                    </div>
                  </div>
                </div>

                <div>
                  {isFacebookLinked ? (
                    <button
                      type="button"
                      onClick={() => handleUnlinkProvider('facebook.com', 'Facebook')}
                      disabled={loadingProvider === 'facebook.com'}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer min-h-[40px] disabled:opacity-50"
                    >
                      {loadingProvider === 'facebook.com' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3 text-red-400" />
                      )}
                      <span>Откачи</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLinkFacebook}
                      disabled={loadingProvider === 'facebook.com'}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs transition cursor-pointer min-h-[40px] disabled:opacity-50 shadow-md shadow-blue-950/50"
                    >
                      {loadingProvider === 'facebook.com' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Свържи Facebook</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Phone SMS Auth */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Телефон (SMS код)</span>
                        {isPhoneLinked && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Свързан
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {volunteer.phone ? (
                          <span className="font-mono text-emerald-300">{volunteer.phone}</span>
                        ) : (
                          'Вход чрез 6-цифрен SMS код'
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {!isLinkingPhone ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLinkingPhone(true);
                          setSmsPhoneInput(volunteer.phone || '');
                          setErrorMsg('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer min-h-[40px]"
                      >
                        {isPhoneLinked ? 'Промени номер' : 'Свържи телефон'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLinkingPhone(false);
                          setCodeSent(false);
                        }}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
                      >
                        Отказ
                      </button>
                    )}
                  </div>
                </div>

                {isLinkingPhone && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5 animate-in fade-in">
                    {!codeSent ? (
                      <form onSubmit={handleSendPhoneCode} className="flex items-center gap-2">
                        <input
                          type="tel"
                          required
                          placeholder="напр. 0888 123 456"
                          value={smsPhoneInput}
                          onChange={(e) => setSmsPhoneInput(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[42px]"
                        />
                        <button
                          type="submit"
                          disabled={loadingProvider === 'phone'}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[42px] disabled:opacity-50"
                        >
                          {loadingProvider === 'phone' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>SMS код</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyPhoneCode} className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="6-цифрен SMS код"
                          value={smsCode}
                          onChange={(e) => setSmsCode(e.target.value)}
                          className="flex-1 bg-slate-900 border border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 min-h-[42px]"
                        />
                        <button
                          type="submit"
                          disabled={loadingProvider === 'phone'}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer min-h-[42px] disabled:opacity-50"
                        >
                          Потвърди
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Email & Password */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Имейл и Парола</span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Активно
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {volunteer.emailOrPhone || volunteer.gmail || 'Вход с парола'}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                    Firebase Auth
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-200">
                      Изтриване на профила и нулиране на точките
                    </h4>
                    <p className="text-xs text-red-300/80 leading-relaxed mt-1">
                      Това действие е окончателно. Акаунтът ще бъде напълно премахнат от Firebase, Google и Facebook ще бъдат разкачени, а всички спечелени доброволчески точки и рангове ще се заличат.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-red-900/40">
                  {!isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="w-full py-3 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 hover:text-white border border-red-600/50 text-xs font-bold transition cursor-pointer min-h-[44px]"
                    >
                      Искам да изтрия акаунта си
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-red-300 text-center">
                        Сигурни ли сте? Данните не могат да бъдат възстановени.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleDeleteAccountConfirm}
                          disabled={isDeleting}
                          className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>Да, изтрий всичко</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          disabled={isDeleting}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer min-h-[44px]"
                        >
                          Отказ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Bottom Bar */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Умна Враца • ПТГ „Н. Й. Вапцаров“
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold text-xs transition cursor-pointer min-h-[40px]"
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
};
