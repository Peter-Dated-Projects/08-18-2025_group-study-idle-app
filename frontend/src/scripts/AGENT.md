# /src/scripts - Entity Behavior Scripts

## Purpose

Behavior scripts and state machines for game entities, particularly character AI and animations.

## Key Files

- `AvatarSignalHandler.tsx` - Avatar event handling system
- `AvatarStateMachine.tsx` - Player avatar behavior and states
- `CowBabyStateMachine.tsx` - Pet cow character AI and animations

## Script Architecture

### State Machines

- **Finite State Machine** pattern for character behaviors
- **Signal-based communication** between entities
- **Animation integration** with behavior states
- **Pathfinding and movement** logic

### Avatar System

- Player character controller
- Input handling and response
- Animation state management
- Interaction with environment

### Pet AI (CowBaby)

- Autonomous pet behavior
- Following and wandering states
- Interactive responses to player
- Idle animations and activities

## Agent Notes

- Scripts extend the engine's Entity system
- State machines control both logic and animations
- Use signals for entity communication
- Behaviors are frame-based, not time-based
- Each script should handle its own state transitions
- Animation states should sync with behavior states
- Consider performance when adding new behaviors
