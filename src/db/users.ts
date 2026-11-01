import crypto from 'crypto';
import { adminDb } from '../lib/firebase-admin.ts';
import { validateEmailExistence } from '../lib/emailValidator.ts';

const COLLECTION = 'users';
const SALT = '_vratsa_volunteer_sec_2026';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

export interface UserRecord {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  neighborhood: string;
  rank: string;
  weeklyPoints: number;
  totalPoints: number;
  resolvedCount: number;
  activeAssignments?: string[];
  skills?: string;
  availability?: string;
  preferredCategories?: string[];
  photoURL?: string;
  passwordHash?: string;
  authProvider?: 'password' | 'google' | 'facebook' | 'phone' | 'legacy' | string;
  facebookId?: string;
  googleEmail?: string;
  linkedProviders?: string[];
  createdAt: string;
  updatedAt: string;
}

const inMemoryUsers = new Map<string, UserRecord>();


export async function isEmailAlreadyRegistered(email: string): Promise<boolean> {
  const clean = email.toLowerCase().trim();
  for (const user of inMemoryUsers.values()) {
    if (user.email?.toLowerCase() === clean) return true;
  }
  try {
    const snapshot = await adminDb.collection(COLLECTION).get();
    return snapshot.docs.some((doc) => doc.data()?.email?.toLowerCase() === clean);
  } catch {
    return false;
  }
}

export async function registerUserWithPassword(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  neighborhood?: string;
  skills?: string;
  availability?: string;
  preferredCategories?: string[];
}): Promise<UserRecord> {
  const cleanEmail = data.email.toLowerCase().trim();
  const cleanPhone = (data.phone || '').trim();

  // If email is provided and not internal generated phone alias, verify existence
  if (cleanEmail && !cleanEmail.endsWith('@vratsa.bg')) {
    const emailCheck = await validateEmailExistence(cleanEmail);
    if (!emailCheck.valid) {
      throw new Error(emailCheck.error || 'Имейл адресът не съществува или няма активен пощенски сървър.');
    }
  }

  // Check in memory first
  for (const user of inMemoryUsers.values()) {
    if (
      (cleanEmail && user.email?.toLowerCase() === cleanEmail) ||
      (cleanPhone && user.phone === cleanPhone)
    ) {
      throw new Error('Вече съществува регистриран доброволец с този имейл или телефон.');
    }
  }

  // Try checking in Firestore if accessible
  try {
    const snapshot = await adminDb.collection(COLLECTION).get();
    const existingDoc = snapshot.docs.find((d) => {
      const val = d.data();
      return (
        (cleanEmail && val.email?.toLowerCase() === cleanEmail) ||
        (cleanPhone && val.phone === cleanPhone)
      );
    });

    if (existingDoc) {
      throw new Error('Вече съществува регистриран доброволец с този имейл или телефон.');
    }
  } catch (err: any) {
    if (err.message?.includes('Вече съществува')) throw err;
    // Memory cache active
  }

  const uid = `vol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = hashPassword(data.password);

  const newUser: UserRecord = {
    uid,
    email: cleanEmail,
    name: data.name.trim(),
    phone: cleanPhone,
    neighborhood: data.neighborhood || 'Център',
    rank: 'Новак доброволец',
    weeklyPoints: 50, // Welcome bonus
    totalPoints: 50,
    resolvedCount: 0,
    activeAssignments: [],
    skills: data.skills || '',
    availability: data.availability || 'Уикенди (събота / неделя)',
    preferredCategories: data.preferredCategories || ['cleanliness'],
    passwordHash,
    authProvider: 'password',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryUsers.set(uid, newUser);

  try {
    await adminDb.collection(COLLECTION).doc(uid).set(newUser);
  } catch (_err: any) {
    // Stored in memory cache
  }

  return newUser;
}

export async function loginUserWithPassword(
  identifier: string,
  password?: string
): Promise<UserRecord> {
  const cleanIdent = identifier.toLowerCase().trim();

  let matched: UserRecord | undefined;

  // Search memory first
  for (const u of inMemoryUsers.values()) {
    if (
      u.email?.toLowerCase() === cleanIdent ||
      u.name?.toLowerCase() === cleanIdent ||
      u.phone === cleanIdent
    ) {
      matched = u;
      break;
    }
  }

  // Try Firestore if not found
  if (!matched) {
    try {
      const snapshot = await adminDb.collection(COLLECTION).get();
      const doc = snapshot.docs.find((d) => {
        const val = d.data();
        return (
          val.email?.toLowerCase() === cleanIdent ||
          val.name?.toLowerCase() === cleanIdent ||
          val.phone === cleanIdent
        );
      });
      if (doc) {
        matched = doc.data() as UserRecord;
        inMemoryUsers.set(matched.uid, matched);
      }
    } catch (_err: any) {
      // Memory cache active
    }
  }

  if (!matched) {
    throw new Error('Няма намерен доброволец с тези данни. Моля, проверете имейла или се регистрирайте.');
  }

  // If user has a passwordHash and password is provided, verify it
  if (matched.passwordHash && password) {
    const hashed = hashPassword(password);
    if (matched.passwordHash !== hashed) {
      throw new Error('Грешна парола. Моля, опитайте отново.');
    }
  }

  return matched;
}

export async function syncFirebaseUser(data: {
  uid: string;
  email: string;
  name?: string;
  phone?: string;
  neighborhood?: string;
  skills?: string;
  availability?: string;
  preferredCategories?: string[];
  photoURL?: string;
  authProvider?: 'password' | 'google' | 'facebook' | 'phone' | string;
  facebookId?: string;
  googleEmail?: string;
  linkedProviders?: string[];
  isNewRegistration?: boolean;
}): Promise<UserRecord> {
  const {
    uid,
    email,
    name,
    phone,
    neighborhood,
    skills,
    availability,
    preferredCategories,
    photoURL,
    authProvider,
    facebookId,
    googleEmail,
    isNewRegistration,
  } = data;
  const cleanEmail = email.toLowerCase().trim();
  const isInternalProxyEmail =
    cleanEmail.endsWith('@facebook.vratsa.bg') || cleanEmail.endsWith('@phone.vratsa.bg');

  // If this is an explicit new registration (or user was deleted in Firebase and registering anew),
  // completely wipe any old ghost records with this email or facebookId so they start fresh with 50 points!
  if (isNewRegistration) {
    if (!isInternalProxyEmail && cleanEmail) {
      await deleteUserAccount(cleanEmail);
    }
    if (facebookId) {
      await deleteUserAccount(facebookId);
    }
  }

  let existingData: Partial<UserRecord> = inMemoryUsers.get(uid) || {};

  // Epic Games style unification: If not matched by UID, check if user exists by email, googleEmail, or facebookId
  if (!existingData.uid && !isNewRegistration) {
    for (const u of inMemoryUsers.values()) {
      // Unification: check if user exists by email, googleEmail, facebookId, or phone
      if (!isInternalProxyEmail && cleanEmail && u.email?.toLowerCase() === cleanEmail) {
        existingData = u;
        break;
      }
      if (
        googleEmail &&
        (u.googleEmail?.toLowerCase() === googleEmail.toLowerCase() ||
          u.email?.toLowerCase() === googleEmail.toLowerCase())
      ) {
        existingData = u;
        break;
      }
      if (cleanEmail && u.googleEmail?.toLowerCase() === cleanEmail) {
        existingData = u;
        break;
      }
      if (facebookId && (u.facebookId === facebookId || u.uid === facebookId)) {
        existingData = u;
        break;
      }
      if (phone && u.phone && u.phone === phone) {
        existingData = u;
        break;
      }
    }
  }

  if (!existingData.uid && !isNewRegistration) {
    try {
      const doc = await adminDb.collection(COLLECTION).doc(uid).get();
      if (doc.exists) {
        existingData = doc.data() as Partial<UserRecord>;
      }
    } catch {
      // Memory fallback
    }
  }

  // Primary UID preserves the canonical user ID across all linked platforms
  const canonicalUid = existingData.uid || uid;
  // Preserve original display name, photo, and accumulated points if linking to an existing account!
  const canonicalName = existingData.name || name?.trim() || cleanEmail.split('@')[0];
  const canonicalPhoto = existingData.photoURL || photoURL;

  // Consolidate linked providers across all services
  const providersSet = new Set<string>(existingData.linkedProviders || []);
  if (data.linkedProviders) {
    for (const p of data.linkedProviders) providersSet.add(p);
  }
  if (authProvider === 'google' || googleEmail || existingData.googleEmail) {
    providersSet.add('google.com');
  }
  if (authProvider === 'facebook' || facebookId || existingData.facebookId) {
    providersSet.add('facebook.com');
  }
  if (authProvider === 'phone' || phone || existingData.phone) {
    providersSet.add('phone');
  }
  if (authProvider === 'password' || existingData.passwordHash) {
    providersSet.add('password');
  }

  const userData: UserRecord = {
    uid: canonicalUid,
    email: !isInternalProxyEmail && cleanEmail ? cleanEmail : (existingData.email || cleanEmail),
    googleEmail: googleEmail || existingData.googleEmail,
    name: canonicalName,
    phone: phone || existingData.phone || '',
    neighborhood: neighborhood || existingData.neighborhood || 'Център',
    rank: existingData.rank || 'Новак доброволец',
    weeklyPoints: existingData.weeklyPoints ?? 50,
    totalPoints: existingData.totalPoints ?? 50,
    resolvedCount: existingData.resolvedCount || 0,
    activeAssignments: existingData.activeAssignments || [],
    skills: skills || existingData.skills || '',
    availability: availability || existingData.availability || 'Уикенди (събота / неделя)',
    preferredCategories: preferredCategories || existingData.preferredCategories || ['cleanliness'],
    photoURL: canonicalPhoto,
    authProvider: existingData.authProvider || authProvider || 'password',
    facebookId: facebookId || existingData.facebookId,
    linkedProviders: Array.from(providersSet),
    createdAt: existingData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Map both canonicalUid and current auth uid to the unified user record
  inMemoryUsers.set(canonicalUid, userData);
  if (uid !== canonicalUid) {
    inMemoryUsers.set(uid, userData);
  }
  if (facebookId) {
    inMemoryUsers.set(facebookId, userData);
  }

  try {
    const docRef = adminDb.collection(COLLECTION).doc(canonicalUid);
    await docRef.set(userData, { merge: true });
  } catch (_err: any) {
    // Memory cache active
  }

  return userData;
}

export async function syncGoogleUser(
  uid: string,
  email: string,
  name?: string,
  photoURL?: string
): Promise<UserRecord> {
  return syncFirebaseUser({
    uid,
    email,
    name,
    photoURL,
    authProvider: 'google',
  });
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  name?: string,
  neighborhood?: string,
  phone?: string,
  rank?: string,
  weeklyPoints?: number,
  totalPoints?: number,
  skills?: string
) {
  const existingInMemory = inMemoryUsers.get(uid);

  const userData: UserRecord = {
    uid,
    email,
    name: name || existingInMemory?.name || email.split('@')[0],
    neighborhood: neighborhood || existingInMemory?.neighborhood || 'Център',
    phone: phone || existingInMemory?.phone || '',
    rank: rank || existingInMemory?.rank || 'Новак доброволец',
    weeklyPoints: typeof weeklyPoints === 'number' ? weeklyPoints : (existingInMemory?.weeklyPoints ?? 50),
    totalPoints: typeof totalPoints === 'number' ? totalPoints : (existingInMemory?.totalPoints ?? 50),
    skills: skills || existingInMemory?.skills || '',
    resolvedCount: existingInMemory?.resolvedCount || 0,
    activeAssignments: existingInMemory?.activeAssignments || [],
    updatedAt: new Date().toISOString(),
    createdAt: existingInMemory?.createdAt || new Date().toISOString(),
  };

  inMemoryUsers.set(uid, userData);

  try {
    const docRef = adminDb.collection(COLLECTION).doc(uid);
    await docRef.set(userData, { merge: true });
  } catch (_error) {
    // Memory cache active
  }
  return userData;
}

export async function getUserByUid(uid: string) {
  if (inMemoryUsers.has(uid)) {
    return inMemoryUsers.get(uid)!;
  }
  try {
    const doc = await adminDb.collection(COLLECTION).doc(uid).get();
    if (doc.exists) {
      const data = doc.data() as UserRecord;
      inMemoryUsers.set(uid, data);
      return data;
    }
  } catch (_error) {
    // Memory fallback
  }
  return inMemoryUsers.get(uid) || null;
}

export async function updateUserProfile(uid: string, updates: Partial<UserRecord>) {
  const existing = inMemoryUsers.get(uid) || { uid, email: '' } as UserRecord;
  const merged: UserRecord = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  inMemoryUsers.set(uid, merged);

  try {
    const docRef = adminDb.collection(COLLECTION).doc(uid);
    await docRef.set(updates, { merge: true });
  } catch (_error) {
    // Memory fallback
  }
  return merged;
}

export async function addPointsToUser(uid: string, points: number, newRank?: string) {
  const current = inMemoryUsers.get(uid) || {
    uid,
    email: '',
    name: 'Доброволец',
    weeklyPoints: 50,
    totalPoints: 50,
    resolvedCount: 0,
  } as UserRecord;

  const updated: UserRecord = {
    ...current,
    weeklyPoints: (current.weeklyPoints || 0) + points,
    totalPoints: (current.totalPoints || 0) + points,
    resolvedCount: (current.resolvedCount || 0) + 1,
    rank: newRank || current.rank || 'Новак доброволец',
    updatedAt: new Date().toISOString(),
  };
  inMemoryUsers.set(uid, updated);

  try {
    const docRef = adminDb.collection(COLLECTION).doc(uid);
    await docRef.set(updated, { merge: true });
  } catch (_error) {
    // Memory fallback
  }
  return updated;
}

export async function getLeaderboardUsers() {
  try {
    const snapshot = await adminDb.collection(COLLECTION).limit(50).get();
    if (!snapshot.empty) {
      const users = snapshot.docs.map((d) => d.data() as UserRecord);
      const unique = new Map<string, UserRecord>();
      for (const u of users) {
        if (u.uid) unique.set(u.uid, u);
      }
      return Array.from(unique.values())
        .filter((u) => (u.totalPoints || 0) > 0 && u.name !== 'Smart Vratsa')
        .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0));
    }
  } catch (_error) {
    // Graceful fallback to persistent memory store when admin credentials aren't active in dev container
  }

  const list = Array.from(inMemoryUsers.values());
  const unique = new Map<string, UserRecord>();
  for (const u of list) {
    if (u.uid) unique.set(u.uid, u);
  }
  return Array.from(unique.values())
    .filter((u) => (u.totalPoints || 0) > 0 && u.name !== 'Smart Vratsa')
    .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0));
}

export async function linkUserProvider(
  uid: string,
  providerId: string,
  extraData?: {
    phone?: string;
    email?: string;
    googleEmail?: string;
    photoURL?: string;
    facebookId?: string;
  }
): Promise<UserRecord> {
  const existing = await getUserByUid(uid);
  if (!existing) {
    throw new Error('Потребителят не е намерен.');
  }

  const linked = new Set<string>(existing.linkedProviders || []);
  linked.add(providerId);

  // If user has gmail or links google, make sure google.com is always considered linked
  if (
    providerId === 'google.com' ||
    (existing.email && existing.email.toLowerCase().includes('@gmail.com')) ||
    extraData?.googleEmail
  ) {
    linked.add('google.com');
  }
  if (providerId === 'facebook.com' || extraData?.facebookId) {
    linked.add('facebook.com');
  }

  const updates: Partial<UserRecord> = {
    linkedProviders: Array.from(linked),
    updatedAt: new Date().toISOString(),
  };

  if (extraData?.googleEmail) {
    updates.googleEmail = extraData.googleEmail;
  }
  if (extraData?.email && !existing.email) {
    updates.email = extraData.email;
  }
  if (extraData?.phone) updates.phone = extraData.phone;
  // If user registered with Facebook, they already have a photo, but allow upgrade if not present
  if (extraData?.photoURL && !existing.photoURL) updates.photoURL = extraData.photoURL;
  if (extraData?.facebookId) (updates as any).facebookId = extraData.facebookId;

  const updated = await updateUserProfile(uid, updates);

  // Also map alias keys in inMemoryUsers so lookups by facebookId or googleEmail find this user immediately
  if (extraData?.facebookId) {
    inMemoryUsers.set(extraData.facebookId, updated);
  }
  if (extraData?.googleEmail) {
    inMemoryUsers.set(extraData.googleEmail.toLowerCase(), updated);
  }

  return updated;
}

export async function unlinkUserProvider(uid: string, providerId: string): Promise<UserRecord> {
  const existing = await getUserByUid(uid);
  if (!existing) {
    throw new Error('Потребителят не е намерен.');
  }

  const linked = new Set<string>(existing.linkedProviders || []);
  linked.delete(providerId);

  // Never leave 0 providers if possible
  if (linked.size === 0) {
    if (existing.email) linked.add('password');
    else if (existing.phone) linked.add('phone');
  }

  const updates: Partial<UserRecord> = {
    linkedProviders: Array.from(linked),
    updatedAt: new Date().toISOString(),
  };

  if (providerId === 'facebook.com') {
    updates.facebookId = undefined;
    if (existing.authProvider === 'facebook') updates.authProvider = 'password';
  }
  if (providerId === 'google.com') {
    updates.googleEmail = undefined;
    if (existing.authProvider === 'google') updates.authProvider = 'password';
  }

  return updateUserProfile(uid, updates);
}

export async function deleteUserAccount(
  identifier: string,
  extra?: { email?: string; facebookId?: string; phone?: string }
): Promise<boolean> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanEmail = (extra?.email || '').trim().toLowerCase();
  const targetFbId = extra?.facebookId;
  const targetPhone = extra?.phone;

  // Identify all keys to delete from inMemoryUsers
  const keysToDelete = new Set<string>();
  if (identifier) keysToDelete.add(identifier);

  for (const [key, user] of Array.from(inMemoryUsers.entries())) {
    const matchesUid = user.uid === identifier || key === identifier;
    const matchesEmail =
      (cleanId && user.email?.toLowerCase() === cleanId) ||
      (cleanId && user.googleEmail?.toLowerCase() === cleanId) ||
      (cleanEmail && user.email?.toLowerCase() === cleanEmail) ||
      (cleanEmail && user.googleEmail?.toLowerCase() === cleanEmail);
    const matchesFb =
      (targetFbId && user.facebookId === targetFbId) ||
      (targetFbId && key === targetFbId) ||
      (identifier && user.facebookId === identifier);
    const matchesPhone =
      (targetPhone && user.phone === targetPhone) ||
      (identifier && user.phone === identifier);

    if (matchesUid || matchesEmail || matchesFb || matchesPhone) {
      keysToDelete.add(key);
      keysToDelete.add(user.uid);
      if (user.facebookId) keysToDelete.add(user.facebookId);
    }
  }

  for (const k of keysToDelete) {
    inMemoryUsers.delete(k);
    try {
      await adminDb.collection(COLLECTION).doc(k).delete();
    } catch {}
  }

  return true;
}
