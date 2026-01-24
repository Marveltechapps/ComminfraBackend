# 🔍 Contact Form 500 Error - Diagnostic Guide

## ✅ What We Fixed

### 1. **req.body Validation** ✅
- Added check for `req.body` existence before accessing it
- Prevents crash if `express.json()` middleware fails
- Returns clear error: `BODY_PARSER_ERROR`

### 2. **express.json() Middleware** ✅
- Already configured correctly (line 135 in server.js)
- Placed BEFORE routes (correct order)
- Has 10MB limit

### 3. **dotenv Loading** ✅
- Already loaded FIRST (line 2-13 in server.js)
- Tries multiple paths for .env file
- Logs success/failure on startup

### 4. **Email Error Handling** ✅
- Enhanced error logging with specific error codes
- Test mode to bypass email (for debugging)
- Timeout protection (25 seconds)

## 🧪 TEST ENDPOINTS

### Test 1: Bypass Email (Recommended First Test)
**Endpoint:** `POST /api/contact/submit-test`

This endpoint:
- ✅ Validates request body
- ✅ Processes Google Sheets (if configured)
- ❌ **SKIPS email sending**

**How to test:**
```bash
curl -X POST http://13.232.113.79:5000/api/contact/submit-test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "message": "Test message"
  }'
```

**Expected Result:**
- ✅ If returns 200 → Backend works, issue is **EMAIL CONFIGURATION**
- ❌ If returns 500 → Issue is **BACKEND LOGIC** (not email)

### Test 2: Enable Test Mode
Add to your `.env` file:
```env
TEST_MODE=true
# OR
SKIP_EMAIL=true
```

Then use normal endpoint: `POST /api/contact/submit`

## 🔍 Diagnostic Checklist

### Step 1: Check Backend Logs
Look for these messages on server startup:

```
📁 .env loaded: ✅ Success  OR  ❌ Failed
✅ All email configuration variables are set  OR  ❌ Email configuration incomplete!
```

### Step 2: Check Request Body
Look for this in logs when form is submitted:
```
🔍 [MIDDLEWARE] Request body check:
   req.body exists: true/false
   req.body type: object/undefined
   req.body keys: [...]
```

### Step 3: Check Email Configuration
Verify these in `.env`:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password  # NOT regular password!
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
RECIPIENT_EMAIL=recipient@example.com
```

### Step 4: Common Email Issues

#### Gmail Issues:
1. **App Password Required**: Gmail blocks regular passwords
   - Go to: https://myaccount.google.com/apppasswords
   - Generate app password
   - Use that in `EMAIL_PASS`

2. **"Less Secure Apps" Disabled**: 
   - Gmail no longer supports this
   - **MUST use App Password**

3. **Wrong Port/Secure Flag**:
   - Port 587: `secure: false` ✅
   - Port 465: `secure: true` ✅
   - Port 25: Usually blocked by ISPs ❌

#### Connection Issues:
- `ECONNREFUSED`: Server can't reach SMTP host
- `ETIMEDOUT`: SMTP server not responding
- `EAUTH`: Authentication failed (wrong password)

## 📊 Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `BODY_PARSER_ERROR` | req.body is undefined | Check express.json() middleware |
| `EMAIL_CONFIG_MISSING` | Missing .env variables | Set all EMAIL_* variables |
| `EMAIL_TIMEOUT` | SMTP server timeout | Check network/firewall |
| `EMAIL_CONNECTION_FAILED` | Can't connect to SMTP | Check EMAIL_HOST and EMAIL_PORT |
| `EMAIL_AUTH_FAILED` | Wrong credentials | Use App Password for Gmail |
| `EMAIL_SEND_FAILED` | Generic email error | Check logs for details |

## 🚀 Quick Fix Steps

1. **Test without email first:**
   ```bash
   # Add to .env
   TEST_MODE=true
   ```

2. **Check backend logs** for:
   - `.env loaded` status
   - Email config validation
   - Request body parsing

3. **If test mode works:**
   - Fix email configuration
   - Check Gmail App Password
   - Verify SMTP settings

4. **If test mode fails:**
   - Check req.body parsing
   - Verify middleware order
   - Check backend logs for errors

## 📝 Log Analysis

### Good Logs (Working):
```
📥 ========== CONTACT FORM REQUEST RECEIVED ==========
📥 Request body keys: ['name', 'email', 'message']
📧 Attempting to send admin email...
✅ Admin email sent successfully
```

### Bad Logs (Error):
```
❌ req.body is undefined or invalid!
❌ Email configuration incomplete!
❌ EMAIL SEND ERROR
❌ SMTP authentication error
```

## 🎯 Next Steps

1. **Run test endpoint** (`/submit-test`)
2. **Check backend logs** for specific error
3. **Fix based on error code** (see table above)
4. **Test again** with real email

---

**Remember:** The frontend is innocent! All 500 errors come from backend. Use test endpoint to isolate the issue.
