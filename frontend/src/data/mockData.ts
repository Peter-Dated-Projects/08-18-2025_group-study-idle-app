// Garden-themed GIFs for the Study Garden application
// TODO: Replace these URLs with actual garden/plant/nature themed assets later

export const funnyGifs = [
  // Study/Learning GIFs (with garden theme preference)
  "https://media.giphy.com/media/26uf6hOLB8C8W6wUw/giphy.gif", // Books with plants
  "https://media.giphy.com/media/3oKHWikxKFJhjArSXm/giphy.gif", // Plant growing timelapse
  "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif", // Seedling sprouting
  "https://media.giphy.com/media/3o7btT1T9qpQZWhNlK/giphy.gif", // Garden study space

  // Growth/Success GIFs (garden themed)
  "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif", // Flowers blooming
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", // Plant growing fast
  "https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif", // Garden flourishing
  "https://media.giphy.com/media/3o7qE1YN7aBOFPRw8E/giphy.gif", // Harvest time celebration

  // Building/Gardening GIFs
  "https://media.giphy.com/media/l0HlPystfePnAI3G8/giphy.gif", // Planting seeds
  "https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif", // Watering plants
  "https://media.giphy.com/media/3o7qE1YN7aBOFPRw8E/giphy.gif", // Garden maintenance
  "https://media.giphy.com/media/l0HlPystfePnAI3G8/giphy.gif", // Building garden structures

  // Community/Friends GIFs (garden context)
  "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif", // Friends gardening together
  "https://media.giphy.com/media/l1ughbsd9qXz2s9SE/giphy.gif", // Community garden celebration
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", // Sharing garden harvest
  "https://media.giphy.com/media/3o7buirYcmV5nSwIRW/giphy.gif", // Virtual garden tour

  // Success/Achievement GIFs (nature themed)
  "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif", // Golden flower trophy
  "https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif", // Garden celebration
  "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif", // Petals confetti
  "https://media.giphy.com/media/26u4kr3xRaZhfPw4M/giphy.gif", // Level up plant growth

  // Hero section GIFs (magical garden theme)
  "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif", // Magical garden exploration
  "https://media.giphy.com/media/3o7buC8HuOMLkxFpFC/giphy.gif", // Garden sanctuary
  "https://media.giphy.com/media/l1J9GIXk9w7OYsd5S/giphy.gif", // Sparkly plant magic
  "https://media.giphy.com/media/3o6Zt0hNCfak3QCqsw/giphy.gif", // Peaceful garden scene
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
