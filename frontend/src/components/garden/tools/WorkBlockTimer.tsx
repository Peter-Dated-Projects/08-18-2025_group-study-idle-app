import React, { useState, useEffect, useRef, useCallback } from "react";
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

type WorkBlockPhase = "work" | "idle";

interface WorkBlockSettings {
  workDuration: number; // in minutes
}

const defaultSettings: WorkBlockSettings = {
  workDuration: 25,
};

export default function WorkBlockTimer() {
  const [settings, setSettings] = useState<WorkBlockSettings>(defaultSettings);
  const [currentPhase, setCurrentPhase] = useState<WorkBlockPhase>("idle");
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHours, setEditHours] = useState("0");
  const [editMinutes, setEditMinutes] = useState(settings.workDuration.toString());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    if (typeof window !== "undefined" && window.AudioContext) {
      // We'll use a simple approach without audio files for now
    }
  }, []);

  const handlePhaseComplete = useCallback(() => {
    setIsRunning(false);

    // Play notification sound (simple beep)
    playNotificationSound();

    if (currentPhase === "work") {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);

      // Work session completed, go back to idle
      setCurrentPhase("idle");
      setTimeLeft(settings.workDuration * 60);
    }
  }, [currentPhase, completedSessions, settings]);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
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
  }, [isRunning, timeLeft, handlePhaseComplete]);

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
        console.log("Audio notification not available");
      }
    }
  };

  const startTimer = () => {
    if (currentPhase === "idle") {
      setCurrentPhase("work");
      setTimeLeft(settings.workDuration * 60);
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentPhase("idle");
    setTimeLeft(settings.workDuration * 60);
    setCompletedSessions(0);
  };

  const skipPhase = () => {
    handlePhaseComplete();
  };

  const formatTime = (seconds: number): string => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
  };

  const getPhaseDisplay = (phase: WorkBlockPhase): string => {
    switch (phase) {
      case "work":
        return "Focus Time";
      case "idle":
        return "Ready to Start";
    }
  };

  const getPhaseColor = (phase: WorkBlockPhase): string => {
    switch (phase) {
      case "work":
        return ACCENT_COLOR;
      case "idle":
        return SECONDARY_TEXT;
    }
  };

  const updateSetting = (key: keyof WorkBlockSettings, totalMinutes: number) => {
    setSettings((prev) => ({ ...prev, [key]: totalMinutes }));

    // Update current timer if we're idle and changing work duration
    if (currentPhase === "idle" && key === "workDuration") {
      setTimeLeft(totalMinutes * 60);
    }
  };

  const handleTimeEdit = () => {
    if (currentPhase !== "idle" || isRunning) return;
    setIsEditingTime(true);
    const totalMinutes = Math.floor(timeLeft / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setEditHours(hours.toString());
    setEditMinutes(minutes.toString());
  };

  const handleTimeSubmit = () => {
    const newHours = parseInt(editHours) || 0;
    const newMinutes = parseInt(editMinutes) || 0;
    const totalMinutes = newHours * 60 + newMinutes;
    
    if (totalMinutes > 0 && totalMinutes <= 1440) { // Max 24 hours
      updateSetting("workDuration", totalMinutes);
    } else {
      // Reset to current values if invalid
      const currentTotalMinutes = Math.floor(timeLeft / 60);
      const currentHours = Math.floor(currentTotalMinutes / 60);
      const currentMinutes = currentTotalMinutes % 60;
      setEditHours(currentHours.toString());
      setEditMinutes(currentMinutes.toString());
    }
    setIsEditingTime(false);
  };

  const handleTimeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTimeSubmit();
    } else if (e.key === "Escape") {
      const currentTotalMinutes = Math.floor(timeLeft / 60);
      const currentHours = Math.floor(currentTotalMinutes / 60);
      const currentMinutes = currentTotalMinutes % 60;
      setEditHours(currentHours.toString());
      setEditMinutes(currentMinutes.toString());
      setIsEditingTime(false);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px",
        fontFamily: BodyFont,
        textAlign: "center",
      }}
    >
      {/* All content grouped together */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
        {/* Current Phase */}
        <div
          style={{
            color: getPhaseColor(currentPhase),
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {getPhaseDisplay(currentPhase)}
        </div>

        {/* Timer Display */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: getPhaseColor(currentPhase),
            fontFamily: "monospace",
            cursor: currentPhase === "idle" && !isRunning ? "pointer" : "default",
            padding: "4px",
            border: isEditingTime ? `1px solid ${BORDERLINE}` : "1px solid transparent",
            borderRadius: "4px",
            transition: "border-color 0.2s ease",
            minHeight: "60px", // Reserve space for consistent height
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "200px", // Reserve space for consistent width
          }}
          onClick={handleTimeEdit}
        >
          {isEditingTime ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  onKeyDown={handleTimeKeyPress}
                  autoFocus
                  style={{
                    fontSize: "48px",
                    fontWeight: "bold",
                    color: getPhaseColor(currentPhase),
                    fontFamily: "monospace",
                    background: "transparent",
                    border: "none",
                    textAlign: "center",
                    width: "80px",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "48px", fontWeight: "bold", fontFamily: "monospace" }}>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  onKeyDown={handleTimeKeyPress}
                  style={{
                    fontSize: "48px",
                    fontWeight: "bold",
                    color: getPhaseColor(currentPhase),
                    fontFamily: "monospace",
                    background: "transparent",
                    border: "none",
                    textAlign: "center",
                    width: "80px",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "48px", fontWeight: "bold", fontFamily: "monospace" }}>:00</span>
              </div>
              {/* Save/Cancel buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleTimeSubmit}
                  style={{
                    backgroundColor: SUCCESS_COLOR,
                    color: "white",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    const currentTotalMinutes = Math.floor(timeLeft / 60);
                    const currentHours = Math.floor(currentTotalMinutes / 60);
                    const currentMinutes = currentTotalMinutes % 60;
                    setEditHours(currentHours.toString());
                    setEditMinutes(currentMinutes.toString());
                    setIsEditingTime(false);
                  }}
                  style={{
                    backgroundColor: "#FF6B6B",
                    color: "white",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: "10px", color: SECONDARY_TEXT, textAlign: "center" }}>
                Press Enter to save, Esc to cancel
              </div>
            </div>
          ) : (
            <span>{formatTime(timeLeft)}</span>
          )}
        </div>

        {/* Session Counter */}
        <div
          style={{
            color: SECONDARY_TEXT,
            fontSize: "14px",
          }}
        >
          Completed Sessions: {completedSessions}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          {!isRunning && currentPhase !== "idle" && (
            <button
              onClick={startTimer}
              style={{
                backgroundColor: SUCCESS_COLOR,
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Resume
            </button>
          )}

          {!isRunning && currentPhase === "idle" && (
            <button
              onClick={startTimer}
              style={{
                backgroundColor: ACCENT_COLOR,
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Start
            </button>
          )}

          {isRunning && (
            <button
              onClick={pauseTimer}
              style={{
                backgroundColor: "#FF6B6B",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Pause
            </button>
          )}

          <button
            onClick={resetTimer}
            style={{
              backgroundColor: BORDERFILL,
              color: FONTCOLOR,
              border: `1px solid ${BORDERLINE}`,
              padding: "10px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Reset
          </button>

          {currentPhase !== "idle" && (
            <button
              onClick={skipPhase}
              style={{
                backgroundColor: BORDERFILL,
                color: FONTCOLOR,
                border: `1px solid ${BORDERLINE}`,
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
