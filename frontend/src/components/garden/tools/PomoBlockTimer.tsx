import React, { useEffect, useRef, useCallback } from "react";
import { useAppSelector, useAppDispatch, useTimer } from "../../../store/hooks";
import { useReduxAuth } from "../../../hooks/useReduxAuth";
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
  const { user } = useReduxAuth();
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

  // Timer tick effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        dispatch(tick());
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
        intervalRef.current = null;
      }
    };
  }, [isRunning, dispatch]);

  // Handle timer completion
  useEffect(() => {
    if (timeLeft <= 0 && !hasProcessedCompletionRef.current) {
      dispatch(completePhase());
      hasProcessedCompletionRef.current = true;
    }
  }, [timeLeft, dispatch]);

  // Reset completion flag when timer starts
  useEffect(() => {
    if (isRunning) {
      hasProcessedCompletionRef.current = false;
    }
  }, [isRunning]);

  // Handle timer completion
  useEffect(() => {
    if (hasProcessedCompletion) {
      // Award coins based on phase
      const coinsEarned = currentPhase === "work" ? 10 : 5;
      dispatch(updateBalance(coinsEarned));

      // Auto-start next phase after a delay
      setTimeout(() => {
        if (currentPhase === "work") {
          dispatch(startTimer());
        } else {
          dispatch(startTimer());
        }
      }, 2000);
    }
  }, [hasProcessedCompletion, currentPhase, dispatch]);

  const handleStart = () => {
    dispatch(startTimer());
  };

  const handlePause = () => {
    dispatch(pauseTimer());
  };

  const handleReset = () => {
    dispatch(resetTimer());
  };

  const handleSkip = () => {
    dispatch(skipSession());
  };

  const handleEditTimeStart = () => {
    const { hours, minutes } = formatTimeForEdit(timeLeft);
    dispatch(setEditHours(hours));
    dispatch(setEditMinutes(minutes));
    dispatch(setEditingTime(true));
  };

  const handleEditTimeCancel = () => {
    dispatch(setEditingTime(false));
  };

  const handleEditTimeApply = () => {
    dispatch(applyTimeEdit());
  };

  const handleEditHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (parseInt(value) >= 0 && parseInt(value) <= 23)) {
      dispatch(setEditHours(value));
    }
  };

  const handleEditMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
      dispatch(setEditMinutes(value));
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeForEdit = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours: hours.toString(), minutes: minutes.toString() };
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#fdf4e8] overflow-hidden">
      {/* Main timer container - now fills entire space */}
      <div className="bg-[#fdf4e8] w-full h-full p-5 flex flex-col overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 flex-shrink-0">
          <h3 className="font-falling-sky text-[#2c1810] m-0 text-base">🍅 Pomodoro Timer</h3>
          <div className="text-[#7a6b57] text-xs">Sessions: {completedSessions}</div>
        </div>

        {/* Time Display */}
        <div className="text-center mb-6 flex-1 flex flex-col justify-center min-h-[120px]">
          {!isEditingTime ? (
            <div
              onClick={handleEditTimeStart}
              className={`font-falling-sky text-5xl cursor-pointer p-4 rounded-xl transition-colors font-bold ${
                currentPhase === "work" ? "text-[#d4944a]" : "text-[#2c1810]"
              } hover:bg-[#e4be93ff]`}
            >
              {formatTime(timeLeft)}
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-center">
              <input
                type="number"
                value={editHours}
                onChange={handleEditHoursChange}
                className="w-16 px-2 py-1 border-2 border-[#a0622d] rounded bg-white text-[#2c1810] text-center text-2xl font-bold"
                min="0"
                max="23"
                placeholder="0"
              />
              <span className="text-[#2c1810] text-2xl font-bold">:</span>
              <input
                type="number"
                value={editMinutes}
                onChange={handleEditMinutesChange}
                className="w-16 px-2 py-1 border-2 border-[#a0622d] rounded bg-white text-[#2c1810] text-center text-2xl font-bold"
                min="0"
                max="59"
                placeholder="0"
              />
            </div>
          )}
        </div>

        {/* Phase Indicator */}
        <div className="text-center mb-4">
          <div
            className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
              currentPhase === "work" ? "bg-[#d4944a] text-white" : "bg-[#5cb370] text-white"
            }`}
          >
            {currentPhase === "work" ? "Focus Time" : "Break Time"}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 mb-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex-1 bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#4a9c5a]"
            >
              Start
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex-1 bg-[#d4944a] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#c4843a]"
            >
              Pause
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex-1 bg-[#7a6b57] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#6a5b47]"
          >
            Reset
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 bg-[#c85a54] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#b84a44]"
          >
            Skip
          </button>
        </div>

        {/* Edit Time Controls */}
        {isEditingTime && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleEditTimeApply}
              className="flex-1 bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#4a9c5a]"
            >
              Apply
            </button>
            <button
              onClick={handleEditTimeCancel}
              className="flex-1 bg-[#7a6b57] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#6a5b47]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Settings */}
        <div className="mt-auto">
          <h4 className="text-[#2c1810] text-sm font-bold mb-2">Settings</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[#2c1810] text-sm">Work Duration (min)</label>
              <input
                type="number"
                value={settings.workDuration}
                onChange={(e) =>
                  dispatch(updateSettings({ workDuration: parseInt(e.target.value) || 25 }))
                }
                className="w-16 px-2 py-1 border-2 border-[#a0622d] rounded bg-white text-[#2c1810] text-sm text-center"
                min="1"
                max="60"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[#2c1810] text-sm">Break Duration (min)</label>
              <input
                type="number"
                value={5}
                disabled
                className="w-16 px-2 py-1 border-2 border-[#a0622d] rounded bg-gray-200 text-[#2c1810] text-sm text-center"
                min="1"
                max="30"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
