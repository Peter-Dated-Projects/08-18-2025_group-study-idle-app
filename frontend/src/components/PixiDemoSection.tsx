"use client";

import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

const PixiDemoSection: React.FC = () => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!pixiContainerRef.current) return;

    // Create PIXI application
    const app = new PIXI.Application({
      width: 800,
      height: 400,
      backgroundColor: 0x87ceeb, // Sky blue
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    appRef.current = app;
    pixiContainerRef.current.appendChild(app.view as HTMLCanvasElement);

    // Create a simple demo scene
    const createDemoScene = async () => {
      // Background gradient
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0x87ceeb, 1); // Sky blue
      graphics.drawRect(0, 0, 800, 200);
      graphics.beginFill(0x90ee90, 1); // Light green
      graphics.drawRect(0, 200, 800, 200);
      graphics.endFill();
      app.stage.addChild(graphics);

      // Create simple shapes representing structures
      const structures = [
        { x: 100, y: 250, color: 0xff6b6b, width: 80, height: 100, label: "📚 Library" },
        { x: 250, y: 280, color: 0x4ecdc4, width: 60, height: 70, label: "🏠 Dorm" },
        { x: 380, y: 260, color: 0x45b7d1, width: 90, height: 90, label: "🧪 Lab" },
        { x: 540, y: 290, color: 0xf9ca24, width: 70, height: 60, label: "☕ Café" },
        { x: 680, y: 270, color: 0x6c5ce7, width: 75, height: 80, label: "🎯 Gym" },
      ];

      structures.forEach((structure, index) => {
        // Create building
        const building = new PIXI.Graphics();
        building.beginFill(structure.color);
        building.drawRoundedRect(0, 0, structure.width, structure.height, 8);
        building.endFill();

        // Add outline
        building.lineStyle(3, 0xffffff, 0.8);
        building.drawRoundedRect(0, 0, structure.width, structure.height, 8);

        building.x = structure.x;
        building.y = structure.y;

        // Make interactive
        building.interactive = true;
        building.cursor = "pointer";

        // Add hover effects
        building.on("pointerover", () => {
          building.tint = 0xffffff;
          building.scale.set(1.1);
        });

        building.on("pointerout", () => {
          building.tint = 0xffffff;
          building.scale.set(1);
        });

        // Add click animation
        building.on("pointerdown", () => {
          building.scale.set(0.95);

          // Create floating text
          const style = new PIXI.TextStyle({
            fontFamily: "Arial",
            fontSize: 16,
            fill: "#ffffff",
            stroke: { color: "#000000", width: 2 },
            dropShadow: {
              alpha: 0.8,
              angle: Math.PI / 6,
              blur: 4,
              color: "#000000",
              distance: 2,
            },
          });

          const floatingText = new PIXI.Text(
            `+${Math.floor(Math.random() * 50) + 10} coins!`,
            style
          );
          floatingText.x = structure.x + structure.width / 2;
          floatingText.y = structure.y - 20;
          floatingText.anchor.set(0.5);
          app.stage.addChild(floatingText);

          // Animate floating text
          const ticker = new PIXI.Ticker();
          ticker.add(() => {
            floatingText.y -= 2;
            floatingText.alpha -= 0.02;
            if (floatingText.alpha <= 0) {
              app.stage.removeChild(floatingText);
              ticker.destroy();
            }
          });
          ticker.start();

          setTimeout(() => {
            building.scale.set(1.1);
          }, 100);
        });

        app.stage.addChild(building);

        // Add label
        const labelStyle = new PIXI.TextStyle({
          fontFamily: "Arial",
          fontSize: 12,
          fill: "#333333",
          fontWeight: "bold",
        });

        const label = new PIXI.Text(structure.label, labelStyle);
        label.x = structure.x + structure.width / 2;
        label.y = structure.y + structure.height + 5;
        label.anchor.set(0.5, 0);
        app.stage.addChild(label);

        // Add floating animation
        const ticker = new PIXI.Ticker();
        let elapsed = 0;
        ticker.add((ticker) => {
          elapsed += ticker.deltaTime * 0.02;
          building.y = structure.y + Math.sin(elapsed + index) * 2;
        });
        ticker.start();
      });

      // Add some clouds
      const createCloud = (x: number, y: number, scale: number = 1) => {
        const cloud = new PIXI.Graphics();
        cloud.beginFill(0xffffff, 0.8);

        // Draw cloud shapes
        cloud.drawCircle(0, 0, 20 * scale);
        cloud.drawCircle(25 * scale, -5 * scale, 25 * scale);
        cloud.drawCircle(50 * scale, 0, 20 * scale);
        cloud.drawCircle(35 * scale, 15 * scale, 15 * scale);

        cloud.endFill();
        cloud.x = x;
        cloud.y = y;

        app.stage.addChild(cloud);

        // Animate cloud movement
        const ticker = new PIXI.Ticker();
        ticker.add(() => {
          cloud.x += 0.5;
          if (cloud.x > 850) {
            cloud.x = -100;
          }
        });
        ticker.start();
      };

      createCloud(100, 80, 0.8);
      createCloud(300, 60, 1.2);
      createCloud(600, 90, 1);

      // Add welcome text
      const welcomeStyle = new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: 24,
        fill: "#ffffff",
        stroke: { color: "#4A90E2", width: 3 },
        dropShadow: {
          alpha: 0.8,
          angle: Math.PI / 6,
          blur: 4,
          color: "#000000",
          distance: 2,
        },
        wordWrap: true,
        wordWrapWidth: 400,
      });

      const welcomeText = new PIXI.Text(
        "Click on buildings to earn coins!\nBuild your perfect study world!",
        welcomeStyle
      );
      welcomeText.x = 400;
      welcomeText.y = 50;
      welcomeText.anchor.set(0.5);
      app.stage.addChild(welcomeText);

      // Add pulsing animation to welcome text
      const welcomeTicker = new PIXI.Ticker();
      let welcomeElapsed = 0;
      welcomeTicker.add((ticker) => {
        welcomeElapsed += ticker.deltaTime * 0.05;
        welcomeText.scale.set(1 + Math.sin(welcomeElapsed) * 0.1);
      });
      welcomeTicker.start();
    };

    createDemoScene();

    // Cleanup function
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
      }
    };
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Experience Your World
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See your study progress come to life in a beautiful, interactive world. This is just a
            preview of what you&apos;ll build with your dedication!
          </p>
        </div>

        {/* PIXI Demo Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-b from-blue-50 to-green-50 rounded-3xl p-8 shadow-2xl border border-gray-200">
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
              <div
                ref={pixiContainerRef}
                className="w-full flex justify-center"
                style={{ minHeight: "400px" }}
              />
            </div>

            {/* Demo Controls */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-4">
                💡 <strong>Interactive Demo:</strong> Click on the buildings to see how you earn
                rewards!
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-red-400 rounded"></span>
                  <span>Library (+Focus)</span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-teal-400 rounded"></span>
                  <span>Dorm (+Rest)</span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-blue-400 rounded"></span>
                  <span>Lab (+Research)</span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-yellow-400 rounded"></span>
                  <span>Café (+Energy)</span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-purple-400 rounded"></span>
                  <span>Gym (+Health)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                🎨
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Beautiful Graphics</h3>
              <p className="text-gray-600">
                Stunning visuals powered by PIXI.js bring your study world to life with smooth
                animations and vibrant colors.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-gray-600">
                Watch your world evolve in real-time as you complete study sessions and unlock new
                achievements.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                🎮
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Interactive Experience</h3>
              <p className="text-gray-600">
                Click, drag, and interact with your world. Every action in your study routine
                affects your virtual environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PixiDemoSection;
