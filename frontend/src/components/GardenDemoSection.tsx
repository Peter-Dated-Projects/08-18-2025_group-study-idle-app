"use client";

import React from "react";
import { getGifByCategory } from "../data/mockData";

const GardenDemoSection: React.FC = () => {
  const buildings = [
    {
      id: 1,
      name: "Study Library",
      description: "Focus & earn knowledge points",
      color: "bg-amber-200",
      gif: getGifByCategory("study"),
    },
    {
      id: 2,
      name: "Cozy Cottage",
      description: "Rest & restore energy",
      color: "bg-orange-200",
      gif: getGifByCategory("build"),
    },
    {
      id: 3,
      name: "Research Lab",
      description: "Discover new knowledge",
      color: "bg-yellow-200",
      gif: getGifByCategory("study"),
    },
    {
      id: 4,
      name: "Garden Café",
      description: "Boost productivity",
      color: "bg-green-200",
      gif: getGifByCategory("build"),
    },
  ];

  return (
    <section className="py-20 bg-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Your Study Quest Awaits
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Watch your dedication bloom into a beautiful virtual world. Every study session helps
            your garden grow and unlocks new areas to explore!
          </p>
        </div>

        {/* Main Demo Image */}
        <div className="max-w-5xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl p-8 shadow-2xl border-4 border-gray-300">
            <div className="bg-gradient-to-b from-green-200 via-yellow-100 to-amber-100 rounded-2xl overflow-hidden shadow-lg aspect-video">
              <img
                src={getGifByCategory("hero")}
                alt="Beautiful study garden world"
                className="w-full h-full object-cover rounded-2xl"
                loading="lazy"
              />
            </div>

            {/* Demo Info */}
            <div className="mt-6 text-center">
              <p className="text-gray-700 mb-4 font-medium text-lg">
                🎮 <strong>Your Quest Progresses With You:</strong> Complete study sessions to unlock
                new buildings and decorations!
              </p>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
};

export default GardenDemoSection;
