# StudyQuest Landing Page

A beautiful, responsive landing page inspired by CodeCombat's design, built specifically for the StudyQuest productivity/study app.

## 🎨 Design Features

- **Hero Section**: Epic gradient background with animated elements and compelling CTAs
- **How It Works**: 4-step process explanation with alternating layouts and feature highlights
- **Interactive PIXI.js Demo**: Live preview of the study world with clickable buildings
- **Community Section**: Testimonials, stats, and social features
- **Shop & Leaderboard**: Tabbed interface showing in-app purchases and competitive rankings
- **Responsive Navigation**: Mobile-friendly with smooth scroll anchors
- **Beautiful Footer**: Comprehensive links, newsletter signup, and social proof

## 🛠️ Technology Stack

- **Next.js 15**: React framework with app router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **PIXI.js**: Interactive graphics engine for demo
- **Responsive Design**: Mobile-first approach

## 📁 File Structure

```
frontend/src/
├── components/
│   ├── Navigation.tsx          # Fixed navigation with mobile menu
│   ├── HeroSection.tsx         # Main hero with CTAs
│   ├── HowItWorksSection.tsx   # 4-step process explanation
│   ├── PixiDemoSection.tsx     # Interactive PIXI.js demo
│   ├── CommunitySection.tsx    # Testimonials and features
│   ├── ShopLeaderboardSection.tsx # Shop items and rankings
│   └── Footer.tsx              # Footer with links and stats
├── pages/
│   └── LandingPage.tsx         # Main landing page composition
├── data/
│   └── mockData.ts             # Funny GIF placeholders and mock data
└── app/
    └── page.tsx                # Next.js app router entry point
```

## 🎯 Key Features Implemented

### 1. Hero Section

- Gradient background with animated decorative elements
- Compelling headline with gradient text
- Two CTA buttons (Start Your Adventure, Watch Demo)
- Social proof and feature highlights
- Scroll indicator with animation

### 2. How It Works

- 4-step process with alternating layouts
- Animated GIF placeholders for each step
- Feature bullet points for each stage
- Gradient step indicators
- Responsive design with proper mobile layout

### 3. PIXI.js Interactive Demo

- Real-time interactive buildings
- Click animations with floating coin rewards
- Animated clouds and background
- Hover effects on structures
- Responsive canvas that adapts to screen size
- Building labels and categories

### 4. Community Features

- Student testimonials with ratings
- Community statistics
- Feature cards with hover animations
- Growing community stats
- CTA for joining

### 5. Shop & Leaderboard

- Tabbed interface for easy navigation
- Detailed shop items with rarity system
- Interactive leaderboard with rankings
- Podium design for top 3 players
- Purchase functionality (UI only)

### 6. Navigation & Footer

- Fixed navigation with smooth scroll
- Mobile hamburger menu
- Newsletter signup
- Social media links
- Comprehensive footer links
- Real-time community stats bar

## 🎨 Visual Elements

- **Color Scheme**: Purple/blue gradients with orange/red accents
- **Typography**: System fonts with proper hierarchy
- **Animations**: Subtle hover effects, floating elements, smooth transitions
- **Icons**: Emoji-based icons for universal appeal
- **Images**: Funny GIF placeholders that can be easily replaced

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints for sm, md, lg, xl screens
- Flexible grid layouts
- Touch-friendly navigation
- Optimized for all device sizes

## 🚀 Getting Started

The landing page is now integrated as the main home page. When you run:

```bash
npm run dev
```

You'll see the new CodeCombat-style landing page at `http://localhost:3000`

## 🔗 Navigation Flow

- **Hero CTAs** → Route to `/login` page
- **Demo Button** → Smooth scroll to PIXI demo section
- **All CTAs** → Currently route to login (can be customized)
- **Smooth scrolling** → Between all sections

## 🎭 Placeholder Content

All GIFs are sourced from Giphy with funny/engaging placeholders that can be easily replaced with final assets. The mock data includes:

- Student testimonials
- Shop items with pricing
- Leaderboard rankings
- Community statistics
- Feature descriptions

## 🔧 Customization

To customize the landing page:

1. **Replace GIFs**: Update URLs in `mockData.ts`
2. **Update Copy**: Modify text content in each component
3. **Change Colors**: Adjust Tailwind classes for brand colors
4. **Add Sections**: Create new components and add to `LandingPage.tsx`
5. **Update CTAs**: Modify button actions in Navigation and Hero components

## ✨ Special Features

- **PIXI.js Integration**: Fully functional interactive demo
- **Smooth Animations**: CSS transitions and hover effects
- **Performance Optimized**: Lazy loading for images and efficient rendering
- **SEO Friendly**: Proper semantic HTML structure
- **Accessibility**: Keyboard navigation and screen reader friendly

The landing page is now ready to impress visitors and convert them into active users of your StudyQuest productivity app!
