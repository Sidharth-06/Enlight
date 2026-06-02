import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "Groq API key is not configured for cloud transcription." },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    
    // Diagnostic logging to see what was sent in the FormData
    console.log("[Transcribe API] Incoming FormData keys:", Array.from(formData.keys()));
    for (const [key, val] of Array.from(formData.entries())) {
      const isFile = val instanceof File;
      const isBlob = val instanceof Blob;
      console.log(`  -> Key: "${key}" | Type: ${typeof val} | isFile: ${isFile} | isBlob: ${isBlob} | Name: ${isFile || isBlob ? (val as any).name : 'N/A'}`);
    }

    const file = (formData.get("file") || formData.get("audio")) as File;

    if (!file) {
      console.error("[Transcribe API] No file found under keys 'file' or 'audio' in request payload");
      return NextResponse.json(
        { error: "Audio file is required in request payload." },
        { status: 400 }
      );
    }

    console.log(`[Transcribe API] Received audio file: name="${file.name}", size=${file.size} bytes, type="${file.type}"`);

    // Forward the file directly to Groq's high-speed Whisper endpoint
    const groqFormData = new FormData();
    groqFormData.append("file", file, file.name || "speech.webm");
    groqFormData.append("model", "whisper-large-v3");
    groqFormData.append("temperature", "0.0");
    groqFormData.append("language", "en");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Groq Whisper API returned HTTP ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as { text: string };
    return NextResponse.json({ text: payload.text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription server failure." },
      { status: 500 }
    );
  }
}
