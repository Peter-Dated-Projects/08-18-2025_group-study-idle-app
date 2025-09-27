"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasUserCookies, setHasUserCookies] = useState(false);
  const [buttonPressRedirect, setButtonPressRedirect] = useState<string>('/login');
  const router = useRouter();

  // Check for user authentication via server-side API
  useEffect(() => {
    const checkUserAuth = async () => {
      try {
        console.log('🔐 Checking authentication via server-side API...');
        const response = await fetch('/api/auth/check-cookie');
        const data = await response.json();
        
        console.log('🔐 Auth check response:', data);
        console.log('🔐 Has user cookies:', data.hasCookie);
        
        setHasUserCookies(data.hasCookie);
        // Set redirect based on authentication status
        setButtonPressRedirect(data.hasCookie ? '/garden' : '/login');
      } catch (error) {
        console.error('🔐 Error checking authentication:', error);
        setHasUserCookies(false);
        setButtonPressRedirect('/login');
      }
    };

    checkUserAuth();
  }, []);

    const navItems: never[] = [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200/30 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16 relative">
          {/* Logo - Centered */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              📚
            </div>
            <span className="text-xl font-bold text-gray-900">Study Quest</span>
          </div>

          {/* CTA Buttons - Positioned absolutely to the right */}
          <div className="hidden md:flex items-center space-x-4 absolute right-0">
            {hasUserCookies ? (
              <>
                <button
                  onClick={() => router.push(buttonPressRedirect)}
                  className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200"
                >
                  Start Growing
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Login
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-gray-900 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              {/* Navigation items removed */}
              <div className="border-t border-gray-200 pt-3 space-y-2">
                {hasUserCookies ? (
                  <>
                    <button
                      onClick={() => router.push(buttonPressRedirect)}
                      className="block w-full text-left px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md font-medium transition-colors duration-200"
                    >
                      Start Growing
                    </button>
                    <button
                      onClick={() => router.push("/login")}
                      className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2 rounded-md font-semibold transition-all duration-300"
                    >
                      Login
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2 rounded-md font-semibold transition-all duration-300"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
