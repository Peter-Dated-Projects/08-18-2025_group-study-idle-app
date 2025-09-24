import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
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
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        {/* Header with username and balance */}
        <AccountHeader username={username} accountBalance={currentBalance} />

        {/* Shop Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
            gap: "15px",
            justifyItems: "center",
          }}
        >
          {shopItems.map((item) => (
            <div key={item.id} style={{ position: "relative", width: "100%" }}>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1", // Ensures 1:1 aspect ratio
                  minWidth: "100px",
                }}
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
        opacity: canPurchase ? 1 : 0.6,
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        if (onClick && canPurchase) {
          e.currentTarget.style.backgroundColor = PANELFILL;
          e.currentTarget.style.borderColor = FONTCOLOR;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick && canPurchase) {
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
          marginBottom: "2px",
          lineHeight: "1.1",
        }}
      >
        {name}
      </div>

      {/* Price */}
      <div
        style={{
          color: canPurchase ? "#4CAF50" : "#FF5722",
          fontSize: "9px",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        {price} coins
      </div>

      {/* Insufficient funds overlay */}
      {!canPurchase && (
        <div
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            backgroundColor: "#FF5722",
            color: "white",
            fontSize: "8px",
            fontWeight: "bold",
            padding: "1px 4px",
            borderRadius: "3px",
          }}
        >
          !
        </div>
      )}
    </div>
  );
}
