import { getDatabase } from '@/database';
import { notifyDatabaseChanged } from '@/database/changeEvents';

export type SyncedContact = {
  id: string;
  phoneNumber: string;
  displayName: string;
  avatarUrl?: string | null;
  status?: string | null;
  isRegistered: boolean;
};

export async function upsertSyncedContacts(contacts: SyncedContact[]) {
  if (contacts.length === 0) {
    return;
  }

  const db = await getDatabase();
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const contact of contacts) {
      await db.runAsync(
        `
            INSERT INTO contacts (
              id,
              phone_number,
              display_name,
              avatar_url,
              status,
              is_registered,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(phone_number) DO UPDATE SET
              id = excluded.id,
              display_name = excluded.display_name,
              avatar_url = excluded.avatar_url,
              status = excluded.status,
              is_registered = excluded.is_registered,
              updated_at = excluded.updated_at
          `,
        [
          contact.id,
          contact.phoneNumber,
          contact.displayName,
          contact.avatarUrl ?? null,
          contact.status ?? null,
          contact.isRegistered ? 1 : 0,
          now,
          now,
        ],
      );
    }
  });

  notifyDatabaseChanged(['contacts']);
}
