import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient.js';
import { listQueuedMutations, removeQueuedMutation } from '../utils/offlineQueue.js';
import { useUI } from './UIContext.js';

const OfflineSyncContext = createContext(null);

export function OfflineSyncProvider({ children }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedItems, setQueuedItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useUI();

  const refreshQueue = useCallback(async () => {
    const list = await listQueuedMutations();
    setQueuedItems(list);
    return list;
  }, []);

  const flushQueue = useCallback(async () => {
    if (isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const pending = await listQueuedMutations();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;

    try {
      for (const item of pending) {
        try {
          await apiClient.request({
            method: item.method,
            url: item.url,
            data: item.data,
          });
          await removeQueuedMutation(item.id);
          syncedCount += 1;
        } catch (err) {
          // Stop flushing if still offline/network down; drop 4xx items cleanly so queue doesn't poison
          if (!err?.status) {
            break;
          }
          await removeQueuedMutation(item.id);
        }
      }

      if (syncedCount > 0) {
        queryClient.invalidateQueries();
        showToast(`Synced ${syncedCount} offline change(s)`, 'success');
      }
    } finally {
      await refreshQueue();
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient, refreshQueue, showToast]);

  useEffect(() => {
    refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleQueueChange = () => {
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('dm-tiles:offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('dm-tiles:offline-queue-changed', handleQueueChange);
    };
  }, [flushQueue, refreshQueue]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        pendingCount: queuedItems.length,
        queuedItems,
        isSyncing,
        flushQueue,
        refreshQueue,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    return {
      isOnline: true,
      pendingCount: 0,
      queuedItems: [],
      isSyncing: false,
      flushQueue: async () => {},
      refreshQueue: async () => [],
    };
  }
  return ctx;
}

