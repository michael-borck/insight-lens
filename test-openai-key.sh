#!/bin/bash

# Test OpenAI API Key from environment
echo "Testing OpenAI API Key..."
echo "========================"

# Check if API key exists
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY environment variable is not set"
    echo ""
    echo "To set it temporarily for this session:"
    echo "  export OPENAI_API_KEY='your-key-here'"
    echo ""
    echo "To set it permanently, add to ~/.bashrc or ~/.zshrc"
    exit 1
fi

# Show masked API key
echo "✓ API Key found: ${OPENAI_API_KEY:0:7}...${OPENAI_API_KEY: -4}"
echo ""

# Test 1: Check models endpoint (lightweight)
echo "Test 1: Checking models endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    https://api.openai.com/v1/models)

if [ "$RESPONSE" = "200" ]; then
    echo "✓ Models endpoint successful (HTTP 200)"
elif [ "$RESPONSE" = "401" ]; then
    echo "❌ Authentication failed (HTTP 401) - Invalid API key"
    exit 1
elif [ "$RESPONSE" = "429" ]; then
    echo "⚠️  Rate limit hit (HTTP 429) - Key is valid but rate limited"
elif [ "$RESPONSE" = "521" ] || [ "$RESPONSE" = "529" ]; then
    echo "⚠️  Cloudflare error (HTTP $RESPONSE) - OpenAI service issue, try again later"
else
    echo "❌ Unexpected response: HTTP $RESPONSE"
fi

echo ""

# Test 2: Make a minimal completion request
echo "Test 2: Testing chat completion..."
CHAT_RESPONSE=$(curl -s -w "\n---HTTP_CODE---%{http_code}" \
    https://api.openai.com/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": "Say hello"}],
        "max_tokens": 5
    }')

HTTP_CODE=$(echo "$CHAT_RESPONSE" | grep -o "---HTTP_CODE---[0-9]*" | cut -d'-' -f5)
BODY=$(echo "$CHAT_RESPONSE" | sed '/---HTTP_CODE---/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Chat completion successful!"
    echo ""
    echo "Response preview:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null | head -15 || echo "$BODY" | head -5
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Authentication failed - Invalid API key"
    echo "Error: $BODY"
elif [ "$HTTP_CODE" = "429" ]; then
    echo "⚠️  Rate limit exceeded - Key is valid but you've hit the rate limit"
    echo "Error: $BODY"
elif [ "$HTTP_CODE" = "521" ] || [ "$HTTP_CODE" = "529" ]; then
    echo "⚠️  Cloudflare error ($HTTP_CODE) - OpenAI is experiencing issues"
    echo "This is a temporary OpenAI service issue. Please try again in a few minutes."
elif [ "$HTTP_CODE" = "400" ]; then
    echo "❌ Bad request - Check API key format"
    echo "Error: $BODY"
else
    echo "❌ Unexpected response: HTTP $HTTP_CODE"
    echo "Response: $BODY"
fi

echo ""
echo "========================"
echo "Test complete!"