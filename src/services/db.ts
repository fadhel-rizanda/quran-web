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

const dbDirectory = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dbDirectory, 'db.json');

// Initialize folder and file if they don't exist
function ensureDbFile() {
  if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify({ users: {} }, null, 2), 'utf-8');
  }
}

// Load database
function loadDb(): Record<string, UserData> {
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

// Save database
function saveDb(users: Record<string, UserData>) {
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

export function getUserData(email: string): UserData {
  const users = loadDb();
  const lowerEmail = email.toLowerCase();
  
  if (!users[lowerEmail]) {
    // Return default initialized data (doesn't save to file yet, just returns it)
    return {
      email: lowerEmail,
      settings: DEFAULT_SETTINGS,
      collections: getDefaultCollections(),
      views: getDefaultViews(),
      activeViewIndex: 0,
    };
  }
  
  // Merge loaded data with defaults to ensure completeness
  const user = users[lowerEmail];
  return {
    email: lowerEmail,
    settings: { ...DEFAULT_SETTINGS, ...user.settings },
    collections: user.collections || getDefaultCollections(),
    views: user.views || getDefaultViews(),
    activeViewIndex: typeof user.activeViewIndex === 'number' ? user.activeViewIndex : 0,
  };
}

export function saveUserData(email: string, updates: Partial<Omit<UserData, 'email'>>): UserData {
  const users = loadDb();
  const lowerEmail = email.toLowerCase();
  const current = getUserData(lowerEmail);
  
  const updatedUser: UserData = {
    email: lowerEmail,
    settings: updates.settings ? { ...current.settings, ...updates.settings } : current.settings,
    collections: updates.collections !== undefined ? updates.collections : current.collections,
    views: updates.views !== undefined ? updates.views : current.views,
    activeViewIndex: updates.activeViewIndex !== undefined ? updates.activeViewIndex : current.activeViewIndex,
  };
  
  users[lowerEmail] = updatedUser;
  saveDb(users);
  return updatedUser;
}
