"use client";

import React from "react";
import { useRouter } from "next/navigation";

const PricingSection: React.FC = () => {
  const router = useRouter();

  const handlePlanClick = (planType: string) => {
    router.push(`/login?type=${planType}`);
  };
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with your study quest, and FREE forever",
      features: [
        "Study Timer",
        "Notion Tracking",
        "Notion Integration",
        "Social Features",
        "Pomo Leaderboard",
        "Shopping System",
      ],
      buttonText: "Start Free",
      buttonStyle: "border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50",
      popular: false,
      type: "free"
    },
    {
      name: "Premium",
      price: "$2.99",
      period: "per month",
      description: "Unlock the full Study Quest experience",
      features: [
        "Everything in Free Plan",
        "Study Group Features",
        "Study Group Leaderboard",
        "Study Group Chat",
        "Study Group Music Dashboard",
      ],
      buttonText: "Go Premium",
      buttonStyle: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white",
      popular: true,
      type: "premium"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Choose Your Quest Level
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Start your journey for free, or unlock premium features to supercharge your study experience.
            Every subscription helps support the independent developer!
          </p>
        </div>

        {/* Pricing Cards Grid Container */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-auto md:h-[650px] justify-items-center">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-3xl shadow-xl p-8 border-2 transition-all duration-300 hover:shadow-2xl flex flex-col w-full max-w-[400px] h-full ${
                  plan.popular ? "border-green-500 transform scale-105" : "border-gray-200"
                }`}
              >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">/{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <button
                  onClick={() => handlePlanClick(plan.type)}
                  className={`w-full py-4 px-6 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${plan.buttonStyle}`}
                >
                  {plan.buttonText}
                </button>
              </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Message */}
        <div className="bg-gray-50 rounded-3xl p-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              💚 Support an Independent Developer
            </h3>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Study Quest is built by a passionate independent developer who believes in making learning 
              engaging and accessible. Your premium subscription directly supports the development and 
              helps continue improving the platform, adding new features, and keeping the lights on!
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">🛠️</span>
                <span className="text-gray-600">Continuous Development</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">🚀</span>
                <span className="text-gray-600">New Features</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">💬</span>
                <span className="text-gray-600">Community Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
