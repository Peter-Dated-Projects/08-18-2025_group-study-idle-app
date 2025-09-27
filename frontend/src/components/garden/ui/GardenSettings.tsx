import { useState, useRef, useEffect } from "react";
import { BaseModal } from "../../common";
import {
  HeaderFont,
  BodyFont,
  SETTINGS_HEADER,
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
    <div className="absolute bottom-4 right-4 z-[100]">
      <button
        onClick={() => setSettingsActive(true)}
        className="w-12 h-12 bg-[#e4be93ff] border-3 border-[#a0622d] rounded-lg flex items-center justify-center cursor-pointer text-xl text-[#2c1810] transition-all duration-200 hover:bg-[#f5d9b8]"
        title="Settings"
      >
        <i className="fi fi-ss-settings translate-y-0.5"></i>
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
        <div className="w-full h-full text-white bg-[#e4be93ff]">
          <img
            src={SETTINGS_HEADER}
            alt="Settings Header"
            className="w-full h-auto"
            style={{ imageRendering: "pixelated" }}
          />

          <div className="px-6 w-full flex flex-col justify-center gap-3">
            <button
              className="flex items-center justify-center py-4 px-5 rounded-lg transition-all duration-200 mb-2 w-full shadow-sm hover:shadow-md bg-white text-[#2c1810] border-2 border-[#a0622d] text-base hover:bg-[#f5d9b8]"
              style={{ fontFamily: HeaderFont }}
              onClick={handleLogout}
            >
              <span className="pr-2">{googleSVG}</span>
              <span>Sign out of Google</span>
            </button>
            <button
              className="flex items-center justify-center py-4 px-5 rounded-lg transition-all duration-200 mb-4 w-full shadow-sm hover:shadow-md bg-white text-[#2c1810] border-2 border-[#a0622d] text-base hover:bg-[#f5d9b8]"
              style={{ fontFamily: HeaderFont }}
              onClick={() => handleNotionLogout()}
            >
              <span className="pr-2">{notionSVG}</span>
              <span>Sign out of Notion</span>
            </button>
          </div>

          <div className="px-6 w-full flex justify-center">
            <button
              className="flex items-center gap-2 text-white py-3 px-6 rounded-lg w-full transition-all duration-200 justify-center shadow-sm hover:shadow-md bg-[#a0622d] hover:bg-[#2c1810] text-base"
              style={{ fontFamily: HeaderFont }}
              onClick={() => setSettingsActive(false)}
            >
              <i className="fi fi-rr-cross-small text-sm"></i>
              Close Settings
            </button>
          </div>

          <div className="absolute bottom-4 left-0 w-full flex justify-center text-xs opacity-60">
            <div
              className="flex items-center gap-1 text-[#7a6b57]"
              style={{ fontFamily: BodyFont }}
            >
              <i className="fi fi-rr-heart text-xs"></i>
              <span>Icons by</span>
              <a
                href="https://www.flaticon.com/uicons"
                className="underline hover:no-underline transition-all text-[#d4944a]"
                target="_blank"
                rel="noopener noreferrer"
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
