'use client';
import React, { useState } from 'react';
import { useBookmarks } from '@/context/BookmarkContext';
import { X, CheckSquare, Square, Plus } from 'lucide-react';

interface BookmarkSelectModalProps {
  visible: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  translations: Record<string, string>;
}

export default function BookmarkSelectModal({
  visible,
  onClose,
  surahNumber,
  ayahNumber,
  arabicText,
  translations,
}: BookmarkSelectModalProps) {
  const { collections, addCollection, addBookmark, removeBookmark, isBookmarked } = useBookmarks();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!visible) return null;

  const handleToggleBookmark = (collectionId: string) => {
    const bookmarked = isBookmarked(surahNumber, ayahNumber, collectionId);
    if (bookmarked) {
      removeBookmark(collectionId, surahNumber, ayahNumber);
    } else {
      addBookmark(collectionId, surahNumber, ayahNumber, arabicText, translations);
    }
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCollectionName.trim() === '') return;
    const newColId = addCollection(newCollectionName.trim());
    setNewCollectionName('');
    setShowAddForm(false);
    // Auto-bookmark in the newly created collection
    addBookmark(newColId, surahNumber, ayahNumber, arabicText, translations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl animate-in fade-in-50 zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Bookmark Ayah {surahNumber}:{ayahNumber}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Collections list */}
        <div className="p-4 max-h-60 overflow-y-auto space-y-1">
          {collections.length === 0 ? (
            <p className="text-sm text-center py-6 text-zinc-500">No folder collections found</p>
          ) : (
            collections.map((col) => {
              const bookmarked = isBookmarked(surahNumber, ayahNumber, col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => handleToggleBookmark(col.id)}
                  className="flex items-center justify-between w-full p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {col.name}
                  </span>
                  <span className="text-sky-500">
                    {bookmarked ? (
                      <CheckSquare size={20} className="fill-sky-500/10" />
                    ) : (
                      <Square size={20} className="text-zinc-400 dark:text-zinc-600" />
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Add Form */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
          {showAddForm ? (
            <form onSubmit={handleCreateCollection} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                placeholder="Folder name (e.g. Reflections)..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-950 dark:text-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md transition-colors"
                >
                  Create & Add
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center w-full gap-2 py-2 text-sm font-semibold text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-500/5 dark:hover:bg-sky-500/10 rounded-xl transition-colors border border-dashed border-sky-500/30"
            >
              <Plus size={16} />
              Create New Folder
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
