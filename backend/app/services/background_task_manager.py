"""
Background task manager for running periodic sync and reset tasks within the FastAPI application.
This replaces the need for external cron jobs by using asyncio background tasks.
"""

import asyncio
import logging
from typing import Optional

from app.services.periodic_sync_service import periodic_sync_service
from app.services.periodic_reset_service import periodic_reset_service

logger = logging.getLogger(__name__)


class BackgroundTaskManager:
    """Manages background tasks for the FastAPI application."""
    
    def __init__(self):
        """Initialize the task manager."""
        self.sync_task: Optional[asyncio.Task] = None
        self.reset_task: Optional[asyncio.Task] = None
        self.is_running = False
        
    async def start_periodic_sync(self):
        """Start the periodic sync as a background task."""
        if self.is_running:
            logger.warning("Background tasks are already running")
            return
            
        logger.info("Starting background tasks")
        self.is_running = True
        
        # Create and store the background tasks
        self.sync_task = asyncio.create_task(self._run_periodic_sync())
        self.reset_task = asyncio.create_task(self._run_periodic_resets())
        
        return [self.sync_task, self.reset_task]
    
    async def stop_periodic_sync(self):
        """Stop all background tasks."""
        if not self.is_running:
            logger.warning("Background tasks are not running")
            return
            
        logger.info("Stopping background tasks")
        self.is_running = False
        
        # Stop the services
        periodic_sync_service.stop_periodic_sync()
        periodic_reset_service.stop_periodic_resets()
        
        # Cancel the background tasks
        tasks_to_cancel = []
        if self.sync_task and not self.sync_task.done():
            tasks_to_cancel.append(self.sync_task)
        if self.reset_task and not self.reset_task.done():
            tasks_to_cancel.append(self.reset_task)
        
        for task in tasks_to_cancel:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                logger.info(f"Background task {task.get_name()} cancelled")
        
        self.sync_task = None
        self.reset_task = None
    
    async def _run_periodic_sync(self):
        """Internal method to run the periodic sync loop."""
        try:
            logger.info("Periodic sync background task started")
            
            # Run the sync service
            await periodic_sync_service.start_periodic_sync()
            
        except asyncio.CancelledError:
            logger.info("Periodic sync background task was cancelled")
            raise
        except Exception as e:
            logger.error(f"Periodic sync background task failed: {e}")
        finally:
            logger.info("Periodic sync background task ended")
    
    async def _run_periodic_resets(self):
        """Internal method to run the periodic reset loop."""
        try:
            logger.info("Periodic reset background task started")
            
            # Run the reset service
            await periodic_reset_service.start_periodic_resets()
            
        except asyncio.CancelledError:
            logger.info("Periodic reset background task was cancelled")
            raise
        except Exception as e:
            logger.error(f"Periodic reset background task failed: {e}")
        finally:
            logger.info("Periodic reset background task ended")
    
    def get_status(self) -> dict:
        """Get the status of background tasks."""
        return {
            "background_tasks_running": self.is_running,
            "sync_task_exists": self.sync_task is not None,
            "sync_task_done": self.sync_task.done() if self.sync_task else None,
            "reset_task_exists": self.reset_task is not None,
            "reset_task_done": self.reset_task.done() if self.reset_task else None,
            "sync_service_status": periodic_sync_service.get_sync_status(),
            "reset_service_status": periodic_reset_service.get_reset_status()
        }


# Global task manager instance
background_task_manager = BackgroundTaskManager()
