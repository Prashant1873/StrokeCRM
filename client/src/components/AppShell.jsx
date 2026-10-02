import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { Menu, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-row selection:bg-indigo-500 selection:text-white">
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
        <header className="sticky top-0 z-30 bg-[#080c14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
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
            {authStatus?.connected ? (
              <div 
                onClick={() => navigate('#/settings')}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium cursor-pointer hover:bg-emerald-900/40 transition-colors"
                title="Manage Gmail Settings"
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
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-900/40 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Gmail</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Page Viewport */}
        <main className="flex-1 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Fixed Footprint Status Bar */}
        <footer className="border-t border-slate-800/80 py-3 bg-[#080c14]/60 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Local SQLite Engine Active</span>
              <span>•</span>
              <span className="text-slate-400">100% Private & Self-Hosted</span>
            </div>
            <div className="flex items-center gap-3">
              <span>StrokeCRM v1.1 • Traceable UI</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
