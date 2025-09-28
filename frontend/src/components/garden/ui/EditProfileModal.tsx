import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { updateProfilePicture, fetchUserProfilePicture } from "../../../store/slices/authSlice";
import {
  BaseModal,
  ProfilePicture,
  FormGroup,
  TextInput,
  InfoDisplay,
  Button,
  MessageDisplay,
  LoadingSpinner,
  User,
} from "../../common";
import { FaUser, FaUpload, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import { FONTCOLOR, BORDERFILL, BORDERLINE, SUCCESS_COLOR, ERROR_COLOR } from "../../constants";
import {
  uploadProfilePicture,
  updateUserProfilePicture,
  removeUserProfilePicture,
  getUserImageInfo,
  ImageInfoResponse,
} from "../../common/imageApi";

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
  // Redux hooks
  const dispatch = useDispatch<AppDispatch>();

  // State management
  const [editableName, setEditableName] = useState(
    user.given_name && user.family_name ? `${user.given_name} ${user.family_name}` : ""
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfoResponse | null>(null);
  const [isLoadingImageInfo, setIsLoadingImageInfo] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user image info when modal opens
  useEffect(() => {
    if (isVisible && (user.id || user.userId)) {
      loadUserImageInfo();
    }
  }, [isVisible, user.id, user.userId]);

  const loadUserImageInfo = async () => {
    const userId = user.id || user.userId;
    if (!userId) return;

    setIsLoadingImageInfo(true);
    try {
      const info = await getUserImageInfo(userId);
      setImageInfo(info);
    } catch (error) {
      console.error("Error loading user image info:", error);
      showMessage("Failed to load profile picture information", "error");
    } finally {
      setIsLoadingImageInfo(false);
    }
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      showMessage("Please select a PNG, JPEG, or JPG image file", "error");
      return;
    }

    // Validate file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showMessage("Image file size must be less than 10MB", "error");
      return;
    }

    const userId = user.id || user.userId;
    if (!userId) {
      showMessage("User ID not available", "error");
      return;
    }

    setIsUploadingImage(true);
    try {
      console.log("Starting profile picture upload for user:", userId);
      console.log("File details:", { name: file.name, size: file.size, type: file.type });

      // Upload the profile picture (automatically resized to 128x128)
      console.log("Uploading image to backend...");
      const uploadResponse = await uploadProfilePicture(file);
      console.log("Upload response:", uploadResponse);

      // Update the user's profile picture URL in the database
      console.log("Updating user profile picture URL in database...");
      const updateResponse = await updateUserProfilePicture(userId, uploadResponse.image_id);
      console.log("Update response:", updateResponse);

      if (updateResponse.success) {
        showMessage("Profile picture updated successfully!", "success");

        // Update Redux state with the new profile picture URL
        if (updateResponse.user && updateResponse.user.user_picture_url) {
          dispatch(updateProfilePicture(updateResponse.user.user_picture_url));
        } else {
          // Fallback: fetch the profile picture from the API
          const userId = user.id || user.userId;
          if (userId) {
            dispatch(fetchUserProfilePicture(userId));
          }
        }

        // Reload image info to get the new URL
        console.log("Reloading user image info...");
        await loadUserImageInfo();

        // Notify parent component
        if (onUserUpdated) {
          onUserUpdated();
        }
      } else {
        const errorMsg = `Failed to update profile picture: ${
          updateResponse.message || "Unknown error"
        }`;
        console.error(errorMsg, updateResponse);
        showMessage(errorMsg, "error");
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);

      // More specific error messaging
      let errorMessage = "Failed to upload profile picture. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("Failed to upload profile picture")) {
          errorMessage = "Failed to process image. Please check your image format and try again.";
        } else if (error.message.includes("Failed to update user profile picture")) {
          errorMessage = "Image uploaded but failed to update your profile. Please try again.";
        } else {
          errorMessage = `Upload failed: ${error.message}`;
        }
      }
      showMessage(errorMessage, "error");
    } finally {
      setIsUploadingImage(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    const userId = user.id || user.userId;
    if (!userId) {
      showMessage("User ID not available", "error");
      return;
    }

    if (!imageInfo?.has_custom_picture) {
      showMessage("You're already using the default profile picture", "error");
      return;
    }

    setIsRemovingImage(true);
    try {
      const response = await removeUserProfilePicture(userId);

      if (response.success) {
        showMessage("Profile picture removed successfully! Using default picture.", "success");

        // Update Redux state to clear the profile picture URL (set to null for default)
        dispatch(updateProfilePicture(null));

        // Update local image info
        setImageInfo({
          ...imageInfo,
          has_custom_picture: false,
          is_default: true,
          image_id: "default_pfp.png",
          url: response.url,
        });

        // Notify parent component
        if (onUserUpdated) {
          onUserUpdated();
        }
      } else {
        showMessage("Failed to remove profile picture", "error");
      }
    } catch (error) {
      console.error("Error removing profile picture:", error);
      showMessage("Failed to remove profile picture. Please try again.", "error");
    } finally {
      setIsRemovingImage(false);
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = () => {
    // For now, just close the modal since name editing isn't implemented yet
    // In the future, this would save name changes
    showMessage("Name editing will be implemented in a future update", "error");
  };

  if (!isVisible) return null;

  const userId = user.id || user.userId;

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
            {/* Profile Picture */}
            <div
              style={{
                position: "relative",
                cursor: "pointer",
              }}
              onClick={handleProfilePictureClick}
              title="Click to upload new profile picture"
            >
              <ProfilePicture
                size="120px"
                userId={userId}
                imageId={(user as any).user_picture_url}
              />
              {/* Upload overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "120px",
                  height: "120px",
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "24px",
                  opacity: 0,
                  transition: "opacity 0.2s ease",
                  pointerEvents: "none",
                }}
                className="upload-overlay"
              >
                <FaUpload />
              </div>
            </div>

            {/* Profile Picture Actions */}
            <div
              style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}
            >
              <Button
                onClick={handleProfilePictureClick}
                variant="secondary"
                disabled={isUploadingImage}
                style={{ fontSize: "14px", padding: "8px 16px" }}
              >
                {isUploadingImage ? (
                  <>
                    <LoadingSpinner size="small" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FaUpload />
                    Upload New
                  </>
                )}
              </Button>

              {imageInfo?.has_custom_picture && (
                <Button
                  onClick={handleRemoveImage}
                  variant="danger"
                  disabled={isRemovingImage}
                  style={{ fontSize: "14px", padding: "8px 16px" }}
                >
                  {isRemovingImage ? (
                    <>
                      <LoadingSpinner size="small" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Remove
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Image Info */}
            {isLoadingImageInfo ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: FONTCOLOR }}>
                <LoadingSpinner size="small" />
                Loading image info...
              </div>
            ) : imageInfo ? (
              <div style={{ textAlign: "center", fontSize: "12px", color: FONTCOLOR }}>
                {imageInfo.has_custom_picture
                  ? "Custom profile picture"
                  : "Default profile picture"}
              </div>
            ) : null}
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
            Save Changes
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />
      </div>
    </BaseModal>
  );
}
