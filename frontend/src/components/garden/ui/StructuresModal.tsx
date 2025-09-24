import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import StorageItem from "./StorageItem";
import AccountHeader from "./AccountHeader";
import { getAllStructureConfigs } from "../../../config/structureConfigs";
import { BsFillBuildingsFill, BsFillCartFill } from "react-icons/bs";

interface StructuresModalProps {
  locked: boolean;
  onClose: () => void;
  structureName?: string;
  username?: string;
  accountBalance?: number;
  onShopClick?: () => void; // Handler to open shop modal
}

export default function StructuresModal({
  locked,
  onClose,
  structureName = "Structure",
  username = "Player",
  accountBalance = 0,
  onShopClick,
}: StructuresModalProps) {
  const [windowWidth, setWindowWidth] = useState(750); // Default width

  // Get structure configurations
  const structureConfigs = getAllStructureConfigs();

  // Convert structure configs to storage items format
  const storageItems = structureConfigs.map((config) => ({
    id: config.id,
    image: config.image,
    name: config.name,
    count: Math.floor(Math.random() * 3) + 1, // Random count for demo
  }));

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

  const handleItemClick = (itemId: string) => {
    console.log(`Clicked storage item: ${itemId}`);
    // Add item interaction logic here
  };

  if (!locked) return null;

  const gridColumns = getGridColumns();

  return (
    <BaseModal
      isVisible={locked}
      onClose={onClose}
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
                  onClose(); // Close structures modal when switching to shop
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
      </div>
    </BaseModal>
  );
}
