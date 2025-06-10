# Setting Up AI Providers

InsightLens supports multiple AI providers to give you flexible options for natural language analysis. This guide walks you through setting up and configuring different AI services.

## Supported AI Providers

### OpenAI (ChatGPT)
- **Models**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- **Best For**: General analysis, reliable responses, wide language support
- **Cost**: Pay-per-use via OpenAI API
- **Setup Difficulty**: Easy

### Anthropic (Claude)
- **Models**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Best For**: Detailed analysis, safety-focused responses, complex reasoning
- **Cost**: Pay-per-use via Anthropic API
- **Setup Difficulty**: Easy

### Local Models (Ollama)
- **Models**: Llama 3.2, Llama 3.1, Mistral, Qwen 2.5 Coder
- **Best For**: Privacy, offline use, no usage costs after setup
- **Cost**: Free (hardware requirements apply)
- **Setup Difficulty**: Moderate

### Custom OpenAI-Compatible APIs
- **Providers**: LM Studio, LocalAI, Text Generation Web UI
- **Best For**: Self-hosted solutions, custom models
- **Cost**: Varies by provider
- **Setup Difficulty**: Advanced

## Getting API Keys

### OpenAI API Key

1. **Visit** [OpenAI's website](https://platform.openai.com/)
2. **Create account** or sign in to existing account
3. **Navigate** to API Keys section
4. **Create new secret key**
5. **Copy and save** the key securely (starts with `sk-`)

**Important Notes:**
- Keys are only shown once - save immediately
- Keep keys secure and never share publicly
- Monitor usage to control costs
- Set usage limits to prevent unexpected charges

### Anthropic API Key

1. **Visit** [Anthropic's Console](https://console.anthropic.com/)
2. **Create account** or sign in
3. **Go to** API Keys section
4. **Generate new key**
5. **Copy and save** the key securely (starts with `sk-ant-`)

**Billing Setup:**
- Credit card required for API access
- Pay-as-you-go pricing model
- Usage monitoring tools available
- Set spending limits for cost control

## Configuration in InsightLens

### Basic Setup Steps

1. **Open InsightLens** and navigate to Settings (⚙️ in sidebar)
2. **Locate** the "AI Assistant" section
3. **Select** your preferred provider from dropdown
4. **Enter** your API key in the secure field
5. **Choose** your preferred model
6. **Test connection** to verify setup

### Provider-Specific Configuration

#### OpenAI Setup
```
API Provider: OpenAI
API URL: https://api.openai.com (auto-filled)
API Key: sk-your-openai-key-here
Model: gpt-4o-mini (recommended for most users)
```

**Model Selection Guide:**
- **GPT-4o Mini**: Best balance of cost and performance
- **GPT-4o**: Higher quality, more expensive
- **GPT-4 Turbo**: Good for complex analysis
- **GPT-3.5 Turbo**: Budget option, lower quality

#### Anthropic (Claude) Setup
```
API Provider: Claude (Anthropic)
API URL: https://api.anthropic.com (auto-filled)
API Key: sk-ant-your-anthropic-key-here
Model: claude-3-5-sonnet-20241022 (recommended)
```

**Model Comparison:**
- **Claude 3.5 Sonnet**: Best overall performance
- **Claude 3.5 Haiku**: Faster, less expensive
- **Claude 3 Opus**: Most capable, highest cost

#### Ollama (Local) Setup
```
API Provider: Ollama (Local)
API URL: http://localhost:11434 (default)
Model: llama3.2 (or your installed model)
```

**Prerequisites:**
- Ollama installed and running on your system
- At least one model downloaded
- Sufficient RAM (8GB+ recommended)

## Local AI Setup (Ollama)

### Installing Ollama

#### Windows
1. **Download** Ollama installer from [ollama.ai](https://ollama.ai/)
2. **Run installer** and follow setup wizard
3. **Open Command Prompt** or PowerShell
4. **Verify installation**: `ollama --version`

#### macOS
1. **Download** Ollama for macOS from [ollama.ai](https://ollama.ai/)
2. **Install** the application
3. **Open Terminal**
4. **Verify installation**: `ollama --version`

#### Linux
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Verify installation
ollama --version
```

### Installing Models

#### Recommended Models for Survey Analysis

**Llama 3.2 (3B)** - Fast, good for basic analysis
```bash
ollama pull llama3.2
```

**Llama 3.1 (8B)** - Better quality, moderate resource usage
```bash
ollama pull llama3.1
```

**Mistral (7B)** - Good alternative with different strengths
```bash
ollama pull mistral
```

**Qwen 2.5 Coder (7B)** - Excellent for structured data analysis
```bash
ollama pull qwen2.5-coder
```

### Running Ollama

#### Starting the Service
```bash
# Start Ollama (usually starts automatically)
ollama serve

# Test with a simple query
ollama run llama3.2 "Hello, how are you?"
```

#### Checking Available Models
```bash
# List installed models
ollama list

# Check running models
ollama ps
```

### System Requirements for Local Models

#### Minimum Requirements
- **RAM**: 8GB (for 3B models)
- **Storage**: 4GB per model
- **CPU**: Modern multi-core processor
- **OS**: Windows 10+, macOS 10.15+, Linux

#### Recommended Specifications
- **RAM**: 16GB+ (for 7B+ models)
- **GPU**: Optional but improves performance
- **Storage**: SSD for better model loading
- **CPU**: Recent Intel/AMD with good single-thread performance

## Environment Variables (Optional)

For enhanced security and convenience, you can set API keys as environment variables:

### Windows
```batch
# Command Prompt
set OPENAI_API_KEY=sk-your-key-here
set ANTHROPIC_API_KEY=sk-ant-your-key-here

# PowerShell
$env:OPENAI_API_KEY = "sk-your-key-here"
$env:ANTHROPIC_API_KEY = "sk-ant-your-key-here"
```

### macOS/Linux
```bash
# Add to ~/.bashrc or ~/.zshrc
export OPENAI_API_KEY="sk-your-key-here"
export ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Apply changes
source ~/.bashrc
```

### Benefits of Environment Variables
- **Enhanced Security**: Keys not stored in application settings
- **Easy Management**: Change keys without opening InsightLens
- **Team Sharing**: Share configuration without exposing keys
- **Backup Safety**: Keys not included in setting backups

## Testing Your Setup

### Connection Test

1. **In Settings**, click "Test Connection" button
2. **Wait for response** - should show green checkmark
3. **Check error messages** if test fails
4. **Verify model availability** in dropdown

### First AI Query

1. **Navigate** to "Ask InsightLens" page
2. **Enter simple question**: "How many units are in my database?"
3. **Wait for response** and generated chart
4. **Verify** results match your expectations

### Troubleshooting Connection Issues

#### OpenAI Connection Problems
- **Invalid API Key**: Check key format (starts with sk-)
- **Quota Exceeded**: Check billing and usage limits
- **Rate Limiting**: Wait a few minutes and retry
- **Model Availability**: Ensure selected model is accessible

#### Anthropic Connection Problems
- **Authentication Failed**: Verify API key accuracy
- **Insufficient Credits**: Check account balance
- **Model Access**: Ensure you have access to selected model
- **Regional Restrictions**: Check if service is available in your region

#### Ollama Connection Problems
- **Service Not Running**: Start Ollama service
- **Model Not Found**: Download required model
- **Port Conflicts**: Check if port 11434 is available
- **Memory Issues**: Ensure sufficient RAM for model

## Cost Management

### Understanding Pricing

#### OpenAI Pricing (approximate)
- **GPT-4o Mini**: $0.15/1M input tokens, $0.60/1M output tokens
- **GPT-4o**: $5.00/1M input tokens, $15.00/1M output tokens
- **GPT-4 Turbo**: $10.00/1M input tokens, $30.00/1M output tokens

#### Anthropic Pricing (approximate)
- **Claude 3.5 Sonnet**: $3.00/1M input tokens, $15.00/1M output tokens
- **Claude 3.5 Haiku**: $0.25/1M input tokens, $1.25/1M output tokens
- **Claude 3 Opus**: $15.00/1M input tokens, $75.00/1M output tokens

### Cost Optimization Tips

**Choose Appropriate Models**
- Use cheaper models for simple queries
- Reserve premium models for complex analysis
- Test with small datasets first

**Efficient Query Design**
- Be specific and concise in questions
- Avoid unnecessary follow-up queries
- Use filters to reduce data scope

**Monitor Usage**
- Check API provider dashboards regularly
- Set up billing alerts
- Track usage patterns in InsightLens

## Security Best Practices

### API Key Security
- **Never share** API keys publicly
- **Use environment variables** when possible
- **Rotate keys** periodically
- **Revoke unused** or compromised keys

### Data Privacy
- **Understand** what data is sent to AI providers
- **Review** privacy policies of your chosen provider
- **Consider local models** for sensitive data
- **Implement data minimization** strategies

### Access Control
- **Limit** who can configure AI settings
- **Use** separate keys for different team members
- **Monitor** usage for unusual patterns
- **Implement** approval processes for new providers

---

**Next**: [Asking Questions](asking-questions.md)