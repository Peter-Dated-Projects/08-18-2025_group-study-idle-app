"use client";

import React from "react";
import { getGifByCategory } from "../data/mockData";

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: 1,
      title: "Start Studying",
      description: "Focus on your studies using our Pomodoro timer and task management system.",
      icon: "📚",
      gif: getGifByCategory("study"),
      color: "from-blue-500 to-purple-600",
    },
    {
      step: 2,
      title: "Earn Rewards",
      description:
        "Complete study sessions to earn coins and unlock new structures for your world.",
      icon: "💰",
      gif: getGifByCategory("success"),
      color: "from-green-500 to-emerald-600",
    },
    {
      step: 3,
      title: "Build Your World",
      description:
        "Use your earned resources to expand and customize your virtual study sanctuary.",
      icon: "🏗️",
      gif: getGifByCategory("build"),
      color: "from-orange-500 to-red-600",
    },
    {
      step: 4,
      title: "Compete & Connect",
      description:
        "Join study groups, compete on leaderboards, and motivate each other to succeed.",
      icon: "🏆",
      gif: getGifByCategory("community"),
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your study routine into an engaging adventure. Here's how our gamified
            learning platform helps you stay motivated and achieve your goals.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-20">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`flex flex-col lg:flex-row items-center gap-12 ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Content */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg`}
                  >
                    {step.step}
                  </div>
                  <div className="text-4xl">{step.icon}</div>
                </div>

                <h3 className="text-3xl sm:text-4xl font-bold text-gray-900">{step.title}</h3>

                <p className="text-lg text-gray-600 leading-relaxed">{step.description}</p>

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
              <div className="flex-1">
                <div className="relative max-w-md mx-auto">
                  {/* Main card */}
                  <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
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

                  {/* Decorative elements */}
                  <div
                    className={`absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
                  >
                    {step.step}
                  </div>

                  {/* Floating icons */}
                  {step.step === 1 && (
                    <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white animate-pulse">
                      ⏰
                    </div>
                  )}
                  {step.step === 2 && (
                    <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white animate-spin">
                      💎
                    </div>
                  )}
                  {step.step === 3 && (
                    <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white animate-bounce">
                      🏡
                    </div>
                  )}
                  {step.step === 4 && (
                    <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white animate-pulse">
                      👥
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            Ready to Start Your Journey?
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
