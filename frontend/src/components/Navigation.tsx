"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  Target, 
  Briefcase, 
  Send, 
  Video, 
  Kanban, 
  Settings, 
  LogOut,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { clearAuthToken, getAuthToken } from '@/lib/api';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile & Bio', href: '/profile', icon: User },
  { name: 'Resume Builder', href: '/resume/builder', icon: FileText },
  { name: 'ATS Score Analyzer', href: '/ats-analyzer', icon: Target },
  { name: 'Job Discovery', href: '/jobs', icon: Briefcase },
  { name: 'Smart Outreach', href: '/outreach', icon: Send },
  { name: 'Video Self-Intro', href: '/video', icon: Video },
  { name: 'Application Tracker', href: '/applications', icon: Kanban },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token && !['/login', '/register'].includes(pathname)) {
      router.push('/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  // Don't show navigation on auth pages
  if (['/login', '/register'].includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
        {/* Brand Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide text-white">JobGateway</h1>
            <span className="text-xs text-indigo-400 font-medium">Smart AI Job System</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base">JobGateway</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-300">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800"
                >
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-rose-400 hover:bg-slate-800"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
