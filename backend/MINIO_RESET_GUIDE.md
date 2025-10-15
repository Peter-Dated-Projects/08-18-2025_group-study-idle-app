# MinIO Storage Reset Scripts

Tools for resetting the MinIO storage container during development and testing.

---

## 📋 Available Scripts

### 1. Python Script (Recommended)

**File:** `reset_minio_storage.py`

Full-featured Python script with detailed options and error handling.

### 2. Shell Script (Quick & Simple)

**File:** `reset_minio_storage.sh`

Simple bash script using MinIO CLI (mc) for quick resets.

---

## 🚀 Quick Start

### Using Python Script

```bash
# Basic reset - delete all objects except default picture
python reset_minio_storage.py

# Delete everything including default picture
python reset_minio_storage.py --no-keep-default

# Complete reset - recreate bucket and upload default picture
python reset_minio_storage.py --recreate-bucket --upload-default

# Dry run - see what would be deleted
python reset_minio_storage.py --dry-run

# Just show statistics
python reset_minio_storage.py --stats-only
```

### Using Shell Script

```bash
# Basic reset
./reset_minio_storage.sh

# That's it! The shell script is simple and interactive
```

---

## 📖 Python Script Options

### Basic Usage

```bash
python reset_minio_storage.py [OPTIONS]
```

### Options

| Option              | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `--bucket NAME`     | Specify bucket name (default: study-garden-bucket)   |
| `--keep-default`    | Keep the default profile picture (default_pfp.png)   |
| `--recreate-bucket` | Delete and recreate the bucket completely            |
| `--dry-run`         | Show what would be deleted without actually deleting |
| `--stats-only`      | Only show bucket statistics without making changes   |
| `--upload-default`  | Upload default profile picture after reset           |

### Examples

**See what would be deleted:**

```bash
python reset_minio_storage.py --dry-run
```

**Delete everything except default picture:**

```bash
python reset_minio_storage.py --keep-default
```

**Complete reset with fresh bucket:**

```bash
python reset_minio_storage.py --recreate-bucket --upload-default
```

**Reset specific bucket:**

```bash
python reset_minio_storage.py --bucket my-custom-bucket
```

**Check storage usage:**

```bash
python reset_minio_storage.py --stats-only
```

---

## 🔧 Shell Script Usage

### Prerequisites

Install MinIO Client (mc):

**macOS:**

```bash
brew install minio/stable/mc
```

**Linux:**

```bash
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/
```

**Windows:**

```powershell
# Download from: https://dl.min.io/client/mc/release/windows-amd64/mc.exe
```

### Configuration

Set environment variables (optional):

```bash
export MINIO_ENDPOINT="http://localhost:9000"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin"
export BUCKET_NAME="study-garden-bucket"
```

### Run

```bash
./reset_minio_storage.sh
```

The script will:

1. ✅ Connect to MinIO
2. 📋 List current objects
3. ⚠️ Ask for confirmation
4. 🗑️ Delete all objects
5. 📤 Upload default picture (if exists)
6. 📊 Show final statistics

---

## 📊 Expected Output

### Python Script Output

```
============================================================
MinIO Storage Container Reset Script
============================================================

🔌 Connecting to MinIO at localhost:9000...
✅ Connected to MinIO successfully
✅ Bucket 'study-garden-bucket' exists

📊 Current State:

📋 Listing objects in bucket 'study-garden-bucket'...
   Found 45 objects:
   - user_123_profile.png (14.23 KB)
   - user_456_profile.png (15.67 KB)
   - default_pfp.png (12.34 KB)
   [...]

📊 Bucket Statistics:
   Total Objects: 45
   Total Size: 0.67 MB (701,234 bytes)

⚠️  WARNING: This will delete objects in the bucket!

Type 'yes' to confirm: yes

============================================================
Starting Reset Process
============================================================

🗑️  Deleting 44 objects...
   ✓ Deleted: user_123_profile.png
   ✓ Deleted: user_456_profile.png
   [...]

✅ Successfully deleted 44 objects

⏭️  Skipping default profile picture: default_pfp.png

============================================================
Final State:
============================================================

📊 Bucket Statistics:
   Total Objects: 1
   Total Size: 0.01 MB (12,340 bytes)

============================================================
✅ Reset Complete!
============================================================
```

### Shell Script Output

```
============================================================
MinIO Storage Reset Script
============================================================
✅ MinIO Client (mc) found

🔧 Configuring MinIO connection...
✅ Connected to MinIO at http://localhost:9000

📋 Current objects in bucket 'study-garden-bucket':
[2024-10-14 15:30:42 PDT]  14KiB user_123_profile.png
[2024-10-14 15:31:15 PDT]  15KiB user_456_profile.png
[2024-10-14 14:20:05 PDT]  12KiB default_pfp.png
   Total: 45 objects

⚠️  WARNING: This will delete ALL objects in the bucket!
Type 'yes' to confirm: yes

🗑️  Deleting all objects...
Removing `myminio/study-garden-bucket/user_123_profile.png`.
Removing `myminio/study-garden-bucket/user_456_profile.png`.
[...]
✅ All objects deleted successfully

📤 Uploading default profile picture...
✅ Default profile picture uploaded

============================================================
📊 Final State:
============================================================
[2024-10-14 15:35:22 PDT]  12KiB default_pfp.png
   Total: 1 objects

============================================================
✅ Reset Complete!
============================================================
```

---

## 🧪 Common Use Cases

### 1. Clean Development Environment

```bash
# Reset to clean state but keep default picture
python reset_minio_storage.py --keep-default
```

### 2. Fresh Start for Testing

```bash
# Complete reset with fresh bucket
python reset_minio_storage.py --recreate-bucket --upload-default
```

### 3. Check Storage Usage

```bash
# See current storage statistics
python reset_minio_storage.py --stats-only
```

### 4. Preview Changes

```bash
# See what would be deleted without actually deleting
python reset_minio_storage.py --dry-run
```

### 5. Testing Cache Invalidation

```bash
# Delete all user pictures but keep default
python reset_minio_storage.py --keep-default

# This will trigger cache misses and test the caching system
```

---

## ⚙️ Configuration

### Environment Variables

The scripts read configuration from environment variables or `.env` file:

```bash
# .env file
MINIO_ENDPOINT=localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_SECURE=False
```

### Default Values

- **Endpoint:** `localhost:9000`
- **Access Key:** `minioadmin`
- **Secret Key:** `minioadmin`
- **Bucket:** `study-garden-bucket`
- **Secure:** `False` (no HTTPS)

---

## 🔒 Safety Features

### Python Script

- ✅ Confirmation prompt before deletion
- ✅ Dry-run mode to preview changes
- ✅ Option to keep default picture
- ✅ Detailed error messages
- ✅ Stats-only mode for inspection

### Shell Script

- ✅ Confirmation prompt before deletion
- ✅ Color-coded output for clarity
- ✅ Automatic default picture upload
- ✅ Error handling

---

## 🐛 Troubleshooting

### Python Script Issues

**Problem:** `ModuleNotFoundError: No module named 'minio'`

**Solution:**

```bash
pip install minio python-dotenv
# Or use requirements.txt
pip install -r requirements.txt
```

**Problem:** Connection refused to MinIO

**Solution:**

```bash
# Check if MinIO is running
docker ps | grep minio

# Start MinIO if not running
docker-compose up -d minio
```

**Problem:** Access denied error

**Solution:**

```bash
# Check credentials in .env file
# Make sure MINIO_ROOT_USER and MINIO_ROOT_PASSWORD are correct
```

### Shell Script Issues

**Problem:** `mc: command not found`

**Solution:**

```bash
# Install MinIO Client
brew install minio/stable/mc  # macOS
```

**Problem:** Connection error

**Solution:**

```bash
# Manually configure MinIO alias
mc alias set myminio http://localhost:9000 minioadmin minioadmin

# Test connection
mc ls myminio
```

---

## 📝 Integration with Cache Testing

These scripts are particularly useful for testing the profile picture caching system:

### Test Cache Invalidation

```bash
# 1. Load some profile pictures in the app
# 2. Reset MinIO storage
python reset_minio_storage.py

# 3. Reload app - should see cache misses and fresh downloads
```

### Test Cache Performance

```bash
# 1. Reset storage and load 50 profile pictures
python reset_minio_storage.py --recreate-bucket --upload-default

# 2. Open cache dashboard to see metrics
# 3. All 50 pictures should be cache misses initially
# 4. Refresh page - all should be cache hits (95%+ hit rate)
```

### Test Offline Mode

```bash
# 1. Load profile pictures (fills cache)
# 2. Reset MinIO storage
python reset_minio_storage.py

# 3. Go offline (Network tab → Offline)
# 4. Cached pictures should still load from IndexedDB/Service Worker
```

---

## 🎯 Best Practices

1. **Always use `--dry-run` first** to preview what will be deleted
2. **Keep default picture** during development with `--keep-default`
3. **Use `--stats-only`** to monitor storage growth
4. **Run before major testing** to ensure clean state
5. **Combine with cache monitoring** to validate caching system

---

## 📚 Related Documentation

- **Cache System:** `PROFILE_PICTURE_CACHING_ALL_PHASES_COMPLETE.md`
- **Backend Services:** `backend/app/services/minio_image_service.py`
- **Testing Guide:** `backend/test_image_url_cache.py`

---

## ✅ Summary

**Two scripts available:**

1. **Python:** `reset_minio_storage.py` - Full-featured with many options
2. **Shell:** `reset_minio_storage.sh` - Quick and simple

**Common usage:**

```bash
# Most common: Reset but keep default picture
python reset_minio_storage.py --keep-default

# Or use shell script
./reset_minio_storage.sh
```

**For testing cache system:**

```bash
# Complete reset to test from scratch
python reset_minio_storage.py --recreate-bucket --upload-default
```

Both scripts are safe, interactive, and production-ready! 🚀
