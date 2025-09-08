"""
Database configuration and connection setup for Cloud SQL PostgreSQL.
"""
import os
import logging
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus
from dotenv import load_dotenv

from sqlalchemy import create_engine, Column, String, DateTime, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables from config/.env
config_dir = Path(__file__).parent.parent.parent / "config"
env_file = config_dir / ".env"
load_dotenv(env_file)

# Configure logging
logger = logging.getLogger(__name__)

def get_database_url():
    """
    Get the database URL based on environment configuration.
    Supports multiple connection methods for Cloud SQL.
    """
    # Check if running on GCP (highest priority flag)
    instance_is_gcp = os.getenv("INSTANCE_IS_GCP", "false").lower() == "true"
    instance_connection_name = os.getenv("INSTANCE_CONNECTION_NAME")
    use_cloud_sql_proxy = os.getenv("USE_CLOUD_SQL_PROXY", "false").lower() == "true"
    
    # Database credentials
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "").strip("'\"")  # Strip quotes if present
    db_name = os.getenv("DB_NAME", "postgres")
    
    # Method 1: Direct DATABASE_URL (highest priority)
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        logger.info("Using DATABASE_URL from environment")
        return database_url
    
    # Method 2: GCP-based connection decision
    if instance_is_gcp:
        if instance_connection_name:
            if use_cloud_sql_proxy:
                # GCP instance using Cloud SQL Auth Proxy
                db_host = os.getenv("DB_HOST", "127.0.0.1")
                db_port = os.getenv("DB_PORT", "5432")
                logger.info(f"GCP instance using Cloud SQL Auth Proxy at {db_host}:{db_port}")
                return f"postgresql+psycopg2://{db_user}:{quote_plus(db_password)}@{db_host}:{db_port}/{db_name}"
            else:
                # GCP instance using Cloud SQL Connector (recommended for production)
                logger.info(f"GCP instance using Cloud SQL Connector for instance: {instance_connection_name}")
                return f"cloudsql+psycopg2://{db_user}:{quote_plus(db_password)}@/{db_name}?instance={instance_connection_name}"
        else:
            logger.warning("INSTANCE_IS_GCP=true but INSTANCE_CONNECTION_NAME not set, falling back to direct connection")
    
    # Method 3: Cloud SQL Auth Proxy (for local development with proxy)
    if use_cloud_sql_proxy and not instance_is_gcp:
        db_host = os.getenv("DB_HOST", "127.0.0.1")
        db_port = os.getenv("DB_PORT", "5432")
        logger.info(f"Using Cloud SQL Auth Proxy at {db_host}:{db_port}")
        return f"postgresql+psycopg2://{db_user}:{quote_plus(db_password)}@{db_host}:{db_port}/{db_name}"
    
    # Method 4: Direct IP/local connection (default for local development)
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    logger.info(f"Using direct connection to {db_host}:{db_port}")
    return f"postgresql+psycopg2://{db_user}:{quote_plus(db_password)}@{db_host}:{db_port}/{db_name}"

def create_engine_with_cloud_sql():
    """
    Create SQLAlchemy engine with proper Cloud SQL configuration.
    Handles both GCP and local environments based on INSTANCE_IS_GCP flag.
    """
    database_url = get_database_url()
    instance_is_gcp = os.getenv("INSTANCE_IS_GCP", "false").lower() == "true"
    
    # Handle Cloud SQL Connector case
    if database_url.startswith("cloudsql+psycopg2://"):
        try:
            from google.cloud.sql.connector import Connector
            import sqlalchemy
            
            # Parse the special URL format
            instance_name = database_url.split("instance=")[1]
            db_user = os.getenv("DB_USER")
            db_password = os.getenv("DB_PASSWORD")
            db_name = os.getenv("DB_NAME")
            
            if instance_is_gcp:
                logger.info("Setting up Cloud SQL Connector for GCP instance")
            else:
                logger.info("Setting up Cloud SQL Connector (legacy mode)")
            
            def getconn():
                try:
                    connector = Connector()
                    conn = connector.connect(
                        instance_name,
                        "pg8000",
                        user=db_user,
                        password=db_password,
                        db=db_name,
                    )
                    return conn
                except Exception as e:
                    logger.error(f"Failed to connect to Cloud SQL instance: {e}")
                    if "not in an appropriate state" in str(e):
                        logger.error("Cloud SQL instance may be stopped or in maintenance mode")
                        logger.error("Please check the instance status in Google Cloud Console")
                    elif "409" in str(e):
                        logger.error("Cloud SQL instance conflict - instance may be starting up or in transition")
                    raise
            
            # Create engine with connector
            engine = sqlalchemy.create_engine(
                "postgresql+pg8000://",
                creator=getconn,
                pool_pre_ping=True,
                pool_recycle=300,
                echo=os.getenv("DB_ECHO", "false").lower() == "true",
            )
            
            logger.info("Cloud SQL Connector engine created successfully")
            return engine
            
        except ImportError as e:
            error_msg = f"google-cloud-sql-connector not available: {e}"
            if instance_is_gcp:
                logger.error(f"{error_msg} - This is required for GCP instances")
                raise ImportError(f"{error_msg}. Please install google-cloud-sql-connector.")
            else:
                logger.warning(f"{error_msg}, falling back to direct connection")
                # Fall back to direct connection for local development
                db_host = os.getenv("DB_HOST", "localhost")
                db_port = os.getenv("DB_PORT", "5432")
                db_user = os.getenv("DB_USER")
                db_password = os.getenv("DB_PASSWORD")
                db_name = os.getenv("DB_NAME")
                database_url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        
        except Exception as e:
            # Handle Cloud SQL connection errors
            error_msg = str(e)
            if instance_is_gcp:
                logger.error(f"Cloud SQL connection failed: {e}")
                if "not in an appropriate state" in error_msg or "409" in error_msg:
                    logger.error("Cloud SQL instance appears to be stopped or in maintenance")
                    logger.error("To fix this issue:")
                    logger.error("1. Check instance status in Google Cloud Console")
                    logger.error("2. Start the instance if it's stopped")
                    logger.error("3. Wait for any maintenance to complete")
                    logger.error("4. For local development, consider setting INSTANCE_IS_GCP=false")
                raise Exception(f"Cloud SQL instance not available: {error_msg}")
            else:
                logger.warning(f"Cloud SQL connection failed: {e}, falling back to direct connection")
                # Fall back to direct connection
                db_host = os.getenv("DB_HOST", "localhost")
                db_port = os.getenv("DB_PORT", "5432")
                db_user = os.getenv("DB_USER")
                db_password = os.getenv("DB_PASSWORD")
                db_name = os.getenv("DB_NAME")
                database_url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    # Standard SQLAlchemy engine for all other cases
    engine = create_engine(
        database_url,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,    # Recycle connections every 5 minutes
        echo=os.getenv("DB_ECHO", "false").lower() == "true",  # SQL logging
    )
    
    logger.info(f"Database engine created with URL: {database_url.split('@')[0]}@[REDACTED]")
    return engine

# Create SQLAlchemy engine
engine = create_engine_with_cloud_sql()

# Session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()

class UserRelation(Base):
    """
    User relations model for storing friendships.
    """
    __tablename__ = "user_relations"
    
    user_id = Column(String, primary_key=True, index=True)  # User's ID
    friend_ids = Column(ARRAY(String), default=list)  # List of friend user IDs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudyGroup(Base):
    """
    Study groups model for storing private study groups.
    """
    __tablename__ = "study_groups"
    
    id = Column(String, primary_key=True, index=True)  # 16-character unique UUID
    creator_id = Column(String, nullable=False)  # User ID of the creator
    member_ids = Column(ARRAY(String), default=list)  # List of member user IDs
    group_name = Column(String(32), nullable=False)  # Group name (max 32 chars)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserStats(Base):
    """
    User statistics model for tracking user activity and limits.
    """
    __tablename__ = "user_stats"
    
    user_id = Column(String, primary_key=True, index=True)  # User's ID
    group_count = Column(String, default="0")  # Number of groups user has joined (stored as string)
    group_ids = Column(ARRAY(String), default=list)  # List of group IDs user is a member of
    friend_count = Column(String, default="0")  # Number of friends user has
    pomo_count = Column(String, default="0")  # Number of pomodoros completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def get_db():
    """
    Dependency to get DB session.
    Yields a database session for use in FastAPI dependencies.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Create all database tables.
    Call this function to initialize the database schema.
    """
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
