import React, { useState, useEffect } from 'react';
import AppShell from './components/AppShell';
import DashboardView from './components/DashboardView';
import CampaignsView from './components/CampaignsView';
import LeadsView from './components/LeadsView';
import TemplatesView from './components/TemplatesView';
import ABTestingView from './components/ABTestingView';
import SettingsView from './components/SettingsView';
import { useRouter } from './router';

export default function App() {
  const router = useRouter();
  const { currentRoute, navigate, goBack, canGoBack } = router;

  const [authStatus, setAuthStatus] = useState({ connected: false, account: null });
  const [loading, setLoading] = useState(true);
  const [activeCampaignData, setActiveCampaignData] = useState(null);

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

  // Backward compatibility adapter for components calling setActiveTab('leads')
  const handleSetActiveTab = (tabId) => {
    switch (tabId) {
      case 'dashboard':
        navigate('#/dashboard');
        break;
      case 'campaigns':
        navigate('#/campaigns');
        break;
      case 'leads':
        navigate('#/leads');
        break;
      case 'templates':
        navigate('#/templates');
        break;
      case 'abtesting':
        navigate('#/ab-testing');
        break;
      case 'settings':
        navigate('#/settings');
        break;
      default:
        navigate(`#/${tabId}`);
    }
  };

  // Resolve entity name for breadcrumbs if inside a campaign or lead
  const entityNames = {
    campaignName: activeCampaignData?.name || (currentRoute.params?.id ? `Campaign #${currentRoute.params.id}` : null),
  };

  return (
    <AppShell
      currentRoute={currentRoute}
      navigate={navigate}
      goBack={goBack}
      canGoBack={canGoBack}
      authStatus={authStatus}
      entityNames={entityNames}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          <span className="animate-pulse">Loading StrokeCRM...</span>
        </div>
      ) : (
        <>
          {currentRoute.name === 'dashboard' && (
            <DashboardView 
              authStatus={authStatus} 
              setActiveTab={handleSetActiveTab} 
              navigate={navigate}
            />
          )}

          {currentRoute.name.startsWith('campaign') && (
            <CampaignsView 
              setActiveTab={handleSetActiveTab} 
              navigate={navigate}
              currentRoute={currentRoute}
              onCampaignSelected={setActiveCampaignData}
            />
          )}

          {currentRoute.name.startsWith('leads') && (
            <LeadsView 
              setActiveTab={handleSetActiveTab} 
              navigate={navigate}
              currentRoute={currentRoute}
            />
          )}

          {currentRoute.name.startsWith('template') && (
            <TemplatesView 
              setActiveTab={handleSetActiveTab} 
              navigate={navigate}
              currentRoute={currentRoute}
            />
          )}

          {currentRoute.name === 'abtesting' && (
            <ABTestingView 
              setActiveTab={handleSetActiveTab} 
              navigate={navigate}
            />
          )}

          {currentRoute.name === 'settings' && (
            <SettingsView 
              authStatus={authStatus} 
              refreshAuthStatus={refreshAuthStatus} 
              setActiveTab={handleSetActiveTab}
              navigate={navigate}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
