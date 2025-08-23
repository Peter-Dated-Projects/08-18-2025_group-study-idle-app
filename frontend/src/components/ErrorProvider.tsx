import React, { createContext, useContext, useState, useCallback } from "react";

interface ErrorMessage {
  id: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
}

interface ErrorContextType {
  errors: ErrorMessage[];
  addError: (message: string, autoClose?: boolean) => string;
  removeError: (id: string) => void;
  clearAllErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

export function useGlobalError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useGlobalError must be used within an ErrorProvider");
  }
  return context;
}

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const addError = useCallback((message: string, autoClose: boolean = true): string => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newError: ErrorMessage = {
      id,
      message,
      timestamp: Date.now(),
      autoClose,
    };

    setErrors((prev) => [...prev, newError]);

    // Auto-remove after 5 seconds if autoClose is true
    if (autoClose) {
      setTimeout(() => {
        removeError(id);
      }, 5000);
    }

    return id;
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((error) => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider
      value={{
        errors,
        addError,
        removeError,
        clearAllErrors,
      }}
    >
      {children}
      <GlobalErrorDisplay />
    </ErrorContext.Provider>
  );
}

function GlobalErrorDisplay() {
  const { errors, removeError } = useGlobalError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
      {errors.map((error, index) => (
        <div
          key={error.id}
          className="bg-red-50 border-2 border-red-200 rounded-xl px-5 py-4 text-red-800 text-sm font-medium shadow-lg max-w-sm md:max-w-md lg:max-w-lg min-w-80 text-center transition-all duration-300 ease-out"
          style={{
            animation: `slideUp 0.3s ease-out`,
            marginBottom: index > 0 ? "8px" : "0",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="flex-1">{error.message}</span>
            <button
              onClick={() => removeError(error.id)}
              className="ml-3 bg-transparent border-none text-red-600 text-lg font-bold cursor-pointer hover:text-red-800 transition-colors duration-200 p-0 leading-none"
              title="Dismiss error"
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
