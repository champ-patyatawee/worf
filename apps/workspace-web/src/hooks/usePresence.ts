import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '@/services/socket';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import type { UserStatus, PresenceUpdate } from '@/types';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const AWAY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

interface UsePresenceOptions {
  onPresenceUpdate?: (update: PresenceUpdate) => void;
}

export function usePresence(options: UsePresenceOptions = {}) {
  const { onPresenceUpdate } = options;
  const { updateUserStatus, onlineUsers, sortedUsers } = useUserStore();
  const currentUser = useAuthStore((state) => state.user);
  
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const manualStatusRef = useRef<UserStatus | null>(null);
  const isVisibleRef = useRef<boolean>(!document.hidden);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (awayTimerRef.current) {
      clearTimeout(awayTimerRef.current);
      awayTimerRef.current = null;
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();

    // If user manually set a status, don't auto-change
    if (manualStatusRef.current !== null) {
      return;
    }

    // If tab is not visible, don't change status
    if (!isVisibleRef.current) {
      return;
    }

    // Set to online on activity
    if (currentUser && currentUser.status !== 'online') {
      updateUserStatus(currentUser.id, 'online');
      socketService.updatePresence('online');
    }

    // Set idle timer for away status
    idleTimerRef.current = setTimeout(() => {
      if (currentUser && manualStatusRef.current === null) {
        updateUserStatus(currentUser.id, 'away');
        socketService.updatePresence('away');
      }
    }, IDLE_TIMEOUT);

    // Set away timer for offline status
    awayTimerRef.current = setTimeout(() => {
      if (currentUser && manualStatusRef.current === null) {
        updateUserStatus(currentUser.id, 'offline');
        socketService.updatePresence('offline');
      }
    }, AWAY_TIMEOUT);
  }, [clearTimers, currentUser, updateUserStatus]);

  const handleVisibilityChange = useCallback(() => {
    isVisibleRef.current = !document.hidden;

    if (document.hidden) {
      // Tab became hidden - set to away if online and no manual status
      if (currentUser && currentUser.status === 'online' && manualStatusRef.current === null) {
        updateUserStatus(currentUser.id, 'away');
        socketService.updatePresence('away');
      }
      clearTimers();
    } else {
      // Tab became visible - reset status if no manual override
      if (currentUser && manualStatusRef.current === null) {
        updateUserStatus(currentUser.id, 'online');
        socketService.updatePresence('online');
      }
      resetIdleTimer();
    }
  }, [currentUser, updateUserStatus, resetIdleTimer, clearTimers]);

  const handleActivity = useCallback(() => {
    if (!document.hidden && manualStatusRef.current === null) {
      resetIdleTimer();
    }
  }, [resetIdleTimer]);

  const updateMyPresence = useCallback(
    (status: UserStatus) => {
      manualStatusRef.current = status === 'online' ? null : status;

      if (currentUser) {
        updateUserStatus(currentUser.id, status);
        socketService.updatePresence(status);
      }
    },
    [currentUser, updateUserStatus]
  );

  // Subscribe to presence updates from other users
  useEffect(() => {
    const wrappedHandler = (args: unknown) => {
      const update = args as PresenceUpdate;
      updateUserStatus(update.userId, update.status);
      onPresenceUpdate?.(update);
    };

    socketService.on('presence_update', wrappedHandler);

    return () => {
      socketService.off('presence_update', wrappedHandler);
    };
  }, [updateUserStatus, onPresenceUpdate]);

  // Handle online_users event sent on connection with list of online users
  useEffect(() => {
    const onlineUsersHandler = (args: unknown) => {
      const onlineUserIds = args as string[];
      onlineUserIds.forEach((userId) => {
        updateUserStatus(userId, 'online');
      });
    };

    socketService.on('online_users', onlineUsersHandler);

    return () => {
      socketService.off('online_users', onlineUsersHandler);
    };
  }, [updateUserStatus]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    // Throttle the activity handler
    let lastCall = 0;
    const throttleMs = 1000;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        handleActivity();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, throttledHandler, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledHandler);
      });
    };
  }, [handleActivity]);

  // Set up visibility change listener
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Initialize presence on mount
  useEffect(() => {
    if (currentUser) {
      resetIdleTimer();
    }

    return () => {
      clearTimers();
    };
  }, [currentUser, resetIdleTimer, clearTimers]);

  return {
    updateMyPresence,
    onlineUsers: onlineUsers(),
    sortedUsers: sortedUsers(),
  };
}
