import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '',
  children,
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-primary-950';

  const variants = {
    // In dark mode the primary button inverts: light surface, dark text.
    primary: 'bg-primary-800 text-primary-100 hover:bg-primary-900 dark:bg-primary-200 dark:text-primary-900 dark:hover:bg-primary-300 focus:ring-primary-300 disabled:bg-gray-300 dark:disabled:bg-primary-700 dark:disabled:text-primary-400',
    secondary: 'bg-white dark:bg-primary-900 text-primary-800 dark:text-primary-100 border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-800 focus:ring-primary-300 disabled:bg-gray-100 dark:disabled:bg-primary-800',
    ghost: 'text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800 focus:ring-primary-300',
    danger: 'bg-error-500 text-white hover:bg-error-700 focus:ring-error-500 disabled:bg-gray-300 dark:disabled:bg-primary-700'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}