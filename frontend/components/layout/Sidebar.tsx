'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  Settings,
  BarChart3,
  X,
  Shield,
  Folder,
  Target,
  Newspaper,
  MessageSquare,
  Building2
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['USER', 'ADMIN'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['USER', 'ADMIN'] },
  { name: 'Account Intel', href: '/account-intelligence', icon: Building2, roles: ['USER', 'ADMIN'] },
  { name: 'Competitive Intel', href: '/competitive-intelligence', icon: Target, roles: ['USER', 'ADMIN'] },
  { name: 'News Digest', href: '/news-digest', icon: Newspaper, roles: ['USER', 'ADMIN'] },
  { name: 'Templates', href: '/templates', icon: Folder, roles: ['USER', 'ADMIN'] },
  { name: 'Schedules', href: '/schedules', icon: Calendar, roles: ['USER', 'ADMIN'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['USER', 'ADMIN'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Admin', href: '/admin', icon: Shield, roles: ['ADMIN'] },
  { name: 'Prompts', href: '/admin/prompts', icon: MessageSquare, roles: ['ADMIN'] },
  { name: 'Webex Bot', href: '/admin/webex', icon: MessageSquare, roles: ['ADMIN'] },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredItems = navigationItems.filter(item =>
    item.roles.includes(user?.role || 'USER')
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] w-64
          bg-gradient-to-b from-meraki-midnight via-meraki-midnight to-meraki-midnight-dark
          border-r border-white/5 shadow-xl
          transition-transform duration-300 ease-in-out
          lg:sticky lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-full flex-col">
          {/* Mobile header */}
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 lg:hidden">
            <h2 className="text-base font-semibold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all
                        relative overflow-hidden
                        ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }
                      `}
                    >
                      {/* Active indicator */}
                      <div
                        className={`
                          absolute left-0 top-0 bottom-0 w-1 bg-meraki-blue transition-all
                          ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
                        `}
                      />

                      <Icon className={`h-5 w-5 transition-colors ${
                        isActive ? 'text-meraki-blue-light' : 'text-white/60 group-hover:text-white/80'
                      }`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 p-4">
            <div className="text-xs text-white/40 space-y-0.5">
              <p>Version 1.0.0</p>
              <p>© 2025 IIoT Intelligence</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
