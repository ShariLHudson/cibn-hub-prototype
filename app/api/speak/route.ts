import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return Response.json({ error: "Missing text." }, { status: 400 });
    }

    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: text,
      instructions:
        "Speak in a warm, calm, confident, grounded, conversational tone. Sound supportive and clear. Keep a steady pace. This is AI-generated audio.",
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Speak route error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown server error occurred.",
      },
      { status: 500 }
    );
  }
}