import React, { useEffect } from "react";
import { useSessionAuth } from "../../../hooks/useSessionAuth";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import type { RootState } from "../../../store/store";
import { updateBalance, setLoading, setError } from "../../../store/slices/walletSlice";
import {
  FONTCOLOR,
  SECONDARY_TEXT,
  ACCENT_COLOR,
  PANELFILL,
  BORDERLINE,
  BodyFont,
} from "@/components/constants";

interface BankBalanceProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function BankBalance({ className, style }: BankBalanceProps) {
  const { user } = useSessionAuth();
  const { onPomoBankEvent } = useWebSocket();
  const dispatch = useAppDispatch();

  // Get wallet state from Redux
  const { balance, isLoading, error, lastUpdated } = useAppSelector(
    (state: RootState) => state.wallet
  );

  // Fetch user's bank balance
  const fetchBalance = async () => {
    if (!user?.userId) {
      dispatch(updateBalance(0));
      dispatch(setLoading(false));
      return;
    }

    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

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
          dispatch(updateBalance(data.balance || 0));
        } else {
          dispatch(setError(data.message || "Failed to load balance"));
          dispatch(updateBalance(0));
        }
      } else {
        dispatch(setError("Failed to load balance"));
        dispatch(updateBalance(0));
      }
    } catch (err) {
      console.error("Error fetching bank balance:", err);
      dispatch(setError("Failed to load balance"));
      dispatch(updateBalance(0));
    } finally {
      dispatch(setLoading(false));
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

        dispatch(updateBalance(event.new_balance));
        dispatch(setError(null)); // Clear any previous errors since we got a successful update
      }
    });

    return cleanup;
  }, [user?.userId, onPomoBankEvent, dispatch]);

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
      className={`${className} ml-0.5 flex items-center gap-2 py-2 px-3 rounded-lg text-sm w-[150px] box-border`}
      style={{
        backgroundColor: PANELFILL,
        border: `1px solid ${BORDERLINE}`,
        fontFamily: BodyFont,
        color: FONTCOLOR,
        ...style,
      }}
    >
      {/* Coin Icon */}
      <i
        className="fi fi-sr-coins text-xl flex items-center"
        style={{ color: ACCENT_COLOR }}
      />

      {/* Balance Display */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <span style={{ color: SECONDARY_TEXT }}>...</span>
        ) : error ? (
          <span className="text-xs" style={{ color: "#ff6b6b" }}>Error</span>
        ) : (
          <span
            className="font-bold"
            style={{ color: FONTCOLOR }}
            title={`${balance} pomo coins`}
          >
            {formatBalance(balance || 0)}
          </span>
        )}
      </div>
    </div>
  );
}
