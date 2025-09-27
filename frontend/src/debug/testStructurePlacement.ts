/**
 * Debug utility to test structure placement flow
 * This can be called from browser console to test the complete flow
 */

export const testStructurePlacement = async (userId: string, plotIndex: number, structureId: string) => {
  console.log(`🧪 Testing structure placement: ${structureId} on plot ${plotIndex} for user ${userId}`);
  
  try {
    // Test the API endpoint directly
    console.log("1. Testing API endpoint...");
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
    console.log("✅ API call successful:", data);

    // Test Redux action
    console.log("2. Testing Redux action...");
    const { store } = await import("../store/store");
    const { placeStructureOnPlot } = await import("../store/slices/worldSlice");
    
    const result = await store.dispatch(placeStructureOnPlot({ userId, plotIndex, structureId }));
    
    if (placeStructureOnPlot.fulfilled.match(result)) {
      console.log("✅ Redux action successful:", result.payload);
      
      // Check if visual update was queued
      const state = store.getState();
      const pendingUpdates = state.world.pendingVisualUpdates;
      console.log("📋 Pending visual updates:", pendingUpdates);
      
      if (pendingUpdates.includes(plotIndex)) {
        console.log("✅ Plot added to visual update queue");
      } else {
        console.log("❌ Plot NOT added to visual update queue");
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
