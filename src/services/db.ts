import { Redis } from '@upstash/redis';
import type { Database } from 'sqlite';
import fs from 'fs';
import path from 'path';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  arabicFontSize: number;
  translationFontSize: number;
  selectedLanguages: string[];
  showArabic: boolean;
}

export interface Bookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  translations: Record<string, string>;
  timestamp: number;
  notes?: string;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  createdAt: number;
  bookmarks: Bookmark[];
}

export interface BookmarkView {
  id: string;
  name: string;
  selectedCollectionId: string;
}

export interface UserData {
  email: string;
  settings: UserSettings;
  collections: BookmarkCollection[];
  views: BookmarkView[];
  activeViewIndex: number;
  isNewUser?: boolean;
}

// 1. Cloud Storage Configuration (Redis / Upstash for Vercel)
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisEnabled = !!(redisUrl && redisToken);

const redis = isRedisEnabled
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

// 2. Local Storage Configuration (SQLite)
const dbDirectory = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dbDirectory, 'quran.db');

let sqliteDb: Database | null = null;

async function getSqliteDb(): Promise<Database> {
  if (sqliteDb) return sqliteDb;

  if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
  }

  // Dynamic import to prevent loading native binaries in serverless production env
  const sqlite3 = (await import('sqlite3')).default;
  const { open } = await import('sqlite');

  sqliteDb = await open({
    filename: dbFilePath,
    driver: sqlite3.Database,
  });

  // Create table to store structured user profiles as JSON document rows
  await sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      email TEXT PRIMARY KEY,
      settings TEXT,
      collections TEXT,
      views TEXT,
      active_view_index INTEGER,
      updated_at INTEGER NOT NULL
    )
  `);

  // Check if we need to migrate from old schema
  try {
    const tableInfo = await sqliteDb.all("PRAGMA table_info(user_profiles)");
    const hasDataColumn = tableInfo.some((col: any) => col.name === 'data');
    
    if (hasDataColumn) {
      console.log('Migrating user_profiles table to new column-based schema...');
      // Load all old rows
      const oldRows = await sqliteDb.all("SELECT email, data, updated_at FROM user_profiles");
      
      // Re-create the table with new schema
      await sqliteDb.exec("DROP TABLE user_profiles");
      await sqliteDb.exec(`
        CREATE TABLE user_profiles (
          email TEXT PRIMARY KEY,
          settings TEXT,
          collections TEXT,
          views TEXT,
          active_view_index INTEGER,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // Migrate old data
      for (const row of oldRows) {
        try {
          const parsed = JSON.parse(row.data);
          await sqliteDb.run(
            `INSERT INTO user_profiles (email, settings, collections, views, active_view_index, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            row.email,
            parsed.settings ? JSON.stringify(parsed.settings) : null,
            parsed.collections ? JSON.stringify(parsed.collections) : null,
            parsed.views ? JSON.stringify(parsed.views) : null,
            parsed.activeViewIndex !== undefined ? parsed.activeViewIndex : null,
            row.updated_at
          );
        } catch (err) {
          console.error('Failed to migrate row for email:', row.email, err);
        }
      }
      console.log('Migration completed successfully!');
    }
  } catch (e) {
    console.error('Failed to run schema migration', e);
  }

  return sqliteDb;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  arabicFontSize: 28,
  translationFontSize: 16,
  selectedLanguages: ['id'],
  showArabic: true,
};

const getDefaultCollections = (): BookmarkCollection[] => [
  {
    id: 'default_favs',
    name: 'Favorites',
    createdAt: Date.now(),
    bookmarks: [],
  },
];

const getDefaultViews = (): BookmarkView[] => [
  {
    id: 'default_view_all',
    name: 'All Bookmarks',
    selectedCollectionId: 'all',
  },
  {
    id: 'default_view_favs',
    name: 'My Favorites',
    selectedCollectionId: 'default_favs',
  },
];

// Asynchronous Get User Data (works for SQLite and Redis)
export async function getUserData(email: string): Promise<UserData> {
  const lowerEmail = email.toLowerCase();
  let dbSettings: UserSettings | null = null;
  let dbCollections: BookmarkCollection[] | null = null;
  let dbViews: BookmarkView[] | null = null;
  let dbActiveViewIndex: number | null = null;

  if (isRedisEnabled && redis) {
    try {
      const type = await redis.type(`user:${lowerEmail}`);
      if (type === 'string') {
        // Migrate old string data to hash
        const oldStr = await redis.get<string>(`user:${lowerEmail}`);
        if (oldStr) {
          const parsed = typeof oldStr === 'string' ? JSON.parse(oldStr) : oldStr;
          await redis.del(`user:${lowerEmail}`);
          const hsetPayload: Record<string, string> = {
            updated_at: Date.now().toString(),
          };
          if (parsed.settings) hsetPayload.settings = JSON.stringify(parsed.settings);
          if (parsed.collections) hsetPayload.collections = JSON.stringify(parsed.collections);
          if (parsed.views) hsetPayload.views = JSON.stringify(parsed.views);
          if (parsed.activeViewIndex !== undefined) hsetPayload.activeViewIndex = parsed.activeViewIndex.toString();
          
          await redis.hset(`user:${lowerEmail}`, hsetPayload);
          
          dbSettings = parsed.settings || null;
          dbCollections = parsed.collections || null;
          dbViews = parsed.views || null;
          dbActiveViewIndex = parsed.activeViewIndex !== undefined ? parsed.activeViewIndex : null;
        }
      } else {
        const data = await redis.hgetall(`user:${lowerEmail}`);
        if (data) {
          dbSettings = data.settings ? JSON.parse(data.settings as string) : null;
          dbCollections = data.collections ? JSON.parse(data.collections as string) : null;
          dbViews = data.views ? JSON.parse(data.views as string) : null;
          dbActiveViewIndex = data.activeViewIndex !== undefined ? parseInt(data.activeViewIndex as string, 10) : null;
        }
      }
    } catch (e) {
      console.error('Failed to fetch from Upstash Redis, falling back to SQLite', e);
    }
  }

  // Fallback to SQLite (either because Redis is disabled or failed)
  if (!dbSettings && !dbCollections) {
    try {
      const db = await getSqliteDb();
      const row = await db.get('SELECT settings, collections, views, active_view_index FROM user_profiles WHERE email = ?', lowerEmail);
      if (row) {
        dbSettings = row.settings ? JSON.parse(row.settings) : null;
        dbCollections = row.collections ? JSON.parse(row.collections) : null;
        dbViews = row.views ? JSON.parse(row.views) : null;
        dbActiveViewIndex = row.active_view_index !== null ? row.active_view_index : null;
      }
    } catch (e) {
      console.error('Failed to load from SQLite database', e);
    }
  }

  const isNew = !dbSettings && !dbCollections;

  return {
    email: lowerEmail,
    settings: dbSettings ? { ...DEFAULT_SETTINGS, ...dbSettings } : DEFAULT_SETTINGS,
    collections: dbCollections || getDefaultCollections(),
    views: dbViews || getDefaultViews(),
    activeViewIndex: dbActiveViewIndex !== null ? dbActiveViewIndex : 0,
    isNewUser: isNew,
  };
}

// Asynchronous Save User Data (syncs to SQLite or Redis)
export async function saveUserData(email: string, updates: Partial<Omit<UserData, 'email'>>): Promise<UserData> {
  const lowerEmail = email.toLowerCase();
  const timestamp = Date.now();

  // 1. Sync to Upstash Redis if in cloud production (Vercel)
  if (isRedisEnabled && redis) {
    try {
      const hsetPayload: Record<string, string> = {
        updated_at: timestamp.toString(),
      };
      if (updates.settings !== undefined) {
        hsetPayload.settings = JSON.stringify(updates.settings);
      }
      if (updates.collections !== undefined) {
        hsetPayload.collections = JSON.stringify(updates.collections);
      }
      if (updates.views !== undefined) {
        hsetPayload.views = JSON.stringify(updates.views);
      }
      if (updates.activeViewIndex !== undefined) {
        hsetPayload.activeViewIndex = updates.activeViewIndex.toString();
      }
      await redis.hset(`user:${lowerEmail}`, hsetPayload);
    } catch (e) {
      console.error('Failed to save to Upstash Redis', e);
    }
  }

  // 2. Sync locally to SQLite database (quran.db)
  try {
    const db = await getSqliteDb();
    const sql = `
      INSERT INTO user_profiles (email, settings, collections, views, active_view_index, updated_at)
      VALUES ($email, $settings, $collections, $views, $active_view_index, $updated_at)
      ON CONFLICT(email) DO UPDATE SET
        settings = COALESCE($settings, settings),
        collections = COALESCE($collections, collections),
        views = COALESCE($views, views),
        active_view_index = COALESCE($active_view_index, active_view_index),
        updated_at = $updated_at
    `;
    await db.run(sql, {
      $email: lowerEmail,
      $settings: updates.settings !== undefined ? JSON.stringify(updates.settings) : null,
      $collections: updates.collections !== undefined ? JSON.stringify(updates.collections) : null,
      $views: updates.views !== undefined ? JSON.stringify(updates.views) : null,
      $active_view_index: updates.activeViewIndex !== undefined ? updates.activeViewIndex : null,
      $updated_at: timestamp,
    });
  } catch (e) {
    console.error('Failed to save to SQLite database', e);
  }

  return getUserData(lowerEmail);
}
