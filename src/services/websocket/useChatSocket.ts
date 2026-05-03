import { useEffect, useState } from 'react';

import { chatSocket } from './chatSocket';

export function useChatSocket() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'>(
    'idle',
  );

  useEffect(() => {
    const unsubscribe = chatSocket.subscribe(setStatus);
    void chatSocket.connect();

    return unsubscribe;
  }, []);

  return {
    status,
    sendMessage: chatSocket.sendMessage.bind(chatSocket),
  };
}
