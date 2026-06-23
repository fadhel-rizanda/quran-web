'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings, LANGUAGES } from './SettingsContext';

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  translations: Record<string, string>;
}

export interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
  downloadedLanguages: string[];
}

interface QuranContextProps {
  cachedSurahNumbers: number[];
  downloadProgress: Record<number, number>;
  isDownloadingAll: boolean;
  currentSurahNumber: number;
  setCurrentSurahNumber: (num: number) => void;
  currentAyahNumber: number;
  setCurrentAyahNumber: (num: number) => void;
  downloadSurah: (surahNumber: number, forceLanguages?: string[]) => Promise<SurahData | null>;
  downloadAllSurahs: () => Promise<void>;
  cancelDownloadAll: () => void;
  getSurah: (surahNumber: number) => Promise<SurahData | null>;
  clearCache: () => Promise<void>;
}

const QuranContext = createContext<QuranContextProps | undefined>(undefined);

const LOCAL_KEYS = {
  CACHE_LIST: 'quran_cache_downloaded_list',
  CURRENT_SURAH: 'quran_current_surah',
  CURRENT_AYAH: 'quran_current_ayah',
};

export const QuranProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedLanguages } = useSettings();
  const [cachedSurahNumbers, setCachedSurahNumbers] = useState<number[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [shouldCancelDownloadAll, setShouldCancelDownloadAll] = useState(false);
  const [currentSurahNumber, setCurrentSurahNumberState] = useState<number>(1);
  const [currentAyahNumber, setCurrentAyahNumberState] = useState<number>(1);

  // In-memory cache fallback if localStorage is full or disabled
  const [memoryCache] = useState<Map<number, SurahData>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedList = localStorage.getItem(LOCAL_KEYS.CACHE_LIST);
    if (storedList) {
      try {
        setCachedSurahNumbers(JSON.parse(storedList));
      } catch (e) {
        console.error(e);
      }
    }

    const storedCurrentSurah = localStorage.getItem(LOCAL_KEYS.CURRENT_SURAH);
    if (storedCurrentSurah) {
      setCurrentSurahNumberState(parseInt(storedCurrentSurah, 10));
    }

    const storedCurrentAyah = localStorage.getItem(LOCAL_KEYS.CURRENT_AYAH);
    if (storedCurrentAyah) {
      setCurrentAyahNumberState(parseInt(storedCurrentAyah, 10));
    }
  }, []);

  const setCurrentSurahNumber = (num: number) => {
    if (num < 1 || num > 114) return;
    setCurrentSurahNumberState(num);
    localStorage.setItem(LOCAL_KEYS.CURRENT_SURAH, num.toString());
  };

  const setCurrentAyahNumber = (num: number) => {
    setCurrentAyahNumberState(num);
    localStorage.setItem(LOCAL_KEYS.CURRENT_AYAH, num.toString());
  };

  const getCachedSurah = async (number: number): Promise<SurahData | null> => {
    if (memoryCache.has(number)) {
      return memoryCache.get(number) || null;
    }
    
    try {
      const data = localStorage.getItem(`quran_cache_surah_${number}`);
      if (data) {
        const parsed = JSON.parse(data);
        memoryCache.set(number, parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading from localStorage cache', e);
    }
    return null;
  };

  const saveSurahToCache = async (number: number, data: SurahData) => {
    // Save to memory cache (always succeeds)
    memoryCache.set(number, data);

    try {
      localStorage.setItem(`quran_cache_surah_${number}`, JSON.stringify(data));
      
      setCachedSurahNumbers((prev) => {
        if (prev.includes(number)) return prev;
        const updated = [...prev, number].sort((a, b) => a - b);
        localStorage.setItem(LOCAL_KEYS.CACHE_LIST, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      // LocalStorage might be full (5MB limit reached)
      console.warn('LocalStorage quota exceeded, cached in memory only.', e);
    }
  };

  const downloadSurah = async (
    surahNumber: number,
    forceLanguages?: string[]
  ): Promise<SurahData | null> => {
    const langsToDownload = forceLanguages || selectedLanguages;
    setDownloadProgress((prev) => ({ ...prev, [surahNumber]: 10 }));

    try {
      const arRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
      if (!arRes.ok) throw new Error(`HTTP error ${arRes.status} fetching Arabic`);
      const arData = await arRes.json();
      if (arData.code !== 200) throw new Error('API returned error fetching Arabic');

      setDownloadProgress((prev) => ({ ...prev, [surahNumber]: 40 }));

      const ayahs: Ayah[] = arData.data.ayahs.map((ayah: any) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        translations: {},
      }));

      const existing = await getCachedSurah(surahNumber);
      if (existing) {
        ayahs.forEach((ayah, index) => {
          if (existing.ayahs[index]) {
            ayah.translations = { ...existing.ayahs[index].translations };
          }
        });
      }

      let count = 0;
      for (const langCode of langsToDownload) {
        const config = LANGUAGES.find((l) => l.code === langCode);
        if (!config) continue;

        try {
          const transRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${config.edition}`);
          if (transRes.ok) {
            const transData = await transRes.json();
            if (transData.code === 200) {
              transData.data.ayahs.forEach((transAyah: any, index: number) => {
                if (ayahs[index]) {
                  ayahs[index].translations[langCode] = transAyah.text;
                }
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch translation ${langCode} for surah ${surahNumber}`, e);
        }

        count++;
        const progressPercent = 40 + Math.floor((count / langsToDownload.length) * 50);
        setDownloadProgress((prev) => ({ ...prev, [surahNumber]: progressPercent }));
      }

      const downloadedLangs = Array.from(
        new Set([
          ...(existing?.downloadedLanguages || []),
          ...langsToDownload.filter((langCode) =>
            ayahs.every((a) => a.translations[langCode] && a.translations[langCode].length > 0)
          ),
        ])
      );

      const surahData: SurahData = {
        number: arData.data.number,
        name: arData.data.name,
        englishName: arData.data.englishName,
        englishNameTranslation: arData.data.englishNameTranslation,
        numberOfAyahs: arData.data.numberOfAyahs,
        revelationType: arData.data.revelationType,
        ayahs,
        downloadedLanguages: downloadedLangs,
      };

      await saveSurahToCache(surahNumber, surahData);
      setDownloadProgress((prev) => {
        const updated = { ...prev };
        delete updated[surahNumber];
        return updated;
      });

      return surahData;
    } catch (e) {
      console.error(`Failed to download surah ${surahNumber}`, e);
      setDownloadProgress((prev) => {
        const updated = { ...prev };
        delete updated[surahNumber];
        return updated;
      });
      return null;
    }
  };

  const getSurah = async (surahNumber: number): Promise<SurahData | null> => {
    const cached = await getCachedSurah(surahNumber);

    if (cached) {
      const needsDownload = selectedLanguages.some((lang) => !cached.downloadedLanguages.includes(lang));
      if (!needsDownload) {
        return cached;
      }
      try {
        const updated = await downloadSurah(surahNumber);
        if (updated) return updated;
      } catch (e) {
        console.warn(`Failed to update cache on-the-fly for surah ${surahNumber}`, e);
      }
      return cached;
    }

    return downloadSurah(surahNumber);
  };

  const downloadAllSurahs = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    setShouldCancelDownloadAll(false);

    try {
      for (let i = 1; i <= 114; i++) {
        let isCancelled = false;
        setShouldCancelDownloadAll((curr) => {
          if (curr) isCancelled = true;
          return curr;
        });
        if (isCancelled) {
          break;
        }

        const cached = await getCachedSurah(i);
        const needsDownload = !cached || selectedLanguages.some((lang) => !cached.downloadedLanguages.includes(lang));

        if (needsDownload) {
          await downloadSurah(i);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        setDownloadProgress((prev) => ({ ...prev, [i]: 100 }));
      }
    } catch (e) {
      console.error('Error downloading all surahs', e);
    } finally {
      setIsDownloadingAll(false);
      setShouldCancelDownloadAll(false);
      setDownloadProgress({});
    }
  };

  const cancelDownloadAll = () => {
    if (isDownloadingAll) {
      setShouldCancelDownloadAll(true);
    }
  };

  const clearCache = async () => {
    memoryCache.clear();
    try {
      const storedList = localStorage.getItem(LOCAL_KEYS.CACHE_LIST);
      if (storedList) {
        const list: number[] = JSON.parse(storedList);
        for (const num of list) {
          localStorage.removeItem(`quran_cache_surah_${num}`);
        }
      }
      localStorage.removeItem(LOCAL_KEYS.CACHE_LIST);
      setCachedSurahNumbers([]);
    } catch (e) {
      console.error('Failed to clear cache', e);
    }
  };

  return (
    <QuranContext.Provider
      value={{
        cachedSurahNumbers,
        downloadProgress,
        isDownloadingAll,
        currentSurahNumber,
        setCurrentSurahNumber,
        currentAyahNumber,
        setCurrentAyahNumber,
        downloadSurah,
        downloadAllSurahs,
        cancelDownloadAll,
        getSurah,
        clearCache,
      }}>
      {children}
    </QuranContext.Provider>
  );
};

export const useQuran = () => {
  const context = useContext(QuranContext);
  if (!context) {
    throw new Error('useQuran must be used within a QuranProvider');
  }
  return context;
};
