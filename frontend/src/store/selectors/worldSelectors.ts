import type { RootState } from "../store";
import type { WorldState } from "../slices/worldSlice";

// World selectors
export const selectWorldData = (state: RootState) => (state.world as WorldState).worldData;
export const selectIsWorldLoading = (state: RootState) => (state.world as WorldState).isLoading;
export const selectWorldError = (state: RootState) => (state.world as WorldState).error;
export const selectCurrentPlots = (state: RootState) => (state.world as WorldState).currentPlots;
export const selectSelectedPlotIndex = (state: RootState) =>
  (state.world as WorldState).selectedPlotIndex;
export const selectIsStructuresModalOpen = (state: RootState) =>
  (state.world as WorldState).isStructuresModalOpen;
export const selectHoveredSlot = (state: RootState) => (state.world as WorldState).hoveredSlot;
export const selectPendingPlacements = (state: RootState) =>
  (state.world as WorldState).pendingPlacements;
export const selectPendingRemovals = (state: RootState) =>
  (state.world as WorldState).pendingRemovals;
export const selectPendingVisualUpdates = (state: RootState) =>
  (state.world as WorldState).pendingVisualUpdates;
export const selectIsWorldSaving = (state: RootState) => (state.world as WorldState).isSaving;
export const selectStructureInventory = (state: RootState) =>
  (state.world as WorldState).structureInventory;

// Computed selectors
export const selectPlotByIndex = (index: number) => (state: RootState) =>
  (state.world as WorldState).currentPlots.find((plot) => plot.index === index);

export const selectHasSelectedPlot = (state: RootState) =>
  (state.world as WorldState).selectedPlotIndex !== null;

export const selectSelectedPlot = (state: RootState) => {
  const worldState = state.world as WorldState;
  return worldState.selectedPlotIndex !== null
    ? worldState.currentPlots.find((plot) => plot.index === worldState.selectedPlotIndex)
    : undefined;
};

export const selectHasPendingUpdates = (state: RootState) =>
  (state.world as WorldState).pendingVisualUpdates.length > 0;
