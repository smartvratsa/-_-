import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleAuthProvider, facebookAuthProvider } from '../lib/firebase.ts';
import { saveUserProfileToFirestore, getUserProfileFromFirestore } from '../lib/firestoreService';
import {
  LogIn,
  UserPlus,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  MapPin,
  Sparkles,
  Trophy,
  CheckCircle2,
  X,
  Award,
  Calendar,
  Wrench,
  Clock,
  Shield,
  LogOut,
  Edit3,
  Lightbulb,
  Trash2,
  Hammer,
  Trees,
  Check,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { VolunteerProfile, VolunteerRank } from '../types.ts';
import { VRATSA_DISTRICTS } from '../data/mockReports.ts';
import { LOGO_PATH, handleImageError } from '../constants/assets';
import { ADMIN_USER_ID } from '../constants/admin';

interface VolunteerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (profile: VolunteerProfile) => void;
  onLogin?: (profile: VolunteerProfile) => void;
  currentVolunteer?: VolunteerProfile | null;
  onLogout?: () => void;
  initialMode?: 'login' | 'signup' | 'card';
}

const CATEGORY_INTERESTS = [
  { id: 'lighting', label: 'Осветление и електрозахранване', icon: Lightbulb, color: 'text-amber-400' },
  { id: 'potholes', label: 'Дупки и пътна настилка', icon: Hammer, color: 'text-orange-400' },
  { id: 'cleanliness', label: 'Чистота и отпадъци', icon: Trash2, color: 'text-emerald-400' },
  { id: 'parks', label: 'Зелени площи и паркове', icon: Trees, color: 'text-green-400' },
  { id: 'general', label: 'Общи доброволчески акции', icon: Sparkles, color: 'text-cyan-400' }
];

const AVAILABILITY_OPTIONS = [
  'Уикенди (събота / неделя)',
  'Делнични дни след 17:30',
  'По всяко време при спешни повиквания',
  'Гъвкаво (по предварително съгласуване)'
];


export const VolunteerRegistrationModal: React.FC<VolunteerRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  onLogin,
  currentVolunteer,
  onLogout,
  initialMode = 'signup'
}) => {
  // Modes: 'login', 'signup', 'card'
  const [activeMode, setActiveMode] = useState<'login' | 'signup' | 'card'>(initialMode);

  // Sign up fields
  const [name, setName] = useState('');
  const [gmail, setGmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [neighborhood, setNeighborhood] = useState('Център');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'lighting',
    'cleanliness'
  ]);
  const [skills, setSkills] = useState('');
  const [availability, setAvailability] = useState('Уикенди (събота / неделя)');
  const [contactMode, setContactMode] = useState<'gmail' | 'phone'>('gmail');

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Live real-time email existence verification state
  const [emailValidationState, setEmailValidationState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
    suggestedCorrection?: string;
  }>({ status: 'idle' });

  // Debounced real-time email existence check (DNS MX verification)
  useEffect(() => {
    if (activeMode !== 'signup' || contactMode !== 'gmail') {
      setEmailValidationState({ status: 'idle' });
      return;
    }

    const clean = gmail.trim().toLowerCase();
    if (!clean) {
      setEmailValidationState({ status: 'idle' });
      return;
    }

    // Fast check: requires @ and domain with at least 1 dot
    if (!clean.includes('@') || !clean.split('@')[1]?.includes('.')) {
      setEmailValidationState({
        status: 'invalid',
        message: 'Непълен имейл адрес. Въведете валиден формат (напр. ime@domain.bg)',
      });
      return;
    }

    setEmailValidationState({
      status: 'checking',
      message: 'Проверка дали пощенският домейн съществува в интернет...',
    });

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/validate-email?email=${encodeURIComponent(clean)}`);
        if (!res.ok) {
          setEmailValidationState({ status: 'idle' });
          return;
        }
        const data = await res.json();
        if (data.valid) {
          setEmailValidationState({
            status: 'valid',
            message: 'Имейл адресът съществува (активен пощенски сървър).',
          });
        } else {
          setEmailValidationState({
            status: 'invalid',
            message: data.error || 'Несъществуващ имейл или домейн.',
            suggestedCorrection: data.suggestedCorrection,
          });
        }
      } catch (e) {
        console.warn('Real-time email check fallback:', e);
        setEmailValidationState({ status: 'idle' });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [gmail, activeMode, contactMode]);

  // Sync state when modal opens or initialMode changes
  useEffect(() => {
    if (!isOpen) return;

    if (currentVolunteer && initialMode === 'card') {
      setActiveMode('card');
      setName(currentVolunteer.name);
      setGmail(currentVolunteer.gmail || (currentVolunteer.emailOrPhone.includes('@') ? currentVolunteer.emailOrPhone : ''));
      setPhone(currentVolunteer.phone || (!currentVolunteer.emailOrPhone.includes('@') ? currentVolunteer.emailOrPhone : ''));
      setNeighborhood(currentVolunteer.neighborhood || 'Център');
      setSkills(currentVolunteer.skills || '');
      setAvailability(currentVolunteer.availability || AVAILABILITY_OPTIONS[0]);
      if (currentVolunteer.preferredCategories && currentVolunteer.preferredCategories.length > 0) {
        setSelectedCategories(currentVolunteer.preferredCategories);
      }
    } else if (initialMode === 'login') {
      setActiveMode('login');
    } else {
      setActiveMode(currentVolunteer ? 'card' : 'signup');
    }

    setErrorMsg('');
    setSuccessMsg('');
  }, [isOpen, initialMode, currentVolunteer]);

  if (!isOpen) return null;

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleAppendDomain = (domain: string) => {
    const raw = gmail.split('@')[0].trim();
    if (raw) {
      setGmail(`${raw}${domain}`);
    } else {
      setGmail(`dobrovolec${domain}`);
    }
  };

  // Google Sign-In Popup with Firebase Auth
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      if (!user) throw new Error('Неуспешна аутентикация с Google.');

      // Check existing profile in Firestore
      let existingProfile: VolunteerProfile | null = null;
      try {
        existingProfile = await getUserProfileFromFirestore(user.uid);
      } catch (_e) {
        // Fallback
      }

      const userProfile: VolunteerProfile = existingProfile || {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Доброволец',
        emailOrPhone: user.email || '',
        gmail: user.email || '',
        neighborhood: 'Център',
        joinedDate: 'Днес',
        weeklyPoints: 50,
        totalPoints: 50,
        resolvedTasksCount: 0,
        activeAssignments: [],
        rank: 'Новак доброволец' as VolunteerRank,
        photoURL: user.photoURL || undefined,
        authProvider: 'google',
        googleEmail: user.email || undefined,
        linkedProviders: ['google.com'],
        badges: [
          {
            id: 'welcome-badge',
            name: 'Активен гражданин на Враца 🤝',
            icon: 'Users',
            description: 'Успешна регистрация през Google в отряда на Враца',
            earnedDate: 'Днес'
          }
        ]
      };

      // Direct Firestore persistence
      await saveUserProfileToFirestore(userProfile).catch((err) => {
        console.warn('Firestore user profile save notice:', err);
      });

      // Optional backend sync (non-fatal on static hosting like GitHub Pages)
      fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email || '',
          name: userProfile.name,
          photoURL: userProfile.photoURL,
          authProvider: 'google',
          googleEmail: user.email || undefined,
          linkedProviders: ['google.com'],
          isNewRegistration: !existingProfile,
        }),
      }).catch(() => {});

      if (onLogin) onLogin(userProfile);
      else onRegister(userProfile);
      onClose();
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('Домейнът (напр. вашият GitHub Pages URL) все още не е добавен в списъка с оторизирани домейни във Firebase Console -> Authentication -> Settings -> Authorized domains. Добавете вашия домейн (*.github.io), за да ползвате Google вход, или ползвайте Email/Парола или Бърз вход.');
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Прозорецът за вход с Google беше затворен преди приключване.');
      } else {
        setErrorMsg(err.message || 'Възникна грешка при вход с Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Facebook Sign-In Popup with Firebase Auth
  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(auth, facebookAuthProvider);
      const user = result.user;
      if (!user) throw new Error('Неуспешен вход с Facebook.');

      const fbUid = user.providerData.find((p) => p.providerId === 'facebook.com')?.uid || user.uid;

      let existingProfile: VolunteerProfile | null = null;
      try {
        existingProfile = await getUserProfileFromFirestore(user.uid);
      } catch (_e) {}

      const userProfile: VolunteerProfile = existingProfile || {
        id: user.uid,
        name: user.displayName || 'Facebook Доброволец',
        emailOrPhone: user.email || `${fbUid}@facebook.vratsa.bg`,
        gmail: user.email || undefined,
        neighborhood: 'Център',
        joinedDate: 'Днес',
        weeklyPoints: 50,
        totalPoints: 50,
        resolvedTasksCount: 0,
        activeAssignments: [],
        rank: 'Новак доброволец' as VolunteerRank,
        photoURL: user.photoURL || undefined,
        authProvider: 'facebook',
        facebookId: fbUid,
        linkedProviders: ['facebook.com'],
        badges: [
          {
            id: 'welcome-badge',
            name: 'Активен гражданин на Враца 🤝',
            icon: 'Users',
            description: 'Успешна регистрация през Facebook в отряда на Враца',
            earnedDate: 'Днес'
          }
        ]
      };

      await saveUserProfileToFirestore(userProfile).catch(() => {});

      fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: userProfile.emailOrPhone,
          name: userProfile.name,
          photoURL: userProfile.photoURL,
          authProvider: 'facebook',
          facebookId: fbUid,
          linkedProviders: ['facebook.com'],
          isNewRegistration: !existingProfile,
        }),
      }).catch(() => {});

      if (onLogin) onLogin(userProfile);
      else onRegister(userProfile);
      onClose();
    } catch (err: any) {
      console.warn('Facebook sign-in notice:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('Домейнът не е в списъка с оторизирани домейни във Firebase Console -> Authentication -> Settings -> Authorized domains.');
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Прозорецът за вход с Facebook беше затворен преди приключване.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setErrorMsg('Вече съществува профил със същия имейл адрес. Моля, влезте с Google или парола и свържете Facebook от настройките на акаунта.');
      } else {
        setErrorMsg(err.message || 'Възникна грешка при вход с Facebook.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Login with real Firebase Auth & Database verification
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setErrorMsg('Моля, въведете имейл, Gmail или телефонен номер.');
      return;
    }

    setIsLoading(true);
    try {
      const isEmail = identifier.includes('@');

      if (isEmail && loginPassword) {
        try {
          // Real Firebase Authentication with Email & Password
          const userCredential = await signInWithEmailAndPassword(auth, identifier, loginPassword);
          const user = userCredential.user;
          if (user) {
            // Load or create Firestore profile
            let loadedProfile: VolunteerProfile | null = null;
            try {
              loadedProfile = await getUserProfileFromFirestore(user.uid);
            } catch (_e) {}

            const profile: VolunteerProfile = loadedProfile || {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Доброволец',
              emailOrPhone: user.email || identifier,
              gmail: user.email || identifier,
              neighborhood: 'Център',
              joinedDate: 'Днес',
              weeklyPoints: 50,
              totalPoints: 50,
              resolvedTasksCount: 0,
              activeAssignments: [],
              rank: 'Новак доброволец' as VolunteerRank,
              authProvider: 'password',
              linkedProviders: ['password'],
              badges: [
                {
                  id: 'welcome-badge',
                  name: 'Активен гражданин на Враца 🤝',
                  icon: 'Users',
                  description: 'Успешен вход в доброволческия отряд на Враца',
                  earnedDate: 'Днес'
                }
              ]
            };

            await saveUserProfileToFirestore(profile).catch(() => {});

            // Optional backend sync (non-blocking)
            fetch('/api/auth/firebase-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: user.uid,
                email: user.email || identifier,
                name: profile.name,
                authProvider: 'password',
              }),
            }).catch(() => {});

            if (onLogin) onLogin(profile);
            else onRegister(profile);
            onClose();
            return;
          }
        } catch (fbErr: any) {
          console.warn('Firebase Email/Password login notice:', fbErr.code, fbErr.message);
          if (fbErr.code === 'auth/wrong-password') {
            throw new Error('Грешна парола за този Firebase профил. Моля, проверете въведените данни.');
          } else if (
            fbErr.code === 'auth/user-not-found' ||
            fbErr.code === 'auth/invalid-credential'
          ) {
            throw new Error(
              'Няма намерен потребител с този имейл във Firebase или акаунтът не съществува. Моля, преминете към раздел „Регистрация“ (Sign Up), за да създадете нов профил.'
            );
          } else if (fbErr.code === 'auth/too-many-requests') {
            throw new Error('Твърде много неуспешни опити. Моля, изчакайте няколко минути преди следващ опит.');
          } else if (fbErr.code === 'auth/invalid-email') {
            throw new Error('Моля, въведете валиден имейл адрес (напр. ime@gmail.com).');
          } else if (fbErr.code === 'auth/operation-not-allowed') {
            throw new Error('Email/Password автентикацията трябва да се активира във Firebase Console -> Authentication -> Sign-in method.');
          } else {
            throw new Error(fbErr.message || 'Неуспешен вход във Firebase.');
          }
        }
      } else {
        // Phone or username login fallback
        let profileToLogin: VolunteerProfile | null = null;
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier,
              password: loginPassword || undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              profileToLogin = data.profile;
            }
          }
        } catch (_e) {
          // Fallback if backend offline
        }

        if (!profileToLogin) {
          profileToLogin = {
            id: `vol-${Date.now()}`,
            name: identifier,
            emailOrPhone: identifier,
            phone: identifier.includes('@') ? undefined : identifier,
            gmail: identifier.includes('@') ? identifier : undefined,
            neighborhood: 'Център',
            joinedDate: 'Днес',
            weeklyPoints: 50,
            totalPoints: 50,
            resolvedTasksCount: 0,
            activeAssignments: [],
            rank: 'Новак доброволец' as VolunteerRank,
            badges: [
              {
                id: 'welcome-badge',
                name: 'Активен гражданин на Враца 🤝',
                icon: 'Users',
                description: 'Успешна регистрация в доброволческия отряд на Враца',
                earnedDate: 'Днес'
              }
            ]
          };
        }

        if (onLogin) onLogin(profileToLogin);
        else onRegister(profileToLogin);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Грешка при вход в профила.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Sign Up with real Firebase Auth & Database persistence
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Моля, въведете трите или двете си имена.');
      return;
    }

    const cleanGmail = gmail.trim();
    if (contactMode === 'gmail') {
      if (!cleanGmail) {
        setErrorMsg('Моля, въведете имейл адрес.');
        return;
      }
      if (emailValidationState.status === 'invalid') {
        setErrorMsg(emailValidationState.message || 'Имейл адресът не съществува или домейнът няма пощенски сървър.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanGmail)) {
        setErrorMsg('Моля, въведете валиден имейл адрес (напр. ime@gmail.com).');
        return;
      }
    }

    const cleanPhone = phone.trim();
    if (contactMode === 'phone' && !cleanPhone) {
      setErrorMsg('Моля, въведете телефонен номер.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Моля, създайте сигурна парола от поне 6 символа.');
      return;
    }

    setIsLoading(true);
    try {
      let createdProfile: VolunteerProfile | null = null;

      // Real Firebase Email/Password Registration
      if (contactMode === 'gmail' && cleanGmail) {
        let userCredential: any = null;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, cleanGmail, password);
        } catch (fbErr: any) {
          console.warn('Firebase createUserWithEmailAndPassword notice:', fbErr.code, fbErr.message);
          if (fbErr.code === 'auth/email-already-in-use') {
            throw new Error('Този имейл адрес вече е регистриран във Firebase Authentication. Моля, преминете към раздел „Вход“ (Login).');
          } else if (fbErr.code === 'auth/weak-password') {
            throw new Error('Паролата във Firebase трябва да съдържа най-малко 6 символа.');
          } else if (fbErr.code === 'auth/invalid-email') {
            throw new Error('Моля, въведете валиден имейл адрес (напр. ime@gmail.com).');
          } else if (fbErr.code === 'auth/operation-not-allowed') {
            throw new Error('Email/Password автентикацията все още не е активна във Firebase Console -> Authentication -> Sign-in method.');
          } else {
            throw new Error(fbErr.message || 'Грешка при регистрация във Firebase Authentication.');
          }
        }

        if (userCredential?.user) {
          try {
            await updateProfile(userCredential.user, { displayName: name.trim() });
          } catch (profileErr) {
            console.warn('Firebase updateProfile notice:', profileErr);
          }

          createdProfile = {
            id: userCredential.user.uid,
            name: name.trim(),
            emailOrPhone: cleanGmail,
            gmail: cleanGmail,
            phone: cleanPhone || undefined,
            neighborhood,
            joinedDate: 'Днес',
            weeklyPoints: 50,
            totalPoints: 50,
            resolvedTasksCount: 0,
            activeAssignments: [],
            rank: 'Новак доброволец' as VolunteerRank,
            skills: skills.trim() || undefined,
            availability,
            preferredCategories: selectedCategories,
            authProvider: 'password',
            linkedProviders: ['password'],
            badges: [
              {
                id: 'welcome-badge',
                name: 'Активен гражданин на Враца 🤝',
                icon: 'Users',
                description: 'Успешна регистрация в доброволческия отряд на Враца',
                earnedDate: 'Днес'
              }
            ]
          };

          // Direct Firestore save
          await saveUserProfileToFirestore(createdProfile).catch((err) => {
            console.warn('Could not save user profile to Firestore:', err);
          });

          // Optional backend sync (non-fatal)
          fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: userCredential.user.uid,
              email: userCredential.user.email || cleanGmail,
              name: name.trim(),
              phone: cleanPhone || undefined,
              neighborhood,
              skills: skills.trim() || undefined,
              availability,
              preferredCategories: selectedCategories,
              authProvider: 'password',
              isNewRegistration: true,
            }),
          }).catch(() => {});
        }
      } else {
        // Phone-based registration fallback
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              phone: cleanPhone,
              password,
              neighborhood,
              skills: skills.trim() || undefined,
              availability,
              preferredCategories: selectedCategories,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              createdProfile = data.profile;
            }
          }
        } catch (_e) {}

        if (!createdProfile) {
          const phoneUid = `vol-${Date.now()}`;
          createdProfile = {
            id: phoneUid,
            name: name.trim(),
            emailOrPhone: cleanPhone,
            phone: cleanPhone,
            neighborhood,
            joinedDate: 'Днес',
            weeklyPoints: 50,
            totalPoints: 50,
            resolvedTasksCount: 0,
            activeAssignments: [],
            rank: 'Новак доброволец' as VolunteerRank,
            skills: skills.trim() || undefined,
            availability,
            preferredCategories: selectedCategories,
            authProvider: 'phone',
            linkedProviders: ['phone'],
            badges: [
              {
                id: 'welcome-badge',
                name: 'Активен гражданин на Враца 🤝',
                icon: 'Users',
                description: 'Успешна регистрация в доброволческия отряд на Враца',
                earnedDate: 'Днес'
              }
            ]
          };
          saveUserProfileToFirestore(createdProfile).catch(() => {});
        }
      }

      if (createdProfile) {
        onRegister(createdProfile);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Възникна проблем при регистрацията.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          title="Затвори"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Navigation Tabs: LOGIN vs SIGN UP (or DIGITAL CARD if logged in) */}
        <div className="flex items-center gap-1.5 mb-5 p-1 bg-slate-950 rounded-2xl border border-slate-800 w-full sm:w-fit">
          <button
            type="button"
            onClick={() => {
              setActiveMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'login'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700 ring-1 ring-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LogIn className={`w-3.5 h-3.5 ${activeMode === 'login' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Login (Вход)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('signup');
              setErrorMsg('');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'signup'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserPlus className={`w-3.5 h-3.5 ${activeMode === 'signup' ? 'text-emerald-100' : 'text-slate-400'}`} />
            <span>Sign Up (Регистрация)</span>
            {!currentVolunteer && (
              <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono ml-0.5">
                +50 т.
              </span>
            )}
          </button>

          {currentVolunteer && (
            <button
              type="button"
              onClick={() => {
                setActiveMode('card');
                setErrorMsg('');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'card'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Профил</span>
            </button>
          )}
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ==============================================================
            TAB 1: LOGIN (ВХОД)
            ============================================================== */}
        {activeMode === 'login' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-emerald-400 p-0.5 shrink-0 shadow-lg shadow-emerald-950/50">
                <img
                  src={LOGO_PATH}
                  alt="Доброволци Враца"
                  className="w-full h-full object-contain rounded-full"
                  onError={handleImageError}
                />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Вход в профила</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 border border-slate-700 text-emerald-400 rounded-lg">
                    Login
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Влезте, за да поемате градски сигнали във Враца и да трупате точки
                </p>
              </div>
            </div>

            {/* Social Logins: Google & Facebook */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-3 rounded-2xl shadow-lg border border-slate-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer text-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Вход с Google</span>
              </button>

              {/* Facebook Sign-In Button */}
              <button
                type="button"
                onClick={handleFacebookSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold px-3.5 py-3 rounded-2xl shadow-lg shadow-blue-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer text-xs"
              >
                <div className="w-4 h-4 rounded-full bg-white text-[#1877F2] flex items-center justify-center font-black text-[11px] shrink-0">
                  f
                </div>
                <span>Вход с Facebook</span>
              </button>
            </div>

            <div className="flex items-center gap-3 my-1 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="flex items-center gap-1.5 text-emerald-400/90 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                или с имейл / парола (Firebase Auth)
              </span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>


            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email / Username / Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Gmail, имейл или телефон</span>
                  <span className="text-[10px] text-slate-400 font-normal">или име на доброволец</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-emerald-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="напр. stefan.vratsa@gmail.com или 0888123456"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">Парола</label>
                  <span className="text-[10px] text-slate-400">По избор за свободни доброволци</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                  <span>Запомни ме на това устройство</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/80 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Вход (Login)</span>
                </button>
              </div>
            </form>

            {/* Switch to Sign Up */}
            <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
              <span>Нямате акаунт за доброволческия отряд? </span>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('signup');
                  setErrorMsg('');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
              >
                Регистрация (Sign Up) • +50 т.
              </button>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 2: SIGN UP (РЕГИСТРАЦИЯ)
            ============================================================== */}
        {activeMode === 'signup' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Form Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-emerald-400 p-0.5 shrink-0 shadow-lg shadow-emerald-950/50">
                <img
                  src={LOGO_PATH}
                  alt="Доброволци Враца"
                  className="w-full h-full object-contain rounded-full"
                  onError={handleImageError}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {currentVolunteer ? 'Редактиране на профил' : 'Регистрация (Sign Up)'}
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> +50 т.
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Платформа на ПТГ „Н. Й. Вапцаров“ и Община Враца
                </p>
              </div>
            </div>

            {/* Quick banner */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Бърза регистрация с име и Gmail / телефон</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Получавате <strong>+50 начални точки</strong> и право да поемате градски сигнали, да качвате снимки за решение и да се състезавате в седмичната класация на Враца.
              </p>
            </div>

            {/* Fast Social Sign Up: Google & Facebook */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Google Fast Sign Up */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-3 rounded-2xl shadow-lg border border-slate-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer text-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Регистрация с Google</span>
              </button>

              {/* Facebook Fast Sign Up */}
              <button
                type="button"
                onClick={handleFacebookSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold px-3.5 py-3 rounded-2xl shadow-lg shadow-blue-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer text-xs"
              >
                <div className="w-4 h-4 rounded-full bg-white text-[#1877F2] flex items-center justify-center font-black text-[11px] shrink-0">
                  f
                </div>
                <span>Регистрация с Facebook</span>
              </button>
            </div>

            <div className="flex items-center gap-3 my-1 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="flex items-center gap-1.5 text-emerald-400/90 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                или регистрация с имейл и парола (Firebase Auth)
              </span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              {/* 1. Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Име и фамилия *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ще се изписва в класацията</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Стефан Димитров"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* 2. Contact Tabs: Gmail vs Phone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    <span>Контакт за регистрация (Sign Up)</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setContactMode('gmail')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        contactMode === 'gmail'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gmail / Имейл
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactMode('phone')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        contactMode === 'phone'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Телефон
                    </button>
                  </div>
                </div>

                {contactMode === 'gmail' ? (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <div className="relative">
                      <Mail className={`w-4 h-4 absolute left-3 top-2.5 pointer-events-none transition-colors ${
                        emailValidationState.status === 'valid'
                          ? 'text-emerald-400'
                          : emailValidationState.status === 'invalid'
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`} />
                      <input
                        type="email"
                        required
                        placeholder="вашият.имейл@gmail.com"
                        value={gmail}
                        onChange={(e) => setGmail(e.target.value)}
                        className={`w-full bg-slate-950 border rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all ${
                          emailValidationState.status === 'valid'
                            ? 'border-emerald-500/80 ring-1 ring-emerald-500/30'
                            : emailValidationState.status === 'invalid'
                            ? 'border-red-500/80 ring-1 ring-red-500/30'
                            : emailValidationState.status === 'checking'
                            ? 'border-amber-500/60 ring-1 ring-amber-500/20'
                            : 'border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        }`}
                      />
                      {/* Status indicator inside input */}
                      <div className="absolute right-3 top-2.5">
                        {emailValidationState.status === 'checking' && (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        )}
                        {emailValidationState.status === 'valid' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {emailValidationState.status === 'invalid' && (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>

                    {/* Live validation feedback banner */}
                    {emailValidationState.status === 'checking' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 pl-1">
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                        <span>Проверява се дали пощенският сървър (домейн) съществува в интернет...</span>
                      </div>
                    )}

                    {emailValidationState.status === 'valid' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium pl-1 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{emailValidationState.message || 'Имейл адресът съществува и има валиден пощенски сървър.'}</span>
                      </div>
                    )}

                    {emailValidationState.status === 'invalid' && (
                      <div className="text-[11px] text-red-300 pl-1 bg-red-950/40 p-2 rounded-lg border border-red-500/40 space-y-1">
                        <div className="flex items-start gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span>{emailValidationState.message}</span>
                        </div>
                        {emailValidationState.suggestedCorrection && (
                          <div className="pt-1 border-t border-red-800/40 flex items-center justify-between text-[11px]">
                            <span className="text-amber-200">Имахте предвид:</span>
                            <button
                              type="button"
                              onClick={() => setGmail(emailValidationState.suggestedCorrection!)}
                              className="font-bold text-amber-300 underline hover:text-white transition-colors cursor-pointer"
                            >
                              {emailValidationState.suggestedCorrection}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick domain buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400">Бързо добавяне:</span>
                      <button
                        type="button"
                        onClick={() => handleAppendDomain('@gmail.com')}
                        className="text-[10px] bg-slate-800 hover:bg-emerald-950/80 hover:text-emerald-300 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 transition-colors cursor-pointer"
                      >
                        + @gmail.com
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAppendDomain('@abv.bg')}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 transition-colors cursor-pointer"
                      >
                        + @abv.bg
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="tel"
                        placeholder="напр. 0888 123 456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Password (optional for easy citizen participation) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">Парола за профила</label>
                  <span className="text-[10px] text-slate-400">По избор</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Създайте парола или оставете празно за бърз вход"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 4. Neighborhood */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Предпочитан квартал във Враца</span>
                </label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {VRATSA_DISTRICTS.filter((d) => d.id !== 'all').map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Category Interests */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Области за помощ</span>
                  <span className="text-[10px] text-slate-400 font-normal">Изберете поне една</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CATEGORY_INTERESTS.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`flex items-center gap-2 p-1.5 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-[11px] leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Отказ
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/80 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-100" />
                  <span>
                    {currentVolunteer ? 'Запази промените' : 'Регистрация (Sign Up) • +50 т.'}
                  </span>
                </button>
              </div>
            </form>

            {/* Switch to Login */}
            <div className="pt-2.5 border-t border-slate-800 text-center text-xs text-slate-400">
              <span>Вече имате профил? </span>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('login');
                  setErrorMsg('');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
              >
                Вход (Login)
              </button>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 3: DIGITAL CARD VIEW (Когато потребителят е влязъл)
            ============================================================== */}
        {activeMode === 'card' && currentVolunteer && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* ID Card Graphic */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/40 p-6 shadow-2xl shadow-emerald-950/40">
              <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-emerald-400 p-0.5 shrink-0 shadow-md">
                    <img
                      src={LOGO_PATH}
                      alt="Доброволци Враца"
                      className="w-full h-full object-contain rounded-full"
                      onError={handleImageError}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Официален доброволчески отряд
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      ДОБРОВОЛЦИ ВРАЦА
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-md border border-emerald-500/30 font-bold block">
                    ID: #{currentVolunteer.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ПТГ „Н. Й. Вапцаров“
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Име на доброволеца:</div>
                  <div className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    {currentVolunteer.name}
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>кв. {currentVolunteer.neighborhood}</span>
                    <span>·</span>
                    <span className="text-slate-400">
                      {currentVolunteer.gmail || currentVolunteer.emailOrPhone}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center min-w-[120px]">
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    Седмични точки
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-300 tabular-nums">
                    {currentVolunteer.weeklyPoints}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {currentVolunteer.rank}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentVolunteer.badges.length} спечелени значки</span>
                </div>
                <div>
                  <span className="text-slate-500">Член от: </span>
                  <span className="text-slate-300 font-medium">{currentVolunteer.joinedDate}</span>
                </div>
              </div>
            </div>

            {/* Badges preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Постижения и значки</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentVolunteer.badges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                      ★
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{b.name}</div>
                      <div className="text-[11px] text-slate-400">{b.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onLogout?.();
                  setActiveMode('login');
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Изход от профила (Logout)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMode('signup')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Редактирай данни</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-emerald-950 cursor-pointer"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
