export type ChatType = 'direct' | 'group';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'system';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageDirection = 'incoming' | 'outgoing';
export type SyncState = 'pending' | 'synced' | 'deleted';

export type Contact = {
  id: string;
  phoneNumber: string;
  displayName: string;
  avatarUrl?: string | null;
  status?: string | null;
  isRegistered: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Chat = {
  id: string;
  type: ChatType;
  title?: string | null;
  contactId?: string | null;
  lastMessageId?: string | null;
  unreadCount: number;
  mutedUntil?: number | null;
  archived: boolean;
  pinnedAt?: number | null;
  syncState: SyncState;
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  clientId: string;
  body?: string | null;
  type: MessageType;
  status: MessageStatus;
  direction: MessageDirection;
  sentAt?: number | null;
  receivedAt?: number | null;
  readAt?: number | null;
  deletedAt?: number | null;
  metadataJson?: string | null;
  syncState: SyncState;
  createdAt: number;
  updatedAt: number;
};
