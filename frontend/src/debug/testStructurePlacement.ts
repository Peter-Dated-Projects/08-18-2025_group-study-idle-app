/**
 * Debug utility to test structure placement flow
 * This can be called from browser console to test the complete flow
 */

export const testStructurePlacement = async (userId: string, plotIndex: number, structureId: string) => {

  try {
    // Test the API endpoint directly

    const response = await fetch(`/api/level-config/${userId}/slot`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        slot_index: plotIndex,
        structure_id: structureId,
      }),
    });

    if (!response.ok) {
      console.error("❌ API call failed:", response.status, response.statusText);
      const errorData = await response.text();
      console.error("Error details:", errorData);
      return false;
    }

    const data = await response.json();

    // Test Redux action

    const { store } = await import("../store/store");
    const { placeStructureOnPlot } = await import("../store/slices/worldSlice");
    
    const result = await store.dispatch(placeStructureOnPlot({ userId, plotIndex, structureId }));
    
    if (placeStructureOnPlot.fulfilled.match(result)) {

      // Check if visual update was queued
      const state = store.getState();
      const pendingUpdates = state.world.pendingVisualUpdates;

      if (pendingUpdates.includes(plotIndex)) {

      } else {

      }
      
      return true;
    } else {
      console.error("❌ Redux action failed:", result.payload);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    return false;
  }
};

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testStructurePlacement = testStructurePlacement;
}

export default testStructurePlacement;
