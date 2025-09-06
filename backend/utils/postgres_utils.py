"""
PostgreSQL utility functions for Google Cloud SQL.
Provides SDK-style functions for database operations.
"""

import os
import logging
from typing import Any, Dict, List, Optional
from contextlib import contextmanager
from psycopg2 import pool, sql
from psycopg2.extras import RealDictCursor, execute_values
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)


class PostgreSQLClient:
    """PostgreSQL client wrapper with utility methods."""
    
    def __init__(self):
        """Initialize PostgreSQL client with environment configuration."""
        self.db_host = os.getenv("DB_HOST", "localhost")
        self.db_port = int(os.getenv("DB_PORT", "5432"))
        self.db_name = os.getenv("DB_NAME", "postgres")
        self.db_user = os.getenv("DB_USER", "postgres")
        self.db_password = os.getenv("DB_PASSWORD", "")
        
        # Google Cloud SQL specific settings
        self.db_socket_dir = os.getenv("DB_SOCKET_DIR", "/cloudsql")
        self.instance_connection_name = os.getenv("INSTANCE_CONNECTION_NAME")
        self.use_cloud_sql_proxy = os.getenv("USE_CLOUD_SQL_PROXY", "false").lower() == "true"
        
        self._connection_pool = None
        self._engine = None
        self._session_factory = None
    
    def _get_connection_string(self) -> str:
        """Get the appropriate connection string based on environment."""
        if self.use_cloud_sql_proxy and self.instance_connection_name:
            # Using Cloud SQL Proxy with Unix socket
            socket_path = f"{self.db_socket_dir}/{self.instance_connection_name}"
            return f"postgresql://{self.db_user}:{self.db_password}@/{self.db_name}?host={socket_path}"
        else:
            # Standard TCP connection
            return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    def _get_psycopg2_connection_params(self) -> Dict[str, Any]:
        """Get connection parameters for psycopg2."""
        if self.use_cloud_sql_proxy and self.instance_connection_name:
            return {
                "host": f"{self.db_socket_dir}/{self.instance_connection_name}",
                "database": self.db_name,
                "user": self.db_user,
                "password": self.db_password
            }
        else:
            return {
                "host": self.db_host,
                "port": self.db_port,
                "database": self.db_name,
                "user": self.db_user,
                "password": self.db_password
            }
    
    @property
    def connection_pool(self) -> pool.SimpleConnectionPool:
        """Get connection pool (lazy initialization)."""
        if self._connection_pool is None:
            try:
                self._connection_pool = pool.SimpleConnectionPool(
                    minconn=1,
                    maxconn=20,
                    **self._get_psycopg2_connection_params()
                )
                logger.info("PostgreSQL connection pool created successfully")
            except Exception as e:
                logger.error(f"Failed to create PostgreSQL connection pool: {e}")
                raise
        return self._connection_pool
    
    @property
    def engine(self) -> sqlalchemy.Engine:
        """Get SQLAlchemy engine (lazy initialization)."""
        if self._engine is None:
            try:
                connection_string = self._get_connection_string()
                self._engine = create_engine(
                    connection_string,
                    poolclass=QueuePool,
                    pool_size=10,
                    max_overflow=20,
                    pool_pre_ping=True,
                    pool_recycle=3600,
                    echo=os.getenv("DB_ECHO", "false").lower() == "true"
                )
                logger.info("SQLAlchemy engine created successfully")
            except Exception as e:
                logger.error(f"Failed to create SQLAlchemy engine: {e}")
                raise
        return self._engine
    
    @property
    def session_factory(self) -> sessionmaker:
        """Get SQLAlchemy session factory."""
        if self._session_factory is None:
            self._session_factory = sessionmaker(bind=self.engine)
        return self._session_factory
    
    def test_connection(self) -> bool:
        """Test database connection."""
        try:
            connection = self.connection_pool.getconn()
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            cursor.close()
            self.connection_pool.putconn(connection)
            return result[0] == 1
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    @contextmanager
    def get_connection(self):
        """Context manager for getting a database connection."""
        connection = None
        try:
            connection = self.connection_pool.getconn()
            yield connection
        except Exception as e:
            if connection:
                connection.rollback()
            logger.error(f"Database operation failed: {e}")
            raise
        finally:
            if connection:
                self.connection_pool.putconn(connection)
    
    @contextmanager
    def get_session(self):
        """Context manager for getting a SQLAlchemy session."""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session operation failed: {e}")
            raise
        finally:
            session.close()
    
    def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as list of dictionaries."""
        with self.get_connection() as connection:
            cursor = connection.cursor(cursor_factory=RealDictCursor)
            try:
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                results = cursor.fetchall()
                return [dict(row) for row in results]
            finally:
                cursor.close()
    
    def execute_update(self, query: str, params: Optional[Dict[str, Any]] = None) -> int:
        """Execute an INSERT/UPDATE/DELETE query and return affected row count."""
        with self.get_connection() as connection:
            cursor = connection.cursor()
            try:
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                connection.commit()
                return cursor.rowcount
            finally:
                cursor.close()
    
    def execute_many(self, query: str, params_list: List[Dict[str, Any]]) -> int:
        """Execute query with multiple parameter sets."""
        with self.get_connection() as connection:
            cursor = connection.cursor()
            try:
                cursor.executemany(query, params_list)
                connection.commit()
                return cursor.rowcount
            finally:
                cursor.close()
    
    def insert_returning(self, query: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Execute INSERT query with RETURNING clause."""
        with self.get_connection() as connection:
            cursor = connection.cursor(cursor_factory=RealDictCursor)
            try:
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                connection.commit()
                result = cursor.fetchone()
                return dict(result) if result else None
            finally:
                cursor.close()
    
    def bulk_insert(self, table_name: str, columns: List[str], values: List[List[Any]]) -> int:
        """Perform bulk insert using execute_values for better performance."""
        with self.get_connection() as connection:
            cursor = connection.cursor()
            try:
                query = sql.SQL("INSERT INTO {} ({}) VALUES %s").format(
                    sql.Identifier(table_name),
                    sql.SQL(', ').join(map(sql.Identifier, columns))
                )
                execute_values(
                    cursor,
                    query.as_string(connection),
                    values,
                    template=None,
                    page_size=1000
                )
                connection.commit()
                return cursor.rowcount
            finally:
                cursor.close()
    
    def table_exists(self, table_name: str, schema: str = "public") -> bool:
        """Check if a table exists."""
        query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = %(schema)s 
                AND table_name = %(table_name)s
            )
        """
        result = self.execute_query(query, {"schema": schema, "table_name": table_name})
        return result[0]["exists"] if result else False
    
    def get_table_columns(self, table_name: str, schema: str = "public") -> List[Dict[str, Any]]:
        """Get column information for a table."""
        query = """
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = %(schema)s 
            AND table_name = %(table_name)s
            ORDER BY ordinal_position
        """
        return self.execute_query(query, {"schema": schema, "table_name": table_name})
    
    def create_table_if_not_exists(self, table_name: str, columns_definition: str) -> bool:
        """Create table if it doesn't exist."""
        try:
            query = f"CREATE TABLE IF NOT EXISTS {table_name} ({columns_definition})"
            self.execute_update(query)
            logger.info(f"Table {table_name} created or already exists")
            return True
        except Exception as e:
            logger.error(f"Failed to create table {table_name}: {e}")
            return False
    
    def execute_transaction(self, operations: List[Dict[str, Any]]) -> bool:
        """Execute multiple operations in a transaction."""
        with self.get_connection() as connection:
            cursor = connection.cursor()
            try:
                for operation in operations:
                    query = operation["query"]
                    params = operation.get("params")
                    if params:
                        cursor.execute(query, params)
                    else:
                        cursor.execute(query)
                connection.commit()
                return True
            except Exception as e:
                connection.rollback()
                logger.error(f"Transaction failed: {e}")
                return False
            finally:
                cursor.close()
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get basic database statistics."""
        stats_query = """
            SELECT 
                current_database() as database_name,
                current_user as current_user,
                version() as version,
                pg_database_size(current_database()) as database_size_bytes,
                (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
        """
        result = self.execute_query(stats_query)
        return result[0] if result else {}
    
    def close_all_connections(self):
        """Close all connections in the pool."""
        if self._connection_pool:
            self._connection_pool.closeall()
            self._connection_pool = None
            logger.info("All PostgreSQL connections closed")


# Global PostgreSQL client instance
postgres_client = PostgreSQLClient()


# Convenience functions for direct usage
def test_db_connection() -> bool:
    """Test database connection."""
    return postgres_client.test_connection()


def query_db(query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Execute a SELECT query."""
    return postgres_client.execute_query(query, params)


def update_db(query: str, params: Optional[Dict[str, Any]] = None) -> int:
    """Execute an INSERT/UPDATE/DELETE query."""
    return postgres_client.execute_update(query, params)


def insert_and_return(query: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """Execute INSERT with RETURNING clause."""
    return postgres_client.insert_returning(query, params)


def get_db_session():
    """Get a SQLAlchemy session context manager."""
    return postgres_client.get_session()


def execute_db_transaction(operations: List[Dict[str, Any]]) -> bool:
    """Execute multiple operations in a transaction."""
    return postgres_client.execute_transaction(operations)
