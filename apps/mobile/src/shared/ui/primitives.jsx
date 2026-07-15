import {
  BADGE_TONES,
  resolveTone,
} from './accent.js';

export function IconBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function Button({ children, primary, small, disabled, onClick, full, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      className={[
        'rounded-xl border-none font-display font-semibold uppercase tracking-wider',
        small ? 'px-3.5 py-2 text-xs' : 'px-5 py-3 text-sm',
        full ? 'w-full' : '',
        disabled
          ? 'cursor-default bg-coach-border text-coach-t3 opacity-50'
          : 'cursor-pointer',
        !disabled && primary ? 'bg-coach-orange text-white' : '',
        !disabled && !primary ? 'bg-coach-orange-glow text-coach-orange' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

export function Badge({ children, color, tone }) {
  const key = tone || resolveTone(color);
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide ${BADGE_TONES[key] || BADGE_TONES.orange}`}
    >
      {children}
    </span>
  );
}

export function Card({ children, onClick, className = '', style }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`mb-2.5 rounded-[14px] border border-coach-border bg-coach-card p-4 ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({ label, placeholder, id, name, type = 'text', value, onChange }) {
  return (
    <div className="mb-3.5">
      {label ? (
        <label
          htmlFor={id}
          className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
        >
          {label}
        </label>
      ) : null}
      <input
        id={id}
        name={name || id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
    </div>
  );
}

export function BackButton({ onClick, label = 'Back' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-coach-orange"
    >
      <IconBack />
      <span className="font-body text-[13px]">{label}</span>
    </button>
  );
}

export function PageHeader({ title, subtitle, user, onBack, trailing }) {
  return (
    <div className="flex items-start justify-between pb-4 pt-2">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 shrink-0 cursor-pointer border-none bg-transparent p-0 text-coach-orange"
          >
            <IconBack />
          </button>
        ) : null}
        <div className="min-w-0">
          {subtitle ? (
            <div className="font-body text-[11px] uppercase tracking-widest text-coach-t3">
              {subtitle}
            </div>
          ) : null}
          <h1 className="font-display text-2xl font-bold text-coach-t1">{title}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {trailing}
        {user && user.tier === 'trial' ? (
          <Badge tone="yellow">Trial {user.trialDays}d</Badge>
        ) : null}
      </div>
    </div>
  );
}

export function DashedBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl border-2 border-dashed border-coach-border bg-transparent px-3.5 py-3.5 font-display text-[13px] font-semibold uppercase text-coach-t3"
    >
      {children}
    </button>
  );
}

/** Standard horizontal padding for full-screen flows (auth, gates, tab screens). */
export function ScreenContainer({ children, className = '', centered = false }) {
  return (
    <div
      className={[
        'px-6',
        centered ? 'py-10 text-center' : 'pb-24',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

/** Root layout for the authenticated app shell. */
export function AppShell({ children, footer, overlay }) {
  return (
    <div className="relative min-h-svh w-full bg-coach-bg font-body text-coach-t1">
      <div className="min-h-svh w-full pt-[env(safe-area-inset-top)]">
        <div className="w-full">
          {children}
        </div>
      </div>
      {overlay}
      {footer}
    </div>
  );
}

export function TabBar({ tabs, activeId, onSelect }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 w-full bg-gradient-to-t from-coach-bg from-80% to-transparent px-4 pb-[env(safe-area-inset-bottom)] pt-4">
      <div className="flex items-center justify-around rounded-t-[20px] border-t border-coach-border bg-coach-surface px-2 pb-3 pt-2.5">
        {tabs.map(function (tab) {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={function () {
                onSelect(tab.id);
              }}
              className={`relative flex cursor-pointer flex-col items-center gap-1 border-none bg-transparent ${isActive ? 'text-coach-orange' : 'text-coach-t3'}`}
            >
              {isActive ? (
                <div className="absolute -top-3.5 h-[3px] w-6 rounded-sm bg-coach-orange" />
              ) : null}
              {tab.icon}
              <span className="font-body text-[10px] font-semibold tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
