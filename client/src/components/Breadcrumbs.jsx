import React, { useEffect } from 'react';
import { ChevronRight, ArrowLeft, Home, Send, Users, FileText, Split, Settings, ShieldCheck, Zap, Database } from 'lucide-react';

/**
 * Breadcrumbs Component
 * Displays indexed hierarchical trail with clickable ancestor jumps and 1-key (Esc) backwards tracing.
 */
export default function Breadcrumbs({ currentRoute, navigate, goBack, canGoBack, entityNames = {} }) {
  // Listen for Escape key to quickly trace back
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing inside an input/textarea/select
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'Escape' && canGoBack) {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack, goBack]);

  // Build crumbs array based on active route
  const getCrumbs = () => {
    const { name, params } = currentRoute;
    const crumbs = [
      { label: 'Home', path: '#/dashboard', icon: Home }
    ];

    if (name === 'dashboard') {
      return crumbs;
    }

    // Campaigns domain
    if (name.startsWith('campaign')) {
      crumbs.push({ label: 'Campaigns', path: '#/campaigns', icon: Send });

      if (name === 'campaign-detail' || name === 'campaign-preflight') {
        const campaignLabel = entityNames.campaignName || `Campaign #${params.id}`;
        crumbs.push({
          label: campaignLabel,
          path: `#/campaigns/${params.id}`,
        });
      }

      if (name === 'campaign-preflight') {
        crumbs.push({
          label: 'Launch Preflight',
          path: `#/campaigns/${params.id}/preflight`,
          badge: 'Ready to Ignite',
          icon: Zap
        });
      }
      return crumbs;
    }

    // Databases domain
    if (name.startsWith('database') || name.startsWith('leads')) {
      crumbs.push({ label: 'Databases', path: '#/databases', icon: Database });

      if (name === 'databases-upload') {
        crumbs.push({ label: 'Upload Database', path: '#/databases/upload' });
      } else if (name === 'database-detail' && params.id) {
        crumbs.push({
          label: entityNames.databaseName || `Database #${params.id}`,
          path: `#/databases/${params.id}`,
        });
      }
      return crumbs;
    }

    // Templates domain
    if (name.startsWith('template')) {
      crumbs.push({ label: 'Templates', path: '#/templates', icon: FileText });
      if (name === 'template-detail') {
        crumbs.push({ label: entityNames.templateName || 'Edit Template', path: currentRoute.path });
      }
      return crumbs;
    }

    // A/B Testing domain
    if (name === 'abtesting') {
      crumbs.push({ label: 'A/B Testing Studio', path: '#/ab-testing', icon: Split });
      return crumbs;
    }

    // Settings domain
    if (name === 'settings') {
      crumbs.push({ label: 'Settings & Gmail Gateway', path: '#/settings', icon: Settings });
      return crumbs;
    }

    return crumbs;
  };

  const crumbs = getCrumbs();
  const isRoot = crumbs.length <= 1;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-3 py-2 px-1">
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        {/* Back Button */}
        {canGoBack && !isRoot && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-secondary hover:text-primary hover:bg-subtle border border-subtle text-xs font-medium transition-colors mr-2 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none cursor-pointer"
            title="Go back to previous page (or press Esc)"
            aria-label="Back to parent"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-subtle border border-subtle rounded text-[10px] text-muted font-mono">
              Esc
            </kbd>
          </button>
        )}

        {/* Trail Items */}
        <ol className="flex items-center gap-1.5 flex-wrap">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            const Icon = crumb.icon;

            return (
              <li key={crumb.path + idx} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0 select-none" aria-hidden="true" />
                )}

                {isLast ? (
                  <span
                    aria-current="page"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold text-primary bg-subtle border border-subtle"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-indigo-500" />}
                    <span>{crumb.label}</span>
                    {crumb.badge && (
                      <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-md bg-subtle text-teal-600 dark:text-teal-400 border border-teal-500/30 font-mono">
                        {crumb.badge}
                      </span>
                    )}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(crumb.path)}
                    className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-secondary hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-subtle transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-muted" />}
                    <span>{crumb.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Path Trace Index Indicator */}
      <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-muted select-none">
        <span>route:</span>
        <span className="text-secondary bg-subtle px-2 py-0.5 rounded border border-subtle">
          {currentRoute.path}
        </span>
      </div>
    </nav>
  );
}
