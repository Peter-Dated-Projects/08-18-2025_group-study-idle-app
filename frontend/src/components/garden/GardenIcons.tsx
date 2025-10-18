import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store/store";
import FriendsModal from "./ui/FriendsModal";
import UserProfile from "./UserProfileModal";
import GroupsModal from "./ui/GroupsModal";
import GlobalLeaderboardModal from "./ui/GlobalLeaderboardModal";
import GroupLeaderboardModal from "./ui/GroupLeaderboardModal";
import ShopModal from "./ui/ShopModal";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { Structure } from "@/scripts/structures/Structure";
import StructuresModal from "./ui/StructuresModal";
import { openStructuresModal, selectPlot } from "../../store/slices/worldSlice";
import {
  clearGlobalStructureClickHandler,
  setGlobalStructureClickHandler,
} from "@/utils/globalStructureHandler";
import GardenIcon from "./ui/GardenIcon";
import { useReduxSubscription } from "@/store/hooks/useReduxSubscription";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GardenIconsProps {
  onShopModalOpen?: (openFunction: () => void) => void; // Callback to provide shop opener to parent
}

export default function GardenIcons({ onShopModalOpen }: GardenIconsProps) {
  const { user } = useSessionAuth();
  const dispatch = useDispatch<AppDispatch>();
  const { user: reduxUser } = useSelector((state: RootState) => state.auth);

  // Eagerly fetch subscription status when component mounts
  // This ensures the data is cached before UserProfileModal opens
  useReduxSubscription();

  const [showFriendsMenu, setShowFriendsMenu] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [showGroupLeaderboard, setShowGroupLeaderboard] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);

  // Structure click handler
  const handleStructureClick = (structure: Structure) => {
    // Try to determine which plot this structure corresponds to
    const plotIndex = findPlotIndexForStructure(structure);
    dispatch(selectPlot(plotIndex));
    dispatch(openStructuresModal());
  };

  // Helper function to determine plot index from structure
  const findPlotIndexForStructure = (structure: Structure): number => {
    // Extract plot index from structure ID if it contains the information
    // For now, let's try a simpler approach by looking at the structure position
    // and comparing it with known plot layout from DefaultWorld

    const DESIGN_WIDTH = 1920;
    const DESIGN_HEIGHT = 1080;
    const centerX = DESIGN_WIDTH / 2; // 960
    const centerY = DESIGN_HEIGHT / 2; // 540
    const plotDistance = 200; // pixels from center (from DefaultWorld)

    // Expected plot positions (matching DefaultWorld.tsx)
    const expectedPlotPositions = [
      { x: centerX - plotDistance * 2, y: centerY + plotDistance * 0.5 }, // Plot 0
      { x: centerX - plotDistance * 1.5, y: centerY - plotDistance * 0.5 }, // Plot 1
      { x: centerX - plotDistance, y: centerY - plotDistance * 1.5 }, // Plot 2
      { x: centerX, y: centerY - plotDistance * 1.5 }, // Plot 3
      { x: centerX + plotDistance, y: centerY - plotDistance * 1.5 }, // Plot 4
      { x: centerX + plotDistance * 1.5, y: centerY - plotDistance * 0.5 }, // Plot 5
      { x: centerX + plotDistance * 2, y: centerY + plotDistance * 0.5 }, // Plot 6
    ];

    // Find closest plot position to structure position
    let closestPlotIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < expectedPlotPositions.length; i++) {
      const distance = Math.sqrt(
        Math.pow(structure.position.x - expectedPlotPositions[i].x, 2) +
          Math.pow(structure.position.y - expectedPlotPositions[i].y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPlotIndex = i;
      }
    }

    return closestPlotIndex;
  };

  // Set up global structure click handler
  useEffect(() => {
    setGlobalStructureClickHandler(handleStructureClick);
    return () => {
      clearGlobalStructureClickHandler();
    };
  }, []);

  // Provide shop modal opener to parent
  useEffect(() => {
    if (onShopModalOpen) {
      onShopModalOpen(() => setShowShopModal(true));
    }
  }, [onShopModalOpen]);

  // Early return AFTER all hooks have been called
  if (!user) return null;

  // Convert user session to the format expected by UserProfile
  const userProfileData = {
    id: user.userId,
    email: user.userEmail,
    given_name: user.userName?.split(" ")[0] || undefined,
    family_name: user.userName?.split(" ").slice(1).join(" ") || undefined,
  };

  return (
    <>
      {/* Icon Container - positioned absolute in top-right of canvas */}
      <div
        style={{
          position: "absolute",
          top: "15px",
          right: "15px",
          display: "flex",
          gap: "10px",
          zIndex: 1000,
        }}
      >
        {/* Friends */}
        <GardenIcon
          onClick={() => setShowFriendsMenu(true)}
          title="Friends"
          iconClassName="fas fa-user-friends"
        />

        {/* Groups */}
        <GardenIcon
          onClick={() => setShowGroups(true)}
          title="Groups"
          iconClassName="fas fa-users-cog"
        />

        {/* Global Leaderboard */}
        <GardenIcon
          onClick={() => {
            setShowGlobalLeaderboard(true);
          }}
          title="Global Leaderboard"
          iconClassName="fas fa-trophy"
        />

        {/* Group Leaderboard */}
        <GardenIcon
          onClick={() => {
            setShowGroupLeaderboard(true);
          }}
          title="Group Leaderboard"
          iconClassName="fas fa-trophy"
        >
          <i
            className="fas fa-users"
            style={{
              position: "absolute",
              bottom: "2px",
              right: "2px",
              fontSize: "10px",
            }}
          />
        </GardenIcon>

        <GardenIcon
          id="user-profile-button"
          onClick={() => setShowUserProfile(true)}
          title="User Profile"
          iconClassName="fas fa-user-circle"
        />
      </div>

      {/* Modals */}
      {showFriendsMenu && (
        <FriendsModal
          isVisible={showFriendsMenu}
          onClose={() => setShowFriendsMenu(false)}
          userId={user.userId}
        />
      )}

      {showUserProfile && (
        <UserProfile
          isVisible={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          user={userProfileData}
        />
      )}

      {showGroups && <GroupsModal isVisible={showGroups} onClose={() => setShowGroups(false)} />}

      {showGlobalLeaderboard && (
        <GlobalLeaderboardModal
          isVisible={showGlobalLeaderboard}
          onClose={() => setShowGlobalLeaderboard(false)}
        />
      )}

      {showGroupLeaderboard && (
        <GroupLeaderboardModal
          isVisible={showGroupLeaderboard}
          onClose={() => setShowGroupLeaderboard(false)}
          onOpenGroupsModal={() => setShowGroups(true)}
        />
      )}

      {/* Structures Modal */}
      <StructuresModal userId={user.userId} onShopClick={() => setShowShopModal(true)} />

      {/* Shop Modal */}
      {showShopModal && (
        <ShopModal locked={showShopModal} onClose={() => setShowShopModal(false)} />
      )}
    </>
  );
}
