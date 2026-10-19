import React from 'react';
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  FileText, 
  Split, 
  Settings, 
  Mail, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, authStatus }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campaigns', icon: Send },
    { id: 'leads', label: 'Leads & Lists', icon: Users },
    { id: 'templates', label: 'Templates & Spam Check', icon: FileText },
    { id: 'abtesting', label: 'A/B Testing', icon: Split },
    { id: 'settings', label: 'Settings & Gmail', icon: Settings },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                StrokeCRM
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-900 text-white border border-slate-700/60 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  Local Bot
                </span>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-inner shadow-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Gmail Connection Status Pill */}
          <div className="flex items-center">
            {authStatus?.connected ? (
              <div 
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-emerald-500/40 text-white text-xs font-medium cursor-pointer hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
                title="Click to manage Gmail settings"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="truncate max-w-[140px] sm:max-w-[180px]">{authStatus.account?.email}</span>
                <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded text-emerald-200 uppercase font-mono">
                  {authStatus.account?.type === 'app_password' ? 'SMTP' : 'OAuth'}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Gmail</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
