import { Redis } from '@upstash/redis';
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

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisEnabled = !!(redisUrl && redisToken);

const redis = isRedisEnabled
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

const dbDirectory = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dbDirectory, 'db.json');

// Initialize folder and file if they don't exist (Local JSON mode)
function ensureDbFile() {
  if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify({ users: {} }, null, 2), 'utf-8');
  }
}

// Load database (Local JSON mode)
function loadLocalDb(): Record<string, UserData> {
  ensureDbFile();
  try {
    const data = fs.readFileSync(dbFilePath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.users || {};
  } catch (e) {
    console.error('Failed to load JSON database, resetting', e);
    return {};
  }
}

// Save database (Local JSON mode)
function saveLocalDb(users: Record<string, UserData>) {
  ensureDbFile();
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify({ users }, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write JSON database', e);
  }
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

// Asynchronous Get User Data (works for both local and cloud modes)
export async function getUserData(email: string): Promise<UserData> {
  const lowerEmail = email.toLowerCase();

  let user: UserData | null = null;

  if (isRedisEnabled && redis) {
    try {
      user = await redis.get<UserData>(`user:${lowerEmail}`);
    } catch (e) {
      console.error('Failed to fetch from Upstash Redis, falling back to empty profile', e);
    }
  } else {
    const users = loadLocalDb();
    user = users[lowerEmail] || null;
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

  // Merge with defaults to ensure fallback consistency
  return {
    email: lowerEmail,
    settings: { ...DEFAULT_SETTINGS, ...user.settings },
    collections: user.collections || getDefaultCollections(),
    views: user.views || getDefaultViews(),
    activeViewIndex: typeof user.activeViewIndex === 'number' ? user.activeViewIndex : 0,
  };
}

// Asynchronous Save User Data (works for both local and cloud modes)
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

  if (isRedisEnabled && redis) {
    try {
      await redis.set(`user:${lowerEmail}`, JSON.stringify(updatedUser));
    } catch (e) {
      console.error('Failed to save to Upstash Redis', e);
    }
  } else {
    const users = loadLocalDb();
    users[lowerEmail] = updatedUser;
    saveLocalDb(users);
  }

  return updatedUser;
}
