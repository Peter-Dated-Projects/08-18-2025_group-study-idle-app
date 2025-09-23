import React, { useEffect, useState } from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../constants";
import FriendsModal from "./ui/FriendsModal";
import UserProfile from "./UserProfile";
import GroupsModal from "./ui/GroupsModal";
import GlobalLeaderboardModal from "./ui/GlobalLeaderboardModal";
import GroupLeaderboardModal from "./ui/GroupLeaderboardModal";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { Structure } from "@/scripts/structures/Structure";
import StructuresModal from "./ui/StructuresModal";
import {
  clearGlobalStructureClickHandler,
  setGlobalStructureClickHandler,
} from "@/utils/globalStructureHandler";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GardenIconsProps {
  // No specific props needed for now
}

export default function GardenIcons({}: GardenIconsProps) {
  const { user } = useSessionAuth();
  const [showFriendsMenu, setShowFriendsMenu] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [showGroupLeaderboard, setShowGroupLeaderboard] = useState(false);

  // Structures modal state - moved before handleStructureClick function
  const [locked, setLocked] = useState(false);
  const [selectedStructureName, setSelectedStructureName] = useState<string>("Structure");

  // Structure click handler
  const handleStructureClick = (structure: Structure) => {
    setSelectedStructureName(structure.id);
    setLocked(true);
  };

  // Set up global structure click handler
  useEffect(() => {
    setGlobalStructureClickHandler(handleStructureClick);
    return () => {
      clearGlobalStructureClickHandler();
    };
  }, []);

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
        {/* Friends Icon */}
        <button
          onClick={() => setShowFriendsMenu(true)}
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
          }}
          title="Friends"
        >
          <i className="fas fa-user-friends"></i>
        </button>

        {/* Groups Icon */}
        <button
          onClick={() => setShowGroups(true)}
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
          }}
          title="Groups"
        >
          <i className="fas fa-users-cog"></i>
        </button>

        {/* Global Leaderboard Button */}
        <button
          onClick={() => {
            console.log("Global Leaderboard clicked");
            setShowGlobalLeaderboard(true);
          }}
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Global Leaderboard"
        >
          <i className="fas fa-trophy"></i>
        </button>

        {/* Group Leaderboard Button */}
        <button
          onClick={() => {
            console.log("Group Leaderboard clicked");
            setShowGroupLeaderboard(true);
          }}
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
            position: "relative",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Group Leaderboard"
        >
          <i className="fas fa-trophy"></i>
          <i
            className="fas fa-users"
            style={{
              position: "absolute",
              bottom: "2px",
              right: "2px",
              fontSize: "10px",
            }}
          ></i>
        </button>

        {/* User Profile Icon */}
        <button
          onClick={() => setShowUserProfile(true)}
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
          }}
          title="User Profile"
        >
          <i className="fas fa-user-circle"></i>
        </button>
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
        />
      )}

      {/* Structures Modal */}
      <StructuresModal
        locked={locked}
        onClose={() => setLocked(false)}
        structureName={selectedStructureName}
      />
    </>
  );
}
