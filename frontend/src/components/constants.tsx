// svgs
export const googleSVG = (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <g>
      <path
        fill="#4285F4"
        d="M21.805 12.217c0-.638-.057-1.252-.163-1.837H12v3.478h5.548a4.74 4.74 0 0 1-2.057 3.113v2.583h3.323c1.943-1.79 3.05-4.428 3.05-7.337z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.89 6.627-2.418l-3.323-2.583c-.92.62-2.09.99-3.304.99-2.54 0-4.69-1.72-5.46-4.03H2.41v2.602A9.997 9.997 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.959A5.996 5.996 0 0 1 6.09 12c0-.682.12-1.342.33-1.959V7.44H2.41A9.997 9.997 0 0 0 2 12c0 1.57.38 3.05 1.05 4.36l3.49-2.401z"
      />
      <path
        fill="#EA4335"
        d="M12 6.58c1.47 0 2.78.51 3.81 1.51l2.86-2.86C16.97 3.89 14.7 3 12 3 7.58 3 3.73 5.81 2.41 7.44l3.49 2.601C7.31 8.3 9.46 6.58 12 6.58z"
      />
    </g>
  </svg>
);

export const notionSVG = <img width="20" height="20" src="/notion-logo.svg" alt="Notion Icon" />;

// Vibrant wood and plant-inspired color palette
export const BORDERWIDTH = "8px";
export const BORDERFILLLIGHT = "rgba(234, 210, 182, 1)";
export const BORDERFILL = "#e4be93ff"; // Rich warm orange oak
export const BORDERLINE = "#a0622d"; // Rich mahogany border
export const PANELFILL = "#fdf4e8"; // Warm orange-cream background
export const FONTCOLOR = "#2c1810"; // Deep espresso brown text
export const ACCENT_COLOR = "#d4944a"; // Vibrant orange-amber wood accent
export const SUCCESS_COLOR = "#5cb370"; // Bright emerald green like fresh leaves
export const WARNING_COLOR = "#d4a017"; // Brilliant golden yellow
export const ERROR_COLOR = "#c85a54"; // Vibrant terracotta red
export const SECONDARY_TEXT = "#7a6b57"; // Rich taupe for secondary text
export const HOVER_COLOR = "#f5d9b8"; // Warm orange-cream for hover states

// sprite paths
export const SETTINGS_ICON = "/ui/settings.png";
export const SETTINGS_HEADER = "/ui/settings_header.png";
export const AVATAR_BOX = "/ui/avatar-box.png";

// env variables
export const NOTION_API_VERSION = process.env.NOTION_API_VERSION!;

// Typography system
export const HeaderFont = "FallingSky"; // Updated to use custom font
export const BodyFont = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
export const AccentFont = "Rubik Bubbles"; // Keep for special decorative text
