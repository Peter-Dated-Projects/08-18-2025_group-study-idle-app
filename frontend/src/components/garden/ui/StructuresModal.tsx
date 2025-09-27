import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { BaseModal } from "../../common";
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
      <div className="p-5 flex flex-col gap-4">
        {isLoading ? (
          /* Loading State */
          <div className="flex justify-center items-center min-h-[200px] text-[#2c1810]">
            Loading inventory...
          </div>
        ) : (
          <>
            {/* Storage Grid */}
            <div
              className="grid gap-4 justify-items-center"
              style={{
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
              }}
            >
              {storageItems.map((item) => (
                <div key={item.id} className="relative w-full">
                  <div className="w-full aspect-square min-w-[100px]">
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
              <div className="relative w-full">
                <div
                  className="w-full aspect-square min-w-[100px] flex items-center justify-center bg-[#fdf4e8] border-2 border-[#a0622d] rounded-lg cursor-pointer transition-all duration-200 flex-col gap-1 hover:bg-[#e4be93ff] hover:border-[#2c1810]"
                  onClick={() => {
                    if (onShopClick) {
                      onShopClick();
                      dispatch(closeStructuresModal()); // Close structures modal when switching to shop
                    }
                  }}
                >
                  <BsFillCartFill className="text-3xl text-[#f6e05e]" />
                  <span className="text-[#2c1810] text-xs font-bold text-center">
                    Shop
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Info */}
            <div className="mt-4 p-4 bg-[#e4be93ff] border border-[#a0622d] rounded text-[#2c1810] text-sm text-center">
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