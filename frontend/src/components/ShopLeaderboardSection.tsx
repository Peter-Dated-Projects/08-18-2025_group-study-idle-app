"use client";

import React, { useState } from "react";
import { getGifByCategory } from "../data/mockData";

const ShopLeaderboardSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"shop" | "leaderboard">("shop");

  const shopItems = [
    {
      id: 1,
      name: "Wizard Tower",
      description: "Boost your research efficiency by 25%. Perfect for STEM students!",
      price: 500,
      rarity: "Epic",
      rarityColor: "text-purple-600 bg-purple-100",
      icon: "🏰",
      effect: "+25% Research Speed",
      category: "Building",
    },
    {
      id: 2,
      name: "Study Café",
      description: "A cozy place that increases focus time and provides energy boosts.",
      price: 300,
      rarity: "Rare",
      rarityColor: "text-blue-600 bg-blue-100",
      icon: "☕",
      effect: "+2 Energy per hour",
      category: "Building",
    },
    {
      id: 3,
      name: "Rainbow Fountain",
      description: "Beautiful decoration that boosts mood and provides daily coin bonuses.",
      price: 750,
      rarity: "Legendary",
      rarityColor: "text-yellow-600 bg-yellow-100",
      icon: "⛲",
      effect: "+50 coins daily",
      category: "Decoration",
    },
    {
      id: 4,
      name: "Study Buddy Pet",
      description: "A cute companion that keeps you motivated during long study sessions.",
      price: 200,
      rarity: "Common",
      rarityColor: "text-gray-600 bg-gray-100",
      icon: "🐕",
      effect: "+10% Motivation",
      category: "Pet",
    },
    {
      id: 5,
      name: "Time Crystal",
      description: "Extends Pomodoro sessions and provides bonus XP for completed tasks.",
      price: 1000,
      rarity: "Mythic",
      rarityColor: "text-pink-600 bg-pink-100",
      icon: "💎",
      effect: "+50% XP gain",
      category: "Power-up",
    },
    {
      id: 6,
      name: "Garden Gnome",
      description: "Quirky decoration that randomly generates bonus resources.",
      price: 150,
      rarity: "Common",
      rarityColor: "text-gray-600 bg-gray-100",
      icon: "🧙‍♂️",
      effect: "Random bonuses",
      category: "Decoration",
    },
  ];

  const leaderboardData = [
    { rank: 1, name: "StudyMaster_2024", avatar: "👑", points: 15240, streak: 47, school: "MIT" },
    {
      rank: 2,
      name: "CodeNinja_Sarah",
      avatar: "🥷",
      points: 14850,
      streak: 43,
      school: "Stanford",
    },
    {
      rank: 3,
      name: "MathWizard_John",
      avatar: "🧙‍♂️",
      points: 14200,
      streak: 39,
      school: "Harvard",
    },
    { rank: 4, name: "BookwormBella", avatar: "📚", points: 13750, streak: 35, school: "Yale" },
    { rank: 5, name: "QuantumStudent", avatar: "⚛️", points: 13500, streak: 41, school: "Caltech" },
    { rank: 6, name: "FocusedFox", avatar: "🦊", points: 13200, streak: 28, school: "Princeton" },
    { rank: 7, name: "StudySpeedster", avatar: "⚡", points: 12900, streak: 31, school: "Oxford" },
    { rank: 8, name: "GrindingGuru", avatar: "💪", points: 12650, streak: 26, school: "Berkeley" },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">Shop & Compete</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Spend your hard-earned coins on amazing structures and decorations, then see how you
            rank against students worldwide.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 rounded-full p-2 flex space-x-2">
            <button
              onClick={() => setActiveTab("shop")}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === "shop"
                  ? "bg-white text-blue-600 shadow-lg"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🛍️ Item Shop
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === "leaderboard"
                  ? "bg-white text-blue-600 shadow-lg"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>

        {/* Shop Tab Content */}
        {activeTab === "shop" && (
          <div className="space-y-12">
            {/* Shop Header */}
            <div className="text-center">
              <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-6 py-3 mb-4">
                <span className="text-white font-bold text-lg">💰 Your Balance: 1,250 coins</span>
              </div>
              <p className="text-gray-600">
                Earn coins by completing study sessions and use them to customize your world!
              </p>
            </div>

            {/* Shop Items Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {shopItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-gray-200 rounded-3xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Item Header */}
                  <div className="text-center mb-4">
                    <div className="text-6xl mb-3">{item.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${item.rarityColor}`}
                    >
                      {item.rarity}
                    </span>
                  </div>

                  {/* Item Details */}
                  <div className="space-y-3 mb-6">
                    <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-600 font-semibold">{item.effect}</span>
                      <span className="text-purple-600 font-semibold">{item.category}</span>
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <div className="space-y-3">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-gray-900">💰 {item.price}</span>
                    </div>
                    <button
                      className={`w-full py-3 px-6 rounded-full font-semibold transition-all duration-300 ${
                        item.price <= 1250
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:shadow-lg transform hover:scale-105"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      disabled={item.price > 1250}
                    >
                      {item.price <= 1250 ? "Purchase" : "Insufficient Coins"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Shop Features */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8">
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
                Why Shop With Us?
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                    🔄
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Daily Updates</h4>
                  <p className="text-gray-600 text-sm">
                    New items added weekly with seasonal specials and limited editions.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                    💡
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Functional Items</h4>
                  <p className="text-gray-600 text-sm">
                    Every purchase provides real gameplay benefits and study boosts.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                    🎨
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Customization</h4>
                  <p className="text-gray-600 text-sm">
                    Make your world unique with hundreds of combinations and themes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab Content */}
        {activeTab === "leaderboard" && (
          <div className="space-y-8">
            {/* Leaderboard Header */}
            <div className="text-center">
              <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-6 py-3 mb-4">
                <span className="text-white font-bold text-lg">🏆 Weekly Global Leaderboard</span>
              </div>
              <p className="text-gray-600">
                Compete with students worldwide. Top performers get exclusive rewards!
              </p>
            </div>

            {/* Top 3 Podium */}
            <div className="flex justify-center items-end space-x-8 mb-12">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="w-24 h-32 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg flex items-end justify-center pb-4 relative">
                  <span className="text-white font-bold text-lg">2</span>
                  <div className="absolute -top-12 text-4xl">{leaderboardData[1].avatar}</div>
                </div>
                <div className="mt-4">
                  <h4 className="font-bold text-gray-900">{leaderboardData[1].name}</h4>
                  <p className="text-gray-600 text-sm">
                    {leaderboardData[1].points.toLocaleString()} pts
                  </p>
                  <p className="text-orange-500 text-xs font-semibold">
                    {leaderboardData[1].streak} day streak
                  </p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center">
                <div className="w-28 h-40 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg flex items-end justify-center pb-4 relative">
                  <span className="text-white font-bold text-xl">1</span>
                  <div className="absolute -top-16 text-5xl">{leaderboardData[0].avatar}</div>
                  <div className="absolute -top-6 text-2xl">✨</div>
                </div>
                <div className="mt-4">
                  <h4 className="font-bold text-gray-900 text-lg">{leaderboardData[0].name}</h4>
                  <p className="text-gray-600">{leaderboardData[0].points.toLocaleString()} pts</p>
                  <p className="text-orange-500 text-sm font-semibold">
                    {leaderboardData[0].streak} day streak
                  </p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center">
                <div className="w-24 h-28 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-lg flex items-end justify-center pb-4 relative">
                  <span className="text-white font-bold text-lg">3</span>
                  <div className="absolute -top-12 text-4xl">{leaderboardData[2].avatar}</div>
                </div>
                <div className="mt-4">
                  <h4 className="font-bold text-gray-900">{leaderboardData[2].name}</h4>
                  <p className="text-gray-600 text-sm">
                    {leaderboardData[2].points.toLocaleString()} pts
                  </p>
                  <p className="text-orange-500 text-xs font-semibold">
                    {leaderboardData[2].streak} day streak
                  </p>
                </div>
              </div>
            </div>

            {/* Full Leaderboard */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <h3 className="text-xl font-bold text-center">Global Rankings</h3>
              </div>

              <div className="divide-y divide-gray-200">
                {leaderboardData.map((player) => (
                  <div
                    key={player.rank}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          player.rank === 1
                            ? "bg-yellow-500 text-white"
                            : player.rank === 2
                            ? "bg-gray-400 text-white"
                            : player.rank === 3
                            ? "bg-amber-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {player.rank}
                      </div>
                      <div className="text-2xl">{player.avatar}</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{player.name}</h4>
                        <p className="text-sm text-gray-500">{player.school}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {player.points.toLocaleString()} pts
                      </div>
                      <div className="text-sm text-orange-500 font-semibold">
                        {player.streak} day streak
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 p-4 text-center">
                <p className="text-gray-600 text-sm">
                  Your rank: <span className="font-bold text-blue-600">#247</span> • Points needed
                  for next rank: <span className="font-bold text-green-600">127 pts</span>
                </p>
                <button className="mt-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  View Full Leaderboard
                </button>
              </div>
            </div>

            {/* Leaderboard Features */}
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">🏅</div>
                <h4 className="font-bold text-gray-900 mb-2">Weekly Rewards</h4>
                <p className="text-gray-600 text-sm">
                  Top 10 players receive exclusive items and bonus coins every week.
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">📈</div>
                <h4 className="font-bold text-gray-900 mb-2">Progress Tracking</h4>
                <p className="text-gray-600 text-sm">
                  See your rank improvements and compare performance over time.
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="font-bold text-gray-900 mb-2">Fair Competition</h4>
                <p className="text-gray-600 text-sm">
                  Multiple categories ensure everyone has a chance to shine and compete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16">
          <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            Start Earning & Competing Today
          </button>
        </div>
      </div>
    </section>
  );
};

export default ShopLeaderboardSection;
