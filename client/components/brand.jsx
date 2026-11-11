import React from 'react';

export function BrandMark({ size = 40, className = '' }) {
  return (
    <span
      className={`brand-gradient inline-flex flex-none items-center justify-center rounded-2xl shadow-soft ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.64}
        height={size * 0.64}
        fill="none"
      >
        <path
          d="M7 7.5h18a3.5 3.5 0 0 1 3.5 3.5v8a3.5 3.5 0 0 1-3.5 3.5h-8.2L11 27v-4.5H7A3.5 3.5 0 0 1 3.5 19v-8A3.5 3.5 0 0 1 7 7.5Z"
          fill="rgba(255,255,255,.18)"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="11" cy="15.2" r="1.6" fill="white" />
        <circle cx="16" cy="15.2" r="1.6" fill="white" />
        <circle cx="21" cy="15.2" r="1.6" fill="white" />
      </svg>
    </span>
  );
}

export default function Brand({
  size = 40,
  dark = false,
  showTagline = false,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandMark size={size} />
      <div className="leading-tight">
        <p
          className={`font-display text-2xl font-bold tracking-tight ${
            dark ? 'text-white' : 'text-ink-900 dark:text-white'
          }`}
        >
          MZ <span className="text-burgundy-700 dark:text-burgundy-400 font-semibold">chat</span>
        </p>
        {showTagline && (
          <p
            className={`mt-0.5 text-[11px] font-medium tracking-wide ${
              dark ? 'text-white/55' : 'text-spill-500 dark:text-white/50'
            }`}
          >
            Realtime messaging, simplified.
          </p>
        )}
      </div>
    </div>
  );
}
