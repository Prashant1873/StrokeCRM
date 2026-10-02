import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import CampaignsView from './components/CampaignsView';
import LeadsView from './components/LeadsView';
import TemplatesView from './components/TemplatesView';
import ABTestingView from './components/ABTestingView';
import SettingsView from './components/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authStatus, setAuthStatus] = useState({ connected: false, account: null });
  const [loading, setLoading] = useState(true);

  const refreshAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch (err) {
      console.error('Failed to fetch auth status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuthStatus();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        authStatus={authStatus} 
      />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-16">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            <span className="animate-pulse">Loading StrokeCRM...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView 
                authStatus={authStatus} 
                setActiveTab={setActiveTab} 
              />
            )}
            {activeTab === 'campaigns' && (
              <CampaignsView 
                setActiveTab={setActiveTab} 
              />
            )}
            {activeTab === 'leads' && (
              <LeadsView 
                setActiveTab={setActiveTab} 
              />
            )}
            {activeTab === 'templates' && (
              <TemplatesView 
                setActiveTab={setActiveTab} 
              />
            )}
            {activeTab === 'abtesting' && (
              <ABTestingView 
                setActiveTab={setActiveTab} 
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                authStatus={authStatus} 
                refreshAuthStatus={refreshAuthStatus} 
              />
            )}
          </>
        )}
      </main>

      {/* Local App Footer */}
      <footer className="border-t border-slate-800/80 py-4 bg-slate-950/60 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Local SQLite Engine Active</span>
            <span>•</span>
            <span className="text-slate-400">100% Private & Self-Hosted</span>
          </div>
          <div>
            <span>StrokeCRM • Google Account Safe Sender Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
