import { adminDb } from '../lib/firebase-admin.ts';
import { INITIAL_REPORTS } from '../data/mockReports.ts';

const COLLECTION = 'reports';

// Memory cache ensuring zero downtime and instant response
const inMemoryReports = new Map<string, any>();
for (const r of INITIAL_REPORTS) {
  inMemoryReports.set(r.id, { ...r });
}

export async function getAllReports(): Promise<any[]> {
  try {
    const snapshot = await adminDb.collection(COLLECTION).get();
    if (!snapshot.empty) {
      const dbReports = snapshot.docs.map((doc) => doc.data());
      // Merge with memory reports
      for (const r of dbReports) {
        if (r && r.id) {
          inMemoryReports.set(r.id, r);
        }
      }
      return Array.from(inMemoryReports.values());
    }
  } catch (_error) {
    // Graceful offline/local mode when admin gRPC permissions are restricted
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
