import React from 'react';

const Button = ({ onClick, children, className, disabled }) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-2 ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white'} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;