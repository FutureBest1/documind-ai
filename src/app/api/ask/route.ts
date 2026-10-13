import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

type IncomingMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const body = await request.json();
    const vectorStoreId = String(body.vectorStoreId || "");
    const question = String(body.question || "").trim();
    const history = Array.isArray(body.history) ? (body.history as IncomingMessage[]).slice(-6) : [];

    if (!vectorStoreId || !question) {
      return NextResponse.json({ error: "A document and question are required." }, { status: 400 });
    }

    const transcript = history
      .map((item) => `${item.role === "user" ? "User" : "DocuMind"}: ${item.content}`)
      .join("\n");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      instructions:
        "You are DocuMind, a careful document analyst. Answer from the uploaded document. If the document does not support the answer, say that clearly. Be concise but useful. Do not invent facts. Prefer concrete details from retrieved passages.",
      input: `${transcript ? `Recent conversation:\n${transcript}\n\n` : ""}Question: ${question}`,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          max_num_results: 5,
        },
      ],
      include: ["file_search_call.results"],
    });

    const sources: Array<{ filename: string; text: string; score?: number }> = [];
    for (const item of response.output as any[]) {
      if (item?.type === "file_search_call" && Array.isArray(item.results)) {
        for (const result of item.results.slice(0, 4)) {
          sources.push({
            filename: result.filename || "Uploaded document",
            text: result.text || result.content?.map?.((c: any) => c.text).join(" ") || "",
            score: typeof result.score === "number" ? result.score : undefined,
          });
        }
      }
    }

    return NextResponse.json({ answer: response.output_text || "I couldn't produce an answer.", sources });
  } catch (error) {
    console.error("Ask error", error);
    const message = error instanceof Error ? error.message : "Unable to answer the question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
