import { useState, useRef, useEffect } from "react";
import BaseModal from "./BaseModal";
import {
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

  // ---------------------------------------------------------------------- //
  // on load effect
  useEffect(() => {
    // preload images for settings UI
    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
    };

    // Preload settings header image
    preloadImage(SETTINGS_HEADER);
  }, []);

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
      <button
        onClick={() => setSettingsActive(true)}
        style={{
          width: "50px",
          height: "50px",
          backgroundColor: BORDERFILL,
          border: `3px solid ${BORDERLINE}`,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "20px",
          color: FONTCOLOR,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = HOVER_COLOR;
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = BORDERFILL;
          e.currentTarget.style.transform = "scale(1)";
        }}
        title="Settings"
      >
        <i className="fi fi-ss-settings"></i>
      </button>
    </div>
  );

  return (
    <>
      {settingsIcon}

      <BaseModal
        isVisible={settingsActive}
        onClose={() => setSettingsActive(false)}
        title=""
        showHeader={false}
        constrainToCanvas={true}
      >
        <div className="w-full h-full text-white" style={{ backgroundColor: BORDERFILL }}>
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
      </BaseModal>
    </>
  );
}
