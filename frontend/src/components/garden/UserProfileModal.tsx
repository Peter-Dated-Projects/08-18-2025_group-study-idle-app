import React, { useState } from "react";
import {
  BaseModal,
  useCopyToClipboard,
  ProfilePicture,
  UserDisplayName,
  FormGroup,
  InfoDisplay,
  MessageDisplay,
  User,
  Button,
} from "../common";
import { FaUser, FaEdit } from "react-icons/fa";
import { BORDERFILL, BORDERLINE } from "../constants";
import EditProfileModal from "./ui/EditProfileModal";
import { useSubscription } from "@/hooks/useSubscription";

interface UserProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: User;
}

export default function UserProfile({ isVisible, onClose, user }: UserProfileProps) {
  const { copyMessage, copyToClipboard } = useCopyToClipboard();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isHoveringPicture, setIsHoveringPicture] = useState(false);
  const { isPaid: hasSubscription } = useSubscription();

  if (!isVisible) return null;

  const handleEditProfileClick = () => {
    setShowEditProfile(true);
  };

  const handleProfilePictureClick = () => {
    setShowEditProfile(true);
  };

  return (
    <>
      <BaseModal
        isVisible={isVisible}
        onClose={onClose}
        title="User Profile"
        icon={<FaUser />}
        width="650px"
        maxHeight="700px"
        constrainToCanvas={true}
        zIndex={2000}
      >
        {/* Profile Content */}
        <div style={{ padding: "30px", justifyContent: "center", alignItems: "center" }}>
          {/* Profile Picture with Hover Effect */}
          <div className="w-full flex justify-center mb-4">
            <div
              style={{
                position: "relative",
                cursor: "pointer",
              }}
              onMouseEnter={() => setIsHoveringPicture(true)}
              onMouseLeave={() => setIsHoveringPicture(false)}
              onClick={handleProfilePictureClick}
              title="Click to edit profile picture"
            >
              <ProfilePicture
                size="100px"
                userId={user.id || user.userId}
                imageId={(user as any).user_picture_url}
              />

              {/* Premium/Free Banner - positioned diagonally above profile picture */}
              <div
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  width: "70px",
                  height: "20px",
                  background: hasSubscription
                    ? "linear-gradient(135deg, #ffd700 0%, #ffb300 50%, #ff8f00 100%)" // Gold gradient for premium
                    : "linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #cd853f 100%)", // Wood gradient for free
                  transform: "rotate(30deg)", // 30% diagonal from horizontal
                  transformOrigin: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: "bold",
                  color: hasSubscription ? "#000" : "#fff",
                  textShadow: hasSubscription
                    ? "1px 1px 2px rgba(0,0,0,0.3)"
                    : "1px 1px 2px rgba(0,0,0,0.5)",
                  borderRadius: "3px",
                  border: hasSubscription ? "1px solid #ffaa00" : "1px solid #5d4037",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  zIndex: 10,
                }}
              >
                {hasSubscription ? "GOLD" : "WOOD"}
              </div>

              {/* Hover Overlay */}
              {isHoveringPicture && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100px",
                    height: "100px",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "20px",
                    pointerEvents: "none",
                  }}
                >
                  <FaEdit />
                </div>
              )}
            </div>
          </div>

          {/* User Information */}
          <FormGroup>
            {/* Name */}
            <InfoDisplay
              label="Name"
              value={
                user.given_name && user.family_name
                  ? `${user.given_name} ${user.family_name}`
                  : "Not specified"
              }
            />

            {/* Email */}
            <InfoDisplay label="Email" value={user.email} />

            {/* User ID */}
            <InfoDisplay
              label="User ID"
              value={user.id || user.userId || ""}
              copyable={true}
              onCopy={() => copyToClipboard(user.id || user.userId || "")}
            />

            {/* Copy Message */}
            {copyMessage && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#5cb370",
                  fontWeight: "bold",
                }}
              >
                {copyMessage}
              </div>
            )}
          </FormGroup>

          {/* Edit Profile Button */}
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
            <Button
              onClick={handleEditProfileClick}
              variant="secondary"
              style={{
                width: "100%",
                maxWidth: "200px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <FaEdit />
              Edit Profile
            </Button>
          </div>
        </div>
      </BaseModal>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          isVisible={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          user={user}
          onUserUpdated={() => {
            // Refresh the parent component's user data if needed
            // This would be handled by the parent component passing a callback
          }}
        />
      )}
    </>
  );
}
