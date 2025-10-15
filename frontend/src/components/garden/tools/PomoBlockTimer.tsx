import React, { useEffect, useRef, useCallback } from "react";
import {
  FONTCOLOR,
  SECONDARY_TEXT,
  ACCENT_COLOR,
  PANELFILL,
  BORDERLINE,
  HeaderFont,
  BodyFont,
  SUCCESS_COLOR,
  BORDERFILL,
} from "../../constants";
import { useAppSelector, useAppDispatch, useTimer } from "../../../store/hooks";
import { useSessionAuth } from "../../../hooks/useSessionAuth";
import { updateBalance } from "../../../store/slices/walletSlice";
import {
  startTimer,
  pauseTimer,
  resetTimer,
  tick,
  completePhase,
  skipSession,
  updateSettings,
  setEditingTime,
  setEditHours,
  setEditMinutes,
  applyTimeEdit,
} from "../../../store/slices/timerSlice";

export default function PomoBlockTimer() {
  const { user } = useSessionAuth();
  const dispatch = useAppDispatch();

  // Get all timer state from Redux
  const {
    currentPhase,
    timeLeft,
    isRunning,
    completedSessions,
    settings,
    hasProcessedCompletion,
    isEditingTime,
    editHours,
    editMinutes,
  } = useTimer();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasProcessedCompletionRef = useRef(false);

  // Sync the ref with Redux state
  useEffect(() => {
    hasProcessedCompletionRef.current = hasProcessedCompletion;
  }, [hasProcessedCompletion]);

  // Initialize audio for notifications
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    if (typeof window !== "undefined" && window.AudioContext) {
      // We'll use a simple approach without audio files for now
    }
  }, []);

  const updateLeaderboard = async () => {
    if (!user?.userId) {
      console.warn("Cannot update leaderboard: user not authenticated");
      return;
    }

    try {
      const response = await fetch("/api/leaderboard/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: user.userId,
          duration: settings.workDuration, // Send duration in minutes instead of count
        }),
      });

      if (!response.ok) {
        console.error("Failed to update leaderboard:", response.statusText);
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  };

  const updatePomoBank = async (completionType: "normal" | "skipped") => {
    if (!user?.userId) {
      console.warn("Cannot update pomo bank: user not authenticated");
      return;
    }

    try {
      // Calculate minutes based on completion type
      const minutesWorked =
        completionType === "normal"
          ? settings.workDuration
          : Math.floor((settings.workDuration * 60 - timeLeft) / 60); // Floor the partial minutes

      const response = await fetch("/api/pomo-bank/pomo-earnings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          minutes_completed: minutesWorked,
          was_skipped: completionType === "skipped",
        }),
      });

      if (!response.ok) {
        console.error("Failed to update pomo bank:", response.statusText);
        return;
      }

      const result = await response.json();

    } catch (error) {
      console.error("Error updating pomo bank:", error);
    }
  };

  const handlePhaseComplete = useCallback(() => {
    // Prevent duplicate processing using ref
    if (hasProcessedCompletionRef.current) {
      return;
    }

    // Dispatch Redux action
    dispatch(completePhase());

    // Play notification sound
    playNotificationSound();

    // Update leaderboard and pomo bank for completed work sessions
    if (currentPhase === "work") {
      // Update leaderboard and Redis cache
      updateLeaderboard();

      // Update pomo bank with normal completion
      updatePomoBank("normal");
    }
  }, [currentPhase, dispatch]);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        dispatch(tick());

        // Check if we should complete the phase
        if (timeLeft <= 1) {
          handlePhaseComplete();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, handlePhaseComplete, dispatch]);

  const playNotificationSound = () => {
    // Simple beep using Web Audio API
    if (typeof window !== "undefined" && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch {

      }
    }
  };

  const handleStartTimer = () => {
    dispatch(startTimer());
  };

  const handlePauseTimer = () => {
    dispatch(pauseTimer());
  };

  const handleResetTimer = () => {
    dispatch(resetTimer());
  };

  const handleSkipSession = () => {
    // Update pomo bank with skipped session before resetting
    if (currentPhase === "work") {
      updatePomoBank("skipped");
    }
    dispatch(skipSession());
  };

  const handleTimerSettingsChange = (newSettings: { workDuration: number }) => {
    dispatch(updateSettings(newSettings));
  };

  const handleEditTimeStart = () => {
    dispatch(setEditingTime(true));
  };

  const handleEditTimeCancel = () => {
    dispatch(setEditingTime(false));
  };

  const handleEditTimeApply = () => {
    dispatch(applyTimeEdit());
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeForEdit = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours: hours.toString(), minutes: minutes.toString() };
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: BodyFont,
        backgroundColor: PANELFILL,
        overflow: "hidden",
      }}
    >
      {/* Main timer container - now fills entire space */}
      <div
        style={{
          backgroundColor: PANELFILL,
          width: "100%",
          height: "100%",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              fontFamily: HeaderFont,
              color: FONTCOLOR,
              margin: 0,
              fontSize: "16px",
            }}
          >
            🍅 Pomodoro Timer
          </h3>
          <div
            style={{
              fontFamily: BodyFont,
              color: SECONDARY_TEXT,
              fontSize: "12px",
            }}
          >
            Sessions: {completedSessions}
          </div>
        </div>

        {/* Time Display */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "24px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: "120px",
          }}
        >
          {!isEditingTime ? (
            <div
              onClick={handleEditTimeStart}
              style={{
                fontFamily: HeaderFont,
                fontSize: "48px",
                color: currentPhase === "work" ? ACCENT_COLOR : FONTCOLOR,
                cursor: "pointer",
                padding: "16px",
                borderRadius: "12px",
                transition: "background-color 0.2s",
                fontWeight: "bold",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = BORDERFILL)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {formatTime(timeLeft)}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "center",
              }}
            >
              <input
                type="number"
                value={editHours}
                onChange={(e) => dispatch(setEditHours(e.target.value))}
                min="0"
                max="23"
                style={{
                  width: "50px",
                  padding: "4px",
                  fontSize: "16px",
                  textAlign: "center",
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "4px",
                  backgroundColor: PANELFILL,
                  color: FONTCOLOR,
                }}
              />
              <span style={{ color: FONTCOLOR, fontSize: "16px" }}>h</span>
              <input
                type="number"
                value={editMinutes}
                onChange={(e) => dispatch(setEditMinutes(e.target.value))}
                min="1"
                max="59"
                style={{
                  width: "50px",
                  padding: "4px",
                  fontSize: "16px",
                  textAlign: "center",
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "4px",
                  backgroundColor: PANELFILL,
                  color: FONTCOLOR,
                }}
              />
              <span style={{ color: FONTCOLOR, fontSize: "16px" }}>m</span>
            </div>
          )}

          {/* Phase Indicator */}
          <div
            style={{
              fontFamily: BodyFont,
              color: SECONDARY_TEXT,
              fontSize: "14px",
              marginTop: "8px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {currentPhase === "work" ? "Work Session" : "Ready to Start"}
          </div>
        </div>

        {/* Edit Time Controls */}
        {isEditingTime && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "12px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleEditTimeApply}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                backgroundColor: SUCCESS_COLOR,
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#45a049";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = SUCCESS_COLOR;
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Apply
            </button>
            <button
              onClick={handleEditTimeCancel}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                backgroundColor: BORDERFILL,
                color: FONTCOLOR,
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = BORDERLINE;
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = BORDERFILL;
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Control Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexShrink: 0,
          }}
        >
          {!isRunning ? (
            <button
              onClick={handleStartTimer}
              style={{
                flex: 1,
                padding: "16px",
                fontSize: "16px",
                backgroundColor: SUCCESS_COLOR,
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: BodyFont,
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#45a049";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = SUCCESS_COLOR;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {currentPhase === "idle" ? "Start Work" : "Resume"}
            </button>
          ) : (
            <button
              onClick={handlePauseTimer}
              style={{
                flex: 1,
                padding: "16px",
                fontSize: "16px",
                backgroundColor: "#ff6b6b",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: BodyFont,
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#ff5252";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#ff6b6b";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Pause
            </button>
          )}

          <button
            onClick={handleResetTimer}
            style={{
              padding: "16px 20px",
              fontSize: "14px",
              backgroundColor: BORDERFILL,
              color: FONTCOLOR,
              border: `1px solid ${BORDERLINE}`,
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: BodyFont,
              fontWeight: "500",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = BORDERLINE;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = BORDERFILL;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Reset
          </button>
        </div>

        {/* Skip Session Button (only show during work) */}
        {currentPhase === "work" && (
          <button
            onClick={handleSkipSession}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "12px",
              backgroundColor: "transparent",
              color: SECONDARY_TEXT,
              border: `1px dashed ${BORDERLINE}`,
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: BodyFont,
              marginBottom: "8px",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = BORDERFILL;
              e.currentTarget.style.color = FONTCOLOR;
              e.currentTarget.style.borderStyle = "solid";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = SECONDARY_TEXT;
              e.currentTarget.style.borderStyle = "dashed";
            }}
          >
            Skip Session (Partial Credit)
          </button>
        )}

        {/* Progress Bar */}
        <div
          style={{
            width: "100%",
            height: "6px",
            backgroundColor: BORDERFILL,
            borderRadius: "3px",
            overflow: "hidden",
            marginTop: "auto",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: `${
                ((settings.workDuration * 60 - timeLeft) / (settings.workDuration * 60)) * 100
              }%`,
              height: "100%",
              backgroundColor: currentPhase === "work" ? ACCENT_COLOR : SUCCESS_COLOR,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
