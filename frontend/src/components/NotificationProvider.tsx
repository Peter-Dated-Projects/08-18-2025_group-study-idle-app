import React, { createContext, useContext, useState, useCallback } from "react";

// Usage:
// const { addError, addInfo } = useGlobalNotification();
// addError("An error occurred");
// addInfo("Saved successfully");

interface NotificationMessage {
  id: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
  type: "error" | "info";
}

interface NotificationContextType {
  notifications: NotificationMessage[];
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (type: "error" | "info", message: string, autoClose?: boolean) => string;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useGlobalNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useGlobalNotification must be used within a NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

function GlobalNotificationDisplay() {
  const { notifications, removeNotification } = useGlobalNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
      {notifications.map((notification, index) => {
        const containerPalette =
          notification.type === "error"
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-blue-50 border-blue-200 text-blue-800";

        const buttonPalette =
          notification.type === "error"
            ? "text-red-600 hover:text-red-800"
            : "text-blue-600 hover:text-blue-800";

        return (
          <div
            key={notification.id}
            className={`${containerPalette} border-2 rounded-xl px-5 py-4 text-sm font-medium shadow-lg max-w-sm md:max-w-md lg:max-w-lg min-w-80 text-center transition-all duration-300 ease-out z-50`}
            style={{
              animation: `slideUp 0.3s ease-out`,
              marginBottom: index > 0 ? "8px" : "0",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="flex-1">{notification.message}</span>
              <button
                onClick={() => removeNotification(notification.id)}
                className={`ml-3 bg-transparent border-none ${buttonPalette} text-lg font-bold cursor-pointer transition-colors duration-200 p-0 leading-none`}
                title="Dismiss notification"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}

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

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev: NotificationMessage[]) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const addNotification = useCallback(
    (type: "error" | "info", message: string, autoClose: boolean = true): string => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newItem: NotificationMessage = {
        id,
        message,
        timestamp: Date.now(),
        autoClose,
        type,
      };
      setNotifications((prev: NotificationMessage[]) => [...prev, newItem]);

      if (autoClose) {
        setTimeout(() => {
          removeNotification(id);
        }, 5000);
      }
      return id;
    },
    [removeNotification]
  );

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
      <GlobalNotificationDisplay />
    </NotificationContext.Provider>
  );
}
