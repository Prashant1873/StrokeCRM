import { useState, useEffect, useCallback, useMemo } from 'react';

// Route definition mapping patterns to view identifiers and breadcrumb builders
export const ROUTES = [
  { pattern: /^#\/?$/, name: 'dashboard', path: '#/dashboard' },
  { pattern: /^#\/dashboard$/, name: 'dashboard', path: '#/dashboard', title: 'Dashboard' },
  { pattern: /^#\/campaigns$/, name: 'campaigns', path: '#/campaigns', title: 'Campaigns' },
  { pattern: /^#\/campaigns\/([^/]+)$/, name: 'campaign-detail', title: 'Campaign Cockpit' },
  { pattern: /^#\/campaigns\/([^/]+)\/preflight$/, name: 'campaign-preflight', title: 'Launch Preflight' },
  { pattern: /^#\/databases$/, name: 'databases', path: '#/databases', title: 'Databases' },
  { pattern: /^#\/databases\/upload$/, name: 'databases-upload', title: 'Upload Database' },
  { pattern: /^#\/databases\/([^/]+)$/, name: 'database-detail', title: 'Database Inspector' },
  { pattern: /^#\/leads$/, name: 'databases', path: '#/databases', title: 'Databases' },
  { pattern: /^#\/templates$/, name: 'templates', path: '#/templates', title: 'Templates & Spam Preflight' },
  { pattern: /^#\/templates\/([^/]+)$/, name: 'template-detail', title: 'Edit Template' },
  { pattern: /^#\/ab-testing$/, name: 'abtesting', path: '#/ab-testing', title: 'A/B Testing Studio' },
  { pattern: /^#\/settings$/, name: 'settings', path: '#/settings', title: 'Settings & Gmail' },
];

/**
 * Parse current hash into structured route info
 */
export function parseRoute(hash = window.location.hash) {
  const cleanHash = hash || '#/dashboard';
  const [pathPart, queryPart] = cleanHash.split('?');
  const queryParams = new URLSearchParams(queryPart || '');

  // Match against known routes
  if (cleanHash === '' || cleanHash === '#' || cleanHash === '#/') {
    return { name: 'dashboard', path: '#/dashboard', params: {}, query: queryParams, raw: cleanHash };
  }

  // Preflight check: #/campaigns/:id/preflight
  const preflightMatch = pathPart.match(/^#\/campaigns\/([^/]+)\/preflight$/);
  if (preflightMatch) {
    return {
      name: 'campaign-preflight',
      path: pathPart,
      params: { id: preflightMatch[1] },
      query: queryParams,
      raw: cleanHash,
    };
  }

  // Campaign detail: #/campaigns/:id
  const campaignMatch = pathPart.match(/^#\/campaigns\/([^/]+)$/);
  if (campaignMatch) {
    return {
      name: 'campaign-detail',
      path: pathPart,
      params: { id: campaignMatch[1] },
      query: queryParams,
      raw: cleanHash,
    };
  }

  // Database detail: #/databases/:id
  const dbMatch = pathPart.match(/^#\/databases\/([^/]+)$/);
  if (dbMatch) {
    return {
      name: 'database-detail',
      path: pathPart,
      params: { id: dbMatch[1] },
      query: queryParams,
      raw: cleanHash,
    };
  }

  // Database sub-routes
  if (pathPart === '#/databases/upload') {
    return { name: 'databases-upload', path: pathPart, params: {}, query: queryParams, raw: cleanHash };
  }

  // Legacy Leads sub-routes fallback
  if (pathPart.startsWith('#/leads')) {
    return { name: 'databases', path: '#/databases', params: {}, query: queryParams, raw: cleanHash };
  }

  // Template detail: #/templates/:id
  const templateMatch = pathPart.match(/^#\/templates\/([^/]+)$/);
  if (templateMatch) {
    return {
      name: 'template-detail',
      path: pathPart,
      params: { id: templateMatch[1] },
      query: queryParams,
      raw: cleanHash,
    };
  }

  // Primary tab fallbacks
  if (pathPart === '#/campaigns') {
    return { name: 'campaigns', path: pathPart, params: {}, query: queryParams, raw: cleanHash };
  }
  if (pathPart === '#/databases' || pathPart === '#/leads') {
    return { name: 'databases', path: '#/databases', params: {}, query: queryParams, raw: cleanHash };
  }
  if (pathPart === '#/templates') {
    return { name: 'templates', path: pathPart, params: {}, query: queryParams, raw: cleanHash };
  }
  if (pathPart === '#/ab-testing' || pathPart === '#/abtesting') {
    return { name: 'abtesting', path: pathPart, params: {}, query: queryParams, raw: cleanHash };
  }
  if (pathPart === '#/settings') {
    return { name: 'settings', path: pathPart, params: {}, query: queryParams, raw: cleanHash };
  }

  // Default to dashboard
  return { name: 'dashboard', path: '#/dashboard', params: {}, query: queryParams, raw: cleanHash };
}

/**
 * Determine parent route path for hierarchical back-tracing
 */
export function getParentPath(currentRoute) {
  const { name, params } = currentRoute;
  switch (name) {
    case 'campaign-preflight':
      return `#/campaigns/${params.id || ''}`;
    case 'campaign-detail':
      return '#/campaigns';
    case 'database-detail':
    case 'databases-upload':
      return '#/databases';
    case 'template-detail':
      return '#/templates';
    default:
      return '#/dashboard';
  }
}


/**
 * Custom React hook for subscribing to route changes and controlling navigation
 */
export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    }
    return parseRoute(window.location.hash);
  });

  const [historyStack, setHistoryStack] = useState(() => [window.location.hash || '#/dashboard']);

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = parseRoute(window.location.hash);
      setCurrentRoute(nextRoute);
      setHistoryStack((prev) => {
        if (prev[prev.length - 1] === window.location.hash) return prev;
        return [...prev, window.location.hash];
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((targetPath) => {
    const normalized = targetPath.startsWith('#') ? targetPath : `#${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
    if (window.location.hash !== normalized) {
      window.location.hash = normalized;
    }
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1 && historyStack.length > 1) {
      window.history.back();
    } else {
      // Trace backwards along hierarchical tree
      const parent = getParentPath(currentRoute);
      navigate(parent);
    }
  }, [currentRoute, historyStack, navigate]);

  return {
    currentRoute,
    path: currentRoute.path,
    name: currentRoute.name,
    params: currentRoute.params,
    query: currentRoute.query,
    navigate,
    goBack,
    canGoBack: currentRoute.name !== 'dashboard',
  };
}
