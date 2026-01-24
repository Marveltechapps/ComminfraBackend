#!/bin/bash
# Script to check if remote server has updated code

echo "🔍 Checking Remote Server Code Status..."
echo ""

# Test health endpoint
echo "1. Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s http://13.232.113.79:5000/api/contact/health)

echo "Response: $HEALTH_RESPONSE"
echo ""

# Check for version
if echo "$HEALTH_RESPONSE" | grep -q "2.0.0-fixed"; then
    echo "✅ Version: 2.0.0-fixed (Updated code detected)"
else
    echo "❌ Version: Old code detected (not 2.0.0-fixed)"
fi

# Check for testMode
if echo "$HEALTH_RESPONSE" | grep -q "testMode"; then
    echo "✅ TEST_MODE: Present in response"
else
    echo "❌ TEST_MODE: Not found in response"
fi

echo ""
echo "2. Testing Form Submission..."
FORM_RESPONSE=$(curl -s -X POST http://13.232.113.79:5000/api/contact/submit \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}')

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://13.232.113.79:5000/api/contact/submit \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}')

echo "HTTP Status: $HTTP_STATUS"
echo "Response: $FORM_RESPONSE"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Form submission returns 200 OK (Updated code)"
else
    echo "❌ Form submission returns $HTTP_STATUS (Old code or error)"
fi

echo ""
echo "📋 Summary:"
echo "If you see ❌ marks above, the remote server has OLD CODE"
echo "Deploy updated code using: git pull on remote server"
