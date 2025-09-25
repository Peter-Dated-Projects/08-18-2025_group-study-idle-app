import React, { useState, useEffect } from "react";
import { commonStyles } from "./styles";
import { User } from "./types";
import { getImageUrlSmart } from "./imageApi";

interface ProfilePictureProps {
  size?: string;
  emoji?: string;
  imageId?: string | null; // Specific image ID in minIO, or null for default
  userId?: string; // User ID to fetch their profile picture, fallback if no imageId
  style?: React.CSSProperties;
}

/**
 * ProfilePicture component that fetches images from minIO backend service.
 *
 * Behavior:
 * - If imageId is provided (including null), it uses that (null = default image)
 * - If no imageId but userId is provided, tries to fetch user's profile picture
 * - If neither provided, gets default profile picture
 * - Falls back to emoji if minIO fetch fails
 */
export function ProfilePicture({
  size = "100px",
  emoji = "👤",
  imageId,
  userId,
  style,
}: ProfilePictureProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Always try to fetch profile picture from minIO
    setIsLoading(true);
    setImageError(false);
    setImageUrl(null);

    // Use smart image fetching:
    // - If imageId is explicitly provided (including null), use it
    // - Otherwise, use userId if available
    // - If neither, get default
    getImageUrlSmart(imageId, userId)
      .then((response) => {
        if (response.success && response.url) {
          const idUsed = response.user_id ? `user:${response.user_id}` : response.image_id;
          console.debug(`Profile picture loaded for ID: ${idUsed}`, response.url);
          setImageUrl(response.url);
        } else {
          console.warn("Failed to get profile picture URL:", response);
          setImageError(true);
        }
      })
      .catch((error) => {
        console.error("Error fetching profile picture from minIO:", error);
        setImageError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [imageId, userId]);

  // Loading state - show while fetching image
  if (isLoading) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8f8f8",
          border: "2px solid #ddd",
          color: "#999",
          fontSize: `${parseInt(size) * 0.3}px`,
          ...style,
        }}
      >
        ⏳
      </div>
    );
  }

  // Always show image if we have a URL - minIO service handles defaults
  if (imageUrl && !imageError) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
          border: "2px solid #ddd",
          ...style,
        }}
      >
        <img
          src={imageUrl}
          alt="Profile"
          style={{
            display: "flex",
            backgroundColor: "#8590b6ff",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
          }}
          onError={() => {
            console.error("Failed to load profile image from minIO:", imageUrl);
            setImageError(true);
            setImageUrl(null);
          }}
        />
      </div>
    );
  }

  // If there's an error or no URL, show retry message instead of emoji
  // User can click to retry fetching the profile picture
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        border: "2px solid #ddd",
        color: "#666",
        fontSize: `${parseInt(size) * 0.2}px`,
        cursor: "pointer",
        textAlign: "center",
        ...style,
      }}
      onClick={() => {
        // Retry fetching the profile picture
        setIsLoading(true);
        setImageError(false);
        setImageUrl(null);

        getImageUrlSmart(imageId, userId)
          .then((response) => {
            if (response.success && response.url) {
              const idUsed = response.user_id ? `user:${response.user_id}` : response.image_id;
              console.debug(`Profile picture retry loaded for ID: ${idUsed}`, response.url);
              setImageUrl(response.url);
            } else {
              console.warn("Retry failed to get profile picture URL:", response);
              setImageError(true);
            }
          })
          .catch((error) => {
            console.error("Retry error fetching profile picture from minIO:", error);
            setImageError(true);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }}
      title="Click to retry loading profile picture"
    >
      Image
      <br />
      Failed
      <br />↻
    </div>
  );
}

interface UserDisplayNameProps {
  user: User;
  fallback?: string;
}

export function UserDisplayName({ user, fallback = "Not specified" }: UserDisplayNameProps) {
  if (user.given_name && user.family_name) {
    return (
      <span>
        {user.given_name} {user.family_name}
      </span>
    );
  }

  if (user.given_name) {
    return <span>{user.given_name}</span>;
  }

  return <span>{fallback}</span>;
}

interface UserCardProps {
  user: User;
  actions?: React.ReactNode;
  showEmail?: boolean;
  showId?: boolean;
  onIdClick?: () => void;
  style?: React.CSSProperties;
}

export function UserCard({
  user,
  actions,
  showEmail = true,
  showId = true,
  onIdClick,
  style,
}: UserCardProps) {
  return (
    <div style={{ ...commonStyles.container, ...style }}>
      <ProfilePicture
        size="60px"
        userId={user.id || user.userId}
        imageId={(user as any).user_picture_url}
      />

      <div style={commonStyles.formGroup}>
        <div>
          <label style={commonStyles.label}>Name:</label>
          <div style={commonStyles.infoDisplay}>
            <UserDisplayName user={user} />
          </div>
        </div>

        {showEmail && (
          <div>
            <label style={commonStyles.label}>Email:</label>
            <div style={commonStyles.infoDisplay}>{user.email}</div>
          </div>
        )}

        {showId && (
          <div>
            <label style={commonStyles.label}>User ID:</label>
            <div
              style={{
                ...commonStyles.infoDisplay,
                cursor: onIdClick ? "pointer" : "default",
              }}
              onClick={onIdClick}
              title={onIdClick ? "Click to copy" : undefined}
            >
              {user.id || user.userId}
            </div>
          </div>
        )}

        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
