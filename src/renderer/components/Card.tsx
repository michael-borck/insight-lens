import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Optional click handler — when set, the Card is keyboard-focusable
   *  and reachable as a button. Callers that don't need interactivity
   *  can omit it and the Card renders as a plain container. */
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  // Without onClick: render a plain div (no a11y noise from button roles).
  // With onClick: add role/tabIndex/keyboard handler so the card is
  // reachable via tab + Enter/Space, matching click behaviour.
  if (!onClick) {
    return (
      <div className={`bg-white dark:bg-primary-900 rounded-lg shadow-sm border border-primary-200 dark:border-primary-700 ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div
      className={`bg-white dark:bg-primary-900 rounded-lg shadow-sm border border-primary-200 dark:border-primary-700 ${className}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}