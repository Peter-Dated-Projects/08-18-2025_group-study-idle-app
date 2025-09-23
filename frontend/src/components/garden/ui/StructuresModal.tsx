import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import StorageItem from "./StorageItem";
import { getAllStructureConfigs } from "../../../config/structureConfigs";

interface StructuresModalProps {
  locked: boolean;
  onClose: () => void;
  structureName?: string;
}

export default function StructuresModal({
  locked,
  onClose,
  structureName = "Structure",
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

    const maxColumns = 4;
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
      title="🏗️ Structures Storage"
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
            <StorageItem
              key={item.id}
              id={item.id}
              image={item.image}
              name={item.name}
              count={item.count}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
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
