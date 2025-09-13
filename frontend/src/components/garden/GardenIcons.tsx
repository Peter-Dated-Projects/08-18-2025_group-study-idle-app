import React, { useState } from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../constants";
import FriendsMenu from "./ui/FriendsMenu";
import UserProfile from "./UserProfile";
import GroupsModal from "./ui/GroupsModal";
import { useSessionAuth } from "@/hooks/useSessionAuth";

interface GardenIconsProps {
  // No specific props needed for now
}

export default function GardenIcons({}: GardenIconsProps) {
  const { user } = useSessionAuth();
  const [showFriendsMenu, setShowFriendsMenu] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

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
          zIndex: 100,
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
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
            e.currentTarget.style.transform = "scale(1)";
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
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Groups"
        >
          <i className="fas fa-users-cog"></i>
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
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="User Profile"
        >
          <i className="fas fa-user-circle"></i>
        </button>
      </div>

      {/* Modals */}
      <FriendsMenu
        isVisible={showFriendsMenu}
        onClose={() => setShowFriendsMenu(false)}
        userId={user.userId}
      />

      <GroupsModal isVisible={showGroups} onClose={() => setShowGroups(false)} />

      <UserProfile
        isVisible={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        user={userProfileData}
      />
    </>
  );
}
