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
  const [editableEmail, setEditableEmail] = useState(user.userEmail || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfoResponse | null>(null);

  // Get user ID from Redux state
  const userId = useSelector((state: RootState) => state.auth.user?.userId);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image info when modal opens
  useEffect(() => {
    if (isVisible && userId) {
      loadImageInfo();
    }
  }, [isVisible, userId]);

  // Load image info
  const loadImageInfo = async () => {
    if (!userId) return;

    try {
      const info = await getUserImageInfo(userId);
      setImageInfo(info);
    } catch (error) {
      console.error("Error loading image info:", error);
    }
  };

  // Handle profile picture click
  const handleProfilePictureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please select a valid image file", type: "error" });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "File size must be less than 5MB", type: "error" });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      // Upload the file
      const uploadResult = await uploadProfilePicture(file);

      if (uploadResult.success) {
        // Update user profile picture
        const updateResult = await updateUserProfilePicture(userId, uploadResult.imageId);

        if (updateResult.success) {
          // Update Redux state
          dispatch(updateProfilePicture(uploadResult.imageId));

          setMessage({ text: "Profile picture updated successfully!", type: "success" });

          // Reload image info
          await loadImageInfo();

          // Notify parent component
          if (onUserUpdated) {
            onUserUpdated();
          }
        } else {
          setMessage({
            text: updateResult.message || "Failed to update profile picture",
            type: "error",
          });
        }
      } else {
        setMessage({ text: uploadResult.message || "Failed to upload image", type: "error" });
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setMessage({ text: "Failed to upload profile picture", type: "error" });
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle profile picture deletion
  const handleDeleteProfilePicture = async () => {
    if (!userId) return;

    setIsDeleting(true);
    setMessage(null);

    try {
      const result = await removeUserProfilePicture(userId);

      if (result.success) {
        // Update Redux state
        dispatch(updateProfilePicture(null));

        setMessage({ text: "Profile picture removed successfully!", type: "success" });

        // Reload image info
        await loadImageInfo();

        // Notify parent component
        if (onUserUpdated) {
          onUserUpdated();
        }
      } else {
        setMessage({ text: result.message || "Failed to remove profile picture", type: "error" });
      }
    } catch (error) {
      console.error("Error removing profile picture:", error);
      setMessage({ text: "Failed to remove profile picture", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle name edit
  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    // Here you would typically save the name to the backend
    setIsEditingName(false);
    setMessage({ text: "Name updated successfully!", type: "success" });
  };

  const handleNameCancel = () => {
    setEditableName(
      user.given_name && user.family_name ? `${user.given_name} ${user.family_name}` : ""
    );
    setIsEditingName(false);
  };

  // Handle email edit
  const handleEmailEdit = () => {
    setIsEditingEmail(true);
  };

  const handleEmailSave = () => {
    // Here you would typically save the email to the backend
    setIsEditingEmail(false);
    setMessage({ text: "Email updated successfully!", type: "success" });
  };

  const handleEmailCancel = () => {
    setEditableEmail(user.userEmail || "");
    setIsEditingEmail(false);
  };

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Edit Profile"
      icon={<FaUser />}
      width="600px"
      maxHeight="800px"
      zIndex={2000}
    >
      <div className="p-8">
        {/* Message Display */}
        {message && (
          <div className="mb-5">
            <MessageDisplay message={message.text} messageType={message.type} />
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="w-full flex justify-center mb-6">
          <div className="flex flex-col items-center gap-4">
            {/* Profile Picture */}
            <div
              className="relative cursor-pointer"
              onClick={handleProfilePictureClick}
              title="Click to upload new profile picture"
            >
              <ProfilePicture
                size="120px"
                userId={userId}
                imageId={(user as any).user_picture_url}
              />
              {/* Upload overlay */}
              <div className="absolute top-0 left-0 w-[120px] h-[120px] bg-black/10 rounded-full flex items-center justify-center text-white text-2xl opacity-0 transition-opacity duration-200 pointer-events-none upload-overlay hover:opacity-100">
                <FaUpload />
              </div>
            </div>

            {/* Profile Picture Actions */}
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={handleProfilePictureClick}
                disabled={isUploading}
                className="bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a9c5a]"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
              <button
                onClick={handleDeleteProfilePicture}
                disabled={isDeleting || !imageInfo?.hasImage}
                className="bg-[#c85a54] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#b84a44]"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>

            {/* Image Info */}
            {imageInfo && (
              <div className="flex items-center gap-2 text-[#2c1810]">
                <span className="text-sm">
                  {imageInfo.hasImage ? "Image uploaded" : "No image uploaded"}
                </span>
                {imageInfo.hasImage && (
                  <span className="text-xs text-[#7a6b57]">({imageInfo.fileSize} bytes)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          {/* Name Field */}
          <FormGroup label="Name">
            {!isEditingName ? (
              <div className="flex items-center justify-between">
                <InfoDisplay value={editableName || "Not set"} />
                <button
                  onClick={handleNameEdit}
                  className="bg-[#d4944a] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#c4843a]"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <TextInput
                  value={editableName}
                  onChange={(e) => setEditableName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1"
                />
                <button
                  onClick={handleNameSave}
                  className="bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#4a9c5a]"
                >
                  <FaSave />
                </button>
                <button
                  onClick={handleNameCancel}
                  className="bg-[#7a6b57] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#6a5b47]"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </FormGroup>

          {/* Email Field */}
          <FormGroup label="Email">
            {!isEditingEmail ? (
              <div className="flex items-center justify-between">
                <InfoDisplay value={editableEmail || "Not set"} />
                <button
                  onClick={handleEmailEdit}
                  className="bg-[#d4944a] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#c4843a]"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <TextInput
                  value={editableEmail}
                  onChange={(e) => setEditableEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1"
                />
                <button
                  onClick={handleEmailSave}
                  className="bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#4a9c5a]"
                >
                  <FaSave />
                </button>
                <button
                  onClick={handleEmailCancel}
                  className="bg-[#7a6b57] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#6a5b47]"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </FormGroup>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </BaseModal>
  );
}
