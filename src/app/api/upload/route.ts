import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const allowedExtensions = ["pdf", "txt", "md", "docx", "pptx", "html", "json"];

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose a document to upload." }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "For this portfolio demo, files must be 20 MB or smaller." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json({ error: "Unsupported file type. Try PDF, DOCX, TXT, MD, PPTX, HTML, or JSON." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const vectorStore = await openai.vectorStores.create({
      name: `DocuMind - ${file.name}`,
      expires_after: { anchor: "last_active_at", days: 1 },
    });

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadable = await toFile(bytes, file.name, { type: file.type || "application/octet-stream" });
    const attached = await openai.vectorStores.files.uploadAndPoll(vectorStore.id, uploadable);

    if (attached.status !== "completed") {
      return NextResponse.json({ error: "The document could not be indexed. Please try another file." }, { status: 500 });
    }

    return NextResponse.json({
      vectorStoreId: vectorStore.id,
      fileName: file.name,
      fileSize: file.size,
      status: attached.status,
    });
  } catch (error) {
    console.error("Upload error", error);
    const message = error instanceof Error ? error.message : "Unable to process the document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
