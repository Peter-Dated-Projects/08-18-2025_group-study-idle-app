"use client";

import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";

extend({
  Container,
  Graphics,
  Sprite,
  Text,
});

export default function GardenCanvas() {
  return (
    <div className="w-full h-[480px] rounded-xl border bg-white/70 backdrop-blur p-0 overflow-hidden">
      <Application
        width={500}
        height={500}
        options={{ backgroundAlpha: 0, antialias: false }}
        onInit={(app) => {
          app.renderer.background.color = 0x1099bb;
          console.log("PIXI Application initialized:", app);
        }}
      >
        <pixiContainer>
          {/* First red circle */}
          <pixiGraphics
            draw={(g) => {
              g.clear();
              g.beginFill(0xff0000);
              g.drawCircle(150, 150, 50);
              g.endFill();
            }}
          />

          {/* Text label */}
          <pixiText
            text="Hello PIXI! Nah lowkey this is stupid"
            x={50}
            y={50}
            style={{ fill: 0xffffff, fontSize: 24, fontFamily: "Arial" }}
          />
        </pixiContainer>
      </Application>
    </div>
  );
}
