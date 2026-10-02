import React from 'react';

/**
 * Reusable, accessible Toggle Switch component adhering to frontend-skill & WCAG 2.2 AA
 */
export default function Switch({ 
  checked, 
  onChange, 
  label, 
  description, 
  disabled = false, 
  id,
  badge
}) {
  const switchId = id || `switch-${Math.random().toString(36).substring(2, 9)}`;

  const handleToggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3 select-none">
      {/* Label & Description */}
      <div className="flex-1 cursor-pointer" onClick={handleToggle}>
        <div className="flex items-center gap-2">
          <label 
            htmlFor={switchId} 
            className={`text-sm font-semibold cursor-pointer ${
              disabled ? 'text-slate-500' : 'text-slate-200 hover:text-white'
            }`}
          >
            {label}
          </label>
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Interactive Toggle Switch */}
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          disabled 
            ? 'opacity-40 cursor-not-allowed bg-slate-800' 
            : checked 
            ? 'bg-emerald-600 hover:bg-emerald-500' 
            : 'bg-slate-700 hover:bg-slate-600'
        }`}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
