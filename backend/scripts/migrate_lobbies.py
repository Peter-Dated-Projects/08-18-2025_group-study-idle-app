"""
Migration utility to transfer lobby data from PostgreSQL to Redis.
This script helps transition from the old PostgreSQL-based lobby system to the new Redis-based one.
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.models.database import SessionLocal, Lobby
from app.services.lobby_service import (
    redis_json_client, 
    LobbyData, 
    _get_lobby_key, 
    _add_code_to_set,
    LOBBY_TTL_SECONDS
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LobbyMigration:
    """Handles migration of lobby data from PostgreSQL to Redis."""
    
    def __init__(self):
        self.db = SessionLocal()
        self.migrated_count = 0
        self.skipped_count = 0
        self.error_count = 0
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def get_postgres_lobbies(self) -> List[Lobby]:
        """Retrieve all lobbies from PostgreSQL."""
        try:
            lobbies = self.db.query(Lobby).all()
            logger.info(f"Found {len(lobbies)} lobbies in PostgreSQL")
            return lobbies
        except Exception as e:
            logger.error(f"Error fetching lobbies from PostgreSQL: {e}")
            return []
    
    def postgres_lobby_to_redis_data(self, pg_lobby: Lobby) -> LobbyData:
        """Convert PostgreSQL Lobby to Redis LobbyData format."""
        # Convert datetime to ISO string if needed
        created_at = pg_lobby.created_at
        if isinstance(created_at, datetime):
            created_at = created_at.replace(tzinfo=timezone.utc).isoformat()
        elif isinstance(created_at, str):
            # If it's already a string, ensure it's in ISO format
            try:
                # Parse and reformat to ensure consistency
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                created_at = dt.isoformat()
            except (ValueError, AttributeError):
                # Fallback to current time if parsing fails
                created_at = datetime.now(timezone.utc).isoformat()
        
        return LobbyData(
            code=pg_lobby.code,
            host_user_id=pg_lobby.host_user_id,
            users=pg_lobby.users or [],
            created_at=created_at,
            status=getattr(pg_lobby, 'status', 'active')
        )
    
    def migrate_lobby_to_redis(self, lobby_data: LobbyData) -> bool:
        """Migrate a single lobby to Redis."""
        try:
            lobby_key = _get_lobby_key(lobby_data.code)
            
            # Check if lobby already exists in Redis
            if redis_json_client.json_exists(lobby_key):
                logger.info(f"Lobby {lobby_data.code} already exists in Redis, skipping")
                self.skipped_count += 1
                return True
            
            # Store lobby in Redis
            success = redis_json_client.json_set(
                lobby_key,
                '.',
                lobby_data.to_dict(),
                expire_seconds=LOBBY_TTL_SECONDS
            )
            
            if success:
                # Add code to the active codes set
                _add_code_to_set(lobby_data.code)
                logger.info(f"Successfully migrated lobby {lobby_data.code}")
                self.migrated_count += 1
                return True
            else:
                logger.error(f"Failed to store lobby {lobby_data.code} in Redis")
                self.error_count += 1
                return False
                
        except Exception as e:
            logger.error(f"Error migrating lobby {lobby_data.code}: {e}")
            self.error_count += 1
            return False
    
    def migrate_all_lobbies(self) -> Dict[str, int]:
        """Migrate all lobbies from PostgreSQL to Redis."""
        logger.info("Starting lobby migration from PostgreSQL to Redis...")
        
        # Test Redis connectivity
        if not redis_json_client.ping():
            logger.error("Redis is not available, cannot perform migration")
            return {"error": "Redis not available"}
        
        # Get all PostgreSQL lobbies
        pg_lobbies = self.get_postgres_lobbies()
        
        if not pg_lobbies:
            logger.info("No lobbies found in PostgreSQL to migrate")
            return {"migrated": 0, "skipped": 0, "errors": 0}
        
        # Migrate each lobby
        for pg_lobby in pg_lobbies:
            try:
                lobby_data = self.postgres_lobby_to_redis_data(pg_lobby)
                self.migrate_lobby_to_redis(lobby_data)
            except Exception as e:
                logger.error(f"Error processing lobby {pg_lobby.code}: {e}")
                self.error_count += 1
        
        # Return migration statistics
        stats = {
            "migrated": self.migrated_count,
            "skipped": self.skipped_count,
            "errors": self.error_count,
            "total_processed": len(pg_lobbies)
        }
        
        logger.info(f"Migration completed: {stats}")
        return stats
    
    def verify_migration(self) -> Dict[str, Any]:
        """Verify that all PostgreSQL lobbies exist in Redis."""
        logger.info("Verifying migration...")
        
        pg_lobbies = self.get_postgres_lobbies()
        verification_results = {
            "total_postgres_lobbies": len(pg_lobbies),
            "found_in_redis": 0,
            "missing_in_redis": 0,
            "data_mismatches": 0,
            "missing_lobbies": [],
            "mismatched_lobbies": []
        }
        
        for pg_lobby in pg_lobbies:
            lobby_key = _get_lobby_key(pg_lobby.code)
            
            # Check if lobby exists in Redis
            if redis_json_client.json_exists(lobby_key):
                verification_results["found_in_redis"] += 1
                
                # Verify data consistency
                redis_data = redis_json_client.json_get(lobby_key)
                pg_data = self.postgres_lobby_to_redis_data(pg_lobby).to_dict()
                
                # Compare key fields
                mismatches = []
                for key in ["code", "host_user_id", "users", "status"]:
                    if redis_data.get(key) != pg_data.get(key):
                        mismatches.append(f"{key}: Redis={redis_data.get(key)}, PG={pg_data.get(key)}")
                
                if mismatches:
                    verification_results["data_mismatches"] += 1
                    verification_results["mismatched_lobbies"].append({
                        "code": pg_lobby.code,
                        "mismatches": mismatches
                    })
            else:
                verification_results["missing_in_redis"] += 1
                verification_results["missing_lobbies"].append(pg_lobby.code)
        
        logger.info(f"Verification results: {verification_results}")
        return verification_results


def run_migration():
    """Run the complete migration process."""
    try:
        with LobbyMigration() as migration:
            # Perform migration
            stats = migration.migrate_all_lobbies()
            
            # Verify migration
            verification = migration.verify_migration()
            
            return {
                "migration_stats": stats,
                "verification_results": verification
            }
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return {"error": str(e)}


def migrate_specific_lobby(lobby_code: str) -> bool:
    """Migrate a specific lobby by code."""
    try:
        with LobbyMigration() as migration:
            # Find the lobby in PostgreSQL
            pg_lobby = migration.db.query(Lobby).filter(Lobby.code == lobby_code).first()
            
            if not pg_lobby:
                logger.error(f"Lobby {lobby_code} not found in PostgreSQL")
                return False
            
            # Convert and migrate
            lobby_data = migration.postgres_lobby_to_redis_data(pg_lobby)
            return migration.migrate_lobby_to_redis(lobby_data)
            
    except Exception as e:
        logger.error(f"Error migrating specific lobby {lobby_code}: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate lobby data from PostgreSQL to Redis")
    parser.add_argument("--action", choices=["migrate", "verify", "specific"], 
                       default="migrate", help="Action to perform")
    parser.add_argument("--lobby-code", type=str, help="Specific lobby code to migrate")
    
    args = parser.parse_args()
    
    if args.action == "migrate":
        results = run_migration()
        print(f"Migration results: {results}")
    elif args.action == "verify":
        with LobbyMigration() as migration:
            verification = migration.verify_migration()
            print(f"Verification results: {verification}")
    elif args.action == "specific":
        if not args.lobby_code:
            print("--lobby-code is required for specific migration")
            exit(1)
        success = migrate_specific_lobby(args.lobby_code)
        print(f"Migration of lobby {args.lobby_code}: {'Success' if success else 'Failed'}")
