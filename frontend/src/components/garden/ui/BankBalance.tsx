import React, { useEffect, useCallback, useRef } from "react";
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

  // Track if we're currently fetching to prevent concurrent requests
  const isFetchingRef = useRef(false);

  // Fetch user's bank balance - memoized to prevent unnecessary re-creation
  const fetchBalance = useCallback(async () => {
    if (!user?.userId || isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
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
      isFetchingRef.current = false;
    }
  }, [user?.userId, dispatch]);

  // Initial fetch on mount or when user changes
  useEffect(() => {
    // Only fetch balance if user is authenticated
    if (user?.userId) {
      fetchBalance();
    }
  }, [user?.userId, fetchBalance]);

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
      id="pomo-counter"
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
      <i className="fi fi-sr-coins text-xl flex items-center" style={{ color: ACCENT_COLOR }} />

      {/* Balance Display */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <span style={{ color: SECONDARY_TEXT }}>...</span>
        ) : error ? (
          <span className="text-xs" style={{ color: "#ff6b6b" }}>
            Error
          </span>
        ) : (
          <span className="font-bold" style={{ color: FONTCOLOR }} title={`${balance} pomo coins`}>
            {formatBalance(balance || 0)}
          </span>
        )}
      </div>
    </div>
  );
}
