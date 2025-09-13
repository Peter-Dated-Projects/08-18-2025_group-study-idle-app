import { useState, useRef, useEffect } from "react";
import {
  SETTINGS_ICON,
  HeaderFont,
  BodyFont,
  BORDERFILL,
  SETTINGS_HEADER,
  PANELFILL,
  BORDERLINE,
  FONTCOLOR,
  SECONDARY_TEXT,
  ACCENT_COLOR,
  HOVER_COLOR,
  googleSVG,
  notionSVG,
} from "@/components/constants";

export default function GardenSettings() {
  const [settingsActive, setSettingsActive] = useState<boolean>(false);

  const settingsRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------- //
  // on load effect
  useEffect(() => {
    if (settingsActive && settingsRef.current) {
      settingsRef.current.focus();
    }

    // preload image
    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
    };

    // Preload all images
    preloadImage(SETTINGS_ICON);
  }, [settingsActive]);

  // ---------------------------------------------------------------------- //
  const redirectToLogin = () => {
    window.location.href = "/login";
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await fetch("/api/notion/logout", { method: "POST", credentials: "include" });
      redirectToLogin();
    } catch (error) {
      console.error("Logout error:", error);
      redirectToLogin();
    }
  };

  const handleNotionLogout = async () => {
    try {
      await fetch("/api/notion/logout", { method: "POST", credentials: "include" });
      redirectToLogin();
    } catch (error) {
      console.error("Notion logout error:", error);
      redirectToLogin();
    }
  };

  // ---------------------------------------------------------------------- //
  // Settings Icon
  const settingsIcon = (
    <div className="absolute bottom-0 right-0 p-4">
      <div style={{ display: "inline-block" }}>
        <img
          onClick={() => setSettingsActive(true)}
          src={SETTINGS_ICON}
          alt="Settings"
          className="w-16 h-16 transition-transform duration-150 hover:scale-110"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );

  // Settings UI Display
  const settingsUIDisplay = (
    <div
      className="absolute top-0 left-0 p-4 rounded w-full h-full flex items-center justify-center z-9000"
      style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Escape") setSettingsActive(false);
      }}
      // Ensure the div can receive focus for keyboard events
      ref={settingsRef}
    >
      <div
        className="bg-white bg-opacity-90 p-6 rounded shadow-lg max-w-md mx-auto items-center justify-center py-15 px-10 w-3/4 h-7/10"
        style={{ backgroundColor: PANELFILL, border: `5px solid ${BORDERLINE}` }}
      >
        <div
          className="w-full h-full text-white"
          style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
        >
          <img
            src={SETTINGS_HEADER}
            alt="Settings Header"
            className="w-full h-auto"
            style={{ imageRendering: "pixelated" }}
          />

          <div className="px-6 w-full flex flex-col justify-center gap-3">
            <button
              className="flex items-center justify-center py-4 px-5 rounded-lg transition-all duration-200 mb-2 w-full shadow-sm hover:shadow-md"
              style={{
                backgroundColor: "white",
                fontFamily: HeaderFont,
                color: FONTCOLOR,
                border: `2px solid ${BORDERLINE}`,
                fontSize: "1rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = HOVER_COLOR;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
              }}
              onClick={handleLogout}
            >
              <span className="pr-2">{googleSVG}</span>
              <span>Sign out of Google</span>
            </button>
            <button
              className="flex items-center justify-center py-4 px-5 rounded-lg transition-all duration-200 mb-4 w-full shadow-sm hover:shadow-md"
              style={{
                backgroundColor: "white",
                fontFamily: HeaderFont,
                color: FONTCOLOR,
                border: `2px solid ${BORDERLINE}`,
                fontSize: "1rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = HOVER_COLOR;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
              }}
              onClick={() => handleNotionLogout()}
            >
              <span className="pr-2">{notionSVG}</span>
              <span>Sign out of Notion</span>
            </button>
          </div>

          <div className="px-6 w-full flex justify-center">
            <button
              className="flex items-center gap-2 text-white py-3 px-6 rounded-lg w-full transition-all duration-200 justify-center shadow-sm hover:shadow-md"
              style={{
                backgroundColor: BORDERLINE,
                fontFamily: HeaderFont,
                fontSize: "1rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = FONTCOLOR)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BORDERLINE)}
              onClick={() => setSettingsActive(false)}
            >
              <i className="fi fi-rr-cross-small text-sm"></i>
              Close Settings
            </button>
          </div>

          <div className="absolute bottom-4 left-0 w-full flex justify-center text-xs opacity-60">
            <div
              className="flex items-center gap-1"
              style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
            >
              <i className="fi fi-rr-heart text-xs"></i>
              <span>Icons by</span>
              <a
                href="https://www.flaticon.com/uicons"
                className="underline hover:no-underline transition-all"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: ACCENT_COLOR }}
              >
                Flaticon
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------- //
  if (settingsActive) return settingsUIDisplay;
  return settingsIcon;
}
