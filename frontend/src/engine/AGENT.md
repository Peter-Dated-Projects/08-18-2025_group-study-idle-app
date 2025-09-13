# /src/engine - PIXI.js Game Engine Components

## Purpose

Custom game engine built on PIXI.js for rendering the interactive garden environment with entities, animations, and physics.

## Structure

- **Core Systems**: Entity, Animation, Collision, Rigidbody
- **Graphics**: SpriteSheet, Tilemap rendering
- **Utilities**: Math helpers, entity management, collision detection

## Key Files

- `Entity.tsx` - Base entity class for game objects
- `CharacterAnimation.tsx` - Character animation state machine
- `AnimationLoader.tsx` - Sprite animation loading system
- `SpriteSheet.tsx` - Sprite sheet management and rendering
- `Tilemap.tsx` - Tile-based world rendering
- `Collider.tsx` - Collision detection system
- `Rigidbody.tsx` - Physics body component
- `EntityUtils.tsx` - Entity management utilities
- `GlobalSignalHandler.tsx` - Global event system
- `utils.tsx` - Math and file loading utilities

## Architecture

- **Entity-Component System** - Modular game object architecture
- **Animation State Machine** - Frame-based character animations
- **Collision System** - AABB and custom collision detection
- **Signal System** - Event-driven communication between systems

## Agent Notes

- Built on PIXI.js v7+ for WebGL rendering
- Use Entity class as base for all game objects
- Animations are sprite-based with state machines
- Collision detection supports rectangles and custom shapes
- Coordinate system: (0,0) at top-left, Y increases downward
- Frame-based animation timing (not time-based)
- Extensible component system for adding behaviors
