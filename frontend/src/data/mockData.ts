// Mock data with funny GIFs for placeholder content
// TODO: Replace these URLs with final assets later

export const funnyGifs = [
  // Study/Learning GIFs
  "https://media.giphy.com/media/l2Je66zG6mAAZxgqI/giphy.gif", // Cat typing on laptop
  "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", // Dog with glasses reading
  "https://media.giphy.com/media/5wWf7GR2nhgamhRnEuA/giphy.gif", // Brain with sparkles
  "https://media.giphy.com/media/3o7btNhMBytxAM6YBa/giphy.gif", // Student cramming books

  // Shopping/Buying GIFs
  "https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif", // Money flying
  "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif", // Shopping cart animation
  "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif", // Credit card swipe
  "https://media.giphy.com/media/3o85xnoIXebk3xYx4Q/giphy.gif", // Cash register

  // Building/Growing GIFs
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", // Plant growing
  "https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif", // House building animation
  "https://media.giphy.com/media/3o7qE1YN7aBOFPRw8E/giphy.gif", // Farm animals
  "https://media.giphy.com/media/l0HlPystfePnAI3G8/giphy.gif", // Construction worker

  // Community/Friends GIFs
  "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif", // High five
  "https://media.giphy.com/media/l1ughbsd9qXz2s9SE/giphy.gif", // Group celebration
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", // Friends working together
  "https://media.giphy.com/media/3o7buirYcmV5nSwIRW/giphy.gif", // Online meeting

  // Success/Achievement GIFs
  "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif", // Trophy
  "https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif", // Winner celebration
  "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif", // Confetti
  "https://media.giphy.com/media/26u4kr3xRaZhfPw4M/giphy.gif", // Level up

  // Hero section GIFs
  "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif", // Adventure/exploration
  "https://media.giphy.com/media/3o7buC8HuOMLkxFpFC/giphy.gif", // Rocket launch
  "https://media.giphy.com/media/l1J9GIXk9w7OYsd5S/giphy.gif", // Magic sparkles
  "https://media.giphy.com/media/3o6Zt0hNCfak3QCqsw/giphy.gif", // Game controller
];

export const getRandomGif = (): string => {
  return funnyGifs[Math.floor(Math.random() * funnyGifs.length)];
};

export const getGifByCategory = (
  category: "study" | "shop" | "build" | "community" | "success" | "hero"
): string => {
  const categoryRanges = {
    study: funnyGifs.slice(0, 4),
    shop: funnyGifs.slice(4, 8),
    build: funnyGifs.slice(8, 12),
    community: funnyGifs.slice(12, 16),
    success: funnyGifs.slice(16, 20),
    hero: funnyGifs.slice(20, 24),
  };

  const categoryGifs = categoryRanges[category];
  return categoryGifs[Math.floor(Math.random() * categoryGifs.length)];
};
