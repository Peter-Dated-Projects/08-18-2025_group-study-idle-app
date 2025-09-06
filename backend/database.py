"""
Database configuration and connection setup for Cloud SQL PostgreSQL.
"""
import os
import logging
from datetime import datetime

from sqlalchemy import create_engine, Column, String, DateTime, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configure logging
logger = logging.getLogger(__name__)

def get_database_url():
    """
    Get the database URL based on environment configuration.
    Supports multiple connection methods for Cloud SQL.
    """
    # Check if using Cloud SQL Connector (recommended for production)
    instance_connection_name = os.getenv("INSTANCE_CONNECTION_NAME")
    use_cloud_sql_proxy = os.getenv("USE_CLOUD_SQL_PROXY", "false").lower() == "true"
    
    # Database credentials
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "postgres")
    
    # Method 1: Direct DATABASE_URL (highest priority)
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        logger.info("Using DATABASE_URL from environment")
        return database_url
    
    # Method 2: Cloud SQL Connector (for Cloud Run/production)
    if instance_connection_name and not use_cloud_sql_proxy:
        logger.info(f"Using Cloud SQL Connector for instance: {instance_connection_name}")
        # We'll create the connector-based URL but need to handle this differently
        # For now, return a special marker that we'll handle in create_engine
        return f"cloudsql+psycopg2://{db_user}:{db_password}@/{db_name}?instance={instance_connection_name}"
    
    # Method 3: Cloud SQL Auth Proxy (for local development)
    if use_cloud_sql_proxy:
        db_host = os.getenv("DB_HOST", "127.0.0.1")
        db_port = os.getenv("DB_PORT", "5432")
        logger.info(f"Using Cloud SQL Auth Proxy at {db_host}:{db_port}")
        return f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    # Method 4: Direct IP connection (not recommended for production)
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    logger.info(f"Using direct connection to {db_host}:{db_port}")
    return f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def create_engine_with_cloud_sql():
    """
    Create SQLAlchemy engine with proper Cloud SQL configuration.
    """
    database_url = get_database_url()
    
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
            
            logger.info("Setting up Cloud SQL Connector")
            
            def getconn():
                connector = Connector()
                conn = connector.connect(
                    instance_name,
                    "pg8000",
                    user=db_user,
                    password=db_password,
                    db=db_name,
                )
                return conn
            
            # Create engine with connector
            engine = sqlalchemy.create_engine(
                "postgresql+pg8000://",
                creator=getconn,
                pool_pre_ping=True,
                pool_recycle=300,
            )
            
            logger.info("Cloud SQL Connector engine created successfully")
            return engine
            
        except ImportError:
            logger.warning("google-cloud-sql-connector not installed, falling back to direct connection")
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

class Lobby(Base):
    """
    Lobby model for storing group study session information.
    """
    __tablename__ = "lobbies"
    
    code = Column(String, primary_key=True, index=True)  # 16-character unique code
    host_user_id = Column(String, nullable=False)  # User ID of the host
    users = Column(ARRAY(String), default=list)  # List of user IDs in the lobby
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active")  # active, ended, etc.

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
