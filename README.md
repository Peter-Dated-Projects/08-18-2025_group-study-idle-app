# StudyGarden

![StudyGarden Demo](frontend/docs/demo.png)

## Project Overview

StudyGarden is an engaging idle app designed to gamify productivity. Users grow a virtual garden by completing study tasks, fostering consistent study habits in a rewarding way.

## Features

- **Idle Gameplay:** Encourages consistent focus with rewards.
- **Virtual Garden:** Reflects user progress visually.
- **Task Management:** Organize and prioritize study sessions.
- **Focus Timers:** Stay on track with built-in timers.
- **User Authentication:** Securely track progress across devices.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB
- **Deployment:** Vercel (Frontend), Google Cloud Run (Backend)

## Project Structure

- **Frontend:** Manages UI, user interactions, and local state.
- **Backend:** Handles authentication, data persistence, and business logic.

## Local Development

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

## Docker Development

For a containerized development environment, you can use the provided Docker setup to run the backend services (PostgreSQL, Redis).

1.  **Ensure you have a `.env` file** in `backend/config/` with the required variables (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `REDIS_PORT`).
2.  **Run the script** from the root directory:

    ```bash
    # Start all services in the background
    ./run_docker_containers.sh

    # Stop all services
    ./run_docker_containers.sh --down

    # View logs
    ./run_docker_containers.sh --logs
    ```
    For more options, run `./run_docker_containers.sh --help`.

## Deployment

- **Frontend:** Hosted on Vercel for fast, scalable CI/CD.
- **Backend:** Deployed on Google Cloud Run for serverless scalability.

## Roadmap

- Real-time collaboration features.
- Expanded garden customization options.
- Integration with calendar/task management apps.
- Enhanced analytics and progress reports.
- Mobile app development.
