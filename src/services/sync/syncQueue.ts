import { getDatabase } from '@/database';

export async function getPendingMessageCount() {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM messages WHERE sync_state = 'pending'",
  );

  return result?.total ?? 0;
}
