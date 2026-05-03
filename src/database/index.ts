import * as SQLite from 'expo-sqlite';

import { createSchemaSql, DATABASE_NAME, DATABASE_VERSION } from './schema';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!database) {
    database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return database;
}

export async function initLocalDatabase() {
  const db = await getDatabase();
  const [{ user_version: currentVersion }] = await db.getAllAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );

  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(createSchemaSql);
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
  }

  return db;
}

export async function resetLocalDatabaseForDevelopment() {
  const db = await getDatabase();

  await db.execAsync(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS chats;
    DROP TABLE IF EXISTS contacts;
    PRAGMA user_version = 0;
  `);

  await initLocalDatabase();
}

export * from './types';
