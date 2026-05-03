export const DATABASE_NAME = 'whatsup.db';
export const DATABASE_VERSION = 1;

export const createSchemaSql = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT,
  is_registered INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  title TEXT,
  contact_id TEXT,
  last_message_id TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  muted_until INTEGER,
  archived INTEGER NOT NULL DEFAULT 0,
  pinned_at INTEGER,
  sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('pending', 'synced', 'deleted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  body TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'audio', 'video', 'system')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  sent_at INTEGER,
  received_at INTEGER,
  read_at INTEGER,
  deleted_at INTEGER,
  metadata_json TEXT,
  sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('pending', 'synced', 'deleted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_contact_id ON chats(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sync_state ON messages(sync_state);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
`;
