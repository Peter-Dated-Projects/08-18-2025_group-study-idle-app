import React, { useState, useEffect } from "react";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  FONTCOLOR,
  SECONDARY_TEXT,
  ACCENT_COLOR,
  PANELFILL,
  BORDERLINE,
  BodyFont,
  HeaderFont,
} from "@/components/constants";

interface BankBalanceProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function BankBalance({ className, style }: BankBalanceProps) {
  const { user } = useSessionAuth();
  const { onPomoBankEvent } = useWebSocket();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's bank balance
  const fetchBalance = async () => {
    if (!user?.userId) {
      setBalance(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call the backend API through the Next.js proxy
      const response = await fetch("/api/pomo-bank/balance", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBalance(data.balance || 0);
        } else {
          setError(data.message || "Failed to load balance");
          setBalance(0);
        }
      } else {
        setError("Failed to load balance");
        setBalance(0);
      }
    } catch (err) {
      console.error("Error fetching bank balance:", err);
      setError("Failed to load balance");
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user?.userId]);

  // Refresh balance every 30 seconds to catch updates from pomo sessions
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.userId) {
        fetchBalance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.userId]);

  // Listen for real-time pomo bank updates via websocket
  useEffect(() => {
    if (!user?.userId) return;

    const cleanup = onPomoBankEvent((event) => {
      // Only update if this event is for the current user
      if (event.user_id === user.userId) {
        console.log(
          `💰 Real-time balance update: ${event.old_balance} → ${event.new_balance} (${event.reason})`
        );
        setBalance(event.new_balance);
        setError(null); // Clear any previous errors since we got a successful update
      }
    });

    return cleanup;
  }, [user?.userId, onPomoBankEvent]);

  // Format balance for display
  const formatBalance = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    } else {
      return amount.toString();
    }
  };

  return (
    <div
      className={className}
      style={{
        marginLeft: "2px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        backgroundColor: PANELFILL,
        border: `1px solid ${BORDERLINE}`,
        borderRadius: "8px",
        fontSize: "0.9rem",
        fontFamily: BodyFont,
        color: FONTCOLOR,
        maxWidth: "150px",
        ...style,
      }}
    >
      {/* Coin Icon */}
      <i
        className="fi fi-sr-coins"
        style={{
          fontSize: "1.2rem",
          color: ACCENT_COLOR,
          display: "flex",
          alignItems: "center",
        }}
      />

      {/* Balance Display */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <span style={{ color: SECONDARY_TEXT }}>...</span>
        ) : error ? (
          <span style={{ color: "#ff6b6b", fontSize: "0.8rem" }}>Error</span>
        ) : (
          <span
            style={{
              fontWeight: "bold",
              color: FONTCOLOR,
            }}
            title={`${balance} pomo coins`}
          >
            {formatBalance(balance || 0)}
          </span>
        )}
      </div>
    </div>
  );
}
