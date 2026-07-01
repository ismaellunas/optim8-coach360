import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-[14px] border border-coach-border bg-coach-card p-4 ${className}`}>
      {children}
    </div>
  );
}

type BadgeProps = {
  children: ReactNode;
  tone?: 'green' | 'yellow' | 'blue' | 'purple';
};

const toneClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  green: 'bg-coach-green/20 text-coach-green',
  yellow: 'bg-coach-yellow/20 text-coach-yellow',
  blue: 'bg-coach-blue/20 text-coach-blue',
  purple: 'bg-coach-purple/20 text-coach-purple',
};

export function Badge({ children, tone = 'green' }: BadgeProps) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-2xl font-bold tracking-wide text-coach-t1">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-coach-t2">{subtitle}</p> : null}
    </header>
  );
}

type ButtonProps = {
  children: ReactNode;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  disabled = false,
  onClick,
}: ButtonProps) {
  const base =
    'inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50';
  const styles =
    variant === 'primary'
      ? 'bg-coach-orange text-white hover:bg-coach-orange-light'
      : 'border border-coach-border bg-coach-surface text-coach-t1 hover:bg-coach-card';

  return (
    <button type={type} className={`${base} ${styles}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
