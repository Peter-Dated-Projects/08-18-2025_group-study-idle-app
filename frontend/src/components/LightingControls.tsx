"use client";

import { useState } from "react";
import { Light } from "@/engine/LightingSystem";
import { LightPresets, getLightPresetNames } from "@/engine/LightPresets";

interface LightingControlsProps {
  onCreateLight?: (config: { x: number; y: number; preset: string }) => void;
  onToggleLight?: (lightId: string, enabled: boolean) => void;
  onRemoveLight?: (lightId: string) => void;
  lights?: Light[];
  className?: string;
}

export default function LightingControls({
  onCreateLight,
  onToggleLight,
  onRemoveLight,
  lights = [],
  className = "",
}: LightingControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState("torch");
  const [lightX, setLightX] = useState(300);
  const [lightY, setLightY] = useState(300);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCreateLight = () => {
    if (onCreateLight) {
      onCreateLight({
        x: lightX,
        y: lightY,
        preset: selectedPreset,
      });
    }
  };

  const presetNames = getLightPresetNames();

  if (!isExpanded) {
    return (
      <div className={`${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
        >
          💡 Lights
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-black bg-opacity-80 text-white p-4 rounded-lg min-w-64 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Lighting Controls</h3>
        <button onClick={() => setIsExpanded(false)} className="text-white hover:text-gray-300">
          ✕
        </button>
      </div>

      {/* Create Light Section */}
      <div className="mb-4 p-3 border border-gray-600 rounded">
        <h4 className="text-md font-semibold mb-2">Create Light</h4>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-xs text-gray-300">X Position</label>
            <input
              type="number"
              value={lightX}
              onChange={(e) => setLightX(Number(e.target.value))}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-300">Y Position</label>
            <input
              type="number"
              value={lightY}
              onChange={(e) => setLightY(Number(e.target.value))}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-xs text-gray-300">Light Type</label>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
          >
            {presetNames.map((preset) => (
              <option key={preset} value={preset}>
                {LightPresets[preset].name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreateLight}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
        >
          Add Light
        </button>
      </div>

      {/* Active Lights Section */}
      <div>
        <h4 className="text-md font-semibold mb-2">Active Lights ({lights.length})</h4>

        {lights.length === 0 ? (
          <p className="text-gray-400 text-sm">No lights active</p>
        ) : (
          <div className="max-h-40 overflow-y-auto">
            {lights.map((light) => (
              <div
                key={light.id}
                className="flex items-center justify-between bg-gray-700 p-2 rounded mb-1"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{light.id}</div>
                  <div className="text-xs text-gray-300">
                    ({Math.round(light.x)}, {Math.round(light.y)}){light.enabled ? " ✓" : " ✗"}
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => onToggleLight && onToggleLight(light.id, !light.enabled)}
                    className={`px-2 py-1 rounded text-xs ${
                      light.enabled
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    {light.enabled ? "ON" : "OFF"}
                  </button>

                  <button
                    onClick={() => onRemoveLight && onRemoveLight(light.id)}
                    className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="text-xs text-gray-400 mb-2">Quick Actions:</div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() =>
              lights.forEach((light) => onToggleLight && onToggleLight(light.id, false))
            }
            className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
          >
            All Off
          </button>
          <button
            onClick={() =>
              lights.forEach((light) => onToggleLight && onToggleLight(light.id, true))
            }
            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
          >
            All On
          </button>
        </div>
      </div>
    </div>
  );
}
