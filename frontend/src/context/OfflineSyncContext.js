import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient.js';
import { clearAllQueuedMutations, listQueuedMutations, removeQueuedMutation } from '../utils/offlineQueue.js';
import OfflineDataModal from '../components/common/OfflineDataModal.js';
import { useUI } from './UIContext.js';

const OfflineSyncContext = createContext(null);

export function OfflineSyncProvider({ children }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedItems, setQueuedItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useUI();

  const openOfflineModal = useCallback(() => setIsModalOpen(true), []);
  const closeOfflineModal = useCallback(() => setIsModalOpen(false), []);

  const refreshQueue = useCallback(async () => {
    const list = await listQueuedMutations();
    setQueuedItems(list);
    return list;
  }, []);

  const clearQueue = useCallback(async () => {
    await clearAllQueuedMutations();
    await refreshQueue();
    showToast('Cleared offline queue.', 'info');
  }, [refreshQueue, showToast]);

  const removeItem = useCallback(async (id) => {
    await removeQueuedMutation(id);
    await refreshQueue();
    showToast('Removed item from offline queue.', 'info');
  }, [refreshQueue, showToast]);

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
        isModalOpen,
        openOfflineModal,
        closeOfflineModal,
        flushQueue,
        refreshQueue,
        clearQueue,
        removeItem,
      }}
    >
      {children}
      <OfflineDataModal isOpen={isModalOpen} onClose={closeOfflineModal} />
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
      isModalOpen: false,
      openOfflineModal: () => {},
      closeOfflineModal: () => {},
      flushQueue: async () => {},
      refreshQueue: async () => [],
      clearQueue: async () => {},
      removeItem: async () => {},
    };
  }
  return ctx;
}

