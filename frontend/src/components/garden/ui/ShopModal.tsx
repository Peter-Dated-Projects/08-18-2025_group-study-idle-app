import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import StorageItem from "./StorageItem";
import AccountHeader from "./AccountHeader";
import { getAllStructureConfigs } from "../../../config/structureConfigs";
import { purchaseStructure } from "../../../services/inventoryService";
import { BsFillCartFill } from "react-icons/bs";
import { useAppDispatch, useAppSelector, useWallet, useInventory } from "../../../store/hooks";
import { useSessionAuth } from "../../../hooks/useSessionAuth";
import { updateBalance, fetchBalance } from "../../../store/slices/walletSlice";
import { fetchInventory } from "../../../store/slices/inventorySlice";
import { useGlobalNotification } from "../../NotificationProvider";

interface ShopModalProps {
  locked: boolean;
  onClose: () => void;
}

export default function ShopModal({ locked, onClose }: ShopModalProps) {
  const dispatch = useAppDispatch();
  const { user } = useSessionAuth();
  const { balance, isLoading: isWalletLoading, error: walletError } = useWallet();
  const { structures, isLoading: isInventoryLoading, error: inventoryError } = useInventory();
  const { addNotification } = useGlobalNotification();

  const [windowWidth, setWindowWidth] = useState(750); // Default width
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

  // Load wallet balance and inventory when modal opens
  useEffect(() => {
    if (locked && user?.userId) {
      dispatch(fetchBalance(user.userId));
      dispatch(fetchInventory(user.userId));
    }
  }, [locked, user?.userId, dispatch]);

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

  const handleItemClick = async (itemId: string, itemName: string, itemPrice: number) => {
    if (isPurchasing || !user?.userId) {
      return;
    }

    if (balance >= itemPrice) {
      setIsPurchasing(true);
      try {
        const result = await purchaseStructure(user.userId, itemId, itemPrice);

        if (result.success) {
          // Update balance in Redux store
          if (result.balance) {

            dispatch(updateBalance(result.balance.bank_value));
          }

          // Refresh inventory to get updated counts
          dispatch(fetchInventory(user.userId));

        } else {
          console.error(`Failed to purchase ${itemName}:`, result.message);
        }
      } catch (error) {
        console.error(`Error purchasing ${itemName}:`, error);
      } finally {
        setIsPurchasing(false);
      }
    } else {

    }
  };

  if (!locked) return null;

  // Don't show modal if user is not authenticated
  if (!user?.userId) {
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
            padding: "40px",
            textAlign: "center",
            color: FONTCOLOR,
          }}
        >
          Please log in to access the shop.
        </div>
      </BaseModal>
    );
  }

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
        <AccountHeader
          username={user?.userName || user?.userEmail || "Player"}
          accountBalance={balance}
        />

        {/* Error States */}
        {(walletError || inventoryError) && (
          <div
            style={{
              padding: "15px",
              textAlign: "center",
              color: "#FF5722",
              backgroundColor: BORDERFILL,
              border: "1px solid #FF5722",
              borderRadius: "6px",
              marginBottom: "15px",
              fontSize: "14px",
            }}
          >
            Error loading shop data: {walletError || inventoryError}
          </div>
        )}

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
                  canPurchase={balance >= item.price && !isPurchasing && !isWalletLoading}
                  onClick={() => handleItemClick(item.id, item.name, item.price)}
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
