# /src/components/garden - Garden Application UI

## Purpose

UI components specific to the main garden application where users tend virtual plants while studying.

## Structure

- `ui/` - Modal components (Settings, Friends, Groups menus)
- `tasks/` - Task management UI components
- `tools/` - Study tools (Timer, Lobby, Music sync)
- `prompts/` - User instruction and guidance components
- Root level components for main garden features

## Key Components

- `GardenCanvas.tsx` - PIXI.js canvas for garden rendering
- `GardenIcons.tsx` - UI icons in top-right (Friends, Groups, Profile)
- `UserProfile.tsx` - User profile modal
- `RightPanel.tsx` - Side panel with tasks and tools

### `/ui` Directory

- `GardenSettings.tsx` - Settings modal with logout functionality
- `FriendsMenu.tsx` - Friend management interface
- `GroupsModal.tsx` - Study group management
- `GardenMenu.tsx` - Main garden menu

### `/tasks` Directory

- Task list display and management
- Loading and empty states
- Task sorting and filtering
- Notion integration for tasks

### `/tools` Directory

- Work block timer (Pomodoro)
- Study group lobbies
- Music synchronization
- Group collaboration tools

## Agent Notes

- Components use canvas-constrained modals (constrainToCanvas={true})
- Garden canvas is PIXI.js based for real-time rendering
- UI follows consistent design system from constants.tsx
- Many components integrate with external APIs (Notion, backend services)
- Focus on study productivity and social features
