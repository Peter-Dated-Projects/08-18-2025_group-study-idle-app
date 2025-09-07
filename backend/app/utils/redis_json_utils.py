"""
Redis JSON utility functions for the group study idle app backend.
Provides RedisJSON operations for complex data structures.
"""

import json
import redis
import os
from typing import Any, Optional, List
import logging

logger = logging.getLogger(__name__)


class RedisJSONClient:
    """Redis client wrapper with RedisJSON support for complex data operations."""
    
    def __init__(self):
        """Initialize Redis client with RedisJSON configuration."""
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", "6379"))
        self.redis_password = os.getenv("REDIS_PASSWORD")
        self.redis_db = int(os.getenv("REDIS_DB", "0"))
        
        self._client = None
    
    @property
    def client(self) -> redis.Redis:
        """Get Redis client instance (lazy initialization)."""
        if self._client is None:
            self._client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                password=self.redis_password,
                db=self.redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
        return self._client
    
    def ping(self) -> bool:
        """Check if Redis is available."""
        try:
            return self.client.ping()
        except Exception as e:
            logger.error(f"Redis ping failed: {e}")
            return False
    
    def json_set(self, key: str, path: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        """
        Set a JSON value at a specific path in Redis.
        
        Args:
            key: Redis key
            path: JSON path (use '.' for root)
            value: Value to set
            expire_seconds: Optional expiration time
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Use JSON.SET command
            result = self.client.execute_command('JSON.SET', key, path, json.dumps(value))
            
            if expire_seconds:
                self.client.expire(key, expire_seconds)
                
            return result == 'OK'
        except Exception as e:
            logger.error(f"Failed to set JSON at {key}:{path}: {e}")
            return False
    
    def json_get(self, key: str, path: str = '.', default: Any = None) -> Any:
        """
        Get a JSON value from a specific path in Redis.
        
        Args:
            key: Redis key
            path: JSON path (use '.' for root)
            default: Default value if key/path doesn't exist
            
        Returns:
            The JSON value or default
        """
        try:
            # Use JSON.GET command
            result = self.client.execute_command('JSON.GET', key, path)
            
            if result is None:
                return default
                
            return json.loads(result)
        except Exception as e:
            logger.error(f"Failed to get JSON from {key}:{path}: {e}")
            return default
    
    def json_del(self, key: str, path: str = '.') -> bool:
        """
        Delete a JSON value at a specific path in Redis.
        
        Args:
            key: Redis key
            path: JSON path (use '.' for root)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Use JSON.DEL command
            result = self.client.execute_command('JSON.DEL', key, path)
            return result > 0
        except Exception as e:
            logger.error(f"Failed to delete JSON at {key}:{path}: {e}")
            return False
    
    def json_exists(self, key: str, path: str = '.') -> bool:
        """
        Check if a JSON path exists in Redis.
        
        Args:
            key: Redis key
            path: JSON path (use '.' for root)
            
        Returns:
            True if exists, False otherwise
        """
        try:
            # Use JSON.TYPE command to check existence
            result = self.client.execute_command('JSON.TYPE', key, path)
            return result is not None
        except Exception as e:
            logger.error(f"Failed to check JSON existence at {key}:{path}: {e}")
            return False
    
    def json_array_append(self, key: str, path: str, *values: Any) -> int:
        """
        Append values to a JSON array.
        
        Args:
            key: Redis key
            path: JSON path to array
            values: Values to append
            
        Returns:
            New array length or -1 on error
        """
        try:
            # Convert values to JSON strings
            json_values = [json.dumps(value) for value in values]
            result = self.client.execute_command('JSON.ARRAPPEND', key, path, *json_values)
            return result if result is not None else -1
        except Exception as e:
            logger.error(f"Failed to append to JSON array at {key}:{path}: {e}")
            return -1
    
    def json_array_pop(self, key: str, path: str, index: int = -1) -> Any:
        """
        Pop a value from a JSON array.
        
        Args:
            key: Redis key
            path: JSON path to array
            index: Index to pop (default: -1 for last element)
            
        Returns:
            Popped value or None
        """
        try:
            result = self.client.execute_command('JSON.ARRPOP', key, path, index)
            return json.loads(result) if result is not None else None
        except Exception as e:
            logger.error(f"Failed to pop from JSON array at {key}:{path}: {e}")
            return None
    
    def json_array_len(self, key: str, path: str) -> int:
        """
        Get the length of a JSON array.
        
        Args:
            key: Redis key
            path: JSON path to array
            
        Returns:
            Array length or -1 on error
        """
        try:
            result = self.client.execute_command('JSON.ARRLEN', key, path)
            return result if result is not None else -1
        except Exception as e:
            logger.error(f"Failed to get JSON array length at {key}:{path}: {e}")
            return -1
    
    def json_array_index(self, key: str, path: str, value: Any, start: int = 0, stop: int = 0) -> int:
        """
        Find the index of a value in a JSON array.
        
        Args:
            key: Redis key
            path: JSON path to array
            value: Value to find
            start: Start index
            stop: Stop index (0 means end of array)
            
        Returns:
            Index of value or -1 if not found
        """
        try:
            json_value = json.dumps(value)
            if stop == 0:
                result = self.client.execute_command('JSON.ARRINDEX', key, path, json_value, start)
            else:
                result = self.client.execute_command('JSON.ARRINDEX', key, path, json_value, start, stop)
            return result if result is not None else -1
        except Exception as e:
            logger.error(f"Failed to find index in JSON array at {key}:{path}: {e}")
            return -1
    
    def json_array_trim(self, key: str, path: str, start: int, stop: int) -> int:
        """
        Trim a JSON array to a specific range.
        
        Args:
            key: Redis key
            path: JSON path to array
            start: Start index
            stop: Stop index
            
        Returns:
            New array length or -1 on error
        """
        try:
            result = self.client.execute_command('JSON.ARRTRIM', key, path, start, stop)
            return result if result is not None else -1
        except Exception as e:
            logger.error(f"Failed to trim JSON array at {key}:{path}: {e}")
            return -1
    
    def json_object_keys(self, key: str, path: str = '.') -> List[str]:
        """
        Get the keys of a JSON object.
        
        Args:
            key: Redis key
            path: JSON path to object
            
        Returns:
            List of object keys
        """
        try:
            result = self.client.execute_command('JSON.OBJKEYS', key, path)
            return result if result is not None else []
        except Exception as e:
            logger.error(f"Failed to get JSON object keys at {key}:{path}: {e}")
            return []
    
    def json_object_len(self, key: str, path: str = '.') -> int:
        """
        Get the number of keys in a JSON object.
        
        Args:
            key: Redis key
            path: JSON path to object
            
        Returns:
            Number of keys or -1 on error
        """
        try:
            result = self.client.execute_command('JSON.OBJLEN', key, path)
            return result if result is not None else -1
        except Exception as e:
            logger.error(f"Failed to get JSON object length at {key}:{path}: {e}")
            return -1
    
    def expire_key(self, key: str, seconds: int) -> bool:
        """Set expiration time for a key."""
        try:
            return bool(self.client.expire(key, seconds))
        except Exception as e:
            logger.error(f"Failed to set expiration for Redis key {key}: {e}")
            return False
    
    def get_ttl(self, key: str) -> int:
        """Get time-to-live for a key (-1 if no expiration, -2 if key doesn't exist)."""
        try:
            return self.client.ttl(key)
        except Exception as e:
            logger.error(f"Failed to get TTL for Redis key {key}: {e}")
            return -2


# Global RedisJSON client instance
redis_json_client = RedisJSONClient()


# Convenience functions for direct usage
def ping_redis_json() -> bool:
    """Check if Redis with JSON support is available."""
    return redis_json_client.ping()


def set_json(key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
    """Set a JSON object in Redis."""
    return redis_json_client.json_set(key, '.', value, expire_seconds)


def get_json(key: str, default: Any = None) -> Any:
    """Get a JSON object from Redis."""
    return redis_json_client.json_get(key, '.', default)


def delete_json(key: str) -> bool:
    """Delete a JSON object from Redis."""
    return redis_json_client.json_del(key, '.')


def json_exists(key: str) -> bool:
    """Check if a JSON key exists."""
    return redis_json_client.json_exists(key, '.')
