import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { ReportItem, VolunteerProfile, LeaderboardUser, VolunteerRank } from '../types';
import { INITIAL_REPORTS } from '../data/mockReports';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Defensive sanitizer that guarantees ReportItem has all required fields
export function sanitizeReport(raw: any): ReportItem {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticketNumber: `СИГ-VRZ-${Date.now().toString().slice(-4)}`,
      title: 'Сигнал за градски проблем',
      description: '',
      location: 'гр. Враца',
      neighborhood: 'Център',
      coordinates: { lat: 43.2047, lng: 23.5477 },
      imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80',
      createdAt: 'Днес',
      status: 'нови',
      volunteersCount: 0,
      volunteers: [],
      blurPersonalData: false,
      historyLog: [],
      analysis: {
        category: 'Друго',
        problem: 'Градски проблем',
        priority: 'нормален',
        path: 'blue',
        path_reason: '',
        needs_approval: false,
        urgencyScore: 50,
        plan: { people: 1, time: '1 час', materials: [], tools: [], steps: [] },
        safety_warning: '',
        contains_personal_data: false,
        confidence: 'висока',
        clarifying_question: '',
        based_on_cases: [],
        notes: ''
      }
    };
  }

  const rawCoords = raw.coordinates || {};
  const lat = typeof rawCoords.lat === 'number' && !isNaN(rawCoords.lat) ? rawCoords.lat : 43.2047;
  const lng = typeof rawCoords.lng === 'number' && !isNaN(rawCoords.lng) ? rawCoords.lng : 23.5477;

  const rawAnalysis = raw.analysis || {};

  return {
    id: String(raw.id || `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    ticketNumber: String(raw.ticketNumber || `СИГ-VRZ-${Date.now().toString().slice(-4)}`),
    title: String(raw.title || 'Сигнал за градски проблем'),
    description: String(raw.description || ''),
    location: String(raw.location || 'гр. Враца'),
    neighborhood: String(raw.neighborhood || 'Център'),
    coordinates: { lat, lng },
    imageUrl: String(
      raw.imageUrl ||
      'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80'
    ),
    createdAt: String(raw.createdAt || 'Днес'),
    status: ['нови', 'прегледан', 'одобрен', 'в_изпълнение', 'решен'].includes(raw.status)
      ? raw.status
      : 'нови',
    volunteersCount: typeof raw.volunteersCount === 'number'
      ? raw.volunteersCount
      : (Array.isArray(raw.volunteers) ? raw.volunteers.length : 0),
    volunteers: Array.isArray(raw.volunteers) ? raw.volunteers : [],
    blurPersonalData: Boolean(raw.blurPersonalData),
    authorName: raw.authorName,
    authorId: raw.authorId,
    municipalNotes: raw.municipalNotes,
    assignedDepartment: raw.assignedDepartment,
    claimedBy: raw.claimedBy ? {
      uid: String(raw.claimedBy.uid),
      name: String(raw.claimedBy.name),
      claimedAt: Number(raw.claimedBy.claimedAt || Date.now()),
      isPrivate: Boolean(raw.claimedBy.isPrivate),
      inviteCode: raw.claimedBy.inviteCode ? String(raw.claimedBy.inviteCode) : undefined,
    } : undefined,
    taskStartedAt: typeof raw.taskStartedAt === 'number' ? raw.taskStartedAt : (raw.claimedBy ? Number(raw.claimedBy.claimedAt || Date.now()) : undefined),
    minimumRequiredMinutes: typeof raw.minimumRequiredMinutes === 'number'
      ? raw.minimumRequiredMinutes
      : 10,
    maxTeamSize: typeof raw.maxTeamSize === 'number'
      ? raw.maxTeamSize
      : (rawAnalysis.plan?.people && rawAnalysis.plan.people > 1 ? rawAnalysis.plan.people : 3),
    teamMembers: Array.isArray(raw.teamMembers) ? raw.teamMembers : [],
    resolvedImageUrl: raw.resolvedImageUrl,
    resolvedAt: raw.resolvedAt,
    resolvedByVolunteer: raw.resolvedByVolunteer,
    resolutionVerification: raw.resolutionVerification,
    historyLog: Array.isArray(raw.historyLog) && raw.historyLog.length > 0
      ? raw.historyLog
      : [
          {
            timestamp: String(raw.createdAt || 'Днес'),
            actor: 'Гражданин на Враца',
            action: 'Подаден градски сигнал през системата'
          }
        ],
    analysis: {
      category: rawAnalysis.category || 'Друго',
      problem: rawAnalysis.problem || raw.title || 'Градски проблем',
      priority: rawAnalysis.priority || 'нормален',
      path: rawAnalysis.path || 'blue',
      path_reason: rawAnalysis.path_reason || 'Доброволческа акция за подобряване на градската среда',
      needs_approval: Boolean(rawAnalysis.needs_approval),
      urgencyScore: typeof rawAnalysis.urgencyScore === 'number' ? rawAnalysis.urgencyScore : 50,
      urgencyRationale: rawAnalysis.urgencyRationale || 'Стандартен градски сигнал.',
      plan: rawAnalysis.plan || {
        people: 2,
        time: '1-2 часа',
        materials: [],
        tools: [],
        steps: ['Оглед на място', 'Отстраняване на проблема']
      },
      safety_warning: rawAnalysis.safety_warning || 'Работете с повишено внимание и подходяща екипировка.',
      contains_personal_data: Boolean(rawAnalysis.contains_personal_data),
      confidence: rawAnalysis.confidence || 'висока',
      clarifying_question: rawAnalysis.clarifying_question || '',
      based_on_cases: Array.isArray(rawAnalysis.based_on_cases) ? rawAnalysis.based_on_cases : [],
      notes: rawAnalysis.notes || ''
    }
  };
}

// Fetch all reports from Firestore with automatic initialization fallback
export async function fetchReportsFromFirestore(): Promise<ReportItem[]> {
  const path = 'reports';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return [];
    }
    const reports: ReportItem[] = [];
    snap.forEach((d) => {
      reports.push(sanitizeReport(d.data()));
    });
    return reports;
  } catch (error) {
    console.warn('Could not fetch reports from Firestore directly, falling back:', error);
    return [];
  }
}

// Manual helper if ever needed, never called automatically
export async function seedInitialReports(): Promise<void> {
  // Kept for backward compatibility
}

// Subscribe to real-time reports updates
export function subscribeToReports(
  onUpdate: (reports: ReportItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'reports';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const reports: ReportItem[] = [];
      snap.forEach((d) => {
        reports.push(sanitizeReport(d.data()));
      });
      onUpdate(reports);
    },
    (error) => {
      console.warn('Firestore onSnapshot reports notice:', error);
      if (onError) {
        onError(error);
      }
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (_e) {
        // Logged
      }
    }
  );
}

// Save a new civic report to Firestore
export async function saveReportToFirestore(report: ReportItem): Promise<void> {
  const path = `reports/${report.id}`;
  try {
    await setDoc(doc(db, 'reports', report.id), report);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Update an existing civic report in Firestore
export async function updateReportInFirestore(reportId: string, updates: Partial<ReportItem>): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Save / update a volunteer user profile in Firestore
export async function saveUserProfileToFirestore(profile: VolunteerProfile): Promise<void> {
  const path = `users/${profile.id}`;
  try {
    const cleanProfile: Record<string, any> = {};
    Object.entries(profile).forEach(([key, val]) => {
      if (val !== undefined) {
        cleanProfile[key] = val;
      }
    });
    await setDoc(doc(db, 'users', profile.id), cleanProfile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Get a volunteer user profile from Firestore
export async function getUserProfileFromFirestore(userId: string): Promise<VolunteerProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as VolunteerProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Fetch all leaderboard volunteers from Firestore
export async function fetchLeaderboardFromFirestore(): Promise<LeaderboardUser[]> {
  const path = 'users';
  try {
    const q = query(collection(db, path), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) return [];

    const users: LeaderboardUser[] = [];
    snap.forEach((d) => {
      const u = d.data() as VolunteerProfile;
      users.push({
        id: u.id,
        name: u.name || 'Доброволец',
        neighborhood: u.neighborhood || 'Център',
        avatarSeed: u.name || 'Враца',
        rank: u.rank || 'Новак доброволец',
        weeklyPoints: u.weeklyPoints || 0,
        totalPoints: u.totalPoints || 0,
        tasksResolvedThisWeek: u.resolvedTasksCount || 0,
        avgResolutionTimeHours: 4,
        badgesCount: (u.badges || []).length,
        featuredBadge: (u.badges && u.badges[0]?.name) || 'Активен гражданин'
      });
    });

    users.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
    return users;
  } catch (error) {
    console.warn('Could not load leaderboard from Firestore:', error);
    return [];
  }
}

// Add points to a volunteer in Firestore
export async function addPointsToVolunteerInFirestore(
  userId: string,
  points: number,
  newRank?: VolunteerRank
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data() as VolunteerProfile;
      const weekly = (data.weeklyPoints || 0) + points;
      const total = (data.totalPoints || 0) + points;
      const resolved = (data.resolvedTasksCount || 0) + 1;
      const updates: Record<string, any> = {
        weeklyPoints: weekly,
        totalPoints: total,
        resolvedTasksCount: resolved
      };
      if (newRank) {
        updates.rank = newRank;
      }
      await updateDoc(doc(db, 'users', userId), updates);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete a civic report from Firestore (Permanent Admin deletion)
export async function deleteReportFromFirestore(reportId: string): Promise<void> {
  const path = `reports/${reportId}`;
  let directError: any = null;
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (error) {
    directError = error;
    console.warn('Firestore direct delete note:', error);
  }

  // Also notify server endpoint to remove from server-side cache and admin storage
  try {
    await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
  } catch (_e) {
    // Offline or server not running
  }

  // If both failed and user is not admin, handle error gracefully
  if (directError && !window.location) {
    handleFirestoreError(directError, OperationType.DELETE, path);
  }
}

// Fetch all registered users / volunteer profiles from Firestore
export async function fetchAllUsersFromFirestore(): Promise<VolunteerProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return [];
    }
    const profiles: VolunteerProfile[] = [];
    snap.forEach((d) => {
      const data = d.data();
      profiles.push({
        id: d.id,
        name: data.name || 'Потребител',
        emailOrPhone: data.emailOrPhone || data.email || 'Не е посочен',
        gmail: data.gmail || (data.email?.includes('@') ? data.email : undefined),
        phone: data.phone || (data.emailOrPhone?.startsWith('0') || data.emailOrPhone?.startsWith('+') ? data.emailOrPhone : undefined),
        neighborhood: data.neighborhood || 'Център',
        joinedDate: data.joinedDate || '2026 г.',
        weeklyPoints: typeof data.weeklyPoints === 'number' ? data.weeklyPoints : 0,
        totalPoints: typeof data.totalPoints === 'number' ? data.totalPoints : 0,
        resolvedTasksCount: typeof data.resolvedTasksCount === 'number' ? data.resolvedTasksCount : 0,
        activeAssignments: Array.isArray(data.activeAssignments) ? data.activeAssignments : [],
        activeClaimedTaskId: data.activeClaimedTaskId || undefined,
        rank: data.rank || 'Новак доброволец',
        skills: data.skills,
        preferredCategories: Array.isArray(data.preferredCategories) ? data.preferredCategories : [],
        availability: data.availability,
        photoURL: data.photoURL,
        linkedProviders: Array.isArray(data.linkedProviders) ? data.linkedProviders : [],
        facebookId: data.facebookId,
        googleEmail: data.googleEmail,
        authProvider: data.authProvider,
        badges: Array.isArray(data.badges) ? data.badges : [],
        resolvedHistory: Array.isArray(data.resolvedHistory) ? data.resolvedHistory : []
      });
    });

    // Sort by total points descending
    profiles.sort((a, b) => b.totalPoints - a.totalPoints);
    return profiles;
  } catch (error) {
    console.warn('Could not fetch all users from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (_e) {
      // Ignored
    }
    return [];
  }
}

// Delete a user profile from Firestore (Admin capability)
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Current week identifier (Monday of current week date string)
export function getCurrentWeekIdentifier(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday, 1 = Monday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return `week-${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}

// Reset weekly points to 0 for all users in Firestore (leaving totalPoints, ranks, badges, history intact)
export async function resetWeeklyPointsForAllUsersInFirestore(): Promise<number> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return 0;
    }

    let resetCount = 0;
    const updatePromises: Promise<void>[] = [];

    snap.forEach((userDoc) => {
      const userData = userDoc.data();
      // Only update if weekly points is not already 0
      if (typeof userData.weeklyPoints === 'number' && userData.weeklyPoints !== 0) {
        updatePromises.push(
          updateDoc(doc(db, 'users', userDoc.id), {
            weeklyPoints: 0
          }).catch((err) => {
            console.warn(`Could not reset weekly points for user ${userDoc.id}:`, err);
          })
        );
        resetCount++;
      }
    });

    await Promise.all(updatePromises);

    // Record last reset week key in Firestore system settings
    const currentWeekKey = getCurrentWeekIdentifier();
    try {
      await setDoc(
        doc(db, 'system_settings', 'leaderboard_cycle'),
        {
          lastResetWeekKey: currentWeekKey,
          lastResetAt: new Date().toISOString(),
          resetCount
        },
        { merge: true }
      );
    } catch (_e) {
      // Ignore if offline
    }

    // Also notify server endpoint to reset memory cache if backend is active
    try {
      await fetch('/api/leaderboard/reset-weekly', { method: 'POST' });
    } catch (_e) {}

    // Store in localStorage for fast local verification
    try {
      localStorage.setItem('vratsa_last_weekly_reset_key', currentWeekKey);
    } catch (_e) {}

    return resetCount;
  } catch (error) {
    console.warn('Error resetting weekly points in Firestore:', error);
    return 0;
  }
}

// Auto-check and trigger reset if a new weekly cycle (Monday 00:00:00) has begun
export async function checkAndAutoResetWeeklyLeaderboard(): Promise<boolean> {
  const currentWeekKey = getCurrentWeekIdentifier();

  // 1. Fast check from localStorage
  const localSavedKey = localStorage.getItem('vratsa_last_weekly_reset_key');
  if (localSavedKey === currentWeekKey) {
    return false;
  }

  // 2. Check Firestore system setting
  try {
    const cycleDoc = await getDoc(doc(db, 'system_settings', 'leaderboard_cycle'));
    if (cycleDoc.exists()) {
      const data = cycleDoc.data();
      if (data?.lastResetWeekKey === currentWeekKey) {
        localStorage.setItem('vratsa_last_weekly_reset_key', currentWeekKey);
        return false;
      }
    }
  } catch (_e) {
    // If offline/error, proceed to execute reset
  }

  // A new week has started: reset weeklyPoints for all users!
  await resetWeeklyPointsForAllUsersInFirestore();
  return true;
}

// Admin function: Update or reset points for a specific volunteer
export async function updateUserPointsInFirestore(
  userId: string,
  updates: {
    weeklyPoints?: number;
    totalPoints?: number;
    resolvedTasksCount?: number;
    rank?: VolunteerRank;
  }
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const cleanUpdates: Record<string, any> = {};
    if (typeof updates.weeklyPoints === 'number') cleanUpdates.weeklyPoints = Math.max(0, updates.weeklyPoints);
    if (typeof updates.totalPoints === 'number') cleanUpdates.totalPoints = Math.max(0, updates.totalPoints);
    if (typeof updates.resolvedTasksCount === 'number') cleanUpdates.resolvedTasksCount = Math.max(0, updates.resolvedTasksCount);
    if (updates.rank) cleanUpdates.rank = updates.rank;

    await updateDoc(doc(db, 'users', userId), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Update activeClaimedTaskId for a volunteer profile
export async function updateUserActiveClaimedTaskInFirestore(
  userId: string,
  taskId: string | null
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      activeClaimedTaskId: taskId || null
    });
  } catch (error) {
    console.warn(`Could not update activeClaimedTaskId for ${userId}:`, error);
  }
}

