# Asking Good Questions

Once you've configured a provider (see [Setting Up an AI Provider](setup-ai-providers.md)), open **Ask InsightLens** from the sidebar. The chat view has a single text box and a conversation history.

## What the assistant can see

The assistant has access to the schema of your local survey database and to the results of queries it runs against that database. It does **not** see raw PDFs, and it does not see data from any other source. You're asking questions of the data you imported, nothing more.

## Good question patterns

- **Be specific about scope.** "Which Semester 2 2024 units in Information Systems had a response rate below 20 %?" is much easier to answer than "show me problem units".
- **Name the metric.** Overall experience, response rate, comment count, and sentiment are all different things. Pick one.
- **Ask for a chart when you want one.** "Plot the overall experience trend for ISYS2001 across all semesters" will produce a chart in the conversation.
- **Iterate.** Follow-up questions build on the previous answer. "Now compare that to ISYS3001" will do the right thing.

## Things that confuse the assistant

- **Vague superlatives** ("which unit is best?") — best at what? over what period?
- **Data you haven't imported** — if you only imported one campus, asking about another will return empty results.
- **Non-survey knowledge** — the assistant is not a general-purpose chatbot. If you ask it about the weather, it will politely decline.

## Verifying answers

Whenever the assistant reports a number, click into the Units page or the Unit Detail page and cross-check. InsightLens is designed so every AI answer is reproducible from the underlying data — if you can't find the same number by filtering by hand, treat the answer with suspicion and ask the assistant to show its working.

## Privacy reminder

When you use a cloud provider, your questions and the database rows needed to answer them are sent over HTTPS to that provider. For sensitive free-text comments, consider running a local model via Ollama instead.
