import { Redis } from '@upstash/redis';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
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

  sqliteDb = await open({
    filename: dbFilePath,
    driver: sqlite3.Database,
  });

  // Create table to store structured user profiles as JSON document rows
  await sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      email TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

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
  let user: UserData | null = null;

  if (isRedisEnabled && redis) {
    try {
      user = await redis.get<UserData>(`user:${lowerEmail}`);
    } catch (e) {
      console.error('Failed to fetch from Upstash Redis, falling back to SQLite', e);
    }
  }

  // Fallback to SQLite (either because Redis is disabled or failed)
  if (!user) {
    try {
      const db = await getSqliteDb();
      const row = await db.get('SELECT data FROM user_profiles WHERE email = ?', lowerEmail);
      if (row && row.data) {
        user = JSON.parse(row.data);
      }
    } catch (e) {
      console.error('Failed to load from SQLite database', e);
    }
  }

  if (!user) {
    return {
      email: lowerEmail,
      settings: DEFAULT_SETTINGS,
      collections: getDefaultCollections(),
      views: getDefaultViews(),
      activeViewIndex: 0,
    };
  }

  // Merge with defaults to ensure complete profile structure
  return {
    email: lowerEmail,
    settings: { ...DEFAULT_SETTINGS, ...user.settings },
    collections: user.collections || getDefaultCollections(),
    views: user.views || getDefaultViews(),
    activeViewIndex: typeof user.activeViewIndex === 'number' ? user.activeViewIndex : 0,
  };
}

// Asynchronous Save User Data (syncs to SQLite or Redis)
export async function saveUserData(email: string, updates: Partial<Omit<UserData, 'email'>>): Promise<UserData> {
  const lowerEmail = email.toLowerCase();
  const current = await getUserData(lowerEmail);

  const updatedUser: UserData = {
    email: lowerEmail,
    settings: updates.settings ? { ...current.settings, ...updates.settings } : current.settings,
    collections: updates.collections !== undefined ? updates.collections : current.collections,
    views: updates.views !== undefined ? updates.views : current.views,
    activeViewIndex: updates.activeViewIndex !== undefined ? updates.activeViewIndex : current.activeViewIndex,
  };

  // Sync to Upstash Redis if in cloud production (Vercel)
  if (isRedisEnabled && redis) {
    try {
      await redis.set(`user:${lowerEmail}`, JSON.stringify(updatedUser));
    } catch (e) {
      console.error('Failed to save to Upstash Redis', e);
    }
  }

  // Sync locally to SQLite database (quran.db)
  try {
    const db = await getSqliteDb();
    await db.run(
      'INSERT OR REPLACE INTO user_profiles (email, data, updated_at) VALUES (?, ?, ?)',
      lowerEmail,
      JSON.stringify(updatedUser),
      Date.now()
    );
  } catch (e) {
    console.error('Failed to save to SQLite database', e);
  }

  return updatedUser;
}
