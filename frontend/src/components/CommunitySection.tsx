"use client";

import React from "react";
import { getGifByCategory } from "../data/mockData";

const CommunitySection: React.FC = () => {
  const communityFeatures = [
    {
      title: "Garden Circles",
      description:
        "Join or create garden circles with friends and fellow learners. Share growth goals, nurture each other's progress, and bloom together.",
      icon: "🌸",
      gif: getGifByCategory("community"),
      stats: "12,000+ active circles",
      color: "from-pink-400 to-rose-500",
    },
    {
      title: "Flourish Rankings",
      description:
        "See how your garden ranks among fellow cultivators worldwide. Participate in seasonal growth challenges and community events!",
      icon: "🏆",
      gif: getGifByCategory("success"),
      stats: "50,000+ gardeners",
      color: "from-yellow-400 to-amber-500",
    },
    {
      title: "Growth Milestones",
      description:
        "Showcase your learning journey and garden achievements. Earn special seeds, rare plants, and master gardener titles.",
      icon: "�",
      gif: getGifByCategory("success"),
      stats: "100+ milestones",
      color: "from-green-400 to-emerald-500",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Computer Science Student",
      university: "Stanford University",
      quote:
        "This app completely transformed how I study! The gamification keeps me motivated, and my study group helps me stay accountable.",
      avatar: "👩‍💻",
      rating: 5,
      studyTime: "180 hours this month",
    },
    {
      name: "Marcus Johnson",
      role: "Pre-Med Student",
      university: "Harvard University",
      quote:
        "The leaderboards make studying feel like a game. I've increased my study time by 300% and actually enjoy it now!",
      avatar: "👨‍⚕️",
      rating: 5,
      studyTime: "220 hours this month",
    },
    {
      name: "Elena Rodriguez",
      role: "Engineering Student",
      university: "MIT",
      quote:
        "Building my virtual world while studying for finals was incredibly rewarding. It made the stress bearable and fun!",
      avatar: "👩‍🔬",
      rating: 5,
      studyTime: "195 hours this month",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-amber-900 mb-6">Growing Together</h2>
          <p className="text-xl text-amber-800 max-w-3xl mx-auto">
            Connect with thousands of dedicated learners worldwide. Cultivate knowledge together,
            share your growth journey, and flourish as a community of lifelong learners.
          </p>
        </div>

        {/* Community Features */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {communityFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-amber-100"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div
                  className={`w-20 h-20 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-orange-600 font-semibold">{feature.stats}</p>
              </div>

              {/* GIF Preview */}
              <div className="aspect-video bg-amber-50 rounded-2xl overflow-hidden mb-6 shadow-inner border border-amber-100">
                <img
                  src={feature.gif}
                  alt={`${feature.title} preview`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Description */}
              <p className="text-amber-800 leading-relaxed mb-6">{feature.description}</p>

              {/* Action Button */}
              <button
                className={`w-full bg-gradient-to-r ${feature.color} text-white py-3 px-6 rounded-full font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                {feature.title === "Garden Circles" && "Join a Circle"}
                {feature.title === "Flourish Rankings" && "View Gardens"}
                {feature.title === "Growth Milestones" && "Browse Achievements"}
              </button>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            What Students Are Saying
          </h3>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-8 relative">
                {/* Quote Icon */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                  "
                </div>

                {/* Rating */}
                <div className="flex justify-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">
                      ⭐
                    </span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-600 italic text-center mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author Info */}
                <div className="text-center">
                  <div className="text-4xl mb-3">{testimonial.avatar}</div>
                  <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
                  <p className="text-blue-600 font-semibold">{testimonial.role}</p>
                  <p className="text-gray-500 text-sm">{testimonial.university}</p>
                  <div className="mt-3 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                    {testimonial.studyTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Stats */}
        <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">Growing Every Day</h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">52K+</div>
              <div className="text-gray-600">Active Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">2.1M+</div>
              <div className="text-gray-600">Study Hours</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">12K+</div>
              <div className="text-gray-600">Study Groups</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">185+</div>
              <div className="text-gray-600">Countries</div>
            </div>
          </div>

          <div className="mt-12">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
              Join the Community Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
