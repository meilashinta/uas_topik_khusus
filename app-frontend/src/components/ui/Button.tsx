import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const variantClass = styles[`btn-${variant}`];
  const sizeClass = styles[`btn-${size}`];
  
  return (
    <button
      className={`${styles.btn} ${variantClass} ${sizeClass} ${className} ${isLoading ? styles.loading : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className={styles.spinner}></span> : null}
      <span className={styles.content}>{children}</span>
    </button>
  );
};
