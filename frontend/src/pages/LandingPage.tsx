"use client";

import React from "react";
import Navigation from "../components/Navigation";
import HeroSection from "../components/HeroSection";
import HowItWorksSection from "../components/HowItWorksSection";
import GardenDemoSection from "../components/GardenDemoSection";
import PricingSection from "../components/PricingSection";
import { getRandomGif } from "../data/mockData";

const LandingPage: React.FC = () => {
  const [hasUserCookie, setHasUserCookie] = React.useState<boolean | null>(null);
  const [buttonPressRedirect, setButtonPressRedirect] = React.useState<string>("/login");

  // Handle button click based on authentication status
  const handleButtonClick = () => {
    if (hasUserCookie) {
      // User is logged in, redirect to garden
      window.location.href = "/garden";
    } else {
      // User is not logged in, scroll to pricing section
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Check for user cookie on component mount
  React.useEffect(() => {
    const checkUserCookie = async () => {
      try {
        const response = await fetch("/api/auth/check-cookie");
        const data = await response.json();
        setHasUserCookie(data.hasUserCookie);
        // Set redirect based on authentication status
        setButtonPressRedirect(data.hasUserCookie ? "/garden" : "/login");
      } catch (error) {
        console.error("Error checking user cookie:", error);
        setHasUserCookie(false);
        setButtonPressRedirect("/login");
      }
    };

    checkUserCookie();
  }, []);

  // Override custom cursor styles for landing page
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .landing-page,
      .landing-page * {
        cursor: auto !important;
      }
      .landing-page button,
      .landing-page a,
      .landing-page [role="button"],
      .landing-page .cursor-pointer,
      .landing-page input[type="button"],
      .landing-page input[type="submit"],
      .landing-page input[type="reset"] {
        cursor: pointer !important;
      }
      .landing-page button:hover,
      .landing-page a:hover,
      .landing-page [role="button"]:hover,
      .landing-page .cursor-pointer:hover {
        cursor: pointer !important;
      }
      .landing-page input[type="text"],
      .landing-page input[type="email"],
      .landing-page input[type="password"],
      .landing-page input[type="search"],
      .landing-page textarea {
        cursor: text !important;
      }
      .landing-page button:disabled,
      .landing-page input:disabled,
      .landing-page [disabled] {
        cursor: not-allowed !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen landing-page relative overflow-x-hidden">
      {/* Background GIF */}
      <div className="fixed inset-0 z-0">
        <img src={getRandomGif()} alt="Background" className="w-full h-full object-cover" />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-white bg-opacity-90"></div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Navigation */}
        <Navigation />

        {/* Hero Section */}
        <section id="hero">
          <HeroSection
            hasUserCookie={hasUserCookie}
            buttonPressRedirect={buttonPressRedirect}
            onButtonClick={handleButtonClick}
          />
        </section>

        {/* How It Works Section */}
        <section id="how-it-works">
          <HowItWorksSection onButtonClick={handleButtonClick} />
        </section>

        {/* Garden Demo Section */}
        <section id="demo">
          <GardenDemoSection />
        </section>

        {/* Pricing Section */}
        <section id="pricing">
          <PricingSection />
        </section>

        {/* Final Call to Action Section */}
        <section className="h-[400px] bg-black bg-opacity-20 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8">
              Ready to Transform Your Study Journey?
            </h2>
            <button
              onClick={handleButtonClick}
              className="bg-white text-green-600 hover:text-green-700 px-12 py-4 rounded-full text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Start Studying Now!
            </button>
          </div>
        </section>

        {/* Basic Footer */}
        <footer className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-8 select-none">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-green-600 font-bold">
                  📚
                </div>
                <span className="text-xl font-bold">Study Quest</span>
              </div>
              <p className="text-white text-sm opacity-90">
                Transform your learning journey into an epic adventure.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
