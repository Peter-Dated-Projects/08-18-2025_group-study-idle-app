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

interface UserProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: User;
}

export default function UserProfile({ isVisible, onClose, user }: UserProfileProps) {
  const { copyMessage, copyToClipboard } = useCopyToClipboard();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isHoveringPicture, setIsHoveringPicture] = useState(false);

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
