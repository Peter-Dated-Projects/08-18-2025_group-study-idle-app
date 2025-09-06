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

type PomodoroPhase = "work" | "shortBreak" | "longBreak" | "idle";

interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  sessionsBeforeLongBreak: number;
}

const defaultSettings: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
};

export default function Pomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>("idle");
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

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

      // Determine next break type
      if (newCompletedSessions % settings.sessionsBeforeLongBreak === 0) {
        setCurrentPhase("longBreak");
        setTimeLeft(settings.longBreakDuration * 60);
      } else {
        setCurrentPhase("shortBreak");
        setTimeLeft(settings.shortBreakDuration * 60);
      }
    } else {
      // Break completed, go back to work
      setCurrentPhase("work");
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getPhaseDisplay = (phase: PomodoroPhase): string => {
    switch (phase) {
      case "work":
        return "Focus Time";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
      case "idle":
        return "Ready to Start";
    }
  };

  const getPhaseColor = (phase: PomodoroPhase): string => {
    switch (phase) {
      case "work":
        return ACCENT_COLOR;
      case "shortBreak":
        return SUCCESS_COLOR;
      case "longBreak":
        return "#4CAF50";
      case "idle":
        return SECONDARY_TEXT;
    }
  };

  const updateSetting = (key: keyof PomodoroSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    // Update current timer if we're idle and changing work duration
    if (currentPhase === "idle" && key === "workDuration") {
      setTimeLeft(value * 60);
    }
  };

  if (showSettings) {
    return (
      <div style={{ padding: "16px", fontFamily: BodyFont }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              color: FONTCOLOR,
              fontFamily: HeaderFont,
              fontSize: "18px",
              margin: 0,
            }}
          >
            Pomodoro Settings
          </h3>
          <button
            onClick={() => setShowSettings(false)}
            style={{
              background: "none",
              border: "none",
              color: FONTCOLOR,
              fontSize: "16px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{ color: FONTCOLOR, fontSize: "14px", display: "block", marginBottom: "8px" }}
            >
              Work Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.workDuration}
              onChange={(e) => updateSetting("workDuration", parseInt(e.target.value) || 25)}
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${BORDERLINE}`,
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
                borderRadius: "4px",
              }}
            />
          </div>

          <div>
            <label
              style={{ color: FONTCOLOR, fontSize: "14px", display: "block", marginBottom: "8px" }}
            >
              Short Break Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.shortBreakDuration}
              onChange={(e) => updateSetting("shortBreakDuration", parseInt(e.target.value) || 5)}
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${BORDERLINE}`,
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
                borderRadius: "4px",
              }}
            />
          </div>

          <div>
            <label
              style={{ color: FONTCOLOR, fontSize: "14px", display: "block", marginBottom: "8px" }}
            >
              Long Break Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.longBreakDuration}
              onChange={(e) => updateSetting("longBreakDuration", parseInt(e.target.value) || 15)}
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${BORDERLINE}`,
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
                borderRadius: "4px",
              }}
            />
          </div>

          <div>
            <label
              style={{ color: FONTCOLOR, fontSize: "14px", display: "block", marginBottom: "8px" }}
            >
              Sessions Before Long Break
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={settings.sessionsBeforeLongBreak}
              onChange={(e) =>
                updateSetting("sessionsBeforeLongBreak", parseInt(e.target.value) || 4)
              }
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${BORDERLINE}`,
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
                borderRadius: "4px",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", fontFamily: BodyFont, textAlign: "center" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            color: FONTCOLOR,
            fontFamily: HeaderFont,
            fontSize: "18px",
            margin: 0,
          }}
        >
          Pomodoro Timer
        </h3>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: "none",
            border: `1px solid ${BORDERLINE}`,
            color: FONTCOLOR,
            fontSize: "12px",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "4px",
            backgroundColor: BORDERFILL,
          }}
        >
          Settings
        </button>
      </div>

      {/* Current Phase */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            color: getPhaseColor(currentPhase),
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          {getPhaseDisplay(currentPhase)}
        </div>

        {/* Progress indicators */}
        <div
          style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "16px" }}
        >
          {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, index) => (
            <div
              key={index}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor:
                  index < completedSessions % settings.sessionsBeforeLongBreak
                    ? ACCENT_COLOR
                    : BORDERFILL,
                border: `1px solid ${BORDERLINE}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Timer Display */}
      <div
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          color: getPhaseColor(currentPhase),
          marginBottom: "24px",
          fontFamily: "monospace",
        }}
      >
        {formatTime(timeLeft)}
      </div>

      {/* Session Counter */}
      <div
        style={{
          color: SECONDARY_TEXT,
          fontSize: "14px",
          marginBottom: "24px",
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

      {/* Tips */}
      {currentPhase === "work" && (
        <div
          style={{
            marginTop: "24px",
            padding: "12px",
            backgroundColor: BORDERFILL,
            borderRadius: "6px",
            border: `1px solid ${BORDERLINE}`,
          }}
        >
          <div
            style={{ color: FONTCOLOR, fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
          >
            💡 Focus Tips
          </div>
          <div style={{ color: SECONDARY_TEXT, fontSize: "11px" }}>
            • Eliminate distractions
            <br />
            • Focus on one task
            <br />• Take notes of any ideas that come up
          </div>
        </div>
      )}

      {(currentPhase === "shortBreak" || currentPhase === "longBreak") && (
        <div
          style={{
            marginTop: "24px",
            padding: "12px",
            backgroundColor: BORDERFILL,
            borderRadius: "6px",
            border: `1px solid ${BORDERLINE}`,
          }}
        >
          <div
            style={{ color: FONTCOLOR, fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
          >
            🌱 Break Tips
          </div>
          <div style={{ color: SECONDARY_TEXT, fontSize: "11px" }}>
            • Step away from your screen
            <br />
            • Stretch or do light exercise
            <br />• Hydrate and breathe deeply
          </div>
        </div>
      )}
    </div>
  );
}
