import React from "react";

interface GardenIconProps {
  onClick: () => void;
  title: string;
  iconClassName: string;
  hoverEffect?: "scale" | "none";
  children?: React.ReactNode;
}

const GardenIcon: React.FC<GardenIconProps> = ({
  onClick,
  title,
  iconClassName,
  hoverEffect = "none",
  children,
}) => {
  const hoverClasses = hoverEffect === "scale" 
    ? "hover:bg-[#fdf4e8] hover:scale-105" 
    : "hover:bg-[#fdf4e8]";

  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 bg-[#e4be93ff] border-3 border-[#a0622d] rounded-lg flex items-center justify-center cursor-pointer text-xl text-[#2c1810] transition-all duration-200 relative ${hoverClasses}`}
      title={title}
    >
      <i className={iconClassName}></i>
      {children}
    </button>
  );
};

export default GardenIcon;
