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

  // 1. Initial load from LocalStorage (Guest Mode baseline)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
    if (storedTheme) setThemeState(storedTheme as ThemeType);

    const storedArabicSize = localStorage.getItem(LOCAL_STORAGE_KEYS.ARABIC_FONT_SIZE);
    if (storedArabicSize) setArabicFontSizeState(parseInt(storedArabicSize, 10));

    const storedTransSize = localStorage.getItem(LOCAL_STORAGE_KEYS.TRANS_FONT_SIZE);
    if (storedTransSize) setTranslationFontSizeState(parseInt(storedTransSize, 10));

    const storedLangs = localStorage.getItem(LOCAL_STORAGE_KEYS.LANGUAGES);
    if (storedLangs) {
      try {
        setSelectedLanguagesState(JSON.parse(storedLangs));
      } catch (e) {
        console.error(e);
      }
    }

    const storedShowArabic = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_ARABIC);
    if (storedShowArabic !== null) {
      setShowArabicState(storedShowArabic === 'true');
    }
    
    setIsLoading(false);
  }, []);

  // 2. Load from server database if authenticated
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchServerSettings = async () => {
      try {
        const res = await fetch('/api/user/sync');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const { theme, arabicFontSize, translationFontSize, selectedLanguages, showArabic } = data.settings;
            if (theme) setThemeState(theme);
            if (arabicFontSize) setArabicFontSizeState(arabicFontSize);
            if (translationFontSize) setTranslationFontSizeState(translationFontSize);
            if (selectedLanguages) setSelectedLanguagesState(selectedLanguages);
            if (showArabic !== undefined) setShowArabicState(showArabic);
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
  const syncWithServer = (updatedSettings: any) => {
    if (status !== 'authenticated') return;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: updatedSettings }),
        });
      } catch (e) {
        console.error('Error syncing with database', e);
      }
    }, 1500);
  };

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, newTheme);
    await syncWithServer({ theme: newTheme, arabicFontSize, translationFontSize, selectedLanguages, showArabic });
  };

  const setArabicFontSize = async (size: number) => {
    setArabicFontSizeState(size);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ARABIC_FONT_SIZE, size.toString());
    await syncWithServer({ theme, arabicFontSize: size, translationFontSize, selectedLanguages, showArabic });
  };

  const setTranslationFontSize = async (size: number) => {
    setTranslationFontSizeState(size);
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRANS_FONT_SIZE, size.toString());
    await syncWithServer({ theme, arabicFontSize, translationFontSize: size, selectedLanguages, showArabic });
  };

  const setShowArabic = async (val: boolean) => {
    setShowArabicState(val);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_ARABIC, val ? 'true' : 'false');
    await syncWithServer({ theme, arabicFontSize, translationFontSize, selectedLanguages, showArabic: val });
  };

  const toggleLanguage = async (code: string) => {
    let updatedLangs: string[];
    if (selectedLanguages.includes(code)) {
      if (selectedLanguages.length <= 1) return;
      updatedLangs = selectedLanguages.filter((l) => l !== code);
    } else {
      updatedLangs = [...selectedLanguages, code];
    }
    setSelectedLanguagesState(updatedLangs);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LANGUAGES, JSON.stringify(updatedLangs));
    await syncWithServer({ theme, arabicFontSize, translationFontSize, selectedLanguages: updatedLangs, showArabic });
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
