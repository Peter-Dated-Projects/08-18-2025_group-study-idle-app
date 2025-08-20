import LightingControls from "./LightingControls";

interface GardenMenuProps {
  onCreateLight?: (config: { x: number; y: number; preset: string }) => void;
  onToggleLight?: (lightId: string, enabled: boolean) => void;
  onRemoveLight?: (lightId: string) => void;
  lights?: any[];
}

export default function GardenMenu({
  onCreateLight,
  onToggleLight,
  onRemoveLight,
  lights = [],
}: GardenMenuProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gridTemplateAreas: `
          "topleft topcenter topright"
          "middleleft middlecenter middleright"
          "bottomleft bottomcenter bottomright"
        `,
      }}
    >
      <div
        style={{
          gridArea: "topleft",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          width: "100%",
          height: "100%",
          padding: "10px",
        }}
      >
        <LightingControls
          onCreateLight={onCreateLight}
          onToggleLight={onToggleLight}
          onRemoveLight={onRemoveLight}
          lights={lights}
        />
      </div>
      <div
        style={{
          gridArea: "topcenter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        boss_bar
      </div>
      <div
        style={{
          gridArea: "topright",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        settings
      </div>
      <div
        style={{
          gridArea: "middleleft",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        inventory
      </div>
      <div
        style={{
          gridArea: "middlecenter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          // No border for center - this is where gameplay happens
        }}
      >
        {/* Center area - transparent for gameplay */}
      </div>
      <div
        style={{
          gridArea: "middleright",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        stats
      </div>
      <div
        style={{
          gridArea: "bottomleft",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        tasks
      </div>
      <div
        style={{
          gridArea: "bottomcenter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        chat/social
      </div>
      <div
        style={{
          gridArea: "bottomright",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        minimap
      </div>
    </div>
  );
}
