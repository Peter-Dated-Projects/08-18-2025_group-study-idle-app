# Available Inventory Feature Implementation

## Overview

This feature implements a system that calculates and displays the **available (unused) structures** in the inventory modal, taking into account structures that are currently placed in the level configuration.

## Problem Solved

Previously, the structures modal showed the total count of structures owned, regardless of whether they were currently placed in the world. This was misleading because users couldn't distinguish between structures they could place and structures already in use.

## Solution Architecture

### 1. Enhanced Data Structure (`AvailableStructureItem`)

Created a new interface in `worldSelectors.ts` that tracks:
- `structure_name`: The display name (e.g., "Chicken Coop")
- `count`: Total owned structures
- `available_count`: Available to place (total - currently placed)
- `placed_count`: Currently placed in level config

### 2. Smart Selector (`selectAvailableStructureCounts`)

**Location**: `/frontend/src/store/selectors/worldSelectors.ts`

**Logic**:
1. Counts how many of each structure type are currently placed in the 7 level config slots
2. Maps structure IDs (e.g., "chicken-coop") to structure names (e.g., "Chicken Coop") using `structureConfigs`
3. Calculates available count: `Math.max(0, inventory_count - placed_count)`
4. Returns enhanced data with usage breakdown

```typescript
export const selectAvailableStructureCounts = (state: RootState): AvailableStructureItem[]
```

### 3. Updated StructuresModal Logic

**Location**: `/frontend/src/components/garden/ui/StructuresModal.tsx`

**Changes**:
- Uses `selectAvailableStructureCounts` instead of raw inventory
- Displays only structures with `available_count > 0`
- Shows comprehensive statistics in the info panel:
  - Available structures (can be placed)
  - Total owned structures  
  - Currently placed structures

## Data Flow

```
1. Level Config API → currentPlots (array of plot structures)
   └─ ["mailbox", "chicken-coop", "empty", "empty", "water-well", "empty", "empty"]

2. Inventory API → structureInventory (array of owned structures)
   └─ [
       { structure_name: "Mailbox", count: 3 },
       { structure_name: "Chicken Coop", count: 2 },
       { structure_name: "Water Well", count: 1 }
     ]

3. Structure Configs → Mapping between IDs and names
   └─ { id: "mailbox", name: "Mailbox" }, 
      { id: "chicken-coop", name: "Chicken Coop" }

4. Selector Logic → Count placed structures
   └─ placedCounts = { "mailbox": 1, "chicken-coop": 1, "water-well": 1 }

5. Final Calculation → Available counts
   └─ [
       { structure_name: "Mailbox", count: 3, available_count: 2, placed_count: 1 },
       { structure_name: "Chicken Coop", count: 2, available_count: 1, placed_count: 1 },
       { structure_name: "Water Well", count: 1, available_count: 0, placed_count: 1 }
     ]

6. UI Display → Only show structures with available_count > 0
   └─ Shows: Mailbox (2), Chicken Coop (1)
   └─ Hides: Water Well (0 available)
```

## Key Benefits

1. **Accurate Inventory Display**: Users only see structures they can actually place
2. **Better UX**: No confusion about which structures are available vs in-use
3. **Real-time Updates**: Automatically updates when structures are placed/removed
4. **Comprehensive Info**: Shows total owned, available, and placed counts
5. **No Backend Changes**: Uses existing APIs and data structures

## Testing & Debugging

The implementation includes comprehensive logging for debugging:
- Logs current plot states and structure placements
- Tracks calculation steps for each structure type  
- Shows final available counts

Remove console logging from production by removing the debug statements in:
- `selectAvailableStructureCounts` selector
- `StructuresModal` useEffect

## Backward Compatibility

- No changes to existing backend APIs
- No changes to data storage formats
- Uses existing Redux state structure
- Maintains all existing functionality

## Future Enhancements

1. **Visual Indicators**: Add icons to show which structures are placed where
2. **Placement Suggestions**: Highlight empty plots when selecting structures
3. **Usage Analytics**: Track which structures are used most frequently
4. **Batch Operations**: Allow moving multiple structures at once