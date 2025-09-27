import React, { useEffect } from "react";
import { useReduxAuth } from "../../../hooks/useReduxAuth";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import type { RootState } from "../../../store/store";
import { updateBalance, setLoading, setError } from "../../../store/slices/walletSlice";

interface BankBalanceProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function BankBalance({ className, style }: BankBalanceProps) {
  const { user } = useReduxAuth();
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
        console.log(
          `💰 Real-time balance update: ${event.old_balance} → ${event.new_balance} (${event.reason})`
        );
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
      className={`ml-0.5 flex items-center gap-2 p-2 bg-[#fdf4e8] border border-[#a0622d] rounded text-sm text-[#2c1810] w-[150px] box-border ${className}`}
      style={style}
    >
      {/* Coin Icon */}
      <i
        className="fi fi-sr-coins text-xl text-[#d4944a] flex items-center"
      />

      {/* Balance Display */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <span className="text-[#7a6b57]">...</span>
        ) : error ? (
          <span className="text-[#ff6b6b] text-xs">Error</span>
        ) : (
          <span
            className="font-bold text-[#2c1810]"
            title={`${balance} pomo coins`}
          >
            {formatBalance(balance || 0)}
          </span>
        )}
      </div>

      {/* Debug info - remove in production */}
      {lastUpdated && (
        <div
          className="text-xs text-[#7a6b57] absolute -top-3 right-0 opacity-70"
          title={`Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`}
        >
          Redux
        </div>
      )}
    </div>
  );
}
