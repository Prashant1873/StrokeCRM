import React from 'react';
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  FileText, 
  Split, 
  Settings, 
  Mail, 
  ChevronLeft, 
  ChevronRight,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Sidebar({ currentRoute, navigate, isCollapsed, setIsCollapsed, authStatus }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '#/dashboard', icon: LayoutDashboard, shortcut: '1' },
    { id: 'campaigns', label: 'Campaigns', path: '#/campaigns', icon: Send, shortcut: '2' },
    { id: 'leads', label: 'Leads & Lists', path: '#/leads', icon: Users, shortcut: '3' },
    { id: 'templates', label: 'Templates & Spam', path: '#/templates', icon: FileText, shortcut: '4' },
    { id: 'abtesting', label: 'A/B Testing', path: '#/ab-testing', icon: Split, shortcut: '5' },
    { id: 'settings', label: 'Settings & Gmail', path: '#/settings', icon: Settings, shortcut: '6' },
  ];

  // Helper to determine if a nav item matches active route
  const isItemActive = (item) => {
    if (item.id === 'dashboard' && currentRoute.name === 'dashboard') return true;
    if (item.id === 'campaigns' && currentRoute.name.startsWith('campaign')) return true;
    if (item.id === 'leads' && currentRoute.name.startsWith('leads')) return true;
    if (item.id === 'templates' && currentRoute.name.startsWith('template')) return true;
    if (item.id === 'abtesting' && currentRoute.name === 'abtesting') return true;
    if (item.id === 'settings' && currentRoute.name === 'settings') return true;
    return false;
  };

  return (
    <aside 
      className={`h-screen sticky top-0 flex flex-col bg-[#080c14] border-r border-slate-800/80 transition-all duration-200 z-40 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-slate-800/80 ${
        isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
      }`}>
        <button
          type="button"
          onClick={() => navigate('#/dashboard')}
          className={`flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 ${
            isCollapsed ? 'justify-center' : 'min-w-0'
          }`}
          title="StrokeCRM Home"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <Mail className="w-5 h-5 text-white" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                StrokeCRM
                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Local
                </span>
              </span>
              <span className="text-[10px] text-slate-400 truncate">Cold Outreach Engine</span>
            </div>
          )}
        </button>

        {/* Top Collapse button: Only shown when sidebar is expanded */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative ${
                active
                  ? 'bg-indigo-600/15 text-white border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon 
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} 
              />

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] font-mono text-slate-600 group-hover:text-slate-500">
                    {item.shortcut}
                  </span>
                </div>
              )}

              {/* Active Indicator Bar on Left */}
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-500 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 text-xs">
        {/* Collapse / Expand Toggle Button in Footer */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full flex items-center py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-xs font-medium transition-colors border border-slate-800/60 ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-2.5'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!isCollapsed && <span>Collapse Sidebar</span>}
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Gmail Status Pill */}
        <button
          type="button"
          onClick={() => navigate('#/settings')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
            authStatus?.connected
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/30'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/30'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
          title={authStatus?.connected ? `Connected: ${authStatus.account?.email}` : 'Gmail Not Connected'}
        >
          {authStatus?.connected ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}

          {!isCollapsed && (
            <span className="truncate">
              {authStatus?.connected ? authStatus.account?.email : 'Connect Gmail'}
            </span>
          )}
        </button>

        {/* Database Status */}
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 px-2 text-[10px] text-slate-500">
            <Database className="w-3 h-3 text-slate-500" />
            <span>SQLite ACID Engine</span>
          </div>
        )}
      </div>
    </aside>
  );
}
