import { useCallback, useEffect, useState } from 'react';

import { subscribeToDatabaseChanges } from '@/database/changeEvents';
import {
  getOfflineChatList,
  type ChatListItem,
} from '@/database/repositories/chatRepository';

export function useChatList() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextChats = await getOfflineChatList();
    setChats(nextChats);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribeChats = subscribeToDatabaseChanges('chats', refresh);
    const unsubscribeMessages = subscribeToDatabaseChanges('messages', refresh);
    const unsubscribeContacts = subscribeToDatabaseChanges('contacts', refresh);

    return () => {
      unsubscribeChats();
      unsubscribeMessages();
      unsubscribeContacts();
    };
  }, [refresh]);

  return {
    chats,
    isLoading,
    refresh,
  };
}
