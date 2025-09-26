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
} from "../../../store/slices/worldSlice";
import {
  selectStructureInventory,
  selectIsWorldLoading,
  selectIsWorldSaving,
  selectSelectedPlotIndex,
  selectIsStructuresModalOpen,
} from "../../../store/selectors/worldSelectors";
import { BsFillBuildingsFill, BsFillCartFill } from "react-icons/bs";

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
  const isLoading = useSelector(selectIsWorldLoading);
  const isSaving = useSelector(selectIsWorldSaving);
  const selectedPlotIndex = useSelector(selectSelectedPlotIndex);
  const isModalOpen = useSelector(selectIsStructuresModalOpen);

  // Local state for window sizing
  const [windowWidth, setWindowWidth] = useState(750);

  // Get structure configurations
  const structureConfigs = getAllStructureConfigs();

  // Convert structure configs to storage items format, using actual inventory data
  const storageItems = structureConfigs
    .map((config) => {
      const inventoryItem = inventory.find((item) => item.structure_name === config.id);
      return {
        id: config.id,
        image: config.image,
        name: config.name,
        count: inventoryItem ? inventoryItem.count : 0, // Use actual count or 0 if not in inventory
      };
    })
    .filter((item) => item.count > 0); // Only show items with count > 0

  // Load user inventory when modal opens or userId changes
  useEffect(() => {
    if (isModalOpen && userId) {
      dispatch(fetchStructureInventory(userId));
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
    console.log(`Clicked storage item: ${itemId}`);

    if (!userId) {
      console.error("No user ID provided for structure placement");
      return;
    }

    try {
      let targetPlotIndex: number;

      if (selectedPlotIndex !== null) {
        // Use the specific plot that was clicked
        targetPlotIndex = selectedPlotIndex;
        console.log(`Placing ${itemId} on selected plot ${targetPlotIndex}`);
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
        console.log(`Successfully placed ${itemId} on plot ${targetPlotIndex}`);
      } else {
        console.error(`Failed to place ${itemId}:`, result.payload);
        // TODO: Show error message to user and revert optimistic updates
      }
    } catch (error) {
      console.error("Error placing structure:", error);
      // TODO: Show error message to user and revert optimistic updates
    }
  };

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
              <strong>Storage Capacity:</strong>{" "}
              {storageItems.reduce((sum, item) => sum + item.count, 0)} items
              <br />
              <em>Click on items to place them in your garden</em>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
}
