'use client';
import React, { useState, useEffect } from 'react';
import { useQuran } from '@/context/QuranContext';
import { SURAH_LIST, SurahMetadata } from '@/constants/surahList';
import { Search, ChevronRight, CheckCircle2, Bookmark, BookOpen } from 'lucide-react';

interface SurahListTabProps {
  onNavigateToReader: () => void;
}

export default function SurahListTab({ onNavigateToReader }: SurahListTabProps) {
  const { cachedSurahNumbers, currentSurahNumber, setCurrentSurahNumber, setCurrentAyahNumber } = useQuran();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSurahs, setFilteredSurahs] = useState<SurahMetadata[]>(SURAH_LIST);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSurahs(SURAH_LIST);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = SURAH_LIST.filter(
        (surah) =>
          surah.englishName.toLowerCase().includes(q) ||
          surah.englishNameTranslation.toLowerCase().includes(q) ||
          surah.number.toString().includes(q) ||
          surah.name.includes(q)
      );
      setFilteredSurahs(filtered);
    }
  }, [searchQuery]);

  const recentSurah = SURAH_LIST.find((s) => s.number === currentSurahNumber);

  const handleSelectSurah = (num: number) => {
    setCurrentSurahNumber(num);
    setCurrentAyahNumber(1);
    onNavigateToReader();
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Banner Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 opacity-90" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quran Al-Kareem</h1>
          </div>
          <p className="text-sm md:text-base text-sky-100/90 font-medium">
            Learn, read, and reflect daily. Accessible fully offline.
          </p>
        </div>
        {recentSurah && (
          <button
            onClick={() => handleSelectSurah(recentSurah.number)}
            className="flex items-center gap-4 bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white/30 rounded-2xl p-4 transition-all duration-200 text-left cursor-pointer w-full md:w-auto"
          >
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                Recently Read
              </span>
              <h3 className="text-lg font-bold mt-1">{recentSurah.englishName}</h3>
              <p className="text-xs opacity-75">Surah {recentSurah.number}</p>
            </div>
            <ChevronRight className="w-5 h-5 opacity-80" />
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 dark:text-zinc-500 pointer-events-none">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Search by surah name, translation, or number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-11 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-xs"
        />
      </div>

      {/* Surah List Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSurahs.length === 0 ? (
          <div className="col-span-full text-center py-12 space-y-3">
            <Search className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No Surahs found</h3>
            <p className="text-sm text-zinc-500">Try matching spelling or surah numbers.</p>
          </div>
        ) : (
          filteredSurahs.map((surah) => {
            const isCached = cachedSurahNumbers.includes(surah.number);
            return (
              <button
                key={surah.number}
                onClick={() => handleSelectSurah(surah.number)}
                className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-sky-500/5 dark:hover:bg-sky-500/10 rounded-2xl cursor-pointer hover:border-sky-500/30 transition-all text-left shadow-xs hover:shadow-md duration-200 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Number Badge */}
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-100 dark:border-zinc-800 text-sm font-bold text-zinc-800 dark:text-zinc-200 rounded-xl group-hover:bg-sky-500/10 group-hover:text-sky-500 group-hover:border-sky-500/20 transition-all duration-200">
                    {surah.number}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {surah.englishName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                      <span>{surah.revelationType}</span>
                      <span>•</span>
                      <span>{surah.numberOfAyahs} Ayahs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xl font-bold font-arabic text-zinc-900 dark:text-zinc-100">
                      {surah.name}
                    </p>
                  </div>
                  <div className="flex items-center text-zinc-400 dark:text-zinc-600">
                    {isCached && (
                      <CheckCircle2 size={16} className="text-green-500 mr-1.5 fill-green-500/10" />
                    )}
                    <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
