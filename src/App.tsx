/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  fetchReportsFromFirestore,
  subscribeToReports,
  saveReportToFirestore,
  updateReportInFirestore,
  saveUserProfileToFirestore,
  addPointsToVolunteerInFirestore,
  deleteReportFromFirestore,
  sanitizeReport,
  checkAndAutoResetWeeklyLeaderboard,
  updateUserActiveClaimedTaskInFirestore
} from './lib/firestoreService';
import { Header } from './components/Header';
import { VratsaInteractiveMap } from './components/VratsaInteractiveMap';
import { SubmitSection } from './components/SubmitSection';
import { ReportListSection } from './components/ReportListSection';
import { VolunteerLeaderboardSection } from './components/VolunteerLeaderboardSection';
import { ResolutionModal } from './components/ResolutionModal';
import { SolvedCasesSection } from './components/SolvedCasesSection';
import { GuideSection } from './components/GuideSection';
import { VolunteerRegistrationModal } from './components/VolunteerRegistrationModal';
import { VolunteerProfileDashboard } from './components/VolunteerProfileDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ADMIN_USER_ID, isAdminUser } from './constants/admin';
import { INITIAL_REPORTS } from './data/mockReports';
import { ReportItem, VolunteerProfile } from './types';
import { LOGO_PATH, HERO_VIDEO_PATH, handleImageError } from './constants/assets';
import {
  Building2,
  Heart,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Sparkles,
  Map,
  Users,
  AlertCircle,
  User
} from 'lucide-react';

export default function App() {
  // 'map' is default tab for central map prominence
  const [activeTab, setActiveTab] = useState<'map' | 'submit' | 'reports' | 'leaderboard' | 'solved' | 'guide' | 'profile'>('map');
  const [userRole, setUserRole] = useState<'citizen' | 'official'>('citizen');

  // Reports state synced with localStorage (cleans stale placeholders)
  const [reports, setReports] = useState<ReportItem[]>(() => {
    try {
      const saved = localStorage.getItem('vratsa_civic_reports');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonMock = parsed.filter(
            (r: any) =>
              r &&
              r.id &&
              !/^rep-(10|[1-9])$/.test(String(r.id)) &&
              !(typeof r.ticketNumber === 'string' && r.ticketNumber.includes('VRZ-2026-0'))
          );
          if (nonMock.length > 0) {
            return nonMock.map(sanitizeReport);
          }
        }
      }
    } catch (e) {
      console.warn('Could not read saved reports from localStorage:', e);
    }
    return [];
  });

  // Current volunteer profile synced with localStorage
  const [currentVolunteer, setCurrentVolunteer] = useState<VolunteerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('vratsa_volunteer_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read saved volunteer profile:', e);
    }
    return null;
  });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [prefilledCoords, setPrefilledCoords] = useState<{ lat: number; lng: number; districtName: string } | null>(null);
  const [resolutionReport, setResolutionReport] = useState<ReportItem | null>(null);
  const [selectedCaseCode, setSelectedCaseCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'card'>('signup');
  const [forceShowVolunteerProfile, setForceShowVolunteerProfile] = useState(false);

  // Helper: Start of current weekly leaderboard cycle (Monday 00:00:00)
  const getStartOfCurrentWeek = (): number => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sunday, 1 = Monday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  };

  // Weekly cleanup: automatically delete resolved problems from past weekly cycles from Firestore
  // to avoid cluttering the active signals count, while preserving volunteer account points,
  // badges, and resolved history permanently!
  useEffect(() => {
    const mondayTime = getStartOfCurrentWeek();
    const oldResolved = reports.filter((r) => {
      if (r.status !== 'решен') return false;
      if (r.resolvedAt) {
        const resDate = new Date(r.resolvedAt).getTime();
        return !isNaN(resDate) && resDate < mondayTime;
      }
      return true; // resolved without date
    });

    if (oldResolved.length > 0) {
      oldResolved.forEach((r) => {
        deleteReportFromFirestore(r.id).catch(() => {});
        fetch(`/api/reports/${r.id}`, { method: 'DELETE' }).catch(() => {});
      });

      setReports((prev) => prev.filter((r) => !oldResolved.some((p) => p.id === r.id)));
    }
  }, [reports.length]);

  // Weekly leaderboard cycle auto-reset check:
  // When a new week starts (Monday 00:00:00), reset weekly points to 0 for all users
  // while preserving all total points, badges, and history!
  useEffect(() => {
    checkAndAutoResetWeeklyLeaderboard()
      .then((wasReset) => {
        if (wasReset && currentVolunteer && currentVolunteer.weeklyPoints > 0) {
          setCurrentVolunteer((prev) =>
            prev ? { ...prev, weeklyPoints: 0 } : null
          );
        }
      })
      .catch((e) => console.warn('Weekly cycle check notice:', e));
  }, []);

  // Admin report deletion handler
  const handleDeleteReport = async (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    try {
      localStorage.setItem(
        'vratsa_civic_reports',
        JSON.stringify(reports.filter((r) => r.id !== reportId))
      );
    } catch (_e) {}
    try {
      await deleteReportFromFirestore(reportId);
    } catch (e) {
      console.warn('Could not delete report from Firestore:', e);
    }
    fetch(`/api/reports/${reportId}`, { method: 'DELETE' }).catch(() => {});
    showToast('Сигналът беше успешно изтрит от системата!');
  };

  // Load reports from Firestore & backend with real-time Firestore sync
  useEffect(() => {
    // 1. Initial fetch from Firestore
    fetchReportsFromFirestore()
      .then((data) => {
        if (Array.isArray(data)) {
          const clean = data.filter(
            (r) => !/^rep-(10|[1-9])$/.test(String(r.id)) && !r.ticketNumber?.includes('VRZ-2026-0')
          );
          setReports(clean);
        }
      })
      .catch((err) => console.info('Firestore initial fetch fallback:', err));

    // 2. Real-time Firestore onSnapshot listener
    const unsubscribe = subscribeToReports((updatedReports) => {
      const clean = (updatedReports || []).filter(
        (r) => !/^rep-(10|[1-9])$/.test(String(r.id)) && !r.ticketNumber?.includes('VRZ-2026-0')
      );
      setReports(clean);
    });

    // 3. Fallback check to /api/reports if Express server is running
    fetch('/api/reports')
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const clean = data.filter(
            (r) => !/^rep-(10|[1-9])$/.test(String(r.id)) && !r.ticketNumber?.includes('VRZ-2026-0')
          );
          if (clean.length > 0) {
            setReports(clean);
          }
        }
      })
      .catch(() => {});

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync reports to localStorage backup
  useEffect(() => {
    try {
      localStorage.setItem('vratsa_civic_reports', JSON.stringify(reports));
    } catch (e) {
      console.warn('Could not save reports to localStorage:', e);
    }
  }, [reports]);

  // Sync volunteer
  useEffect(() => {
    if (currentVolunteer) {
      try {
        localStorage.setItem('vratsa_volunteer_profile', JSON.stringify(currentVolunteer));
      } catch (e) {
        console.warn('Could not save volunteer profile to localStorage:', e);
      }
    }
  }, [currentVolunteer]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Add new report created by citizen + award 50 points
  const handleReportCreated = (newReport: ReportItem) => {
    // 1. Add report to local state immediately
    setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
    setActiveTab('map');
    setSelectedReportId(newReport.id);

    // 2. Award 50 points to the user for uploading/submitting a signal
    if (currentVolunteer) {
      const awardedPoints = 50;
      const newWeekly = (currentVolunteer.weeklyPoints || 0) + awardedPoints;
      const newTotal = (currentVolunteer.totalPoints || 0) + awardedPoints;

      // Determine rank progression
      let newRank = currentVolunteer.rank;
      if (newTotal >= 1500) newRank = 'Легенда на Враца';
      else if (newTotal >= 1000) newRank = 'Почетен гражданин';
      else if (newTotal >= 500) newRank = 'Градски майстор';
      else if (newTotal >= 200) newRank = 'Квартален пазител';

      const reporterBadge = {
        id: 'active-reporter',
        name: 'Буден гражданин 📢',
        icon: 'Sparkles',
        description: 'Подаден градски сигнал за по-добра Враца (+50 т.)',
        earnedDate: 'Днес'
      };

      const updatedBadges = currentVolunteer.badges.some((b) => b.id === 'active-reporter')
        ? currentVolunteer.badges
        : [...currentVolunteer.badges, reporterBadge];

      const updatedVolunteer: VolunteerProfile = {
        ...currentVolunteer,
        weeklyPoints: newWeekly,
        totalPoints: newTotal,
        rank: newRank,
        badges: updatedBadges
      };

      setCurrentVolunteer(updatedVolunteer);

      // Direct Firestore user profile sync
      saveUserProfileToFirestore(updatedVolunteer).catch((e) =>
        console.warn('Could not save user profile with new points:', e)
      );

      // Direct Firestore points sync
      addPointsToVolunteerInFirestore(currentVolunteer.id, awardedPoints, newRank).catch((e) =>
        console.warn('Could not add points in Firestore:', e)
      );

      // Backend sync
      fetch('/api/users/add-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentVolunteer.id,
          points: awardedPoints,
          rank: newRank
        })
      }).catch(() => {});

      showToast(`Сигнал ${newReport.ticketNumber} е регистриран! Спечелихте +50 точки за гражданска активност! 🎯`);
    } else {
      showToast(`Сигнал ${newReport.ticketNumber} е регистриран! Влезте в профила си, за да запазите +50 точки за класацията.`);
    }

    // If user chose to auto-claim this report immediately upon posting
    if (newReport.claimedBy && currentVolunteer) {
      const updatedWithClaim: VolunteerProfile = {
        ...currentVolunteer,
        activeClaimedTaskId: newReport.id,
        activeAssignments: Array.from(new Set([...currentVolunteer.activeAssignments, newReport.id]))
      };
      setCurrentVolunteer(updatedWithClaim);
      saveUserProfileToFirestore(updatedWithClaim).catch(() => {});
      updateUserActiveClaimedTaskInFirestore(currentVolunteer.id, newReport.id).catch(() => {});
      showToast(`Успешно качихте и поехте задача ${newReport.ticketNumber}! AI таймерът стартира. ⏱️`);
    }

    // 3. Save directly to Firestore
    saveReportToFirestore(newReport).catch((e) => console.warn('Could not save to Firestore:', e));

    // 4. Optional backend sync
    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport),
    }).catch(() => {});
  };

  // Map pin drop -> populate submit
  const handleMapClickNewSignal = (coords: { lat: number; lng: number; districtName: string }) => {
    setPrefilledCoords(coords);
    showToast(`Посочена локация в кв. ${coords.districtName}. Можете да опишете сигнала.`);
    setActiveTab('submit');
  };

  // Open Login modal
  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setIsRegisterModalOpen(true);
  };

  // Open Sign Up modal
  const handleOpenSignUp = () => {
    setAuthModalMode('signup');
    setIsRegisterModalOpen(true);
  };

  // Open Profile digital card modal
  const handleOpenProfile = () => {
    if (currentVolunteer) {
      setActiveTab('profile');
    } else {
      setAuthModalMode('login');
      setIsRegisterModalOpen(true);
    }
  };

  // Register as volunteer
  const handleRegisterVolunteer = (profile: VolunteerProfile) => {
    setCurrentVolunteer(profile);
    showToast(`Добре дошли в доброволческия отряд на Враца, ${profile.name}! +50 начални точки.`);

    // Direct Firestore sync
    saveUserProfileToFirestore(profile).catch((e) => console.warn('Could not sync user to Firestore:', e));

    // Optional backend sync
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: profile.id,
        email: profile.gmail || profile.emailOrPhone,
        name: profile.name,
        neighborhood: profile.neighborhood,
        phone: profile.phone,
        rank: profile.rank,
        weeklyPoints: profile.weeklyPoints,
        totalPoints: profile.totalPoints,
        skills: profile.skills,
      }),
    }).catch(() => {});
  };

  // Login as volunteer
  const handleLoginVolunteer = (profile: VolunteerProfile) => {
    setCurrentVolunteer(profile);
    showToast(`Успешен вход! Добре дошли отново, ${profile.name} (${profile.weeklyPoints} т.).`);

    // Direct Firestore sync
    saveUserProfileToFirestore(profile).catch((e) => console.warn('Could not sync user to Firestore:', e));

    // Optional backend sync
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: profile.id,
        email: profile.gmail || profile.emailOrPhone,
        name: profile.name,
        neighborhood: profile.neighborhood,
        phone: profile.phone,
        rank: profile.rank,
        weeklyPoints: profile.weeklyPoints,
        totalPoints: profile.totalPoints,
        skills: profile.skills,
      }),
    }).catch(() => {});
  };


  const handleLogoutVolunteer = () => {
    signOut(auth).catch(() => {});
    setCurrentVolunteer(null);
    try {
      localStorage.removeItem('vratsa_volunteer_profile');
    } catch (e) {
      console.warn('Could not remove volunteer profile:', e);
    }
    showToast('Успешно излязохте от доброволческия профил.');
  };

  // Volunteer join handler
  const handleJoinVolunteer = (reportId: string, name?: string) => {
    if (!currentVolunteer && !name) {
      setAuthModalMode('login');
      setIsRegisterModalOpen(true);
      showToast('За да поемете задача, влезте в профила си (Login) или се регистрирайте (Sign Up).');
      return;
    }
    const volName = name || currentVolunteer?.name || 'Гражданин доброволец';
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          const updatedVolunteers = r.volunteers.includes(volName) ? r.volunteers : [...r.volunteers, volName];
          return {
            ...r,
            volunteersCount: updatedVolunteers.length,
            volunteers: updatedVolunteers,
            status: r.status === 'нови' ? 'прегледан' : r.status,
            historyLog: [
              ...r.historyLog,
              {
                timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                actor: volName,
                action: 'Записа се като доброволец за тази градска инициатива'
              }
            ]
          };
        }
        return r;
      })
    );

    // Update volunteer profile assignments
    if (currentVolunteer) {
      setCurrentVolunteer((prev) =>
        prev
          ? {
              ...prev,
              activeAssignments: Array.from(new Set([...prev.activeAssignments, reportId]))
            }
          : null
      );
    }

    // Direct Firestore update
    const targetReport = reports.find((r) => r.id === reportId);
    if (targetReport) {
      const updatedVolunteers = targetReport.volunteers.includes(volName)
        ? targetReport.volunteers
        : [...targetReport.volunteers, volName];
      updateReportInFirestore(reportId, {
        volunteersCount: updatedVolunteers.length,
        volunteers: updatedVolunteers,
        status: targetReport.status === 'нови' ? 'прегледан' : targetReport.status,
        historyLog: [
          ...targetReport.historyLog,
          {
            timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actor: volName,
            action: 'Записа се като доброволец за тази градска инициатива'
          }
        ]
      }).catch((e) => console.warn('Could not update report in Firestore:', e));
    }

    showToast(`Благодарим, ${volName}! Записан сте като доброволец за тази задача.`);
  };

  // Municipal approval handler
  const handleApproveByOfficial = (reportId: string, notes: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'одобрен',
            municipalNotes: notes,
            historyLog: [
              ...r.historyLog,
              {
                timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                actor: 'Служител Община Враца',
                action: `Одобрен план за действие: ${notes}`
              }
            ]
          };
        }
        return r;
      })
    );

    // Sync to Firestore
    updateReportInFirestore(reportId, {
      status: 'одобрен',
      municipalNotes: notes
    }).catch((e) => console.warn('Could not update approval in Firestore:', e));

    showToast('Планът за действие е официално одобрен от Община Враца.');
  };

  // Assign department handler
  const handleAssignDepartment = (reportId: string, dept: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'в_изпълнение',
            assignedDepartment: dept,
            historyLog: [
              ...r.historyLog,
              {
                timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                actor: 'Служител Община Враца',
                action: `Възложена аварийна / ремонтна дейност на: ${dept}`
              }
            ]
          };
        }
        return r;
      })
    );

    // Sync to Firestore
    updateReportInFirestore(reportId, {
      status: 'в_изпълнение',
      assignedDepartment: dept
    }).catch((e) => console.warn('Could not update department in Firestore:', e));

    showToast(`Сигналът е насочен към: ${dept}`);
  };

  // Task Claim Handler (Take charge as Leader with 1-active-task limit)
  const handleClaimTask = (reportId: string, isPrivate: boolean, inviteCode?: string) => {
    if (!currentVolunteer) {
      handleOpenLogin();
      return;
    }

    if (currentVolunteer.activeClaimedTaskId && currentVolunteer.activeClaimedTaskId !== reportId) {
      showToast('⚠️ Вече имате 1 активна поета задача! Завършете я, преди да поемете нова.');
      return;
    }

    const now = Date.now();
    const minMinutes = 10;
    const targetReport = reports.find((r) => r.id === reportId);
    const maxTeam = targetReport?.maxTeamSize || targetReport?.analysis?.plan?.people || 3;

    const claimedPayload = {
      uid: currentVolunteer.id,
      name: currentVolunteer.name,
      claimedAt: now,
      isPrivate,
      inviteCode
    };

    const teamPayload = [{ uid: currentVolunteer.id, name: currentVolunteer.name, joinedAt: now }];

    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'в_изпълнение',
            volunteersCount: 1,
            volunteers: [currentVolunteer.name],
            claimedBy: claimedPayload,
            taskStartedAt: now,
            minimumRequiredMinutes: minMinutes,
            maxTeamSize: maxTeam,
            teamMembers: teamPayload,
            historyLog: [
              ...r.historyLog,
              {
                timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                actor: currentVolunteer.name,
                action: isPrivate
                  ? `Пое задачата като ръководител (с код за достъп). Отговорът ще е възможен след 10 мин.`
                  : `Пое задачата като ръководител (отворен екип). Отговорът ще е възможен след 10 мин.`,
                badge: 'Поета задача'
              }
            ]
          };
        }
        return r;
      })
    );

    // Update volunteer profile with 1 active claimed task limit
    const updatedVolunteer: VolunteerProfile = {
      ...currentVolunteer,
      activeClaimedTaskId: reportId,
      activeAssignments: Array.from(new Set([...currentVolunteer.activeAssignments, reportId]))
    };
    setCurrentVolunteer(updatedVolunteer);
    saveUserProfileToFirestore(updatedVolunteer).catch(() => {});
    updateUserActiveClaimedTaskInFirestore(currentVolunteer.id, reportId).catch(() => {});

    // Sync report to Firestore
    updateReportInFirestore(reportId, {
      status: 'в_изпълнение',
      volunteersCount: 1,
      volunteers: [currentVolunteer.name],
      claimedBy: claimedPayload,
      taskStartedAt: now,
      minimumRequiredMinutes: minMinutes,
      maxTeamSize: maxTeam,
      teamMembers: teamPayload
    }).catch((e) => console.warn('Could not claim task in Firestore:', e));

    showToast('Успешно поехте задачата! След 10 минути ще можете да отговорите на сигнала. ⏱️');
  };

  // Join Task as Team Member (No 1-task limit on joining!)
  const handleJoinTeam = (reportId: string, inviteCodeInput?: string) => {
    if (!currentVolunteer) {
      handleOpenLogin();
      return;
    }

    const targetReport = reports.find((r) => r.id === reportId);
    if (!targetReport) return;

    if (targetReport.claimedBy?.isPrivate && targetReport.claimedBy?.inviteCode) {
      if (inviteCodeInput !== targetReport.claimedBy.inviteCode) {
        showToast('Грешен код за достъп!');
        return;
      }
    }

    const now = Date.now();
    const existingMembers = targetReport.teamMembers || [];
    if (existingMembers.some((m) => m.uid === currentVolunteer.id)) {
      showToast('Вече сте част от екипа на тази задача!');
      return;
    }

    const maxTeam = targetReport.maxTeamSize || targetReport.analysis?.plan?.people || 3;
    if (existingMembers.length >= maxTeam) {
      showToast(`Екипът е запълнен (макс. ${maxTeam} души).`);
      return;
    }

    const newTeamMember = { uid: currentVolunteer.id, name: currentVolunteer.name, joinedAt: now };
    const updatedTeam = [...existingMembers, newTeamMember];
    const updatedVolunteers = Array.from(new Set([...targetReport.volunteers, currentVolunteer.name]));

    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            volunteersCount: updatedTeam.length,
            volunteers: updatedVolunteers,
            teamMembers: updatedTeam,
            historyLog: [
              ...r.historyLog,
              {
                timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                actor: currentVolunteer.name,
                action: `Се присъедини към екипа на ${targetReport.claimedBy?.name || 'задачата'}`
              }
            ]
          };
        }
        return r;
      })
    );

    setCurrentVolunteer((prev) =>
      prev
        ? {
            ...prev,
            activeAssignments: Array.from(new Set([...prev.activeAssignments, reportId]))
          }
        : null
    );

    updateReportInFirestore(reportId, {
      volunteersCount: updatedTeam.length,
      volunteers: updatedVolunteers,
      teamMembers: updatedTeam
    }).catch((e) => console.warn('Could not join task in Firestore:', e));

    showToast(`Присъединихте се към екипа на „${targetReport.title}“! 👥`);
  };

  // Leave / Release Task (Leader releases task or team member leaves team)
  const handleReleaseTask = (reportId: string) => {
    const targetReport = reports.find((r) => r.id === reportId);
    if (!targetReport || !currentVolunteer) return;

    const isLeader = targetReport.claimedBy?.uid === currentVolunteer.id;

    if (isLeader) {
      // Leader drops the task -> reset task so other volunteers can claim it
      setReports((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            return {
              ...r,
              status: 'одобрен',
              claimedBy: undefined,
              taskStartedAt: undefined,
              teamMembers: [],
              volunteersCount: 0,
              volunteers: [],
              historyLog: [
                ...r.historyLog,
                {
                  timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  actor: currentVolunteer.name,
                  action: 'Остави сигнала и освободи задачата за други граждани.'
                }
              ]
            };
          }
          return r;
        })
      );

      const updatedVolunteer: VolunteerProfile = {
        ...currentVolunteer,
        activeClaimedTaskId: undefined,
        activeAssignments: currentVolunteer.activeAssignments.filter((id) => id !== reportId)
      };
      setCurrentVolunteer(updatedVolunteer);
      saveUserProfileToFirestore(updatedVolunteer).catch(() => {});
      updateUserActiveClaimedTaskInFirestore(currentVolunteer.id, null).catch(() => {});

      updateReportInFirestore(reportId, {
        status: 'одобрен',
        claimedBy: undefined,
        taskStartedAt: undefined,
        teamMembers: [],
        volunteersCount: 0,
        volunteers: []
      }).catch(() => {});

      showToast('Успешно оставихте сигнала! Вече можете да поемете друг сигнал.');
    } else {
      // Team member leaves
      const updatedTeam = (targetReport.teamMembers || []).filter((m) => m.uid !== currentVolunteer.id);
      const updatedVolunteers = targetReport.volunteers.filter((v) => v !== currentVolunteer.name);

      setReports((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            return {
              ...r,
              teamMembers: updatedTeam,
              volunteers: updatedVolunteers,
              volunteersCount: updatedTeam.length,
              historyLog: [
                ...r.historyLog,
                {
                  timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  actor: currentVolunteer.name,
                  action: 'Напусна екипа на сигнала.'
                }
              ]
            };
          }
          return r;
        })
      );

      const updatedVolunteer: VolunteerProfile = {
        ...currentVolunteer,
        activeAssignments: currentVolunteer.activeAssignments.filter((id) => id !== reportId)
      };
      setCurrentVolunteer(updatedVolunteer);
      saveUserProfileToFirestore(updatedVolunteer).catch(() => {});

      updateReportInFirestore(reportId, {
        teamMembers: updatedTeam,
        volunteers: updatedVolunteers,
        volunteersCount: updatedTeam.length
      }).catch(() => {});

      showToast('Успешно напуснахте екипа на този сигнал.');
    }
  };

  // Resolution photo success handler with Team Synergy Bonus & multi-member points distribution
  const handleResolutionSuccess = (
    updatedReport: ReportItem,
    pointsAwardedPerMember: number,
    teamMembers: { uid: string; name: string }[]
  ) => {
    setReports((prev) => prev.map((r) => (r.id === updatedReport.id ? updatedReport : r)));

    // Distribute points to ALL team members in Firestore
    teamMembers.forEach((member) => {
      if (member.uid && member.uid !== 'temp-lead') {
        addPointsToVolunteerInFirestore(member.uid, pointsAwardedPerMember).catch(() => {});
      }
    });

    // Clear activeClaimedTaskId for the task leader
    const leaderUid = updatedReport.claimedBy?.uid;
    if (leaderUid) {
      updateUserActiveClaimedTaskInFirestore(leaderUid, null).catch(() => {});
    }

    // Update current volunteer profile if they were part of the team
    if (currentVolunteer && teamMembers.some((m) => m.uid === currentVolunteer.id)) {
      const newWeekly = (currentVolunteer.weeklyPoints || 0) + pointsAwardedPerMember;
      const newTotal = (currentVolunteer.totalPoints || 0) + pointsAwardedPerMember;
      const newResolvedCount = (currentVolunteer.resolvedTasksCount || 0) + 1;

      let newRank = currentVolunteer.rank;
      if (newTotal >= 1500) newRank = 'Легенда на Враца';
      else if (newTotal >= 1000) newRank = 'Почетен гражданин';
      else if (newTotal >= 500) newRank = 'Градски майстор';
      else if (newTotal >= 200) newRank = 'Квартален пазител';

      const resolutionEntry = {
        id: updatedReport.id,
        ticketNumber: updatedReport.ticketNumber,
        title: updatedReport.title,
        neighborhood: updatedReport.neighborhood,
        location: updatedReport.location,
        resolvedAt: updatedReport.resolvedAt,
        resolvedImageUrl: updatedReport.resolvedImageUrl,
        pointsAwarded: pointsAwardedPerMember,
      };

      const updatedHistory = [
        ...(currentVolunteer.resolvedHistory || []).filter((h) => h.id !== updatedReport.id),
        resolutionEntry
      ];

      const updatedVolunteer: VolunteerProfile = {
        ...currentVolunteer,
        weeklyPoints: newWeekly,
        totalPoints: newTotal,
        resolvedTasksCount: newResolvedCount,
        rank: newRank,
        activeClaimedTaskId: currentVolunteer.activeClaimedTaskId === updatedReport.id ? undefined : currentVolunteer.activeClaimedTaskId,
        activeAssignments: currentVolunteer.activeAssignments.filter((id) => id !== updatedReport.id),
        resolvedHistory: updatedHistory,
      };

      setCurrentVolunteer(updatedVolunteer);
      saveUserProfileToFirestore(updatedVolunteer).catch(() => {});
    }

    // Direct Firestore report resolution sync
    updateReportInFirestore(updatedReport.id, {
      status: 'решен',
      resolvedImageUrl: updatedReport.resolvedImageUrl,
      resolvedAt: updatedReport.resolvedAt,
      resolvedByVolunteer: updatedReport.resolvedByVolunteer,
      resolutionVerification: updatedReport.resolutionVerification
    }).catch((e) => console.warn('Could not sync resolution to Firestore:', e));

    showToast(`Поздравления! Задачата е успешно решена. Всеки член на екипа получи +${pointsAwardedPerMember} точки! 🏆`);
    setResolutionReport(null);
  };

  // Open solved case detail
  const handleSelectCase = (caseCode: string) => {
    setSelectedCaseCode(caseCode);
    setActiveTab('solved');
  };

  const activeReportsCount = reports.filter((r) => r.status !== 'решен').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Google Maps Error Notice Banner */}
      {quotaExceeded && (
        <div className="bg-amber-950/90 border-b border-amber-600/40 text-amber-200 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-center gap-3">
          <span>Невъзможно зареждане на картата или надвишена квота на API ключа. Моля, проверете настройките на ключа или мрежовата връзка.</span>
          <button
            onClick={() => setQuotaExceeded(false)}
            className="text-amber-400 hover:text-white underline text-xs font-medium cursor-pointer"
          >
            Затвори
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-slideUp max-w-[90vw]">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        reportsCount={activeReportsCount}
        currentVolunteer={currentVolunteer}
        onOpenRegisterModal={handleOpenSignUp}
        onOpenLogin={handleOpenLogin}
        onOpenSignUp={handleOpenSignUp}
        onOpenProfile={handleOpenProfile}
        onLogout={handleLogoutVolunteer}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8 pb-28 sm:pb-12">
        {/* TAB 1: Central Map (EXCLUSIVELY Map view with zero duplicate signals feed) */}
        {activeTab === 'map' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Cinematic Silent Video Hero Section (Responsive on Desktop & Mobile) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 shadow-2xl bg-slate-950 min-h-[380px] sm:min-h-[460px] md:min-h-[500px] flex flex-col justify-between group">
              {/* Background Video with audio completely disabled */}
              <video
                src={HERO_VIDEO_PATH}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-transform duration-700 group-hover:scale-105"
              />

              {/* High-contrast dark gradient overlays to guarantee text & button legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-slate-950/90 pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />

              {/* Hero Top & Center Content */}
              <div className="relative z-10 p-5 sm:p-8 flex flex-col items-center text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
                {/* Civic Platform Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Умна Враца • Платформа на ПТГ „Н. Й. Вапцаров“</span>
                </div>

                {/* Main Prominent Headline */}
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-tight">
                  Интелигентна платформа за <span className="text-emerald-400">модерна Враца</span>
                </h2>

                {/* Subtitle description */}
                <p className="text-xs sm:text-base text-slate-200 max-w-2xl font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] leading-relaxed">
                  Градски сигнали с AI анализ в реално време, интерактивна карта и доброволческа лига за чист, подреден и сигурен град.
                </p>
              </div>

              {/* Floating Bottom Action Cards Bar (Desktop & Mobile optimized) */}
              <div className="relative z-10 p-3 sm:p-6 w-full">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-2 sm:gap-4 bg-slate-950/85 backdrop-blur-xl border border-slate-700/80 rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 shadow-2xl shadow-black/80">
                  {/* Card 1: Подай сигнал */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('submit')}
                    className="group/btn flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-95 text-center sm:text-left"
                    title="Подай нов сигнал с AI анализ"
                  >
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Подай сигнал</div>
                      <div className="text-[10px] sm:text-xs text-emerald-100 hidden sm:block">AI триаж по снимка</div>
                    </div>
                  </button>

                  {/* Card 2: Списък със сигнали */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="group/btn flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 hover:text-white transition-all cursor-pointer border border-slate-700/80 hover:border-slate-500 shadow-md hover:scale-[1.02] active:scale-95 text-center sm:text-left"
                    title="Разгледай списъка с активни сигнали"
                  >
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate flex items-center justify-center sm:justify-start gap-1">
                        <span>Сигнали</span>
                        <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                          {activeReportsCount}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Активни в града</div>
                    </div>
                  </button>

                  {/* Card 3: Седмична класация */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('leaderboard')}
                    className="group/btn flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-amber-200 hover:text-amber-100 transition-all cursor-pointer border border-amber-500/30 hover:border-amber-400/60 shadow-md hover:scale-[1.02] active:scale-95 text-center sm:text-left"
                    title="Виж доброволческата класация"
                  >
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Класация</div>
                      <div className="text-[10px] sm:text-xs text-amber-300/80 hidden sm:block">Доброволци & точки</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Central Interactive Map of Vratsa */}
            <VratsaInteractiveMap
              reports={reports}
              selectedReportId={selectedReportId}
              onSelectReport={(id) => {
                setSelectedReportId(id);
              }}
              onNavigateToReportList={(id) => {
                setSelectedReportId(id);
                setActiveTab('reports');
              }}
              onMapClickNewSignal={handleMapClickNewSignal}
              onVolunteerAction={(id) => handleJoinVolunteer(id)}
              onResolveAction={(id) => {
                const target = reports.find((r) => r.id === id);
                if (target) setResolutionReport(target);
              }}
              userRole={userRole}
              currentVolunteerName={currentVolunteer?.name}
            />
          </div>
        )}

        {/* TAB 2: Submit New Signal */}
        {activeTab === 'submit' && (
          <SubmitSection
            onReportCreated={handleReportCreated}
            userRole={userRole}
            onSelectCase={handleSelectCase}
            prefilledCoords={prefilledCoords}
            onSwitchToMap={() => setActiveTab('map')}
            currentVolunteer={currentVolunteer}
            onOpenLogin={handleOpenLogin}
          />
        )}

        {/* TAB 3: Reports List Only */}
        {activeTab === 'reports' && (
          <ReportListSection
            reports={reports}
            userRole={userRole}
            onJoinVolunteer={(id, name) => handleJoinVolunteer(id, name)}
            onApproveByOfficial={handleApproveByOfficial}
            onAssignDepartment={handleAssignDepartment}
            onSelectCase={handleSelectCase}
            onOpenResolutionModal={(report) => setResolutionReport(report)}
            isAdmin={isAdminUser(currentVolunteer)}
            onDeleteReport={handleDeleteReport}
            focusedReportId={selectedReportId}
            currentVolunteer={currentVolunteer}
            onOpenLogin={handleOpenLogin}
            onClaimTask={handleClaimTask}
            onJoinTeam={handleJoinTeam}
            onReleaseTask={handleReleaseTask}
          />
        )}

        {/* TAB 4: Volunteer Leaderboard & Points */}
        {activeTab === 'leaderboard' && (
          <VolunteerLeaderboardSection
            currentVolunteer={currentVolunteer}
            onRegisterVolunteer={handleRegisterVolunteer}
            onOpenRegisterModal={handleOpenSignUp}
            onOpenLogin={handleOpenLogin}
            onOpenSignUp={handleOpenSignUp}
            onOpenReport={(id) => {
              setSelectedReportId(id);
              setActiveTab('map');
            }}
          />
        )}

        {/* TAB 5: Solved Cases Archive */}
        {activeTab === 'solved' && (
          <SolvedCasesSection
            selectedCaseCode={selectedCaseCode}
            onClearSelection={() => setSelectedCaseCode(null)}
          />
        )}

        {/* TAB 6: Guide & Safety Rules */}
        {activeTab === 'guide' && <GuideSection />}

        {/* TAB 7: My Volunteer Profile & Dashboard / Admin Dashboard */}
        {activeTab === 'profile' && (
          currentVolunteer ? (
            isAdminUser(currentVolunteer) && !forceShowVolunteerProfile ? (
              <AdminDashboard
                currentVolunteer={currentVolunteer}
                reports={reports}
                onDeleteReport={handleDeleteReport}
                userRole={userRole}
                setUserRole={setUserRole}
                onLogout={handleLogoutVolunteer}
                onNavigateToMap={() => setActiveTab('map')}
                onSwitchToVolunteerDashboard={() => setForceShowVolunteerProfile(true)}
                onResetWeeklyPoints={() => {
                  if (currentVolunteer) {
                    setCurrentVolunteer((prev) => (prev ? { ...prev, weeklyPoints: 0 } : null));
                  }
                  showToast('Седмичната класация беше занулена за новата седмица! Всички започват от 0 т.');
                }}
              />
            ) : (
              <div className="space-y-4">
                {isAdminUser(currentVolunteer) && (
                  <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-xl">
                    <span className="text-xs text-emerald-300 font-semibold flex items-center gap-2">
                      <span className="text-base">👑</span>
                      <span>В момента сте в личен доброволчески изглед на Администратора</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setForceShowVolunteerProfile(false)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition shadow-md shadow-emerald-950 flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Към Админ Дашборд</span>
                    </button>
                  </div>
                )}
                <VolunteerProfileDashboard
                  volunteer={currentVolunteer}
                  reports={reports}
                  onUpdateProfile={(updated) => {
                    setCurrentVolunteer(updated);
                    showToast('Профилът беше успешно обновен!');
                  }}
                  onLogout={handleLogoutVolunteer}
                  onResolveReport={(report) => setResolutionReport(report)}
                  onNavigateToMap={() => setActiveTab('map')}
                  onNavigateToGuide={() => setActiveTab('guide')}
                  onLeaveTask={handleReleaseTask}
                />
              </div>
            )
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
                👤
              </div>
              <h3 className="text-lg font-bold text-white">Влезте в профила си</h3>
              <p className="text-xs text-slate-400">
                За да достъпите личния си доброволчески панел или административния център, моля влезте с Google или с имейл и парола.
              </p>
              <button
                onClick={handleOpenLogin}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Вход (Login) / Регистрация</span>
              </button>
            </div>
          )
        )}
      </main>

      {/* Resolution Photo & AI Verification Modal */}
      {resolutionReport && (
        <ResolutionModal
          report={resolutionReport}
          volunteerName={currentVolunteer?.name || 'Доброволец от Враца'}
          onClose={() => setResolutionReport(null)}
          onSuccess={handleResolutionSuccess}
          isAdmin={isAdminUser(currentVolunteer)}
        />
      )}

      {/* Volunteer Registration & Digital Profile Card Modal */}
      <VolunteerRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={handleRegisterVolunteer}
        onLogin={handleLoginVolunteer}
        currentVolunteer={currentVolunteer}
        onLogout={handleLogoutVolunteer}
        initialMode={authModalMode}
      />

      {/* Mobile Sticky Bottom Navigation Dock (Phone Ergonomics) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 sm:hidden shadow-2xl pb-[env(safe-area-inset-bottom,4px)] pt-1 px-1">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* 1. Map */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('map');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[54px] ${
              activeTab === 'map'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'map' ? 'bg-emerald-500/15' : ''}`}>
              <Map className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Карта</span>
          </button>

          {/* 2. Reports */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer relative min-w-[54px] ${
              activeTab === 'reports'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors relative ${activeTab === 'reports' ? 'bg-blue-500/15' : ''}`}>
              <AlertCircle className="w-5 h-5" />
              {reports.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-mono text-[9px] font-bold px-1 rounded-full min-w-[15px] h-[15px] flex items-center justify-center border border-slate-900">
                  {reports.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Сигнали</span>
          </button>

          {/* 3. Center Highlight: Submit Signal */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('submit');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center -mt-4 px-2 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/80 border-2 border-emerald-300 active:scale-95 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 mt-1">Подай</span>
          </button>

          {/* 4. Leaderboard */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('leaderboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[54px] ${
              activeTab === 'leaderboard'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'leaderboard' ? 'bg-amber-500/15' : ''}`}>
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Класация</span>
          </button>

          {/* 5. Profile or Login */}
          <button
            type="button"
            onClick={() => {
              if (currentVolunteer) {
                setActiveTab('profile');
              } else {
                handleOpenLogin();
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[54px] ${
              activeTab === 'profile'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-emerald-500/15' : ''}`}>
              {currentVolunteer?.photoURL ? (
                <img
                  src={currentVolunteer.photoURL}
                  alt={currentVolunteer.name}
                  className="w-5 h-5 rounded-full object-cover border border-emerald-400"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">
              {currentVolunteer
                ? isAdminUser(currentVolunteer)
                  ? 'Админ'
                  : 'Профил'
                : 'Вход'}
            </span>
          </button>
        </div>
      </nav>

      {/* Civic Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs text-slate-400 mt-12 mb-14 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white p-0.5 border-2 border-emerald-400/80 shadow-md shrink-0">
                <img
                  src={LOGO_PATH}
                  alt="Умна Враца - ПТГ Н. Й. Вапцаров"
                  className="w-full h-full object-contain rounded-full"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
              </div>
              <div>
                <span className="font-extrabold text-white text-sm block">
                  Умна Враца
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold block">
                  Платформа на ПТГ „Н. Й. Вапцаров“
                </span>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Съвместна инициатива на ПТГ „Н. Й. Вапцаров“ за автоматизиран AI триаж на градски сигнали, интерактивна карта и седмично състезание за най-активните доброволци.
            </p>
            <div className="flex items-center gap-1.5 text-slate-300 pt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>ул. „Стефанаки Савов“ № 6, 3000 Враца</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-white text-xs uppercase tracking-wider block">
              Аварийни контакти и дежурни служби
            </span>
            <ul className="space-y-1 text-slate-300">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-red-400" />
                <span>Единен европейски номер за спешни повиквания: <strong>112</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Дежурен по Общински съвет Враца: <strong>092 / 62 45 81</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Сигнали: obshtinavr@b-trust.org</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-white text-xs uppercase tracking-wider block">
              Защита на данните и AI безопасност
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI асистентът анализира наложителността и автоматично маркира лични данни за замъгляване. При високоволтови електрически проводници и тежки пътни аварии гражданите се насочват към лицензирани аварийни екипи.
            </p>
            <div className="flex items-center gap-1 text-slate-500 text-[11px] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Градски помощник Враца • AI асистент с човешки контрол</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 py-4 px-4 text-center text-slate-400 text-[11px] flex items-center justify-between max-w-7xl mx-auto flex-wrap gap-2">
          <span>„Умна Враца“ • Платформа на ПТГ „Н. Й. Вапцаров“ • Всички права запазени © 2026</span>
          <span className="font-mono tabular-nums text-slate-400">Версия 2.0 · Интерактивна карта & Доброволческа лига</span>
        </div>
      </footer>
    </div>
  );
}
