
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 select-none active:scale-95";
  
  const variants = {
    // Primary is the high-contrast white button with red text
    primary: "bg-white text-[#c0373f] hover:bg-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.2)]",
    // Secondary is the subtle glass button
    secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/15",
    // Ghost is text only
    ghost: "text-white/60 hover:text-white hover:bg-white/5",
    // Danger is red tinted
    danger: "bg-red-500/20 text-red-100 border border-red-500/30 hover:bg-red-500/30"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};
