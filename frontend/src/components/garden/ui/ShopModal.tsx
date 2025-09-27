import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import StorageItem from "./StorageItem";
import AccountHeader from "./AccountHeader";
import { getAllStructureConfigs } from "../../../config/structureConfigs";
import { purchaseStructure } from "../../../services/inventoryService";
import { BsFillCartFill } from "react-icons/bs";

interface ShopModalProps {
  locked: boolean;
  onClose: () => void;
  username?: string;
  accountBalance?: number;
  userId?: string;
  onBalanceUpdate?: (newBalance: number) => void;
}

export default function ShopModal({
  locked,
  onClose,
  username = "Player",
  accountBalance = 0,
  userId = "test-user",
  onBalanceUpdate,
}: ShopModalProps) {
  const [windowWidth, setWindowWidth] = useState(750); // Default width
  const [currentBalance, setCurrentBalance] = useState(accountBalance);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Get structure configurations (these would be shop items)
  const structureConfigs = getAllStructureConfigs();

  // Convert structure configs to shop items format with prices
  const shopItems = structureConfigs.map((config, index) => ({
    id: config.id,
    image: config.image,
    name: config.name,
    price: (index + 1) * 10, // Sample pricing logic
    count: 1, // Shop items don't show count, but we need it for StorageItem component
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

  // Fixed 3 columns max with responsive sizing
  const getGridColumns = () => {
    const itemMinWidth = 100;
    const gap = 15;
    const padding = 40; // Modal padding
    const availableWidth = windowWidth - padding;

    const maxColumns = 3; // Fixed 3 columns max as per requirements
    let columns = Math.floor((availableWidth + gap) / (itemMinWidth + gap));
    columns = Math.max(1, Math.min(maxColumns, columns));

    return columns;
  };

  const handleItemClick = async (itemId: string, itemPrice: number) => {
    if (isPurchasing) return;

    if (currentBalance >= itemPrice) {
      setIsPurchasing(true);
      try {
        const result = await purchaseStructure(userId, itemId, itemPrice);
        if (result.success && result.data?.balance) {
          const newBalance = result.data.balance.bank_value;
          setCurrentBalance(newBalance);
          if (onBalanceUpdate) {
            onBalanceUpdate(newBalance);
          }
          console.log(`Successfully purchased ${itemId} for ${itemPrice} coins`);
        } else {
          console.error(`Failed to purchase ${itemId}:`, result.message);
          alert(`Failed to purchase ${itemId}: ${result.message || "Unknown error"}`);
        }
      } catch (error) {
        console.error(`Error purchasing ${itemId}:`, error);
        alert(`Error purchasing ${itemId}. Please try again.`);
      } finally {
        setIsPurchasing(false);
      }
    } else {
      console.log(`Insufficient funds to purchase ${itemId}`);
      alert(`Insufficient funds! You need ${itemPrice} coins but only have ${currentBalance}.`);
    }
  };

  if (!locked) return null;

  const gridColumns = getGridColumns();

  return (
    <BaseModal
      isVisible={locked}
      onClose={onClose}
      title="Item Shop"
      icon={<BsFillCartFill />}
      width="750px"
      maxHeight="600px"
      constrainToCanvas={true}
      zIndex={2000}
    >
      <div className="p-5 flex flex-col gap-4">
        {/* Header with username and balance */}
        <AccountHeader username={username} accountBalance={currentBalance} />

        {/* Shop Grid */}
        <div
          className="grid gap-4 justify-items-center"
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          }}
        >
          {shopItems.map((item) => (
            <div key={item.id} className="relative w-full">
              <div
                className="w-full aspect-square min-w-[100px]"
              >
                <ShopItem
                  id={item.id}
                  image={item.image}
                  name={item.name}
                  price={item.price}
                  canPurchase={currentBalance >= item.price && !isPurchasing}
                  onClick={() => handleItemClick(item.id, item.price)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Shop Info */}
        <div className="mt-4 p-4 bg-[#e4be93ff] border border-[#a0622d] rounded text-[#2c1810] text-sm text-center">
          <strong>Item Shop:</strong> Purchase structures and items for your garden
          <br />
          <em>Click on items to purchase them (if you have enough coins)</em>
        </div>
      </div>
    </BaseModal>
  );
}

// ShopItem component - similar to StorageItem but with price display
interface ShopItemProps {
  id: string;
  image: string;
  name: string;
  price: number;
  canPurchase: boolean;
  onClick?: () => void;
}

function ShopItem({ id, image, name, price, canPurchase, onClick }: ShopItemProps) {
  return (
    <div
      onClick={onClick}
      className={`w-full h-full aspect-square p-2 bg-[#e4be93ff] border-2 border-[#a0622d] rounded flex flex-col items-center justify-center transition-all duration-200 relative box-border ${
        onClick ? "cursor-pointer" : "cursor-default"
      } ${canPurchase ? "opacity-100" : "opacity-60"} ${
        onClick && canPurchase ? "hover:bg-[#fdf4e8] hover:border-[#2c1810]" : ""
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
      <div className="text-[#2c1810] text-xs font-bold text-center break-words mb-0.5 leading-tight">
        {name}
      </div>

      {/* Price */}
      <div
        className={`text-xs font-bold text-center ${
          canPurchase ? "text-[#4CAF50]" : "text-[#FF5722]"
        }`}
      >
        {price} coins
      </div>

      {/* Insufficient funds overlay */}
      {!canPurchase && (
        <div className="absolute top-1 right-1 bg-[#FF5722] text-white text-xs font-bold px-1 py-0.5 rounded">
          !
        </div>
      )}
    </div>
  );
}
