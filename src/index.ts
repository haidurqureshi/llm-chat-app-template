/**
 * Portfolio Chat Worker
 * Cloudflare Workers AI — streaming SSE chat backend
 */

const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

// ✏️  Edit this to match your actual name, skills, and services
const SYSTEM_PROMPT = `You are a friendly assistant on a personal portfolio website.
Your job is to help visitors learn about the site owner and their work.

About the owner:
- Name: Haidur
- Role: Fullstack developer & UI/UX designer
- Skills: Python, HTML, CSS, JS, Rust, C
- Services: Web application development, UI/UX design, technical consulting
- Availability: Open to new projects — typical lead time is 2–3 weeks
- Pricing: Project-based; contact for a quote
- Contact: haidur@haidurqureshi.com
- Portfolio highlights: known.org.uk - a web based game development platfrom with orginal games remade by Haidur

Rules:
- Be warm, concise, and conversational — no walls of text
- If asked about pricing specifics, invite them to get in touch directly
- If asked something you don't know, suggest they send an email
- Never make up projects or credentials not listed above
- Keep responses under 3 sentences unless a detailed explanation is genuinely needed`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve static assets for all non-API routes
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
      return handleChat(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleChat(request: Request, env: Env): Promise<Response> {
  try {
    const { messages = [] }: { messages: { role: string; content: string }[] } =
      await request.json();

    // Prepend system prompt if not already present
    if (!messages.some((m) => m.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const stream = await env.AI.run(
      MODEL_ID,
      { messages, max_tokens: 512, stream: true },
      {}
    );

    return new Response(stream as ReadableStream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

interface Env {
  AI: Ai;
  ASSETS: Fetcher;
}
