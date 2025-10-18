import React from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";

interface GardenIconProps {
  onClick: () => void;
  title: string;
  iconClassName: string;
  hoverEffect?: "scale" | "none";
  children?: React.ReactNode;
  id?: string;
}

const GardenIcon: React.FC<GardenIconProps> = ({
  onClick,
  title,
  iconClassName,
  hoverEffect = "none",
  children,
  id,
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = PANELFILL;
    if (hoverEffect === "scale") {
      e.currentTarget.style.transform = "scale(1.05)";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = BORDERFILL;
    if (hoverEffect === "scale") {
      e.currentTarget.style.transform = "scale(1)";
    }
  };

  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        width: "50px",
        height: "50px",
        backgroundColor: BORDERFILL,
        border: `3px solid ${BORDERLINE}`,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "20px",
        color: FONTCOLOR,
        transition: "all 0.2s ease",
        position: "relative", // for children positioning
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={title}
    >
      <i className={iconClassName}></i>
      {children}
    </button>
  );
};

export default GardenIcon;
