import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import ThemeToggle from './ThemeToggle';
import { AlertCircle } from 'lucide-react';

export default function AppShell({ 
  children, 
  currentRoute, 
  navigate, 
  goBack, 
  canGoBack, 
  authStatus,
  entityNames = {}
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-primary flex flex-row selection:bg-indigo-500 selection:text-white transition-colors duration-150">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar 
        currentRoute={currentRoute}
        navigate={navigate}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        authStatus={authStatus}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Sticky Top Header Bar */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-subtle px-4 sm:px-6 h-14 flex items-center justify-between gap-4 transition-colors duration-150">
          {/* Breadcrumbs Navigation with History Stack */}
          <div className="flex-1 min-w-0">
            <Breadcrumbs 
              currentRoute={currentRoute}
              navigate={navigate}
              goBack={goBack}
              canGoBack={canGoBack}
              entityNames={entityNames}
            />
          </div>

          {/* Quick Header Indicators */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Switcher Toggle (D-02, D-03) */}
            <ThemeToggle />

            {authStatus?.connected ? (
              <div 
                onClick={() => navigate('#/settings')}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface border border-emerald-500/40 text-primary text-xs font-medium cursor-pointer hover:bg-subtle transition-all active:scale-95 shadow-sm"
                title="Manage Email Settings"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="truncate max-w-[120px]">{authStatus.account?.email}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('#/settings')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-amber-500/40 text-primary text-xs font-medium hover:bg-subtle transition-all active:scale-95 shadow-sm"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Connect Mail</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Page Viewport */}
        <main className="flex-1 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Fixed Footprint Status Bar */}
        <footer className="border-t border-subtle py-3 bg-surface/60 text-xs text-muted mt-auto transition-colors duration-150">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Local SQLite Engine Active</span>
              <span>•</span>
              <span className="text-secondary">100% Private & Self-Hosted</span>
            </div>
            <div className="flex items-center gap-3">
              <span>StrokeCRM v3.0 • Traceable UI</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
