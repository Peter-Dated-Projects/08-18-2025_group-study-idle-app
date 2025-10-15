import React, { useState, useRef } from "react";
import {
  BaseModal,
  CachedProfilePicture,
  FormGroup,
  TextInput,
  InfoDisplay,
  Button,
  MessageDisplay,
  User,
  uploadProfilePicture,
  removeUserProfilePicture,
  updateUserProfilePicture,
} from "../../common";
import { FaUser, FaSave, FaTimes, FaUpload, FaTrash } from "react-icons/fa";
import { FONTCOLOR, SUCCESS_COLOR, ERROR_COLOR } from "../../constants";
import { useAppDispatch } from "@/store/hooks";
import { fetchProfilePicture } from "@/store/slices/profilePicturesSlice";

interface EditProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  user: User;
  onUserUpdated?: () => void; // Callback when user data is updated
}

interface Message {
  text: string;
  type: "success" | "error";
}

export default function EditProfileModal({
  isVisible,
  onClose,
  user,
  onUserUpdated,
}: EditProfileModalProps) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [editableName, setEditableName] = useState(
    user.given_name && user.family_name ? `${user.given_name} ${user.family_name}` : ""
  );
  const [message, setMessage] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = () => {
    // Profile picture changes are saved immediately when uploaded/removed
    // Just close the modal
    onClose();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showMessage("Please select an image file", "error");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showMessage("Image must be smaller than 5MB", "error");
      return;
    }

    const userId = user.id || user.userId;
    if (!userId) {
      showMessage("User ID is missing", "error");
      return;
    }

    setIsUploading(true);
    try {
      // Upload the image (pass userId to enable old image deletion and auto-update of user_picture_url)
      const uploadResult = await uploadProfilePicture(file, userId);

      // No need to call updateUserProfilePicture - the upload endpoint now handles storing the URL in the database

      // Force refresh the profile picture cache to get the new image immediately
      dispatch(fetchProfilePicture({ userId, forceRefresh: true }));

      showMessage("Profile picture uploaded successfully!", "success");

      // Notify parent component
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error("Upload error:", error);
      showMessage(
        error instanceof Error ? error.message : "Failed to upload profile picture",
        "error"
      );
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    const userId = user.id || user.userId;

    if (!userId) {
      showMessage("User ID is missing", "error");
      return;
    }

    if (!confirm("Are you sure you want to remove your profile picture?")) {
      return;
    }

    setIsRemoving(true);
    try {
      // Remove the profile picture
      await removeUserProfilePicture(userId);

      // Force refresh the profile picture cache to get the default image immediately
      dispatch(fetchProfilePicture({ userId, forceRefresh: true }));

      showMessage("Profile picture removed successfully!", "success");

      // Notify parent component
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error("Remove error:", error);
      showMessage(
        error instanceof Error ? error.message : "Failed to remove profile picture",
        "error"
      );
    } finally {
      setIsRemoving(false);
    }
  };

  if (!isVisible) return null;

  const userId = user.id || user.userId || "";

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Edit Profile"
      icon={<FaUser />}
      width="650px"
      maxHeight="700px"
      constrainToCanvas={true}
      zIndex={2100} // Higher than UserProfile modal
    >
      <div style={{ padding: "30px" }}>
        {/* Message Display */}
        {message && (
          <div style={{ marginBottom: "20px" }}>
            <MessageDisplay message={message.text} messageType={message.type} />
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="w-full flex justify-center mb-6">
          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}
          >
            {/* Profile Picture with Upload/Remove */}
            <CachedProfilePicture size="120px" userId={userId} />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />

            {/* Upload and Remove Buttons */}
            <div
              style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}
            >
              <Button
                onClick={handleUploadClick}
                variant="primary"
                disabled={isUploading || isRemoving}
                style={{
                  minWidth: "140px",
                  backgroundColor: SUCCESS_COLOR,
                  opacity: isUploading || isRemoving ? 0.6 : 1,
                }}
              >
                <FaUpload />
                {isUploading ? "Uploading..." : "Upload Image"}
              </Button>
              <Button
                onClick={handleRemoveImage}
                variant="secondary"
                disabled={isUploading || isRemoving}
                style={{
                  minWidth: "140px",
                  backgroundColor: ERROR_COLOR,
                  opacity: isUploading || isRemoving ? 0.6 : 1,
                }}
              >
                <FaTrash />
                {isRemoving ? "Removing..." : "Remove Image"}
              </Button>
            </div>
          </div>
        </div>

        {/* User Information */}
        <FormGroup>
          {/* Name - Editable */}
          <div>
            <label
              style={{ display: "block", marginBottom: "5px", color: FONTCOLOR, fontSize: "14px" }}
            >
              Name
            </label>
            <TextInput
              value={editableName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditableName(e.target.value)}
              placeholder="Enter your name"
              style={{ width: "100%" }}
            />
          </div>

          {/* Email - Non-editable */}
          <InfoDisplay label="Email" value={user.email || "Not specified"} />

          {/* User ID - Non-editable */}
          <InfoDisplay label="User ID" value={userId || "Not specified"} copyable={true} />
        </FormGroup>

        {/* Action Buttons */}
        <div
          style={{
            marginTop: "30px",
            display: "flex",
            gap: "15px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            onClick={handleSave}
            variant="primary"
            style={{ minWidth: "120px", backgroundColor: SUCCESS_COLOR }}
          >
            <FaSave />
            Done
          </Button>
          <Button
            onClick={onClose}
            variant="secondary"
            style={{ minWidth: "120px", backgroundColor: ERROR_COLOR }}
          >
            <FaTimes />
            Cancel
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
