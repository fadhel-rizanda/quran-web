'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useQuran, Ayah, SurahData } from '@/context/QuranContext';
import { useSettings, LANGUAGES } from '@/context/SettingsContext';
import { useBookmarks } from '@/context/BookmarkContext';
import { SURAH_LIST } from '@/constants/surahList';
import { ChevronLeft, ChevronRight, ChevronDown, Bookmark, BookmarkCheck, Loader2, AlertCircle } from 'lucide-react';
import BookmarkSelectModal from './BookmarkSelectModal';

export default function ReaderTab() {
  const {
    currentSurahNumber,
    setCurrentSurahNumber,
    currentAyahNumber,
    setCurrentAyahNumber,
    getSurah,
    downloadProgress,
  } = useQuran();

  const { arabicFontSize, translationFontSize, selectedLanguages, showArabic } = useSettings();
  const { isBookmarked } = useBookmarks();

  const [surahData, setSurahData] = useState<SurahData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector Menus
  const [surahMenuOpen, setSurahMenuOpen] = useState(false);
  const [ayahMenuOpen, setAyahMenuOpen] = useState(false);
  const [searchSurahQuery, setSearchSurahQuery] = useState('');

  // Bookmark assignment Modal
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [activeBookmarkAyah, setActiveBookmarkAyah] = useState<Ayah | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const loadSurah = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSurah(currentSurahNumber);
      if (data) {
        setSurahData(data);
      } else {
        setError('Failed to fetch Surah data. Check your network connection.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred while loading Surah.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurah();
  }, [currentSurahNumber, selectedLanguages]);

  // Scroll to active ayah when loaded
  useEffect(() => {
    if (!loading && surahData) {
      const activeEl = ayahRefs.current[currentAyahNumber];
      if (activeEl) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [loading, currentSurahNumber, currentAyahNumber, surahData]);

  const handleNextSurah = () => {
    if (currentSurahNumber < 114) {
      setCurrentSurahNumber(currentSurahNumber + 1);
      setCurrentAyahNumber(1);
    }
  };

  const handlePrevSurah = () => {
    if (currentSurahNumber > 1) {
      setCurrentSurahNumber(currentSurahNumber - 1);
      setCurrentAyahNumber(1);
    }
  };

  const handleOpenBookmarkModal = (ayah: Ayah) => {
    setActiveBookmarkAyah(ayah);
    setBookmarkModalOpen(true);
  };

  const currentMetadata = SURAH_LIST.find((s) => s.number === currentSurahNumber);
  const isAtTawbah = currentSurahNumber === 9;

  // Filter surah list
  const filteredSurahs = SURAH_LIST.filter(
    (s) =>
      s.englishName.toLowerCase().includes(searchSurahQuery.toLowerCase()) ||
      s.number.toString().includes(searchSurahQuery)
  );

  return (
    <div className="space-y-6" ref={containerRef}>
      
      {/* Top Bar Selectors / Nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <button
          onClick={handlePrevSurah}
          disabled={currentSurahNumber === 1}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          {/* Surah Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setSurahMenuOpen(!surahMenuOpen);
                setAyahMenuOpen(false);
                setSearchSurahQuery('');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-sm font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[120px]">
                {currentMetadata?.englishName || 'Select Surah'}
              </span>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>

            {surahMenuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg z-30 p-2 space-y-2">
                <input
                  type="text"
                  placeholder="Filter surah..."
                  value={searchSurahQuery}
                  onChange={(e) => setSearchSurahQuery(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden"
                />
                <div className="max-h-60 overflow-y-auto space-y-0.5 text-sm">
                  {filteredSurahs.map((surah) => (
                    <button
                      key={surah.number}
                      onClick={() => {
                        setCurrentSurahNumber(surah.number);
                        setCurrentAyahNumber(1);
                        setSurahMenuOpen(false);
                      }}
                      className="flex items-center justify-between w-full p-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 cursor-pointer"
                    >
                      <div className="flex gap-2">
                        <span className="font-semibold text-zinc-400 w-5 text-right">{surah.number}</span>
                        <span className="font-medium">{surah.englishName}</span>
                      </div>
                      <span className="font-arabic text-zinc-600 dark:text-zinc-400 text-xs">{surah.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ayah Dropdown Grid Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setAyahMenuOpen(!ayahMenuOpen);
                setSurahMenuOpen(false);
              }}
              disabled={!surahData}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-sm font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-colors cursor-pointer"
            >
              <span>Ayah {currentAyahNumber}</span>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>

            {ayahMenuOpen && surahData && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg z-30 p-3 space-y-2">
                <h4 className="text-xs font-bold uppercase text-zinc-400 text-center tracking-wider mb-2">Jump to Ayah</h4>
                <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-0.5">
                  {Array.from({ length: surahData.numberOfAyahs }, (_, i) => i + 1).map((ayahNum) => (
                    <button
                      key={ayahNum}
                      onClick={() => {
                        setCurrentAyahNumber(ayahNum);
                        setAyahMenuOpen(false);
                      }}
                      className={`h-8 flex items-center justify-center font-bold text-xs rounded-lg transition-colors cursor-pointer ${
                        currentAyahNumber === ayahNum
                          ? 'bg-sky-500 text-white'
                          : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {ayahNum}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleNextSurah}
          disabled={currentSurahNumber === 114}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Main Content display area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <p className="text-sm">
            Loading Surah...
            {downloadProgress[currentSurahNumber] && ` ${downloadProgress[currentSurahNumber]}%`}
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Failed to load content</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">{error}</p>
          <button
            onClick={loadSurah}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-xl cursor-pointer shadow-md transition-colors"
          >
            Retry / Sync Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Header Card */}
          {currentMetadata && (
            <div className="flex flex-col items-center text-center p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl space-y-2">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {currentMetadata.englishName}
              </h2>
              {showArabic && (
                <p className="text-3xl font-arabic font-bold text-zinc-950 dark:text-zinc-50 tracking-wide my-1">
                  {currentMetadata.name}
                </p>
              )}
              <p className="text-sm text-zinc-500 font-medium italic">
                {currentMetadata.englishNameTranslation}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold uppercase tracking-wider mt-1">
                <span>{currentMetadata.revelationType}</span>
                <span>•</span>
                <span>{currentMetadata.numberOfAyahs} Verses</span>
              </div>

              {/* Bismillah banner */}
              {showArabic && !isAtTawbah && (
                <div className="w-full max-w-xs border-t border-zinc-200 dark:border-zinc-800/50 mt-4 pt-4 text-center">
                  <p className="text-2xl font-arabic text-zinc-900 dark:text-zinc-100 leading-relaxed">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Verses Scroll list */}
          <div className="space-y-1">
            {surahData?.ayahs.map((ayah, index) => {
              const isCurrentlyRead = currentAyahNumber === ayah.numberInSurah;
              const bookmarked = isBookmarked(currentSurahNumber, ayah.numberInSurah);

              // Remove duplicate Bismillah prefix for display from verse 1
              let displayArabic = ayah.text;
              const bismillahPrefix = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
              if (
                currentSurahNumber !== 1 &&
                currentSurahNumber !== 9 &&
                ayah.numberInSurah === 1 &&
                displayArabic.startsWith(bismillahPrefix)
              ) {
                displayArabic = displayArabic.replace(bismillahPrefix, '').trim();
                if (displayArabic === '') {
                  displayArabic = ayah.text;
                }
              }

              return (
                <div
                  key={ayah.number}
                  ref={(el) => {
                    ayahRefs.current[ayah.numberInSurah] = el;
                  }}
                  className={`p-6 rounded-3xl border-b border-zinc-100 dark:border-zinc-800/40 transition-all duration-200 space-y-4 ${
                    isCurrentlyRead ? 'bg-sky-500/5 dark:bg-sky-500/10 border-l-4 border-l-sky-500' : 'bg-transparent'
                  }`}
                >
                  
                  {/* Top Action Row */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setCurrentAyahNumber(ayah.numberInSurah)}
                      className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-colors ${
                        isCurrentlyRead
                          ? 'bg-sky-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {currentSurahNumber}:{ayah.numberInSurah}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenBookmarkModal(ayah)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-sky-500 rounded-lg transition-colors cursor-pointer"
                      >
                        {bookmarked ? (
                          <BookmarkCheck size={20} className="text-sky-500 fill-sky-500/10" />
                        ) : (
                          <Bookmark size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Arabic Text Block */}
                  {showArabic && (
                    <p
                      dir="rtl"
                      className="text-right font-arabic leading-loose tracking-wide text-zinc-950 dark:text-zinc-50"
                      style={{
                        fontSize: `${arabicFontSize}px`,
                        lineHeight: `${arabicFontSize * 2}px`,
                      }}
                    >
                      {displayArabic}
                    </p>
                  )}

                  {/* Translations stacked vertically */}
                  <div className="space-y-3.5">
                    {selectedLanguages.map((langCode) => {
                      const text = ayah.translations[langCode];
                      const config = LANGUAGES.find((l) => l.code === langCode);
                      return (
                        <div key={langCode} className="text-left">
                          {selectedLanguages.length > 1 && (
                            <span className="text-[10px] font-bold text-sky-500 tracking-wide uppercase block mb-1">
                              {config?.name || langCode}:
                            </span>
                          )}
                          <p
                            className="text-zinc-800 dark:text-zinc-200 font-medium tracking-wide leading-relaxed"
                            style={{ fontSize: `${translationFontSize}px` }}
                          >
                            {text || 'Translation unavailable offline. Connect to fetch.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Bookmark Modal */}
      {activeBookmarkAyah && (
        <BookmarkSelectModal
          visible={bookmarkModalOpen}
          onClose={() => {
            setBookmarkModalOpen(false);
            setActiveBookmarkAyah(null);
          }}
          surahNumber={currentSurahNumber}
          ayahNumber={activeBookmarkAyah.numberInSurah}
          arabicText={activeBookmarkAyah.text}
          translations={activeBookmarkAyah.translations}
        />
      )}

    </div>
  );
}
