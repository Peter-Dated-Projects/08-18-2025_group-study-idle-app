import React from "react";
import {
  BaseModal,
  useCopyToClipboard,
  ProfilePicture,
  UserDisplayName,
  FormGroup,
  InfoDisplay,
  MessageDisplay,
  User,
} from "../common";
import { FaUser } from "react-icons/fa";

interface UserProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: User;
}

export default function UserProfile({ isVisible, onClose, user }: UserProfileProps) {
  const { copyMessage, copyToClipboard } = useCopyToClipboard();

  if (!isVisible) return null;

  return (
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
        {/* Profile Picture */}
        <div className="w-full flex justify-center mb-4">
          <ProfilePicture
            size="100px"
            userId={user.id || user.userId}
            imageId={(user as any).user_picture_url}
          />
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
      </div>
    </BaseModal>
  );
}
