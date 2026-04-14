# Setting Up an AI Provider

Ask InsightLens is an optional feature that lets you ask questions about your survey data in plain English. InsightLens does not bundle an AI provider — you bring your own. Supported services:

- **OpenAI** (ChatGPT family)
- **Anthropic** (Claude family)
- **Google** (Gemini family)
- **OpenRouter** (aggregator for many models)
- **Groq** (fast hosted inference)
- **Ollama** running locally for fully offline use
- Any **OpenAI-compatible** HTTP endpoint (LM Studio, LocalAI, vLLM, etc.)

You choose which one to use from **Settings → AI Assistant**. There is no preselected default — the drop-down starts blank so you have to make an explicit choice.

## Why this matters for privacy

- If you don't configure a provider, InsightLens makes **no AI-related network calls**. The feature is simply unavailable.
- If you configure a **cloud provider** (OpenAI, Anthropic, Google, OpenRouter, Groq), your questions and relevant context from your database are sent to that provider's API. Read their terms before sending sensitive data.
- If you configure **Ollama** or another local server, nothing leaves your machine.

## Configuring a cloud provider

1. Open **Settings → AI Assistant**.
2. Pick a service from the **AI Service** drop-down.
3. Paste your API key into the **Secret key** field. InsightLens stores keys in the OS-level Electron secure store.
4. Click **Test Connection**. You should see a success toast.
5. Use **Fetch Models** to populate the model list, then pick one (for example `gpt-4o-mini`, `claude-3-5-sonnet-latest`, or `gemini-2.0-flash`).
6. Save.

If you already have the relevant environment variable set — `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` / `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or `GROQ_API_KEY` — InsightLens will pick that up automatically and the key field becomes optional.

## Configuring Ollama (local)

1. Install Ollama from [ollama.com](https://ollama.com/) and make sure it's running.
2. Pull a model that fits your hardware:
    ```
    ollama pull llama3.1
    ```
3. In InsightLens, pick **Local AI (Ollama)** from the AI Service drop-down. The URL will be `http://localhost:11434`.
4. Leave the secret key blank — Ollama doesn't need one.
5. Click **Test Connection**, then **Fetch Models** and pick the model you pulled.

## Using a custom OpenAI-compatible endpoint

Pick **Custom** from the drop-down and paste the full base URL (for example `http://localhost:1234/v1` for LM Studio). InsightLens speaks the OpenAI chat-completions protocol, so anything that implements that should work.

## Where the call actually happens

All AI calls are made from the main Electron process over IPC, not directly from the renderer. That's a deliberate choice — it avoids CORS issues with providers that don't set permissive headers, and it keeps API keys out of renderer memory.

## Changing providers

Switching providers is just a matter of picking a different option from the drop-down, pasting the relevant key, and saving. Your question history isn't tied to a specific provider.
