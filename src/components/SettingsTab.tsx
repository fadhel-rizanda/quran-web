'use client';
import React from 'react';
import { useSettings, LANGUAGES } from '@/context/SettingsContext';
import { useQuran } from '@/context/QuranContext';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Minus, Plus, Trash2, CloudDownload, Info, User, LogIn, LogOut, Sun, Moon, Laptop, Loader2 } from 'lucide-react';

export default function SettingsTab() {
  const { data: session, status } = useSession();

  const {
    theme,
    setTheme,
    arabicFontSize,
    setArabicFontSize,
    translationFontSize,
    setTranslationFontSize,
    selectedLanguages,
    toggleLanguage,
    showArabic,
    setShowArabic,
  } = useSettings();

  const {
    cachedSurahNumbers,
    isDownloadingAll,
    downloadAllSurahs,
    cancelDownloadAll,
    clearCache,
    downloadProgress,
  } = useQuran();

  const downloadCount = cachedSurahNumbers.length;

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all downloaded surah content from your browser cache? You will need internet connection to fetch pages next time.')) {
      clearCache();
      alert('Local cache cleared successfully.');
    }
  };

  const handleDownloadAll = () => {
    if (isDownloadingAll) {
      cancelDownloadAll();
    } else {
      if (confirm(`Download all 114 surahs offline? This will store metadata and selected translations locally. Proceed?`)) {
        downloadAllSurahs();
      }
    }
  };

  const increaseArabicSize = () => {
    if (arabicFontSize < 48) setArabicFontSize(arabicFontSize + 2);
  };

  const decreaseArabicSize = () => {
    if (arabicFontSize > 20) setArabicFontSize(arabicFontSize - 2);
  };

  const increaseTransSize = () => {
    if (translationFontSize < 30) setTranslationFontSize(translationFontSize + 1);
  };

  const decreaseTransSize = () => {
    if (translationFontSize > 12) setTranslationFontSize(translationFontSize - 1);
  };

  const activeDownloads = Object.entries(downloadProgress).filter(([_, prog]) => prog < 100);
  const activeDownloadingSurah = activeDownloads.length > 0 ? activeDownloads[0] : null;

  return (
    <div className="space-y-8 max-w-2xl">
      
      {/* Account / Sync Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-sky-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <User size={16} />
          Account & Cloud Sync
        </h2>
        {status === 'loading' ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : status === 'authenticated' && session?.user ? (
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'Avatar'}
                  className="w-12 h-12 rounded-full border border-zinc-150"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
                  {session.user.name?.[0] || 'U'}
                </div>
              )}
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{session.user.name}</h3>
                <p className="text-xs text-zinc-500">{session.user.email}</p>
                <span className="inline-block bg-green-500/10 text-green-500 font-semibold px-2 py-0.5 rounded-md text-[10px] uppercase mt-1">
                  Synced with Cloud
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-855 dark:hover:bg-zinc-800 text-sm font-bold text-red-500 rounded-xl cursor-pointer transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Sign in with Google to persistently back up your folder collections, bookmark views, and visual settings on the cloud.
            </p>
            <button
              onClick={() => signIn('google')}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md transition-all duration-150"
            >
              <LogIn size={16} />
              Sign In with Google
            </button>
          </div>
        )}
      </div>

      {/* Translations Selection */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-sky-500 uppercase tracking-wider">Translations</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Toggle which translation sources to stack underneath the verses.
        </p>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.code);
            return (
              <div key={lang.code} className="flex items-center justify-between p-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{lang.nativeName}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{lang.name}</p>
                </div>
                <button
                  onClick={() => toggleLanguage(lang.code)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                    isSelected ? 'bg-sky-500 flex justify-end' : 'bg-zinc-200 dark:bg-zinc-800 flex justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Typography Preview & Size Adjusters */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-sky-500 uppercase tracking-wider">Typography & Sizing</h2>
        
        {/* Preview Card */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl space-y-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Live Preview</span>
          {showArabic && (
            <p
              dir="rtl"
              className="text-right font-arabic leading-loose text-zinc-950 dark:text-zinc-50"
              style={{ fontSize: `${arabicFontSize}px`, lineHeight: `${arabicFontSize * 1.8}px` }}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          )}
          <p
            className="text-zinc-800 dark:text-zinc-250 font-medium leading-relaxed"
            style={{ fontSize: `${translationFontSize}px` }}
          >
            Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.
          </p>
        </div>

        {/* Size controllers */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl divide-y divide-zinc-100 dark:divide-zinc-800/50">
          
          {/* Show Arabic Script */}
          <div className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Show Arabic Script</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Toggle Arabic display visibility</p>
            </div>
            <button
              onClick={() => setShowArabic(!showArabic)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                showArabic ? 'bg-sky-500 flex justify-end' : 'bg-zinc-200 dark:bg-zinc-800 flex justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Arabic script size */}
          {showArabic && (
            <div className="flex items-center justify-between p-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Arabic FontSize</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Currently: {arabicFontSize}px</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={decreaseArabicSize}
                  disabled={arabicFontSize <= 20}
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <button
                  onClick={increaseArabicSize}
                  disabled={arabicFontSize >= 48}
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Translation script size */}
          <div className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Translation FontSize</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Currently: {translationFontSize}px</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={decreaseTransSize}
                disabled={translationFontSize <= 12}
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={increaseTransSize}
                disabled={translationFontSize >= 30}
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* App Theme Selector */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-sky-500 uppercase tracking-wider">Appearance Theme</h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {[
            { id: 'system', name: 'System Default', icon: Laptop },
            { id: 'light', name: 'Light Mode', icon: Sun },
            { id: 'dark', name: 'Dark Mode', icon: Moon },
          ].map((mode) => {
            const isSelected = theme === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setTheme(mode.id as any)}
                className="flex items-center justify-between w-full p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-sky-500" />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{mode.name}</span>
                </div>
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Offline Storage Cache Manager */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-sky-500 uppercase tracking-wider">Offline Cache Manager</h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4 shadow-3xs">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">Local Cache Quota</span>
              <span className="font-bold text-sky-500">{downloadCount} / 114 Surahs</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${(downloadCount / 114) * 100}%` }}
                className="h-full bg-sky-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {isDownloadingAll && (
            <div className="flex items-center gap-3 p-3 bg-sky-500/5 rounded-2xl border border-sky-500/20 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-sky-500 shrink-0" />
              <div className="flex-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-250 block">Downloading all surahs...</span>
                {activeDownloadingSurah && (
                  <span className="text-zinc-500 mt-0.5 block">
                    Surah {activeDownloadingSurah[0]} progress: {activeDownloadingSurah[1]}%
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={handleDownloadAll}
              className={`flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-xl cursor-pointer border ${
                isDownloadingAll
                  ? 'border-red-500 text-red-500 hover:bg-red-500/5'
                  : 'border-sky-500/30 text-sky-500 hover:bg-sky-500/5'
              } transition-colors`}
            >
              <CloudDownload size={15} />
              {isDownloadingAll ? 'Cancel Download' : 'Download All for Offline Use'}
            </button>
            <button
              onClick={handleClearCache}
              disabled={downloadCount === 0}
              className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-xl cursor-pointer border border-zinc-250 dark:border-zinc-800 text-zinc-500 hover:text-red-500 disabled:opacity-40 disabled:hover:text-zinc-500 transition-colors"
            >
              <Trash2 size={15} />
              Clear Local Cache
            </button>
          </div>

        </div>
      </div>

      {/* About Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-sky-500 uppercase tracking-wider">About</h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-3xl p-5 space-y-4 shadow-3xs text-sm">
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            This application is designed as a personal web portal for studying and reflecting upon the Quran, optimized to work fully offline once cached.
          </p>
          <div className="border-t border-zinc-100 dark:border-zinc-800/50 pt-3 space-y-2 text-xs text-zinc-500">
            <div className="flex justify-between">
              <span>Source API:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Al-Quran Cloud API</span>
            </div>
            <div className="flex justify-between">
              <span>Arabic Font:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Scheherazade New (OFL License)</span>
            </div>
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">1.0.0 (Next.js 16 App Router)</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
