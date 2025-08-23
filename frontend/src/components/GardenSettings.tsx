import { useState, useRef, useEffect } from "react";
import {
  SETTINGS_ICON,
  HeaderFont,
  BORDERFILL,
  SETTINGS_HEADER,
  PANELFILL,
  BORDERLINE,
  FONTCOLOR,
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
      className="absolute top-0 left-0 p-4 bg-black bg-opacity-20 rounded w-full h-full flex items-center justify-center"
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

          <div className="px-5 w-full flex flex-col justify-center gap-1">
            <button
              className="flex items-center justify-center py-4 px-5 rounded transition-transform duration-150 mb-2 w-full text-black"
              style={{
                backgroundColor: "white",
                fontFamily: HeaderFont,
                color: "black",
                border: `2px solid ${BORDERLINE}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "black";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "black";
              }}
              onClick={handleLogout}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5 mr-2"
                style={{ imageRendering: "pixelated" }}
              />
              Log out
            </button>
            <button
              className="flex items-center justify-center py-4 px-5 rounded transition-transform duration-150 mb-4 w-full text-black"
              style={{
                backgroundColor: "white",
                fontFamily: HeaderFont,
                color: "black",
                border: `2px solid ${BORDERLINE}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "black";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "black";
              }}
              onClick={() => handleNotionLogout()}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                alt="Notion"
                className="w-5 h-5 mr-2"
                style={{ imageRendering: "pixelated" }}
              />
              Log out of Notion
            </button>
          </div>

          <div className="px-5 w-full flex justify-center">
            <button
              className="text-white py-3 px-5 rounded w-full transition-transform duration-150"
              style={{ backgroundColor: BORDERLINE, fontFamily: HeaderFont }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = FONTCOLOR)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BORDERLINE)}
              onClick={() => setSettingsActive(false)}
            >
              Exit Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------- //
  if (settingsActive) return settingsUIDisplay;
  return settingsIcon;
}
