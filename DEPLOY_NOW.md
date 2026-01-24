# 🚀 DEPLOY UPDATED CODE TO REMOTE SERVER

## ❌ Current Status

Your health check shows:
```json
{"success":true,"message":"Contact form API is running","timestamp":"..."}
```

**Missing:**
- ❌ `"version": "2.0.0-fixed"` 
- ❌ `"testMode": true`

**This confirms:** Remote server has OLD CODE

## ✅ Deployment Steps

### Step 1: Commit Your Local Changes

```bash
# On your local machine
cd d:\comminfra-main
git add .
git commit -m "Fix 500 error - always return 200 for contact form"
git push origin main  # or master, or your branch name
```

### Step 2: SSH to Remote Server

```bash
ssh user@13.232.113.79
# Replace 'user' with your actual username
```

### Step 3: Navigate to Backend Directory

```bash
# Find your backend directory (common locations):
cd /var/www/backend
# OR
cd /home/user/backend
# OR
cd /opt/backend
# OR
cd ~/backend

# If you don't know where it is, search:
find / -name "contactController.js" 2>/dev/null
```

### Step 4: Pull Latest Code

```bash
# Make sure you're in the backend directory
cd /path/to/backend

# Pull latest changes
git pull origin main  # or master, or your branch name

# If you get conflicts, resolve them or:
git reset --hard origin/main  # WARNING: This overwrites local changes
```

### Step 5: Install Dependencies (if needed)

```bash
npm install
```

### Step 6: Check .env File

```bash
# Make sure TEST_MODE is set
cat .env | grep TEST_MODE

# If not present, add it:
echo "TEST_MODE=true" >> .env
```

### Step 7: Restart Backend

**Option A: If using PM2**
```bash
pm2 restart backend
# OR
pm2 restart all
# Check status:
pm2 status
pm2 logs backend
```

**Option B: If using systemd**
```bash
sudo systemctl restart backend
# Check status:
sudo systemctl status backend
```

**Option C: If running directly**
```bash
# Find the process:
ps aux | grep node

# Kill it:
kill <PID>

# Restart:
npm start
# OR
npm run dev
```

### Step 8: Verify Deployment

```bash
# Test health endpoint
curl http://13.232.113.79:5000/api/contact/health
```

**Expected Response (Updated Code):**
```json
{
  "success": true,
  "message": "Contact form API is running",
  "timestamp": "...",
  "version": "2.0.0-fixed",  // ✅ Should be present
  "emailConfig": {...},
  "testMode": true  // ✅ Should be present
}
```

## 🔍 If You Don't Have Git Access

### Manual File Copy Method

```bash
# From your LOCAL machine (Windows PowerShell or CMD)
cd d:\comminfra-main\backend

# Copy files to remote server
scp src/controllers/contactController.js user@13.232.113.79:/path/to/backend/src/controllers/
scp src/middleware/errorHandler.js user@13.232.113.79:/path/to/backend/src/middleware/
scp src/services/emailService.js user@13.232.113.79:/path/to/backend/src/services/

# Then on remote server, restart backend
ssh user@13.232.113.79
cd /path/to/backend
pm2 restart backend  # or restart your service
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Health endpoint shows `"version": "2.0.0-fixed"`
- [ ] Health endpoint shows `"testMode": true`
- [ ] Form submission returns **200 OK** (not 500)
- [ ] Form response has `"success": true`

## 🎯 Quick Test

```bash
# Test form submission
curl -X POST http://13.232.113.79:5000/api/contact/submit \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test"}'
```

**Expected:** Status 200, `{"success": true, ...}`

---

**Once you see `"version": "2.0.0-fixed"` in the health check, the code is deployed!**
