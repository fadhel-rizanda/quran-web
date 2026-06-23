'use client';
import React, { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSettings } from '@/context/SettingsContext';
import { BookOpen, Home, Book, Bookmark, Settings, Menu, X, LogIn, LogOut } from 'lucide-react';

import SurahListTab from '@/components/SurahListTab';
import ReaderTab from '@/components/ReaderTab';
import BookmarksTab from '@/components/BookmarksTab';
import SettingsTab from '@/components/SettingsTab';

type TabType = 'home' | 'reader' | 'bookmarks' | 'settings';

export default function MainPage() {
  const { data: session, status } = useSession();
  const { theme } = useSettings();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'home', label: 'Home List', icon: Home },
    { id: 'reader', label: 'Quran Reader', icon: Book },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'settings', label: 'App Settings', icon: Settings },
  ] as const;

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <SurahListTab onNavigateToReader={() => setActiveTab('reader')} />;
      case 'reader':
        return <ReaderTab />;
      case 'bookmarks':
        return <BookmarksTab onNavigateToReader={() => setActiveTab('reader')} />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <SurahListTab onNavigateToReader={() => setActiveTab('reader')} />;
    }
  };

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-150">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {/* Title */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-200 dark:border-zinc-800">
          <BookOpen className="w-6 h-6 text-sky-500" />
          <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">Quran App</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-500'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card inside Sidebar */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
          {status === 'authenticated' && session?.user ? (
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'Avatar'}
                  className="w-10 h-10 rounded-full border border-zinc-100 dark:border-zinc-800"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 font-extrabold text-sm">
                  {session.user.name?.[0] || 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{session.user.name}</p>
                <p className="text-[10px] text-zinc-450 truncate">{session.user.email}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="flex items-center justify-center gap-2 w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <LogIn size={14} />
              Sign In with Google
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (Overlay backdrop) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu Card */}
          <div className="relative flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-full p-4 space-y-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-500" />
                <span className="font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Quran App</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 space-y-1">
              {navigationItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-2xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/10 text-sky-500'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
              {status === 'authenticated' && session?.user ? (
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'Avatar'}
                      className="w-10 h-10 rounded-full border border-zinc-100 dark:border-zinc-800"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 font-extrabold text-sm">
                      {session.user.name?.[0] || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{session.user.name}</p>
                    <p className="text-[10px] text-zinc-450 truncate">{session.user.email}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <LogIn size={14} />
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Page Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-500" />
            <span className="font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Quran App</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Scrollable Workspace content */}
        <main className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto overflow-y-auto">
          {renderActiveTabContent()}
        </main>
      </div>

    </div>
  );
}
