import { getDatabase } from '@/database';
import { notifyDatabaseChanged } from '@/database/changeEvents';
import type { Message, MessageStatus } from '@/database/types';

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

export type IncomingMessagePayload = {
  id: string;
  chatId: string;
  senderId: string;
  clientId?: string;
  body?: string | null;
  type?: Message['type'];
  sentAt?: number | string | null;
  metadata?: Record<string, unknown> | null;
};

export type CreateOutgoingMessageInput = {
  chatId: string;
  senderId: string;
  body: string;
};

export type CreateOutgoingImageMessageInput = {
  chatId: string;
  senderId: string;
  localUri: string;
  remoteUrl?: string;
  objectKey?: string;
  mimeType: string;
  width?: number;
  height?: number;
  uploadProgress?: number;
};

export type MessageAckPayload = {
  id: string;
  clientId: string;
  chatId: string;
  sentAt?: number | string | null;
};

export async function getMessagesForChat(chatId: string, limit = 80, offset = 0) {
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

export async function createOutgoingTextMessage(input: CreateOutgoingMessageInput) {
  const db = await getDatabase();
  const now = Date.now();
  const message: Message = {
    id: createLocalId('msg'),
    chatId: input.chatId,
    senderId: input.senderId,
    clientId: createLocalId('client'),
    body: input.body,
    type: 'text',
    status: 'pending',
    direction: 'outgoing',
    sentAt: null,
    receivedAt: null,
    readAt: null,
    deletedAt: null,
    metadataJson: null,
    syncState: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await db.withTransactionAsync(async () => {
    await insertMessage(db, message);
    await touchChatWithLastMessage(db, message.chatId, message.id, now, false);
  });

  notifyDatabaseChanged(['messages', 'chats']);

  return message;
}

export async function createOutgoingImageMessage(input: CreateOutgoingImageMessageInput) {
  const db = await getDatabase();
  const now = Date.now();
  const message: Message = {
    id: createLocalId('msg'),
    chatId: input.chatId,
    senderId: input.senderId,
    clientId: createLocalId('client'),
    body: input.remoteUrl ?? input.localUri,
    type: 'image',
    status: 'pending',
    direction: 'outgoing',
    sentAt: null,
    receivedAt: null,
    readAt: null,
    deletedAt: null,
    metadataJson: JSON.stringify({
      height: input.height,
      localUri: input.localUri,
      mimeType: input.mimeType,
      objectKey: input.objectKey,
      remoteUrl: input.remoteUrl,
      uploadProgress: input.uploadProgress ?? 0,
      width: input.width,
    }),
    syncState: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await db.withTransactionAsync(async () => {
    await insertMessage(db, message);
    await touchChatWithLastMessage(db, message.chatId, message.id, now, false);
  });

  notifyDatabaseChanged(['messages', 'chats']);

  return message;
}

export async function updateImageMessageUploadProgress(clientId: string, uploadProgress: number) {
  const db = await getDatabase();
  const current = await db.getFirstAsync<{ metadata_json: string | null }>(
    'SELECT metadata_json FROM messages WHERE client_id = ?',
    [clientId],
  );
  const metadata = parseMessageMetadata(current?.metadata_json);

  await db.runAsync(
    'UPDATE messages SET metadata_json = ?, updated_at = ? WHERE client_id = ?',
    [
      JSON.stringify({
        ...metadata,
        uploadProgress,
      }),
      Date.now(),
      clientId,
    ],
  );

  notifyDatabaseChanged(['messages']);
}

export async function markImageMessageUploaded(
  clientId: string,
  upload: {
    remoteUrl: string;
    objectKey?: string;
  },
) {
  const db = await getDatabase();
  const current = await db.getFirstAsync<{ metadata_json: string | null }>(
    'SELECT metadata_json FROM messages WHERE client_id = ?',
    [clientId],
  );
  const metadata = parseMessageMetadata(current?.metadata_json);

  await db.runAsync(
    `
      UPDATE messages
      SET body = ?,
          metadata_json = ?,
          updated_at = ?
      WHERE client_id = ?
    `,
    [
      upload.remoteUrl,
      JSON.stringify({
        ...metadata,
        objectKey: upload.objectKey,
        remoteUrl: upload.remoteUrl,
        uploadProgress: 1,
      }),
      Date.now(),
      clientId,
    ],
  );

  notifyDatabaseChanged(['messages']);
}

export async function insertIncomingMessage(payload: IncomingMessagePayload) {
  const db = await getDatabase();
  const now = Date.now();
  const createdAt = parseMessageTimestamp(payload.sentAt) ?? now;
  const message: Message = {
    id: payload.id,
    chatId: payload.chatId,
    senderId: payload.senderId,
    clientId: payload.clientId ?? payload.id,
    body: payload.body ?? null,
    type: payload.type ?? 'text',
    status: 'delivered',
    direction: 'incoming',
    sentAt: createdAt,
    receivedAt: now,
    readAt: null,
    deletedAt: null,
    metadataJson: payload.metadata ? JSON.stringify(payload.metadata) : null,
    syncState: 'synced',
    createdAt,
    updatedAt: now,
  };

  await db.withTransactionAsync(async () => {
    await ensureChatExists(db, message.chatId, now);
    await insertMessage(db, message);
    await touchChatWithLastMessage(db, message.chatId, message.id, now, true);
  });

  notifyDatabaseChanged(['messages', 'chats']);

  return message;
}

export async function markOutgoingMessageAsSent(payload: MessageAckPayload) {
  const db = await getDatabase();
  const now = Date.now();
  const sentAt = parseMessageTimestamp(payload.sentAt) ?? now;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        UPDATE messages
        SET id = ?,
            status = ?,
            sync_state = ?,
            sent_at = ?,
            updated_at = ?
        WHERE client_id = ?
      `,
      [payload.id, 'sent', 'synced', sentAt, now, payload.clientId],
    );
    await touchChatWithLastMessage(db, payload.chatId, payload.id, now, false);
  });

  notifyDatabaseChanged(['messages', 'chats']);
}

export async function markOutgoingMessageAsFailed(clientId: string) {
  await updateMessageStatusByClientId(clientId, 'failed');
}

async function updateMessageStatusByClientId(clientId: string, status: MessageStatus) {
  const db = await getDatabase();

  await db.runAsync(
    'UPDATE messages SET status = ?, updated_at = ? WHERE client_id = ?',
    [status, Date.now(), clientId],
  );
  notifyDatabaseChanged(['messages']);
}

async function insertMessage(db: Awaited<ReturnType<typeof getDatabase>>, message: Message) {
  await db.runAsync(
    `
      INSERT INTO messages (
        id,
        chat_id,
        sender_id,
        client_id,
        body,
        type,
        status,
        direction,
        sent_at,
        received_at,
        read_at,
        deleted_at,
        metadata_json,
        sync_state,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        id = excluded.id,
        status = excluded.status,
        sync_state = excluded.sync_state,
        sent_at = excluded.sent_at,
        received_at = excluded.received_at,
        read_at = excluded.read_at,
        deleted_at = excluded.deleted_at,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `,
    [
      message.id,
      message.chatId,
      message.senderId,
      message.clientId,
      message.body ?? null,
      message.type,
      message.status,
      message.direction,
      message.sentAt ?? null,
      message.receivedAt ?? null,
      message.readAt ?? null,
      message.deletedAt ?? null,
      message.metadataJson ?? null,
      message.syncState,
      message.createdAt,
      message.updatedAt,
    ],
  );
}

async function touchChatWithLastMessage(
  db: Awaited<ReturnType<typeof getDatabase>>,
  chatId: string,
  messageId: string,
  updatedAt: number,
  incrementUnread: boolean,
) {
  await db.runAsync(
    `
      UPDATE chats
      SET last_message_id = ?,
          unread_count = unread_count + ?,
          updated_at = ?
      WHERE id = ?
    `,
    [messageId, incrementUnread ? 1 : 0, updatedAt, chatId],
  );
}

async function ensureChatExists(
  db: Awaited<ReturnType<typeof getDatabase>>,
  chatId: string,
  timestamp: number,
) {
  await db.runAsync(
    `
      INSERT INTO chats (
        id,
        type,
        title,
        contact_id,
        unread_count,
        sync_state,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `,
    [chatId, 'direct', null, null, 0, 'synced', timestamp, timestamp],
  );
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

function parseMessageTimestamp(timestamp?: number | string | null) {
  if (!timestamp) {
    return null;
  }

  if (typeof timestamp === 'number') {
    return timestamp;
  }

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseMessageMetadata(metadataJson?: string | null) {
  if (!metadataJson) {
    return {};
  }

  try {
    return JSON.parse(metadataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
