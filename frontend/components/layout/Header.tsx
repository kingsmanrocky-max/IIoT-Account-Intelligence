'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { Menu, User, LogOut, Settings, Bell } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-16 bg-gradient-to-r from-meraki-midnight to-meraki-midnight-light shadow-md border-b border-meraki-midnight-light/30">
      <div className="flex h-full items-center px-4 gap-4">
        <button
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white lg:hidden transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white hidden sm:block">
            IIoT Account Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-400 rounded-full"></span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-md p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-meraki-blue to-meraki-blue-dark text-white font-medium text-sm">
                {user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {user?.profile?.firstName || user?.email}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-meraki-gray-200 bg-white shadow-lg z-20">
                  <div className="p-4 border-b border-meraki-gray-200 bg-meraki-gray-50">
                    <p className="text-sm font-semibold text-meraki-gray-900">
                      {user?.profile?.firstName} {user?.profile?.lastName}
                    </p>
                    <p className="text-xs text-meraki-gray-500 mt-0.5">{user?.email}</p>
                    <p className="text-xs text-meraki-gray-400 mt-1 px-2 py-0.5 bg-white rounded-full inline-block capitalize">
                      {user?.role.toLowerCase()}
                    </p>
                  </div>
                  <div className="p-2">
                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-meraki-gray-700 hover:bg-meraki-gray-100 transition-colors">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
