import React, { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { commonStyles, hoverEffects } from "./styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const baseStyle = {
    primary: commonStyles.primaryButton,
    secondary: commonStyles.secondaryButton,
    danger: commonStyles.dangerButton,
  }[variant];

  const hoverStyle = {
    primary: hoverEffects.primaryButton,
    secondary: hoverEffects.secondaryButton,
    danger: hoverEffects.dangerButton,
  }[variant];

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    Object.assign(e.currentTarget.style, hoverStyle);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    Object.assign(e.currentTarget.style, baseStyle);
    onMouseLeave?.(e);
  };

  return (
    <button
      style={{ ...baseStyle, ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextInput({ label, style, ...props }: TextInputProps) {
  return (
    <div>
      {label && <label style={commonStyles.label}>{label}</label>}
      <input style={{ ...commonStyles.textInput, ...style }} {...props} />
    </div>
  );
}

interface FormGroupProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormGroup({ children, style }: FormGroupProps) {
  return <div style={{ ...commonStyles.formGroup, ...style }}>{children}</div>;
}

interface InfoDisplayProps {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  truncateLength?: number; // Number of characters to show before truncation
  nonSelectable?: boolean; // Disable text selection
}

export function InfoDisplay({
  label,
  value,
  copyable = false,
  onCopy,
  truncateLength,
  nonSelectable = false,
}: InfoDisplayProps) {
  const displayValue =
    truncateLength && value.length > truncateLength
      ? value.substring(0, truncateLength) + "..."
      : value;

  return (
    <div>
      <label style={commonStyles.label}>{label}:</label>
      <div
        style={{
          ...commonStyles.infoDisplay,
          cursor: copyable ? "pointer" : "default",
          userSelect: nonSelectable ? "none" : "auto",
          WebkitUserSelect: nonSelectable ? "none" : "auto",
          MozUserSelect: nonSelectable ? "none" : "auto",
        }}
        onClick={copyable ? onCopy : undefined}
        title={copyable ? "Click to copy" : undefined}
      >
        {displayValue}
      </div>
    </div>
  );
}
