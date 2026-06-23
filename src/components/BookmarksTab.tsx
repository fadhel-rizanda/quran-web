'use client';
import React, { useState } from 'react';
import { useBookmarks, Bookmark, BookmarkCollection, BookmarkView } from '@/context/BookmarkContext';
import { useSettings } from '@/context/SettingsContext';
import { useQuran } from '@/context/QuranContext';
import { SURAH_LIST } from '@/constants/surahList';
import { FolderOpen, Plus, Trash2, X, Edit, Check, Folder, Search, BookOpen, Settings } from 'lucide-react';

interface BookmarksTabProps {
  onNavigateToReader: () => void;
}

export default function BookmarksTab({ onNavigateToReader }: BookmarksTabProps) {
  const { setCurrentSurahNumber, setCurrentAyahNumber } = useQuran();
  const { arabicFontSize, translationFontSize, showArabic } = useSettings();

  const {
    collections,
    bookmarkViews,
    activeViewIndex,
    setActiveViewIndex,
    addCollection,
    deleteCollection,
    renameCollection,
    removeBookmark,
    addBookmarkView,
    deleteBookmarkView,
    updateBookmarkView,
  } = useBookmarks();

  const [searchQuery, setSearchQuery] = useState('');
  const [addViewModalOpen, setAddViewModalOpen] = useState(false);
  const [foldersModalOpen, setFoldersModalOpen] = useState(false);

  // New View form state
  const [newViewName, setNewViewName] = useState('');
  const [selectedColForNewView, setSelectedColForNewView] = useState('all');

  // Edit Collection name state
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');

  // New Collection Form state inside manager
  const [newColName, setNewColName] = useState('');

  const currentView: BookmarkView | undefined = bookmarkViews[activeViewIndex];

  // Resolve bookmarks for current view
  let viewBookmarks: Bookmark[] = [];
  let currentCollection: BookmarkCollection | undefined = undefined;

  if (currentView) {
    if (currentView.selectedCollectionId === 'all') {
      const map = new Map<string, Bookmark>();
      collections.forEach((col) => {
        col.bookmarks.forEach((b) => {
          map.set(b.id, b);
        });
      });
      viewBookmarks = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    } else {
      currentCollection = collections.find((c) => c.id === currentView.selectedCollectionId);
      if (currentCollection) {
        viewBookmarks = currentCollection.bookmarks;
      }
    }
  }

  // Filter bookmarks
  const filteredBookmarks = viewBookmarks.filter((b) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    const surahMeta = SURAH_LIST.find((s) => s.number === b.surahNumber);
    const nameMatch = surahMeta?.englishName.toLowerCase().includes(q) ?? false;
    const noteMatch = b.notes?.toLowerCase().includes(q) ?? false;
    const arabicMatch = b.arabicText.includes(q);
    const transMatch = Object.values(b.translations).some((text) =>
      text.toLowerCase().includes(q)
    );
    return nameMatch || noteMatch || arabicMatch || transMatch || b.surahNumber.toString() === q;
  });

  const handleCreateView = (e: React.FormEvent) => {
    e.preventDefault();
    if (newViewName.trim() === '') return;
    addBookmarkView(newViewName.trim(), selectedColForNewView);
    setNewViewName('');
    setSelectedColForNewView('all');
    setAddViewModalOpen(false);
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColName.trim() === '') return;
    addCollection(newColName.trim());
    setNewColName('');
  };

  const handleDeleteCollection = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? Bookmarked verses will still be kept in other collections.`)) {
      deleteCollection(id);
      setEditingCollectionId(null);
    }
  };

  const handleSaveRenameCollection = (id: string) => {
    if (editingCollectionName.trim() === '') return;
    renameCollection(id, editingCollectionName.trim());
    setEditingCollectionId(null);
  };

  const handleSelectBookmark = (surahNum: number, ayahNum: number) => {
    setCurrentSurahNumber(surahNum);
    setCurrentAyahNumber(ayahNum);
    onNavigateToReader();
  };

  return (
    <div className="space-y-6">
      
      {/* Scrollable Bookmark View Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <div className="flex items-center overflow-x-auto gap-2 pb-px no-scrollbar">
          {bookmarkViews.map((view, index) => {
            const isActive = index === activeViewIndex;
            return (
              <div
                key={view.id}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-sm cursor-pointer whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'border-sky-500 text-sky-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                <button onClick={() => setActiveViewIndex(index)}>
                  {view.name}
                </button>
                {bookmarkViews.length > 1 && (
                  <button
                    onClick={() => deleteBookmarkView(view.id)}
                    className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
          
          <button
            onClick={() => setAddViewModalOpen(true)}
            className="flex items-center gap-1 text-xs font-bold text-sky-500 hover:text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-500/5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} />
            Add View Tab
          </button>
        </div>

        <button
          onClick={() => setFoldersModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap mb-1"
        >
          <FolderOpen size={14} className="text-sky-500" />
          Folders Manager
        </button>
      </div>

      {/* Info Panel Bar */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-semibold tracking-wide">
        <span>Linked Folder:</span>
        <span className="text-zinc-800 dark:text-zinc-200">
          {currentView?.selectedCollectionId === 'all'
            ? 'All Collections'
            : currentCollection?.name || 'Unknown'}
        </span>
      </div>

      {/* Search Bookmarks */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 dark:text-zinc-500 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search bookmarks in this view..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 focus:outline-hidden"
        />
      </div>

      {/* Bookmarks Cards Grid */}
      <div className="space-y-4">
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-16 space-y-3 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-zinc-50/50 dark:bg-zinc-900/30">
            <BookOpen className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-300">
              {searchQuery ? 'No matching bookmarks' : 'No bookmarks found'}
            </h3>
            <p className="text-xs text-zinc-400">
              {searchQuery ? 'Check spelling or filters' : 'Assign verses from the Reader Tab.'}
            </p>
          </div>
        ) : (
          filteredBookmarks.map((bookmark) => {
            const surahMeta = SURAH_LIST.find((s) => s.number === bookmark.surahNumber);
            return (
              <div
                key={`${bookmark.id}_${bookmark.timestamp}`}
                className="bg-white dark:bg-zinc-900 border border-zinc-250/70 dark:border-zinc-800 rounded-2xl p-5 space-y-3.5 shadow-2xs hover:shadow-xs duration-150 relative overflow-hidden"
              >
                
                {/* Card Header Info */}
                <div className="flex items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/50 pb-2.5">
                  <button
                    onClick={() => handleSelectBookmark(bookmark.surahNumber, bookmark.ayahNumber)}
                    className="flex items-center gap-2 text-sm font-bold text-sky-500 hover:text-sky-600 text-left cursor-pointer"
                  >
                    <BookOpen size={15} />
                    <span>
                      {surahMeta?.englishName} ({bookmark.surahNumber}:{bookmark.ayahNumber})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      if (currentView?.selectedCollectionId === 'all') {
                        collections.forEach((col) => {
                          removeBookmark(col.id, bookmark.surahNumber, bookmark.ayahNumber);
                        });
                      } else if (currentView) {
                        removeBookmark(currentView.selectedCollectionId, bookmark.surahNumber, bookmark.ayahNumber);
                      }
                    }}
                    className="p-1 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Arabic Text snapshot */}
                {showArabic && (
                  <p
                    dir="rtl"
                    className="text-right font-arabic leading-loose tracking-wide text-zinc-950 dark:text-zinc-50"
                    style={{
                      fontSize: `${arabicFontSize * 0.85}px`,
                      lineHeight: `${arabicFontSize * 1.5}px`,
                    }}
                  >
                    {bookmark.arabicText}
                  </p>
                )}

                {/* Translation stack */}
                <div className="space-y-2.5">
                  {Object.entries(bookmark.translations).map(([langCode, text]) => (
                    <div key={langCode} className="text-xs">
                      <span className="text-[9px] font-bold text-sky-500 tracking-wider uppercase border border-sky-500/30 px-1.5 py-0.5 rounded-sm mr-2 inline-block mb-1 font-mono">
                        {langCode}
                      </span>
                      <p className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed inline">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Notes snapshot */}
                {bookmark.notes && (
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 text-xs border border-zinc-100 dark:border-zinc-800/50">
                    <span className="font-bold text-zinc-400 block mb-1">Personal Notes:</span>
                    <p className="text-zinc-700 dark:text-zinc-300 italic">{bookmark.notes}</p>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add View Tab */}
      {addViewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateView}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-5 space-y-4"
          >
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Add Bookmark View Tab</h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">View Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Reflections, Study Group..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-950 dark:text-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Link to Folder</label>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-36 overflow-y-auto p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedColForNewView('all')}
                  className={`flex items-center justify-between w-full p-2 text-xs font-semibold rounded-lg text-left ${
                    selectedColForNewView === 'all'
                      ? 'bg-sky-500/10 text-sky-500'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>All Collections</span>
                  {selectedColForNewView === 'all' && <Check size={14} />}
                </button>
                {collections.map((col) => (
                  <button
                    type="button"
                    key={col.id}
                    onClick={() => setSelectedColForNewView(col.id)}
                    className={`flex items-center justify-between w-full p-2 text-xs font-semibold rounded-lg text-left ${
                      selectedColForNewView === col.id
                        ? 'bg-sky-500/10 text-sky-500'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{col.name}</span>
                    {selectedColForNewView === col.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
              <button
                type="button"
                onClick={() => setAddViewModalOpen(false)}
                className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors cursor-pointer"
              >
                Create Tab
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Folders Manager */}
      {foldersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-250/60 dark:border-zinc-850">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Folders Manager</h3>
              <button onClick={() => setFoldersModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Create new folder section */}
            <form onSubmit={handleCreateCollection} className="p-4 border-b border-zinc-100 dark:border-zinc-850 space-y-1.5 bg-zinc-50 dark:bg-zinc-950/40">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Create New Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Reflections..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="flex-1 h-9 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-950 dark:text-zinc-50 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="h-9 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>

            {/* Folders list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {collections.map((col) => {
                const isEditing = editingCollectionId === col.id;
                const isDefault = col.id === 'default_favs';
                return (
                  <div key={col.id} className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-850 rounded-xl hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 transition-colors">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          required
                          value={editingCollectionName}
                          onChange={(e) => setEditingCollectionName(e.target.value)}
                          className="flex-1 h-8 px-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                        />
                        <button onClick={() => handleSaveRenameCollection(col.id)} className="text-green-500 p-1 hover:bg-green-500/10 rounded-md">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingCollectionId(null)} className="text-red-500 p-1 hover:bg-red-500/10 rounded-md">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder size={16} className="text-sky-500 shrink-0" />
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{col.name}</span>
                          <span className="text-xs text-zinc-400">({col.bookmarks.length} verses)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isDefault && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCollectionId(col.id);
                                  setEditingCollectionName(col.name);
                                }}
                                className="p-1 text-zinc-400 hover:text-sky-500 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCollection(col.id, col.name)}
                                className="p-1 text-zinc-400 hover:text-red-500 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          {isDefault && (
                            <span className="text-[10px] uppercase font-bold text-zinc-400 px-1 bg-zinc-50 dark:bg-zinc-800 rounded-sm">Default</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
