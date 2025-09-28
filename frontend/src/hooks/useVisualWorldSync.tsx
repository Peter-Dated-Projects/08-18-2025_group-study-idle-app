import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "../store/store";
import { selectPendingVisualUpdates, selectCurrentPlots } from "../store/selectors/worldSelectors";
import { clearVisualUpdate } from "../store/slices/worldSlice";
import { visualWorldUpdateService } from "../utils/visualWorldUpdateService";

/**
 * Hook to sync Redux world state changes with PIXI visual updates
 * This bridges the Redux state management with the PIXI rendering system
 */
export const useVisualWorldSync = () => {
  const dispatch = useDispatch<AppDispatch>();
  const pendingUpdates = useSelector(selectPendingVisualUpdates);
  const currentPlots = useSelector(selectCurrentPlots);

  useEffect(() => {
    if (pendingUpdates.length === 0) return;

    const processVisualUpdates = async () => {
      try {
        // Process all pending visual updates
        const updatePromises = pendingUpdates.map(async (plotIndex) => {
          const plot = currentPlots.find((p) => p.index === plotIndex);
          if (!plot) {
            return false;
          }

          // Update the visual representation
          const success = await visualWorldUpdateService.updateStructurePlot(
            plotIndex,
            plot.currentStructureId
          );

          if (success) {
            // Clear the visual update from Redux state
            dispatch(clearVisualUpdate(plotIndex));
          }

          return success;
        });

        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Error processing visual updates:", error);
      }
    };

    // Debounce the visual updates to avoid excessive re-renders
    const timeoutId = setTimeout(processVisualUpdates, 100);

    return () => clearTimeout(timeoutId);
  }, [pendingUpdates, currentPlots, dispatch]);
};

/**
 * Component to provide visual world synchronization
 * Place this component in your app tree where world updates should be active
 */
export const VisualWorldSync: React.FC = () => {
  useVisualWorldSync();
  return null; // This is a headless component
};
