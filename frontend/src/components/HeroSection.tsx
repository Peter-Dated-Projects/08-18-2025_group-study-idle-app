"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getGifByCategory } from "../data/mockData";

interface HeroSectionProps {
  hasUserCookie: boolean | null;
  buttonPressRedirect?: string;
  onButtonClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  hasUserCookie,
  buttonPressRedirect = "/login",
  onButtonClick,
}) => {
  const router = useRouter();
  return (
    <section className="relative h-[90vh] text-white overflow-hidden select-none w-full">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/assets/hero-back.png"
          alt="Study Quest Background"
          className="w-full h-full object-cover object-center"
        />
        {/* Black Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/90"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 h-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center h-full">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                Grow Your
                <span className="bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent">
                  {" "}
                  Study Quest
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-amber-100 leading-relaxed max-w-lg">
                Transform your learning journey into an epic quest. Build your virtual world, level
                up your skills, and watch your dedication grow into something amazing.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onButtonClick || (() => router.push(buttonPressRedirect))}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-8 py-4 rounded-full text-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Your Quest
              </button>
              <button
                onClick={() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="border-2 border-amber-200/50 hover:border-amber-200/70 px-8 py-4 rounded-full text-xl font-semibold transition-all duration-300 hover:bg-amber-200/10"
              >
                Explore Worlds
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center sm:justify-start text-sm text-amber-200">
              <div>Free to start, premium features available</div>
            </div>
          </div>

          {/* Right Column - Empty Space */}
          <div className="hidden lg:block">{/* Intentionally empty for isolated look */}</div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center text-amber-200/80">
            <span className="text-sm mb-2">Discover Worlds</span>
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
    </section>
  );
};

export default HeroSection;
