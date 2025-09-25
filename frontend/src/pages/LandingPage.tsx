"use client";

import React from "react";
import Navigation from "../components/Navigation";
import HeroSection from "../components/HeroSection";
import HowItWorksSection from "../components/HowItWorksSection";
import PixiDemoSection from "../components/PixiDemoSection";
import CommunitySection from "../components/CommunitySection";
import ShopLeaderboardSection from "../components/ShopLeaderboardSection";
import Footer from "../components/Footer";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section id="hero">
        <HeroSection />
      </section>

      {/* How It Works Section */}
      <section id="how-it-works">
        <HowItWorksSection />
      </section>

      {/* PIXI Demo Section */}
      <section id="demo">
        <PixiDemoSection />
      </section>

      {/* Community Section */}
      <section id="community">
        <CommunitySection />
      </section>

      {/* Shop & Leaderboard Section */}
      <section id="shop">
        <ShopLeaderboardSection />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
