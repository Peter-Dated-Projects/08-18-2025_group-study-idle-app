import React from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";

interface StorageItemProps {
  id: string;
  image: string;
  name: string;
  count?: number;
  onClick?: () => void;
}

export default function StorageItem({ id, image, name, count = 1, onClick }: StorageItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1", // Ensures 1:1 aspect ratio
        padding: "8px",
        backgroundColor: BORDERFILL,
        border: `2px solid ${BORDERLINE}`,
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = PANELFILL;
          e.currentTarget.style.borderColor = FONTCOLOR;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = BORDERFILL;
          e.currentTarget.style.borderColor = BORDERLINE;
        }
      }}
    >
      {/* Item Image */}
      <div
        style={{
          width: "40%",
          aspectRatio: "1",
          backgroundImage: `url(${image})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          marginBottom: "5px",
        }}
      />

      {/* Item Name */}
      <div
        style={{
          color: FONTCOLOR,
          fontSize: "10px",
          fontWeight: "bold",
          textAlign: "center",
          wordBreak: "break-word",
          lineHeight: "1.1",
        }}
      >
        {name}
      </div>

      {/* Item Count (if > 1) */}
      {count > 1 && (
        <div
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            backgroundColor: FONTCOLOR,
            color: BORDERFILL,
            fontSize: "10px",
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: "10px",
            minWidth: "16px",
            textAlign: "center",
          }}
        >
          {count}
        </div>
      )}
    </div>
  );
}
