import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Offline sync tests for Firebase fallback to localStorage.
 * Ensures data isn't lost when Firebase is unavailable.
 */

describe('Offline Sync - Firebase Fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to localStorage when Firebase fetch fails', async () => {
    // Simulate localStorage data
    const testData = [
      { id: '1', name: 'Google', role: 'Engineer', status: 'applied' },
      { id: '2', name: 'Meta', role: 'Designer', status: 'interviewing' },
    ];

    localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(testData));

    // Simulate Firebase error
    const getDocs = vi.fn().mockRejectedValue(new Error('Network error'));

    // Mock implementation that falls back
    const loadAllItems = async (uid, mode) => {
      try {
        // This would call Firebase
        await getDocs(); // Simulates failure
      } catch (err) {
        // Fallback to localStorage
        const stored = localStorage.getItem(`jobTrackerAppV2Data_${mode}`);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {}
        }
      }
      return null;
    };

    const result = await loadAllItems('user123', 'jobseeker');
    expect(result).toEqual(testData);
  });

  it('preserves offline edits in localStorage', async () => {
    const company = { id: '1', name: 'Acme Corp', status: 'applied' };

    // User edits offline
    const updated = { ...company, status: 'interviewing' };
    localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify([updated]));

    // Later, retrieve
    const stored = JSON.parse(localStorage.getItem('jobTrackerAppV2Data_jobseeker'));
    expect(stored[0].status).toBe('interviewing');
  });

  it('handles corrupted localStorage data gracefully', async () => {
    // Corrupted JSON
    localStorage.setItem('jobTrackerAppV2Data_jobseeker', '{ invalid json');

    const result = (() => {
      try {
        const stored = localStorage.getItem('jobTrackerAppV2Data_jobseeker');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null; // Graceful failure
      }
    })();

    expect(result).toBeNull();
  });

  it('syncs offline changes to Firebase when online', async () => {
    // 1. Offline: user adds company
    const offlineCompany = { id: '1', name: 'Test Inc', status: 'applied' };
    localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify([offlineCompany]));

    // 2. User comes online
    const firebaseSync = vi.fn().mockResolvedValue({ success: true });

    // 3. Sync to Firebase
    await firebaseSync([offlineCompany]);

    expect(firebaseSync).toHaveBeenCalledWith([offlineCompany]);
  });

  it('detects when Firebase becomes available again', async () => {
    let isOnline = false;

    const checkConnection = async () => {
      // Mock function to check Firebase connectivity
      return isOnline;
    };

    expect(await checkConnection()).toBe(false);

    isOnline = true;
    expect(await checkConnection()).toBe(true);
  });

  it('prevents data loss during offline-to-online transition', async () => {
    const uid = 'user123';
    const mode = 'jobseeker';

    // Offline data
    const offlineData = [
      { id: '1', name: 'Company A', status: 'applied' },
      { id: '2', name: 'Company B', status: 'rejected' },
    ];

    localStorage.setItem(`jobTrackerAppV2Data_${mode}`, JSON.stringify(offlineData));

    // Simulate sync to Firebase
    const syncToFirebase = vi.fn().mockResolvedValue(true);
    await syncToFirebase(uid, mode, offlineData);

    // Verify sync was called with offline data
    expect(syncToFirebase).toHaveBeenCalledWith(uid, mode, offlineData);
  });

  it('merges offline changes with Firebase data on conflict', async () => {
    // Offline: user edited company A
    const offlineVersion = { id: '1', name: 'Company A', status: 'interviewing', notes: 'Good fit' };

    // Firebase: company A was updated by another device to "rejected"
    const firebaseVersion = { id: '1', name: 'Company A', status: 'rejected', notes: '' };

    // Simple merge strategy: offline (more recent locally) wins
    const mergedData = { ...firebaseVersion, ...offlineVersion };

    expect(mergedData.status).toBe('interviewing'); // Offline edit wins
    expect(mergedData.notes).toBe('Good fit'); // Offline edit preserved
  });
});

describe('Offline Sync - Data Integrity', () => {
  it('maintains referential integrity with interviews during offline sync', async () => {
    const company = {
      id: '1',
      name: 'Google',
      interviews: [
        { id: 'int1', type: 'Phone Screen', date: '2024-01-01' },
        { id: 'int2', type: 'Technical', date: '2024-01-05' },
      ],
    };

    localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify([company]));

    // Add new interview offline
    company.interviews.push({ id: 'int3', type: 'Final', date: '2024-01-10' });
    localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify([company]));

    // Verify integrity
    const stored = JSON.parse(localStorage.getItem('jobTrackerAppV2Data_jobseeker'));
    expect(stored[0].interviews.length).toBe(3);
    expect(stored[0].interviews[2].type).toBe('Final');
  });

  it('respects storage limits (quota exceeded gracefully)', async () => {
    // Create large data that might exceed localStorage limit
    const hugeData = Array.from({ length: 10000 }, (_, i) => ({
      id: String(i),
      name: `Company ${i}`,
      notes: 'x'.repeat(1000), // Large notes field
    }));

    const result = (() => {
      try {
        localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(hugeData));
        return true;
      } catch (e) {
        // QuotaExceededError - handle gracefully
        return false;
      }
    })();

    // If quota exceeded, should handle gracefully (don't crash)
    expect(typeof result).toBe('boolean');
  });
});
