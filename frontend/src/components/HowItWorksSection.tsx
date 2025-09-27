"use client";

import React from "react";
import { getGifByCategory } from "../data/mockData";

interface HowItWorksSectionProps {
  onButtonClick?: () => void;
}

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onButtonClick }) => {
  const steps = [
    {
      step: 1,
      title: "Begin Your Quest",
      description:
        "Start studying with our focus timer and watch your virtual world come to life.",
      icon: "🎮",
      gif: getGifByCategory("study"),
      color: "from-green-500 to-emerald-600",
    },
    {
      step: 2,
      title: "Level Up",
      description: "Complete study sessions to earn experience points and unlock new abilities.",
      icon: "⚡",
      gif: getGifByCategory("success"),
      color: "from-yellow-400 to-amber-500",
    },
    {
      step: 3,
      title: "Build Your World",
      description:
        "Use your earned resources to add amazing buildings, decorations, and structures.",
      icon: "🏰",
      gif: getGifByCategory("build"),
      color: "from-pink-400 to-rose-500",
    },
    {
      step: 4,
      title: "Share & Compete",
      description:
        "Show off your world, visit friends' creations, and compete together as a community.",
      icon: "🤝",
      gif: getGifByCategory("community"),
      color: "from-orange-400 to-amber-600",
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[80%]">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            How Your Quest Unfolds
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Transform your study routine into an epic adventure. Here's how our engaging
            learning environment helps you level up and achieve your goals.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-20 w-full">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`flex flex-col lg:flex-row items-start lg:items-center gap-12 w-full ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Content */}
              <div className="flex-1 w-full space-y-6">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                  >
                    {step.step}
                  </div>
                </div>

                <h3 className="text-3xl sm:text-4xl font-bold text-gray-900">{step.title}</h3>

                <p className="text-lg text-gray-700 leading-relaxed">{step.description}</p>

                {/* Feature highlights for each step */}
                <div className="space-y-2">
                  {step.step === 1 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>25-minute focused study sessions</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Track your daily study goals</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Subject-specific progress tracking</span>
                      </div>
                    </div>
                  )}

                  {step.step === 2 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Earn coins for every completed session</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Bonus rewards for consistency streaks</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Unlock achievements and badges</span>
                      </div>
                    </div>
                  )}

                  {step.step === 3 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>Choose from 50+ unique structures</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>Customize your world layout</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>Upgrade buildings for better rewards</span>
                      </div>
                    </div>
                  )}

                  {step.step === 4 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>Join study groups with friends</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>Compete on weekly leaderboards</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>Share achievements with community</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual */}
              <div className="flex-1 w-full">
                <div className="relative w-full">
                  {/* Main card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 w-full">
                    <div className="aspect-video bg-gray-100">
                      <img
                        src={step.gif}
                        alt={`${step.title} demonstration`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-6">
                      <h4 className="font-semibold text-lg text-gray-900 mb-2">
                        Step {step.step}: {step.title}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        Interactive preview of {step.title.toLowerCase()} functionality
                      </p>
                    </div>
                  </div>


                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <button 
            onClick={onButtonClick}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Ready to Start Your Quest?
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
