import { getDatabase } from '@/database';
import type { Chat, Message } from '@/database/types';

type ChatRow = {
  id: string;
  type: Chat['type'];
  title: string | null;
  contact_id: string | null;
  last_message_id: string | null;
  unread_count: number;
  muted_until: number | null;
  archived: number;
  pinned_at: number | null;
  sync_state: Chat['syncState'];
  created_at: number;
  updated_at: number;
};

type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  client_id: string;
  body: string | null;
  type: Message['type'];
  status: Message['status'];
  direction: Message['direction'];
  sent_at: number | null;
  received_at: number | null;
  read_at: number | null;
  deleted_at: number | null;
  metadata_json: string | null;
  sync_state: Message['syncState'];
  created_at: number;
  updated_at: number;
};

export async function getOfflineChats() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ChatRow>(
    'SELECT * FROM chats WHERE archived = 0 ORDER BY pinned_at DESC, updated_at DESC',
  );

  return rows.map(mapChatRow);
}

export async function getOfflineMessagesByChatId(chatId: string, limit = 50, offset = 0) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MessageRow>(
    `
      SELECT * FROM messages
      WHERE chat_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [chatId, limit, offset],
  );

  return rows.map(mapMessageRow);
}

export type ChatListItem = {
  id: string;
  title: string;
  avatarUrl: string | null;
  lastMessagePreview: string;
  lastMessageAt: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
};

type ChatListRow = {
  id: string;
  title: string | null;
  chat_type: Chat['type'];
  contact_name: string | null;
  avatar_url: string | null;
  last_message_body: string | null;
  last_message_type: Message['type'] | null;
  last_message_at: number | null;
  unread_count: number;
  pinned_at: number | null;
  muted_until: number | null;
  updated_at: number;
};

export async function getOfflineChatList() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ChatListRow>(`
    SELECT
      chats.id,
      chats.title,
      chats.type AS chat_type,
      contacts.display_name AS contact_name,
      contacts.avatar_url,
      messages.body AS last_message_body,
      messages.type AS last_message_type,
      COALESCE(messages.created_at, chats.updated_at) AS last_message_at,
      chats.unread_count,
      chats.pinned_at,
      chats.muted_until,
      chats.updated_at
    FROM chats
    LEFT JOIN contacts ON contacts.id = chats.contact_id
    LEFT JOIN messages ON messages.id = COALESCE(
      chats.last_message_id,
      (
        SELECT latest_messages.id
        FROM messages AS latest_messages
        WHERE latest_messages.chat_id = chats.id
          AND latest_messages.deleted_at IS NULL
        ORDER BY latest_messages.created_at DESC
        LIMIT 1
      )
    )
    WHERE chats.archived = 0
      AND chats.sync_state != 'deleted'
    ORDER BY
      chats.pinned_at IS NULL,
      chats.pinned_at DESC,
      last_message_at DESC
  `);

  return rows.map(mapChatListRow);
}

function mapChatRow(row: ChatRow): Chat {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    contactId: row.contact_id,
    lastMessageId: row.last_message_id,
    unreadCount: row.unread_count,
    mutedUntil: row.muted_until,
    archived: Boolean(row.archived),
    pinnedAt: row.pinned_at,
    syncState: row.sync_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    clientId: row.client_id,
    body: row.body,
    type: row.type,
    status: row.status,
    direction: row.direction,
    sentAt: row.sent_at,
    receivedAt: row.received_at,
    readAt: row.read_at,
    deletedAt: row.deleted_at,
    metadataJson: row.metadata_json,
    syncState: row.sync_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChatListRow(row: ChatListRow): ChatListItem {
  return {
    id: row.id,
    title: row.title ?? row.contact_name ?? (row.chat_type === 'group' ? 'Grupo' : 'Contacto'),
    avatarUrl: row.avatar_url,
    lastMessagePreview: getLastMessagePreview(row.last_message_type, row.last_message_body),
    lastMessageAt: row.last_message_at ?? row.updated_at,
    unreadCount: row.unread_count,
    isPinned: Boolean(row.pinned_at),
    isMuted: Boolean(row.muted_until && row.muted_until > Date.now()),
  };
}

function getLastMessagePreview(type: Message['type'] | null, body: string | null) {
  if (body) {
    return body;
  }

  switch (type) {
    case 'audio':
      return 'Audio';
    case 'image':
      return 'Foto';
    case 'video':
      return 'Video';
    case 'system':
      return 'Mensaje del sistema';
    default:
      return 'Sin mensajes';
  }
}
