'use client';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface Bookmark {
  id: string; // e.g. `${surahNumber}_${ayahNumber}`
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  translations: Record<string, string>; // langCode -> text
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
  selectedCollectionId: string; // 'all' or specific collection.id
}

interface BookmarkContextProps {
  collections: BookmarkCollection[];
  bookmarkViews: BookmarkView[];
  activeViewIndex: number;
  setActiveViewIndex: (index: number) => void;
  addCollection: (name: string) => string;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addBookmark: (collectionId: string, surahNumber: number, ayahNumber: number, arabicText: string, translations: Record<string, string>, notes?: string) => void;
  removeBookmark: (collectionId: string, surahNumber: number, ayahNumber: number) => void;
  isBookmarked: (surahNumber: number, ayahNumber: number, collectionId?: string) => boolean;
  addBookmarkView: (name: string, collectionId: string) => void;
  deleteBookmarkView: (viewId: string) => void;
  updateBookmarkView: (viewId: string, updates: Partial<BookmarkView>) => void;
  isLoading: boolean;
}

const BookmarkContext = createContext<BookmarkContextProps | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  COLLECTIONS: 'quran_bookmarks_collections',
  VIEWS: 'quran_bookmarks_views',
  ACTIVE_VIEW_INDEX: 'quran_bookmarks_active_view_index',
};

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();

  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [bookmarkViews, setBookmarkViews] = useState<BookmarkView[]>([]);
  const [activeViewIndex, setActiveViewIndexState] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial load from LocalStorage (Guest Mode baseline)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedCollections = localStorage.getItem(LOCAL_STORAGE_KEYS.COLLECTIONS);
    const storedViews = localStorage.getItem(LOCAL_STORAGE_KEYS.VIEWS);
    const storedActiveViewIndex = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_VIEW_INDEX);

    let parsedCollections: BookmarkCollection[] = [];
    if (storedCollections) {
      try {
        parsedCollections = JSON.parse(storedCollections);
      } catch (e) {
        console.error(e);
      }
    } else {
      parsedCollections = [
        {
          id: 'default_favs',
          name: 'Favorites',
          createdAt: Date.now(),
          bookmarks: [],
        },
      ];
      localStorage.setItem(LOCAL_STORAGE_KEYS.COLLECTIONS, JSON.stringify(parsedCollections));
    }
    setCollections(parsedCollections);

    let parsedViews: BookmarkView[] = [];
    if (storedViews) {
      try {
        parsedViews = JSON.parse(storedViews);
      } catch (e) {
        console.error(e);
      }
    } else {
      parsedViews = [
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
      localStorage.setItem(LOCAL_STORAGE_KEYS.VIEWS, JSON.stringify(parsedViews));
    }
    setBookmarkViews(parsedViews);

    if (storedActiveViewIndex) {
      const index = parseInt(storedActiveViewIndex, 10);
      if (index >= 0 && index < parsedViews.length) {
        setActiveViewIndexState(index);
      }
    }

    setIsLoading(false);
  }, []);

  // 2. Load from server database if authenticated
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchServerBookmarks = async () => {
      try {
        const res = await fetch('/api/user/sync');
        if (res.ok) {
          const data = await res.json();
          if (data.collections) setCollections(data.collections);
          if (data.views) setBookmarkViews(data.views);
          if (typeof data.activeViewIndex === 'number') {
            setActiveViewIndexState(data.activeViewIndex);
          }
        }
      } catch (e) {
        console.error('Failed to sync bookmarks with server', e);
      }
    };

    fetchServerBookmarks();
  }, [status]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync to database helper (Debounced by 1.5s to preserve Vercel execution limits & Upstash requests)
  const syncWithServer = (updatedCollections: BookmarkCollection[], updatedViews: BookmarkView[], updatedActiveIndex: number) => {
    if (status !== 'authenticated') return;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collections: updatedCollections,
            views: updatedViews,
            activeViewIndex: updatedActiveIndex,
          }),
        });
      } catch (e) {
        console.error('Error syncing bookmarks with server', e);
      }
    }, 1500);
  };

  const saveCollections = async (newCollections: BookmarkCollection[]) => {
    setCollections(newCollections);
    localStorage.setItem(LOCAL_STORAGE_KEYS.COLLECTIONS, JSON.stringify(newCollections));
    await syncWithServer(newCollections, bookmarkViews, activeViewIndex);
  };

  const saveViews = async (newViews: BookmarkView[]) => {
    setBookmarkViews(newViews);
    localStorage.setItem(LOCAL_STORAGE_KEYS.VIEWS, JSON.stringify(newViews));
    await syncWithServer(collections, newViews, activeViewIndex);
  };

  const setActiveViewIndex = async (index: number) => {
    setActiveViewIndexState(index);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_VIEW_INDEX, index.toString());
    await syncWithServer(collections, bookmarkViews, index);
  };

  const addCollection = (name: string): string => {
    const id = `col_${Date.now()}`;
    const newCol: BookmarkCollection = {
      id,
      name,
      createdAt: Date.now(),
      bookmarks: [],
    };
    const updated = [...collections, newCol];
    saveCollections(updated);
    return id;
  };

  const deleteCollection = (id: string) => {
    if (id === 'default_favs') return;
    const updated = collections.filter((c) => c.id !== id);
    saveCollections(updated);

    const updatedViews = bookmarkViews.map((view) => {
      if (view.selectedCollectionId === id) {
        return { ...view, selectedCollectionId: 'all', name: `${view.name} (All)` };
      }
      return view;
    });
    saveViews(updatedViews);
  };

  const renameCollection = (id: string, name: string) => {
    const updated = collections.map((c) => {
      if (c.id === id) {
        return { ...c, name };
      }
      return c;
    });
    saveCollections(updated);
  };

  const addBookmark = (
    collectionId: string,
    surahNumber: number,
    ayahNumber: number,
    arabicText: string,
    translations: Record<string, string>,
    notes?: string
  ) => {
    const bookmarkId = `${surahNumber}_${ayahNumber}`;
    const newBookmark: Bookmark = {
      id: bookmarkId,
      surahNumber,
      ayahNumber,
      arabicText,
      translations,
      timestamp: Date.now(),
      notes,
    };

    const updated = collections.map((c) => {
      if (c.id === collectionId) {
        const exists = c.bookmarks.some((b) => b.id === bookmarkId);
        if (exists) {
          return {
            ...c,
            bookmarks: c.bookmarks.map((b) => (b.id === bookmarkId ? newBookmark : b)),
          };
        }
        return { ...c, bookmarks: [newBookmark, ...c.bookmarks] };
      }
      return c;
    });
    saveCollections(updated);
  };

  const removeBookmark = (collectionId: string, surahNumber: number, ayahNumber: number) => {
    const bookmarkId = `${surahNumber}_${ayahNumber}`;
    const updated = collections.map((c) => {
      if (c.id === collectionId) {
        return { ...c, bookmarks: c.bookmarks.filter((b) => b.id !== bookmarkId) };
      }
      return c;
    });
    saveCollections(updated);
  };

  const isBookmarked = (surahNumber: number, ayahNumber: number, collectionId?: string): boolean => {
    const bookmarkId = `${surahNumber}_${ayahNumber}`;
    if (collectionId) {
      const col = collections.find((c) => c.id === collectionId);
      return col ? col.bookmarks.some((b) => b.id === bookmarkId) : false;
    }
    return collections.some((c) => c.bookmarks.some((b) => b.id === bookmarkId));
  };

  const addBookmarkView = (name: string, collectionId: string) => {
    const newView: BookmarkView = {
      id: `view_${Date.now()}`,
      name,
      selectedCollectionId: collectionId,
    };
    const updated = [...bookmarkViews, newView];
    saveViews(updated);
    setActiveViewIndex(updated.length - 1);
  };

  const deleteBookmarkView = (viewId: string) => {
    if (bookmarkViews.length <= 1) return;
    const viewToDeleteIndex = bookmarkViews.findIndex((v) => v.id === viewId);
    const updated = bookmarkViews.filter((v) => v.id !== viewId);
    saveViews(updated);

    if (activeViewIndex >= updated.length) {
      setActiveViewIndex(updated.length - 1);
    } else if (activeViewIndex === viewToDeleteIndex) {
      setActiveViewIndex(Math.max(0, viewToDeleteIndex - 1));
    }
  };

  const updateBookmarkView = (viewId: string, updates: Partial<BookmarkView>) => {
    const updated = bookmarkViews.map((v) => {
      if (v.id === viewId) {
        return { ...v, ...updates };
      }
      return v;
    });
    saveViews(updated);
  };

  return (
    <BookmarkContext.Provider
      value={{
        collections,
        bookmarkViews,
        activeViewIndex,
        setActiveViewIndex,
        addCollection,
        deleteCollection,
        renameCollection,
        addBookmark,
        removeBookmark,
        isBookmarked,
        addBookmarkView,
        deleteBookmarkView,
        updateBookmarkView,
        isLoading,
      }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};
