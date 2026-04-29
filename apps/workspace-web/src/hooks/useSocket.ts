import { useEffect, useState } from 'react';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import type { Message, PresenceUpdate } from '@/types';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
      setIsConnected(true);
    } else {
      socketService.disconnect();
      setIsConnected(false);
    }

    return () => {
      socketService.disconnect();
    };
  }, [token]);

  const emitMessage = (channelId: string, content: string) => {
    socketService.sendMessage(channelId, content);
  };

  const onMessage = (handler: (message: Message) => void) => {
    const wrappedHandler = (args: unknown) => {
      handler(args as Message);
    };
    socketService.on('receive_message', wrappedHandler);
    return () => socketService.off('receive_message', wrappedHandler);
  };

  const onPresence = (handler: (update: PresenceUpdate) => void) => {
    const wrappedHandler = (args: unknown) => {
      handler(args as PresenceUpdate);
    };
    socketService.on('presence_update', wrappedHandler);
    return () => socketService.off('presence_update', wrappedHandler);
  };

  const updatePresence = (status: string) => {
    socketService.updatePresence(status);
  };

  return {
    isConnected,
    emitMessage,
    onMessage,
    onPresence,
    updatePresence,
  };
}
