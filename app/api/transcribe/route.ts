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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing audio file." }, { status: 400 });
    }

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
    });

    const text = transcription.text?.trim() || "";

    return Response.json({ text });
  } catch (error) {
    console.error("Transcribe route error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown server error occurred.",
      },
      { status: 500 }
    );
  }
}