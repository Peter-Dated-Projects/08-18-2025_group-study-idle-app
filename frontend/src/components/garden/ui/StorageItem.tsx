import React from "react";

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
      className={`w-full h-full aspect-square p-2 bg-[#e4be93ff] border-2 border-[#a0622d] rounded flex flex-col items-center justify-center transition-all duration-200 relative box-border ${
        onClick ? "cursor-pointer hover:bg-[#fdf4e8] hover:border-[#2c1810]" : "cursor-default"
      }`}
    >
      {/* Item Image */}
      <div
        className="w-2/5 aspect-square bg-contain bg-no-repeat bg-center mb-1"
        style={{
          backgroundImage: `url(${image})`,
        }}
      />

      {/* Item Name */}
      <div className="text-[#2c1810] text-xs font-bold text-center break-words leading-tight">
        {name}
      </div>

      {/* Item Count (if > 1) */}
      {count > 1 && (
        <div className="absolute top-1 right-1 bg-[#2c1810] text-[#e4be93ff] text-xs font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
          {count}
        </div>
      )}
    </div>
  );
}
