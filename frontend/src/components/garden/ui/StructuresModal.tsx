import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import StorageItem from "./StorageItem";
import { getAllStructureConfigs } from "../../../config/structureConfigs";
import {
  fetchStructureInventory,
  placeStructureWithInventory,
  optimisticPlaceStructure,
  optimisticUpdateInventory,
  closeStructuresModal,
  resetAllStructures,
  initializePlotsFromConfig,
} from "../../../store/slices/worldSlice";
import {
  selectStructureInventory,
  selectIsWorldLoading,
  selectIsWorldSaving,
  selectSelectedPlotIndex,
  selectIsStructuresModalOpen,
  selectCurrentPlots,
  selectAvailableStructureCounts,
} from "../../../store/selectors/worldSelectors";
import { BsFillBuildingsFill, BsFillCartFill } from "react-icons/bs";
import { FaTrash } from "react-icons/fa";

interface StructuresModalProps {
  username?: string;
  accountBalance?: number;
  userId?: string; // Added userId prop
  onShopClick?: () => void; // Handler to open shop modal
}

export default function StructuresModal({
  username = "Player",
  accountBalance = 0,
  userId,
  onShopClick,
}: StructuresModalProps) {
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const inventory = useSelector(selectStructureInventory);
  const availableStructures = useSelector(selectAvailableStructureCounts);
  const currentPlots = useSelector(selectCurrentPlots);
  const isLoading = useSelector(selectIsWorldLoading);
  const isSaving = useSelector(selectIsWorldSaving);
  const selectedPlotIndex = useSelector(selectSelectedPlotIndex);
  const isModalOpen = useSelector(selectIsStructuresModalOpen);

  // Local state for window sizing and reset confirmation
  const [windowWidth, setWindowWidth] = useState(750);
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  // Get structure configurations
  const structureConfigs = getAllStructureConfigs();

  // Convert structure configs to storage items format, using available inventory data
  const storageItems = structureConfigs
    .map((config) => {
      // Try to find inventory item by either ID or name
      const availableItem = availableStructures.find((item) => 
        item.structure_name === config.id ||    // ID match (preferred)
        item.structure_name === config.name     // Name match (fallback)
      );

      return {
        id: config.id,
        image: config.image,
        name: config.name,
        count: availableItem ? availableItem.available_count : 0, // Use available count instead of total
        totalCount: availableItem ? availableItem.count : 0, // Total owned for reference
        placedCount: availableItem ? availableItem.placed_count : 0, // Currently placed
      };
    })
    .filter((item) => item.count > 0); // Only show items with available count > 0

  // Load user inventory and level config when modal opens or userId changes
  useEffect(() => {
    if (isModalOpen && userId) {
      dispatch(fetchStructureInventory(userId));
      dispatch(initializePlotsFromConfig(userId));
    }
  }, [isModalOpen, userId, dispatch]);

  // Update window width for responsive grid
  useEffect(() => {
    const updateWidth = () => {
      // Calculate available width based on modal constraints
      const availableWidth = Math.min(750, window.innerWidth * 0.8);
      setWindowWidth(availableWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Calculate grid columns based on available width
  const getGridColumns = () => {
    const itemMinWidth = 100;
    const gap = 15;
    const padding = 40; // Modal padding
    const availableWidth = windowWidth - padding;

    const maxColumns = 3; // Match ShopModal with 3 columns max
    let columns = Math.floor((availableWidth + gap) / (itemMinWidth + gap));
    columns = Math.max(1, Math.min(maxColumns, columns));

    return columns;
  };

  const handleItemClick = async (itemId: string) => {

    if (!userId) {
      console.error("No user ID provided for structure placement");
      return;
    }

    try {
      let targetPlotIndex: number;

      if (selectedPlotIndex !== null) {
        // Use the specific plot that was clicked
        targetPlotIndex = selectedPlotIndex;

      } else {
        // For now, require a selected plot (can enhance later with fallback logic)
        console.warn("No plot selected for structure placement");
        return;
      }

      // Find the structure config to get the proper name for inventory
      const structureConfig = structureConfigs.find((config) => config.id === itemId);
      if (!structureConfig) {
        console.error(`Structure config not found for ${itemId}`);
        return;
      }

      // Dispatch optimistic updates for immediate UI feedback
      dispatch(optimisticPlaceStructure({ plotIndex: targetPlotIndex, structureId: itemId }));
      dispatch(optimisticUpdateInventory({ structureName: structureConfig.name, delta: -1 }));

      // Close modal immediately for better UX
      dispatch(closeStructuresModal());

      // Perform actual placement and inventory update via Redux thunk
      const result = await dispatch(
        placeStructureWithInventory({
          userId,
          plotIndex: targetPlotIndex,
          structureId: itemId,
        })
      );

      if (placeStructureWithInventory.fulfilled.match(result)) {

      } else {
        console.error(`Failed to place ${itemId}:`, result.payload);
        // TODO: Show error message to user and revert optimistic updates
      }
    } catch (error) {
      console.error("Error placing structure:", error);
      // TODO: Show error message to user and revert optimistic updates
    }
  };

  const handleResetStructures = async () => {
    if (!userId) {
      console.error("No user ID provided for structure reset");
      return;
    }

    // First click - enter confirmation state
    if (!isResetConfirming) {
      setIsResetConfirming(true);
      return;
    }

    // Second click - execute reset
    try {
      const result = await dispatch(resetAllStructures(userId));

      if (resetAllStructures.fulfilled.match(result)) {

        // Close modal after successful reset
        dispatch(closeStructuresModal());
      } else {
        console.error("Failed to reset structures:", result.payload);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error("Error resetting structures:", error);
      // TODO: Show error message to user
    } finally {
      // Reset confirmation state
      setIsResetConfirming(false);
    }
  };

  // Reset confirmation state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setIsResetConfirming(false);
    }
  }, [isModalOpen]);

  // Auto-reset confirmation state after 5 seconds
  useEffect(() => {
    if (isResetConfirming) {
      const timeout = setTimeout(() => {
        setIsResetConfirming(false);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [isResetConfirming]);

  if (!isModalOpen) return null;

  const gridColumns = getGridColumns();

  return (
    <BaseModal
      isVisible={isModalOpen}
      onClose={() => dispatch(closeStructuresModal())}
      title="Structures Storage"
      icon={<BsFillBuildingsFill />}
      width="750px"
      maxHeight="600px"
      constrainToCanvas={true}
      zIndex={2000}
    >
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        {isLoading ? (
          /* Loading State */
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
              color: FONTCOLOR,
            }}
          >
            Loading inventory...
          </div>
        ) : (
          <>
            {/* Storage Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                gap: "15px",
                justifyItems: "center",
              }}
            >
              {storageItems.map((item) => (
                <div key={item.id} style={{ position: "relative", width: "100%" }}>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1", // Ensures 1:1 aspect ratio
                      minWidth: "100px",
                    }}
                  >
                    <StorageItem
                      key={item.id}
                      id={item.id}
                      image={item.image}
                      name={item.name}
                      count={item.count}
                      onClick={() => handleItemClick(item.id)}
                    />
                  </div>
                </div>
              ))}

              {/* Shop Access Item */}
              <div style={{ position: "relative", width: "100%" }}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1", // Ensures 1:1 aspect ratio
                    minWidth: "100px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: PANELFILL,
                    border: `2px solid ${BORDERLINE}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                  onClick={() => {
                    if (onShopClick) {
                      onShopClick();
                      dispatch(closeStructuresModal()); // Close structures modal when switching to shop
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = BORDERFILL;
                    e.currentTarget.style.borderColor = FONTCOLOR;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = PANELFILL;
                    e.currentTarget.style.borderColor = BORDERLINE;
                  }}
                >
                  <BsFillCartFill
                    style={{
                      fontSize: "2rem",
                      color: "#f6e05e", // Gold color like in GardenMenu
                    }}
                  />
                  <span
                    style={{
                      color: FONTCOLOR,
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    Shop
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Info */}
            <div
              style={{
                marginTop: "15px",
                padding: "15px",
                backgroundColor: BORDERFILL,
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "6px",
                color: FONTCOLOR,
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              <strong>Available Structures:</strong>{" "}
              {storageItems.reduce((sum, item) => sum + item.count, 0)} items
              <br />
              <strong>Total Owned:</strong>{" "}
              {storageItems.reduce((sum, item) => sum + item.totalCount, 0)} items
              <br />
              <strong>Currently Placed:</strong>{" "}
              {storageItems.reduce((sum, item) => sum + item.placedCount, 0)} items
              <br />
              <em>Only available (unused) structures are shown for placement</em>
            </div>

            {/* Reset Structures Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetStructures();
              }}
              disabled={isSaving}
              style={{
                width: "100%",
                marginTop: "15px",
                padding: "12px 20px",
                backgroundColor: isResetConfirming ? "#dc2626" : "#fca5a5", // Darker red when confirming
                border: `2px solid ${isResetConfirming ? "#b91c1c" : "#f87171"}`,
                borderRadius: "6px",
                color: isResetConfirming ? "#ffffff" : "#7f1d1d", // White text when confirming
                fontSize: "14px",
                fontWeight: "bold",
                cursor: isSaving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                opacity: isSaving ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  if (isResetConfirming) {
                    e.currentTarget.style.backgroundColor = "#b91c1c";
                    e.currentTarget.style.borderColor = "#991b1b";
                  } else {
                    e.currentTarget.style.backgroundColor = "#f87171";
                    e.currentTarget.style.borderColor = "#ef4444";
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving) {
                  if (isResetConfirming) {
                    e.currentTarget.style.backgroundColor = "#dc2626";
                    e.currentTarget.style.borderColor = "#b91c1c";
                  } else {
                    e.currentTarget.style.backgroundColor = "#fca5a5";
                    e.currentTarget.style.borderColor = "#f87171";
                  }
                }
              }}
            >
              <FaTrash style={{ fontSize: "16px" }} />
              {isSaving
                ? "Resetting..."
                : isResetConfirming
                ? "Click Again to Confirm Reset"
                : "Reset All Structures"}
            </button>
          </>
        )}
      </div>
    </BaseModal>
  );
}
