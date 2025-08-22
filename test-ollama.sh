#!/bin/bash

# Test Ollama Server Connection
echo "Testing Ollama Server Connection"
echo "================================="

# Get server URL from user or use default
if [ -z "$1" ]; then
    echo "Usage: ./test-ollama.sh <server-url> [bearer-token]"
    echo "Example: ./test-ollama.sh http://localhost:11434"
    echo "Example: ./test-ollama.sh http://my-server:11434 my-bearer-token"
    echo ""
    echo "Testing default localhost..."
    SERVER_URL="http://localhost:11434"
else
    SERVER_URL="$1"
fi

BEARER_TOKEN="$2"

echo "Server: $SERVER_URL"
if [ -n "$BEARER_TOKEN" ]; then
    echo "Auth: Bearer token provided (${BEARER_TOKEN:0:10}...)"
    AUTH_HEADER="-H \"Authorization: Bearer $BEARER_TOKEN\""
else
    echo "Auth: No authentication"
    AUTH_HEADER=""
fi
echo ""

# Test 1: Check if server is alive (native Ollama endpoint)
echo "Test 1: Checking Ollama native API (/api/tags)..."
if [ -n "$BEARER_TOKEN" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/api/tags")
else
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/api/tags")
fi

if [ "$RESPONSE" = "200" ]; then
    echo "✓ Native Ollama API is accessible"
    
    # Get the actual models list
    echo ""
    echo "Available models:"
    if [ -n "$BEARER_TOKEN" ]; then
        curl -s -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/api/tags" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'models' in data:
        for model in data['models']:
            print(f\"  - {model.get('name', 'unknown')} ({model.get('size', 'unknown size')})\")
    else:
        print('  No models found')
except:
    print('  Could not parse response')
" 2>/dev/null || echo "  Could not parse models list"
    else
        curl -s "$SERVER_URL/api/tags" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'models' in data:
        for model in data['models']:
            print(f\"  - {model.get('name', 'unknown')} ({model.get('size', 'unknown size')})\")
    else:
        print('  No models found')
except:
    print('  Could not parse response')
" 2>/dev/null || echo "  Could not parse models list"
    fi
elif [ "$RESPONSE" = "401" ]; then
    echo "❌ Authentication required (HTTP 401)"
    echo "   This server requires a Bearer token"
elif [ "$RESPONSE" = "404" ]; then
    echo "⚠️  Endpoint not found (HTTP 404) - Server may not be Ollama"
else
    echo "❌ Failed to connect (HTTP $RESPONSE)"
fi

echo ""

# Test 2: Check OpenAI-compatible endpoint
echo "Test 2: Checking OpenAI-compatible API (/v1/models)..."
if [ -n "$BEARER_TOKEN" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/v1/models")
    V1_BODY=$(curl -s -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/v1/models")
else
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/v1/models")
    V1_BODY=$(curl -s "$SERVER_URL/v1/models")
fi

if [ "$RESPONSE" = "200" ]; then
    echo "✓ OpenAI-compatible API is accessible"
    
    # Try to parse models
    echo ""
    echo "Models via OpenAI-compatible endpoint:"
    echo "$V1_BODY" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'data' in data:
        for model in data['data']:
            print(f\"  - {model.get('id', 'unknown')}\")
    elif 'models' in data:
        for model in data['models']:
            model_id = model if isinstance(model, str) else model.get('id', model.get('name', 'unknown'))
            print(f\"  - {model_id}\")
    else:
        print('  Response format not recognized')
        print('  Raw response:', json.dumps(data, indent=2)[:500])
except Exception as e:
    print(f'  Could not parse response: {e}')
    print('  Raw:', sys.stdin.read()[:200])
" 2>/dev/null || echo "  Could not parse models list"
elif [ "$RESPONSE" = "404" ]; then
    echo "⚠️  OpenAI-compatible endpoint not found (HTTP 404)"
    echo "   The server may only support native Ollama API"
else
    echo "❌ Failed to access OpenAI-compatible API (HTTP $RESPONSE)"
fi

echo ""

# Test 3: Try a simple generation (native Ollama)
echo "Test 3: Testing model generation (native API)..."
if [ -n "$BEARER_TOKEN" ]; then
    GEN_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $BEARER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"model": "llama3.2", "prompt": "Hello", "stream": false}' \
        "$SERVER_URL/api/generate" 2>/dev/null | head -c 200)
else
    GEN_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"model": "llama3.2", "prompt": "Hello", "stream": false}' \
        "$SERVER_URL/api/generate" 2>/dev/null | head -c 200)
fi

if echo "$GEN_RESPONSE" | grep -q "response"; then
    echo "✓ Generation endpoint works"
elif echo "$GEN_RESPONSE" | grep -q "model.*not found"; then
    echo "⚠️  Generation endpoint works but llama3.2 model not installed"
    echo "   Install a model with: ollama pull llama3.2"
else
    echo "⚠️  Could not test generation"
    echo "   Response: $GEN_RESPONSE"
fi

echo ""
echo "================================="
echo "Summary:"
echo ""
echo "For InsightLens Settings, use:"
echo "  API URL: $SERVER_URL/v1"
if [ -n "$BEARER_TOKEN" ]; then
    echo "  API Key: $BEARER_TOKEN"
else
    echo "  API Key: (leave empty)"
fi
echo ""
echo "Note: If models don't appear in InsightLens, you can manually enter"
echo "the model name (e.g., 'llama3.2', 'mistral', etc.) in the custom model field."