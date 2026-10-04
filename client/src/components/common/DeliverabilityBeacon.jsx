import React, { useState, useRef, useEffect } from 'react';
import { Info, ShieldCheck } from 'lucide-react';

const PRESET_GUIDANCE = {
  jitter: {
    title: 'Deliverability Throttle & Jitter',
    body: 'Mail servers flag outbound messages sent at uniform intervals (e.g. exactly every 60s) as automated bot activity. StrokeCRM applies randomized 45s-90s delays between dispatches to mimic natural human typing cadence and bypass ESP spam filters.',
    badge: 'Spam Defense'
  },
  threading: {
    title: 'RFC 2822 In-Reply-To Threading',
    body: 'Injecting In-Reply-To and References headers ensures follow-up emails land directly within the recipient\'s existing inbox conversation thread. Prospects engage with threaded follow-ups 2.8x more frequently than isolated cold messages.',
    badge: 'Response Rate'
  },
  working_hours: {
    title: 'Recipient Send Window',
    body: 'Constraining delivery to recipient business hours (9:00 AM - 5:30 PM) prevents emails from landing during off-hours when inbox competition is highest and unread messages get buried.',
    badge: 'Timing Guard'
  },
  daily_cap: {
    title: 'Mailbox Reputation Quota',
    body: 'Protects sender reputation by enforcing strict daily ceilings (keeping fresh accounts under 30-50/day and warm accounts under 500/day) to prevent domain reputation damage and account suspension.',
    badge: 'Quota Safety'
  },
  reply_disarm: {
    title: 'Atomic Sequence Disarming',
    body: 'The instant an inbound reply is detected via IMAP, all future scheduled drip steps for that lead are permanently cancelled to avoid embarrassing follow-ups after they respond.',
    badge: 'Sequence Guard'
  }
};

export default function DeliverabilityBeacon({ 
  preset, 
  title, 
  content, 
  badge,
  position = 'bottom',
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const presetData = (preset && PRESET_GUIDANCE[preset]) || {};
  const displayTitle = title || presetData.title || 'Deliverability Guidance';
  const displayBody = content || presetData.body || '';
  const displayBadge = badge || presetData.badge || 'Best Practice';

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Position classes
  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    'bottom-end': 'top-full mt-2 right-0',
    'bottom-start': 'top-full mt-2 left-0'
  }[position] || 'top-full mt-2 left-1/2 -translate-x-1/2';

  return (
    <div 
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="w-4 h-4 rounded-full bg-subtle text-muted hover:text-indigo-400 hover:bg-indigo-500/10 inline-flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-help"
        aria-label={`Deliverability guidance: ${displayTitle}`}
        aria-expanded={isOpen}
      >
        <Info className="w-2.5 h-2.5" />
      </button>

      {isOpen && (
        <div 
          role="tooltip"
          className={`absolute ${positionClasses} z-50 w-72 sm:w-80 bg-surface border border-subtle shadow-2xl rounded-xl p-3.5 text-left pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-subtle">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-primary truncate">
                {displayTitle}
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
              {displayBadge}
            </span>
          </div>

          {/* Body */}
          <p className="text-[11px] text-secondary leading-relaxed font-normal">
            {displayBody}
          </p>
        </div>
      )}
    </div>
  );
}
