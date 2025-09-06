# Cloud SQL Connection Methods

This document explains how to connect to your Cloud SQL PostgreSQL instance using the three methods recommended by Google Cloud.

## Your Cloud SQL Instance

- **Instance Connection Name**: `group-study-idle-app:us-central1:study-garden-psql-db`
- **Database**: `postgres`
- **User**: `postgres`

## Connection Methods

### 1. Cloud SQL Connector (Recommended for Production)

The Cloud SQL Connector is automatically used when:

- `INSTANCE_CONNECTION_NAME` is set in your environment
- `USE_CLOUD_SQL_PROXY` is not set to "true"
- The `google-cloud-sql-connector` package is installed

**Environment Variables:**

```bash
INSTANCE_CONNECTION_NAME=group-study-idle-app:us-central1:study-garden-psql-db
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
```

**When to use**:

- Production deployments (Cloud Run, Compute Engine, etc.)
- When you want automatic IAM authentication
- No need to manage proxy processes

### 2. Cloud SQL Auth Proxy (Recommended for Local Development)

The Cloud SQL Auth Proxy is used when:

- `USE_CLOUD_SQL_PROXY=true` in your environment
- The proxy is running locally

**Environment Variables:**

```bash
USE_CLOUD_SQL_PROXY=true
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
INSTANCE_CONNECTION_NAME=group-study-idle-app:us-central1:study-garden-psql-db
```

**How to use for local development:**

1. **Start the proxy** (in one terminal):

   ```bash
   cd backend
   ./start-proxy.sh
   ```

   Keep this terminal open while developing.

2. **Run your application** (in another terminal):
   ```bash
   cd backend
   python main.py
   ```

**When to use**:

- Local development
- When you need to debug database connections
- When you want to use familiar PostgreSQL tools

### 3. Direct IP Connection (Not Recommended)

Direct connection is used as a fallback when neither of the above methods are configured.

**Environment Variables:**

```bash
DB_HOST=your_cloud_sql_ip
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
```

**When to use**:

- Only as a last resort
- Requires authorized networks configuration
- Less secure than other methods

## Testing Your Connection

Run the database connection test:

```bash
cd backend
python test_db_connection.py
```

This will:

- Show your current configuration
- Test the database connection
- Create necessary tables
- Provide troubleshooting tips if something fails

## Environment Configuration Examples

### For Local Development (with Auth Proxy)

Create a `.env` file in the `backend` directory:

```env
# Cloud SQL Configuration
INSTANCE_CONNECTION_NAME=group-study-idle-app:us-central1:study-garden-psql-db
USE_CLOUD_SQL_PROXY=true
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_actual_password
DB_NAME=postgres

# Optional: Enable SQL query logging
DB_ECHO=false

# Other app settings
DEBUG=true
PORT=8080
CORS_ORIGINS=http://localhost:3000
```

### For Production (Cloud Run with Connector)

Set these environment variables in your Cloud Run service:

```env
INSTANCE_CONNECTION_NAME=group-study-idle-app:us-central1:study-garden-psql-db
DB_USER=postgres
DB_PASSWORD=your_actual_password
DB_NAME=postgres
DEBUG=false
PORT=8080
```

## Installation Steps

1. **Install dependencies:**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up your environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **For local development, start the Auth Proxy:**

   ```bash
   ./start-proxy.sh
   ```

4. **Test your connection:**

   ```bash
   python test_db_connection.py
   ```

5. **Start your application:**
   ```bash
   python main.py
   ```

## Troubleshooting

### Common Issues

1. **"google-cloud-sql-connector not installed"**

   - Run: `pip install -r requirements.txt`

2. **"Connection refused" when using Auth Proxy**

   - Make sure the proxy is running: `./start-proxy.sh`
   - Check that `USE_CLOUD_SQL_PROXY=true` in your .env

3. **"Authentication failed"**

   - Run: `gcloud auth login`
   - Verify your password is correct

4. **"Instance not found"**
   - Check your `INSTANCE_CONNECTION_NAME` is correct
   - Ensure the Cloud SQL instance is running

### Getting Help

- Check the logs when running `python test_db_connection.py`
- Verify your `.env` file has the correct values
- Make sure your Cloud SQL instance is in the "Running" state
- Ensure you have the necessary IAM permissions

## Security Best Practices

1. **Never commit your `.env` file** - it contains sensitive credentials
2. **Use IAM authentication** when possible (automatic with Cloud SQL Connector)
3. **Rotate passwords regularly**
4. **Use authorized networks** only when necessary
5. **Monitor connection logs** for unusual activity

## Next Steps

Once your database connection is working:

1. Test your lobby endpoints: `/api/hosting/create`, `/api/hosting/join`, etc.
2. Verify data persistence by creating and joining lobbies
3. Check the database directly using your preferred PostgreSQL client
4. Deploy to production with the Cloud SQL Connector method
