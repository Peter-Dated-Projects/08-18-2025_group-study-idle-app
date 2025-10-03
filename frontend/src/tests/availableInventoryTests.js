/**
 * Test cases for available inventory calculation logic
 * These tests verify that the available structure count calculation works correctly
 */

import { getAllStructureConfigs } from "../src/config/structureConfigs";

// Mock data similar to what we'd get from Redux state
const mockStructureInventory = [
  { structure_name: "Chicken Coop", count: 3 },
  { structure_name: "Mailbox", count: 2 },
  { structure_name: "Water Well", count: 1 },
  { structure_name: "Workbench", count: 2 }
];

const mockCurrentPlots = [
  { index: 0, currentStructureId: "mailbox", position: { x: 100, y: 100 } },
  { index: 1, currentStructureId: "chicken-coop", position: { x: 200, y: 100 } },
  { index: 2, currentStructureId: "empty", position: { x: 300, y: 100 } },
  { index: 3, currentStructureId: "empty", position: { x: 400, y: 100 } },
  { index: 4, currentStructureId: "water-well", position: { x: 500, y: 100 } },
  { index: 5, currentStructureId: "empty", position: { x: 600, y: 100 } },
  { index: 6, currentStructureId: "chicken-coop", position: { x: 700, y: 100 } }
];

// Simulate the selector logic
function calculateAvailableStructures(inventory, currentPlots) {
  const structureConfigs = getAllStructureConfigs();
  
  // Count placed structures
  const placedCounts = {};
  currentPlots.forEach((plot) => {
    if (plot.currentStructureId && plot.currentStructureId !== "empty") {
      const structureId = plot.currentStructureId;
      placedCounts[structureId] = (placedCounts[structureId] || 0) + 1;
    }
  });

  // Calculate available counts
  return inventory.map((inventoryItem) => {
    const structureConfig = structureConfigs.find(
      (config) => config.name === inventoryItem.structure_name
    );
    
    if (!structureConfig) {
      return {
        structure_name: inventoryItem.structure_name,
        count: inventoryItem.count,
        available_count: inventoryItem.count,
        placed_count: 0,
      };
    }

    const placedCount = placedCounts[structureConfig.id] || 0;
    const availableCount = Math.max(0, inventoryItem.count - placedCount);

    return {
      structure_name: inventoryItem.structure_name,
      count: inventoryItem.count,
      available_count: availableCount,
      placed_count: placedCount,
    };
  });
}

// Test cases
export function runAvailableInventoryTests() {
  console.log("🧪 Running Available Inventory Tests");
  
  const result = calculateAvailableStructures(mockStructureInventory, mockCurrentPlots);
  
  console.log("Test Results:");
  console.table(result);
  
  // Expected results:
  // Chicken Coop: 3 total, 2 placed, 1 available
  // Mailbox: 2 total, 1 placed, 1 available  
  // Water Well: 1 total, 1 placed, 0 available
  // Workbench: 2 total, 0 placed, 2 available
  
  const tests = [
    {
      name: "Chicken Coop available count",
      expected: 1,
      actual: result.find(r => r.structure_name === "Chicken Coop")?.available_count
    },
    {
      name: "Mailbox available count", 
      expected: 1,
      actual: result.find(r => r.structure_name === "Mailbox")?.available_count
    },
    {
      name: "Water Well available count",
      expected: 0, 
      actual: result.find(r => r.structure_name === "Water Well")?.available_count
    },
    {
      name: "Workbench available count",
      expected: 2,
      actual: result.find(r => r.structure_name === "Workbench")?.available_count
    }
  ];
  
  tests.forEach(test => {
    const passed = test.expected === test.actual;
    console.log(`${passed ? "✅" : "❌"} ${test.name}: expected ${test.expected}, got ${test.actual}`);
  });
  
  return result;
}

// Uncomment to run tests in browser console
// runAvailableInventoryTests();