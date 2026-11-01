import { adminDb } from '../lib/firebase-admin.ts';

const COLLECTION = 'reports';

// Memory cache ensuring instant response and offline fallback
const inMemoryReports = new Map<string, any>();

export async function getAllReports(): Promise<any[]> {
  try {
    const snapshot = await adminDb.collection(COLLECTION).get();
    if (!snapshot.empty) {
      const dbReports = snapshot.docs.map((doc) => doc.data());
      inMemoryReports.clear();
      for (const r of dbReports) {
        if (r && r.id) {
          inMemoryReports.set(r.id, r);
        }
      }
      return Array.from(inMemoryReports.values());
    } else {
      // Database has 0 reports (e.g. after admin purged them)
      return Array.from(inMemoryReports.values());
    }
  } catch (_error) {
    // Graceful offline/local mode
  }
  return Array.from(inMemoryReports.values());
}

export async function insertReport(reportData: any) {
  const id = reportData.id || `rep-${Date.now()}`;
  const dataWithId = { ...reportData, id };
  inMemoryReports.set(id, dataWithId);

  try {
    await adminDb.collection(COLLECTION).doc(id).set(dataWithId);
  } catch (_error) {
    // Saved in memory
  }
  return dataWithId;
}

export async function updateReportStatus(reportId: string, updates: any) {
  const existing = inMemoryReports.get(reportId) || {};
  const updatedData = { ...existing, ...updates };
  inMemoryReports.set(reportId, updatedData);

  try {
    const docRef = adminDb.collection(COLLECTION).doc(reportId);
    await docRef.set(updates, { merge: true });
  } catch (_error) {
    // Saved in memory
  }
  return updatedData;
}

export async function deleteReport(reportId: string): Promise<boolean> {
  inMemoryReports.delete(reportId);
  try {
    await adminDb.collection(COLLECTION).doc(reportId).delete();
  } catch (_error) {
    // Deleted from memory
  }
  return true;
}

export async function addVolunteerToReport(reportId: string, userUid: string, volunteerName: string) {
  const existing = inMemoryReports.get(reportId) || {};
  const volunteers = Array.isArray(existing.volunteers) ? [...existing.volunteers] : [];
  if (!volunteers.includes(volunteerName)) {
    volunteers.push(volunteerName);
  }
  const updatedData = {
    ...existing,
    volunteers,
    volunteersCount: volunteers.length,
    status: existing.status === 'нови' ? 'прегледан' : (existing.status || 'прегледан'),
  };
  inMemoryReports.set(reportId, updatedData);

  try {
    const docRef = adminDb.collection(COLLECTION).doc(reportId);
    await docRef.set(updatedData, { merge: true });
  } catch (_error) {
    // Saved in memory
  }
  return { reportId, userUid, volunteerName };
}
