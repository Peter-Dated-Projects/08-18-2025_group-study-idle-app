export default function GardenMenu() {
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
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)", // Optional: visual debugging
        }}
      >
        avatar
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
        topright
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
        middleleft
      </div>
      <div
        style={{
          gridArea: "middlecenter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        middlecenter
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
        middleright
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
        bottomleft
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
        bottomcenter
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
        bottomright
      </div>
    </div>
  );
}
