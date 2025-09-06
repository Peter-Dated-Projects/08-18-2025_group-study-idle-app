"""
Redis utility functions for the group study idle app backend.
Provides SDK-style functions for Redis operations.
"""

import json
import redis
import os
from typing import Any, Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client wrapper with utility methods."""
    
    def __init__(self):
        """Initialize Redis client with environment configuration."""
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
    
    def set_value(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        """Set a value in Redis with optional expiration."""
        try:
            serialized_value = json.dumps(value) if not isinstance(value, str) else value
            return self.client.set(key, serialized_value, ex=expire_seconds)
        except Exception as e:
            logger.error(f"Failed to set Redis key {key}: {e}")
            return False
    
    def get_value(self, key: str, default: Any = None) -> Any:
        """Get a value from Redis with optional default."""
        try:
            value = self.client.get(key)
            if value is None:
                return default
            
            # Try to deserialize JSON, fallback to string
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            logger.error(f"Failed to get Redis key {key}: {e}")
            return default
    
    def delete_key(self, key: str) -> bool:
        """Delete a key from Redis."""
        try:
            return bool(self.client.delete(key))
        except Exception as e:
            logger.error(f"Failed to delete Redis key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if a key exists in Redis."""
        try:
            return bool(self.client.exists(key))
        except Exception as e:
            logger.error(f"Failed to check Redis key existence {key}: {e}")
            return False
    
    def set_hash(self, key: str, mapping: Dict[str, Any], expire_seconds: Optional[int] = None) -> bool:
        """Set a hash in Redis."""
        try:
            # Serialize all values to JSON strings
            serialized_mapping = {k: json.dumps(v) if not isinstance(v, str) else v 
                                for k, v in mapping.items()}
            
            result = self.client.hmset(key, serialized_mapping)
            if expire_seconds:
                self.client.expire(key, expire_seconds)
            return result
        except Exception as e:
            logger.error(f"Failed to set Redis hash {key}: {e}")
            return False
    
    def get_hash(self, key: str) -> Dict[str, Any]:
        """Get a hash from Redis."""
        try:
            hash_data = self.client.hgetall(key)
            if not hash_data:
                return {}
            
            # Try to deserialize JSON values
            result = {}
            for k, v in hash_data.items():
                try:
                    result[k] = json.loads(v)
                except json.JSONDecodeError:
                    result[k] = v
            return result
        except Exception as e:
            logger.error(f"Failed to get Redis hash {key}: {e}")
            return {}
    
    def get_hash_field(self, key: str, field: str, default: Any = None) -> Any:
        """Get a specific field from a Redis hash."""
        try:
            value = self.client.hget(key, field)
            if value is None:
                return default
            
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            logger.error(f"Failed to get Redis hash field {key}.{field}: {e}")
            return default
    
    def add_to_set(self, key: str, *values: Any, expire_seconds: Optional[int] = None) -> int:
        """Add values to a Redis set."""
        try:
            serialized_values = [json.dumps(v) if not isinstance(v, str) else v for v in values]
            result = self.client.sadd(key, *serialized_values)
            if expire_seconds:
                self.client.expire(key, expire_seconds)
            return result
        except Exception as e:
            logger.error(f"Failed to add to Redis set {key}: {e}")
            return 0
    
    def get_set_members(self, key: str) -> List[Any]:
        """Get all members of a Redis set."""
        try:
            members = self.client.smembers(key)
            result = []
            for member in members:
                try:
                    result.append(json.loads(member))
                except json.JSONDecodeError:
                    result.append(member)
            return result
        except Exception as e:
            logger.error(f"Failed to get Redis set members {key}: {e}")
            return []
    
    def is_in_set(self, key: str, value: Any) -> bool:
        """Check if a value is in a Redis set."""
        try:
            serialized_value = json.dumps(value) if not isinstance(value, str) else value
            return bool(self.client.sismember(key, serialized_value))
        except Exception as e:
            logger.error(f"Failed to check Redis set membership {key}: {e}")
            return False
    
    def remove_from_set(self, key: str, *values: Any) -> int:
        """Remove values from a Redis set."""
        try:
            serialized_values = [json.dumps(v) if not isinstance(v, str) else v for v in values]
            return self.client.srem(key, *serialized_values)
        except Exception as e:
            logger.error(f"Failed to remove from Redis set {key}: {e}")
            return 0
    
    def push_to_list(self, key: str, *values: Any, expire_seconds: Optional[int] = None) -> int:
        """Push values to the end of a Redis list."""
        try:
            serialized_values = [json.dumps(v) if not isinstance(v, str) else v for v in values]
            result = self.client.rpush(key, *serialized_values)
            if expire_seconds:
                self.client.expire(key, expire_seconds)
            return result
        except Exception as e:
            logger.error(f"Failed to push to Redis list {key}: {e}")
            return 0
    
    def pop_from_list(self, key: str, from_left: bool = False) -> Any:
        """Pop a value from a Redis list."""
        try:
            value = self.client.lpop(key) if from_left else self.client.rpop(key)
            if value is None:
                return None
            
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            logger.error(f"Failed to pop from Redis list {key}: {e}")
            return None
    
    def get_list_range(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """Get a range of values from a Redis list."""
        try:
            values = self.client.lrange(key, start, end)
            result = []
            for value in values:
                try:
                    result.append(json.loads(value))
                except json.JSONDecodeError:
                    result.append(value)
            return result
        except Exception as e:
            logger.error(f"Failed to get Redis list range {key}: {e}")
            return []
    
    def increment(self, key: str, amount: int = 1, expire_seconds: Optional[int] = None) -> int:
        """Increment a numeric value in Redis."""
        try:
            result = self.client.incrby(key, amount)
            if expire_seconds:
                self.client.expire(key, expire_seconds)
            return result
        except Exception as e:
            logger.error(f"Failed to increment Redis key {key}: {e}")
            return 0
    
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


# Global Redis client instance
redis_client = RedisClient()


# Convenience functions for direct usage
def ping_redis() -> bool:
    """Check if Redis is available."""
    return redis_client.ping()


def set_cache(key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
    """Set a value in Redis cache."""
    return redis_client.set_value(key, value, expire_seconds)


def get_cache(key: str, default: Any = None) -> Any:
    """Get a value from Redis cache."""
    return redis_client.get_value(key, default)


def delete_cache(key: str) -> bool:
    """Delete a key from Redis cache."""
    return redis_client.delete_key(key)


def cache_exists(key: str) -> bool:
    """Check if a cache key exists."""
    return redis_client.exists(key)
