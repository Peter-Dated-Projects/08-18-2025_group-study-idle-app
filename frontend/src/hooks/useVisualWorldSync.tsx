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

    console.log(`🔄 Processing ${pendingUpdates.length} pending visual updates:`, pendingUpdates);
    console.log(`📊 Current plots state:`, {
      totalPlots: currentPlots.length,
      plotIndices: currentPlots.map((p) => p.index),
      plotStructures: currentPlots.map((p) => ({
        index: p.index,
        structure: p.currentStructureId,
      })),
    });

    const processVisualUpdates = async () => {
      try {
        // Process all pending visual updates
        const updatePromises = pendingUpdates.map(async (plotIndex) => {
          console.log(
            `🔍 Looking for plot ${plotIndex} in currentPlots:`,
            currentPlots.map((p) => ({ index: p.index, structureId: p.currentStructureId }))
          );
          const plot = currentPlots.find((p) => p.index === plotIndex);
          if (!plot) {
            console.warn(
              `Plot ${plotIndex} not found in current plots. Available plots:`,
              currentPlots.map((p) => p.index)
            );
            return false;
          }

          console.log(`🎯 Updating plot ${plotIndex} to structure: ${plot.currentStructureId}`);

          // Update the visual representation
          const success = await visualWorldUpdateService.updateStructurePlot(
            plotIndex,
            plot.currentStructureId
          );

          if (success) {
            // Clear the visual update from Redux state
            dispatch(clearVisualUpdate(plotIndex));
            console.log(
              `✅ Successfully updated visual for plot ${plotIndex} to ${plot.currentStructureId}`
            );
          } else {
            console.error(
              `❌ Failed to update visual for plot ${plotIndex} to ${plot.currentStructureId}`
            );
          }

          return success;
        });

        const results = await Promise.all(updatePromises);
        const successCount = results.filter(Boolean).length;

        console.log(`🎨 Processed ${successCount}/${pendingUpdates.length} visual updates`);

        if (successCount < pendingUpdates.length) {
          console.warn(
            `⚠️ Some visual updates failed. Check VisualWorldUpdateService initialization.`
          );
        }
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
