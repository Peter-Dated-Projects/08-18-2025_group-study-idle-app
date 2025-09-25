"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getGifByCategory } from "../data/mockData";

const HeroSection: React.FC = () => {
  const router = useRouter();
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px] opacity-20"></div>

      {/* Hero Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                Level Up Your
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {" "}
                  Study Game
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed max-w-lg">
                Transform your productivity into an epic adventure. Build your virtual world,
                compete with friends, and watch your study habits grow into something amazing.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8 py-4 rounded-full text-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Your Adventure
              </button>
              <button
                onClick={() => {
                  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="border-2 border-white/30 hover:border-white/50 px-8 py-4 rounded-full text-xl font-semibold transition-all duration-300 hover:bg-white/10"
              >
                Watch Demo
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                <span>4.9/5 from 12K+ students</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-gray-600"></div>
              <div className="hidden sm:block">Free to start, premium features available</div>
            </div>
          </div>

          {/* Right Column - Visual Content */}
          <div className="relative">
            {/* Main Hero Image/GIF */}
            <div className="relative z-10 bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={getGifByCategory("hero")}
                  alt="Epic study adventure preview"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-2xl font-bold mb-2">Your Study World Awaits</h3>
                <p className="text-gray-300">
                  Build, grow, and compete in the ultimate productivity game
                </p>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-2xl animate-bounce">
              🎮
            </div>
            <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-xl animate-pulse">
              📚
            </div>
            <div className="absolute top-1/2 -right-8 w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center animate-spin">
              ✨
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center text-white/60">
            <span className="text-sm mb-2">Discover More</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-400 rounded-full opacity-60 animate-ping"></div>
      <div
        className="absolute top-1/3 right-20 w-3 h-3 bg-blue-400 rounded-full opacity-60 animate-ping"
        style={{ animationDelay: "1s" }}
      ></div>
      <div
        className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full opacity-60 animate-ping"
        style={{ animationDelay: "2s" }}
      ></div>
    </section>
  );
};

export default HeroSection;
