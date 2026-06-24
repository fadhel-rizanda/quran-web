'use client';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  edition: string;
  rtl: boolean;
}

export const LANGUAGES: LanguageConfig[] = [
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', edition: 'id.indonesian', rtl: false },
  { code: 'en', name: 'English', nativeName: 'English (Sahih)', edition: 'en.sahih', rtl: false },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', edition: 'ms.melayu', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', edition: 'fr.hamidullah', rtl: false },
];

type ThemeType = 'light' | 'dark' | 'system';

interface SettingsContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  arabicFontSize: number;
  setArabicFontSize: (size: number) => void;
  translationFontSize: number;
  setTranslationFontSize: (size: number) => void;
  selectedLanguages: string[];
  toggleLanguage: (code: string) => void;
  isRTL: boolean;
  showArabic: boolean;
  setShowArabic: (val: boolean) => void;
  syncWithServer: (settings: any) => void;
  isLoading: boolean;
  isSyncing: boolean;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  THEME: 'quran_settings_theme',
  ARABIC_FONT_SIZE: 'quran_settings_arabic_font_size',
  TRANS_FONT_SIZE: 'quran_settings_trans_font_size',
  LANGUAGES: 'quran_settings_languages',
  SHOW_ARABIC: 'quran_settings_show_arabic',
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [arabicFontSize, setArabicFontSizeState] = useState<number>(28);
  const [translationFontSize, setTranslationFontSizeState] = useState<number>(16);
  const [selectedLanguages, setSelectedLanguagesState] = useState<string[]>(['id']);
  const [showArabic, setShowArabicState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs to prevent stale state closure issues in debounced sync and back-to-back updates
  const themeRef = useRef<ThemeType>('system');
  const arabicFontSizeRef = useRef<number>(28);
  const translationFontSizeRef = useRef<number>(16);
  const selectedLanguagesRef = useRef<string[]>(['id']);
  const showArabicRef = useRef<boolean>(true);
  const hasFetchedRef = useRef<boolean>(false);

  // Keep refs in sync with state updates as a fallback
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    arabicFontSizeRef.current = arabicFontSize;
  }, [arabicFontSize]);

  useEffect(() => {
    translationFontSizeRef.current = translationFontSize;
  }, [translationFontSize]);

  useEffect(() => {
    selectedLanguagesRef.current = selectedLanguages;
  }, [selectedLanguages]);

  useEffect(() => {
    showArabicRef.current = showArabic;
  }, [showArabic]);

  // 1. Initial load from LocalStorage (Guest Mode baseline)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
    if (storedTheme) {
      setThemeState(storedTheme as ThemeType);
      themeRef.current = storedTheme as ThemeType;
    }

    const storedArabicSize = localStorage.getItem(LOCAL_STORAGE_KEYS.ARABIC_FONT_SIZE);
    if (storedArabicSize) {
      setArabicFontSizeState(parseInt(storedArabicSize, 10));
      arabicFontSizeRef.current = parseInt(storedArabicSize, 10);
    }

    const storedTransSize = localStorage.getItem(LOCAL_STORAGE_KEYS.TRANS_FONT_SIZE);
    if (storedTransSize) {
      setTranslationFontSizeState(parseInt(storedTransSize, 10));
      translationFontSizeRef.current = parseInt(storedTransSize, 10);
    }

    const storedLangs = localStorage.getItem(LOCAL_STORAGE_KEYS.LANGUAGES);
    if (storedLangs) {
      try {
        const parsed = JSON.parse(storedLangs);
        setSelectedLanguagesState(parsed);
        selectedLanguagesRef.current = parsed;
      } catch (e) {
        console.error(e);
      }
    }

    const storedShowArabic = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_ARABIC);
    if (storedShowArabic !== null) {
      const val = storedShowArabic === 'true';
      setShowArabicState(val);
      showArabicRef.current = val;
    }
    
    setIsLoading(false);
  }, []);

  // 2. Load from server database if authenticated
  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') {
        hasFetchedRef.current = false;
      }
      return;
    }

    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchServerSettings = async () => {
      try {
        const res = await fetch(`/api/user/sync?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.isNewUser) {
            // Push current guest settings from state / local storage to database immediately
            const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME) as ThemeType || 'system';
            const storedArabicSize = localStorage.getItem(LOCAL_STORAGE_KEYS.ARABIC_FONT_SIZE) ? parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.ARABIC_FONT_SIZE)!, 10) : 28;
            const storedTransSize = localStorage.getItem(LOCAL_STORAGE_KEYS.TRANS_FONT_SIZE) ? parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.TRANS_FONT_SIZE)!, 10) : 16;
            let storedLangs = ['id'];
            const langsJson = localStorage.getItem(LOCAL_STORAGE_KEYS.LANGUAGES);
            if (langsJson) {
              try {
                storedLangs = JSON.parse(langsJson);
              } catch (e) {
                console.error(e);
              }
            }
            const storedShowArabic = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_ARABIC) !== 'false';

            const localSettings = {
              theme: storedTheme,
              arabicFontSize: storedArabicSize,
              translationFontSize: storedTransSize,
              selectedLanguages: storedLangs,
              showArabic: storedShowArabic,
            };

            await fetch('/api/user/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ settings: localSettings }),
            });
          } else if (data.settings) {
            const { theme, arabicFontSize, translationFontSize, selectedLanguages, showArabic } = data.settings;
            if (theme) {
              setThemeState(theme);
              themeRef.current = theme;
              localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
            }
            if (arabicFontSize) {
              setArabicFontSizeState(arabicFontSize);
              arabicFontSizeRef.current = arabicFontSize;
              localStorage.setItem(LOCAL_STORAGE_KEYS.ARABIC_FONT_SIZE, arabicFontSize.toString());
            }
            if (translationFontSize) {
              setTranslationFontSizeState(translationFontSize);
              translationFontSizeRef.current = translationFontSize;
              localStorage.setItem(LOCAL_STORAGE_KEYS.TRANS_FONT_SIZE, translationFontSize.toString());
            }
            if (selectedLanguages) {
              setSelectedLanguagesState(selectedLanguages);
              selectedLanguagesRef.current = selectedLanguages;
              localStorage.setItem(LOCAL_STORAGE_KEYS.LANGUAGES, JSON.stringify(selectedLanguages));
            }
            if (showArabic !== undefined) {
              setShowArabicState(showArabic);
              showArabicRef.current = showArabic;
              localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_ARABIC, showArabic ? 'true' : 'false');
            }
          }
        }
      } catch (e) {
        console.error('Failed to sync settings with server', e);
      }
    };

    fetchServerSettings();
  }, [status]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync to database helper (Debounced by 1.5s to preserve Vercel execution limits & Upstash requests)
  const syncWithServer = () => {
    if (status !== 'authenticated') return;
    
    setIsSyncing(true);

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              theme: themeRef.current,
              arabicFontSize: arabicFontSizeRef.current,
              translationFontSize: translationFontSizeRef.current,
              selectedLanguages: selectedLanguagesRef.current,
              showArabic: showArabicRef.current,
            }
          }),
        });
      } catch (e) {
        console.error('Error syncing with database', e);
      } finally {
        setIsSyncing(false);
      }
    }, 1500);
  };

  const setTheme = async (newTheme: ThemeType) => {
    themeRef.current = newTheme;
    setThemeState(newTheme);
    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, newTheme);
    syncWithServer();
  };

  const setArabicFontSize = async (size: number) => {
    arabicFontSizeRef.current = size;
    setArabicFontSizeState(size);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ARABIC_FONT_SIZE, size.toString());
    syncWithServer();
  };

  const setTranslationFontSize = async (size: number) => {
    translationFontSizeRef.current = size;
    setTranslationFontSizeState(size);
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRANS_FONT_SIZE, size.toString());
    syncWithServer();
  };

  const setShowArabic = async (val: boolean) => {
    showArabicRef.current = val;
    setShowArabicState(val);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_ARABIC, val ? 'true' : 'false');
    syncWithServer();
  };

  const toggleLanguage = async (code: string) => {
    let updatedLangs: string[];
    if (selectedLanguagesRef.current.includes(code)) {
      if (selectedLanguagesRef.current.length <= 1) return;
      updatedLangs = selectedLanguagesRef.current.filter((l) => l !== code);
    } else {
      updatedLangs = [...selectedLanguagesRef.current, code];
    }
    selectedLanguagesRef.current = updatedLangs;
    setSelectedLanguagesState(updatedLangs);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LANGUAGES, JSON.stringify(updatedLangs));
    syncWithServer();
  };

  // Check if any selected language is RTL
  const isRTL = selectedLanguages.some((code) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    return lang?.rtl ?? false;
  });

  // Apply dark class to html document based on active settings
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        arabicFontSize,
        setArabicFontSize,
        translationFontSize,
        setTranslationFontSize,
        selectedLanguages,
        toggleLanguage,
        isRTL,
        showArabic,
        setShowArabic,
        syncWithServer,
        isLoading,
        isSyncing,
      }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
