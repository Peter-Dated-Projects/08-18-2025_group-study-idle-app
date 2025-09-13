import React from "react";
import { commonStyles } from "./styles";
import { User } from "./types";

interface ProfilePictureProps {
  size?: string;
  emoji?: string;
  style?: React.CSSProperties;
}

export function ProfilePicture({ size = "100px", emoji = "👤", style }: ProfilePictureProps) {
  return (
    <div
      style={{
        ...commonStyles.profilePicture,
        width: size,
        height: size,
        fontSize: `${parseInt(size) * 0.4}px`,
        ...style,
      }}
    >
      {emoji}
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
      <ProfilePicture size="60px" />

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
