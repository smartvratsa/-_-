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
    return INITIAL_REPORTS[0];
  }

  const rawCoords = raw.coordinates || {};
  const lat = typeof rawCoords.lat === 'number' && !isNaN(rawCoords.lat) ? rawCoords.lat : 43.2047;
  const lng = typeof rawCoords.lng === 'number' && !isNaN(rawCoords.lng) ? rawCoords.lng : 23.5477;

  const rawAnalysis = raw.analysis || {};

  return {
    id: String(raw.id || `rep-${Date.now()}`),
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
    municipalNotes: raw.municipalNotes,
    assignedDepartment: raw.assignedDepartment,
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
      seedInitialReports().catch((e) => console.warn('Could not seed initial reports:', e));
      return INITIAL_REPORTS;
    }
    const reports: ReportItem[] = [];
    snap.forEach((d) => {
      reports.push(sanitizeReport(d.data()));
    });
    return reports.length > 0 ? reports : INITIAL_REPORTS;
  } catch (error) {
    console.warn('Could not fetch reports from Firestore directly, falling back:', error);
    return INITIAL_REPORTS;
  }
}

// Seed initial reports into Firestore
export async function seedInitialReports(): Promise<void> {
  try {
    for (const report of INITIAL_REPORTS) {
      await setDoc(doc(db, 'reports', report.id), report, { merge: true });
    }
  } catch (err) {
    console.warn('Initial seeding notice:', err);
  }
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
      if (!snap.empty) {
        const reports: ReportItem[] = [];
        snap.forEach((d) => {
          reports.push(sanitizeReport(d.data()));
        });
        if (reports.length > 0) {
          onUpdate(reports);
        }
      }
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

// Delete a civic report from Firestore (Admin capability)
export async function deleteReportFromFirestore(reportId: string): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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
        rank: data.rank || 'Новак доброволец',
        skills: data.skills,
        preferredCategories: Array.isArray(data.preferredCategories) ? data.preferredCategories : [],
        availability: data.availability,
        photoURL: data.photoURL,
        linkedProviders: Array.isArray(data.linkedProviders) ? data.linkedProviders : [],
        facebookId: data.facebookId,
        googleEmail: data.googleEmail,
        authProvider: data.authProvider,
        badges: Array.isArray(data.badges) ? data.badges : []
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
