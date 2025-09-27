import React, { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses = "px-4 py-2 rounded font-bold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-[#e4be93ff] border-2 border-[#a0622d] text-[#2c1810] hover:bg-[#f5d9b8] focus:ring-[#a0622d]",
    secondary: "bg-transparent border-2 border-[#a0622d] text-[#2c1810] hover:bg-[#e4be93ff] focus:ring-[#a0622d]",
    danger: "bg-[#c85a54] border-2 border-[#c85a54] text-white hover:bg-[#b84a44] focus:ring-[#c85a54]",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextInput({ label, className = "", ...props }: TextInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-[#2c1810] text-sm font-bold mb-1">
          {label}
        </label>
      )}
      <input 
        className={`w-full px-3 py-2 bg-[#fdf4e8] border-2 border-[#a0622d] rounded text-[#2c1810] text-sm outline-none focus:ring-2 focus:ring-[#a0622d] focus:ring-offset-2 ${className}`}
        {...props} 
      />
    </div>
  );
}

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className = "" }: FormGroupProps) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  );
}

interface InfoDisplayProps {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
}

export function InfoDisplay({ label, value, copyable = false, onCopy }: InfoDisplayProps) {
  return (
    <div>
      <label className="block text-[#2c1810] text-sm font-bold mb-1">
        {label}:
      </label>
      <div
        className={`px-3 py-2 bg-[#e4be93ff] border border-[#a0622d] rounded text-[#2c1810] text-sm ${
          copyable ? "cursor-pointer hover:bg-[#f5d9b8]" : "cursor-default"
        }`}
        onClick={copyable ? onCopy : undefined}
        title={copyable ? "Click to copy" : undefined}
      >
        {value}
      </div>
    </div>
  );
}
