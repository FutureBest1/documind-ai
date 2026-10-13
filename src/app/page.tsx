"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type Source = { filename: string; text: string; score?: number };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

type DocumentState = {
  vectorStoreId: string;
  fileName: string;
  fileSize: number;
};

function Icon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    spark: <><path d="M12 3l1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z"/><path d="M5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7L5 14Z"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
    file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/></>,
    send: <><path d="m3 3 18 9-18 9 4-9-4-9Z"/><path d="M7 12h14"/></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/></>,
    quote: <><path d="M7 10H4v4h4v-4c0-3 1-4 3-5"/><path d="M16 10h-3v4h4v-4c0-3 1-4 3-5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const starterQuestions = [
  "Summarize this document in 5 key points",
  "What are the most important facts or decisions?",
  "What risks, gaps, or unanswered questions are mentioned?",
];

export default function Home() {
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasChat = messages.length > 0;
  const assistantCount = useMemo(() => messages.filter((m) => m.role === "assistant").length, [messages]);

  async function uploadFile(file?: File) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDocument({ vectorStoreId: data.vectorStoreId, fileName: data.fileName, fileSize: data.fileSize });
      setMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function ask(text?: string) {
    const q = (text ?? question).trim();
    if (!document || !q || asking) return;
    setQuestion("");
    setError("");
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setAsking(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectorStoreId: document.vectorStoreId, question: q, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Question failed");
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to answer that question");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setAsking(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask();
  }

  return (
    <main className="min-h-screen p-3 sm:p-5 lg:p-7">
      <section className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1480px] overflow-hidden rounded-[28px] border border-white bg-white shadow-soft lg:grid lg:grid-cols-[270px_1fr]">
        <aside className="hidden border-r border-[#eceef4] bg-[#fafaff] p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#6c5ce7] text-white shadow-lg shadow-violet-200"><Icon name="spark" /></div>
            <div><div className="text-[17px] font-bold tracking-[-.02em]">DocuMind</div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8a91a6]">AI workspace</div></div>
          </div>

          <button onClick={() => inputRef.current?.click()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#20263a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#11172b]">
            <Icon name="plus" className="h-4 w-4" /> New document
          </button>

          <div className="mt-7 px-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#9ba1b3]">Workspace</div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-[#eeeaff] px-3 py-3 text-sm font-semibold text-[#5748ce]"><Icon name="file" className="h-4 w-4" /> Documents</div>
          </div>

          <div className="mt-8 px-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#9ba1b3]">Current file</div>
          {document ? (
            <div className="mt-3 rounded-2xl border border-[#e7e3ff] bg-white p-3">
              <div className="flex gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0edff] text-[#6554df]"><Icon name="file" className="h-5 w-5" /></div>
                <div className="min-w-0"><div className="truncate text-sm font-semibold">{document.fileName}</div><div className="mt-1 text-xs text-[#8b91a4]">{formatBytes(document.fileSize)}</div></div>
              </div>
            </div>
          ) : <div className="mt-3 px-2 text-sm leading-6 text-[#9298aa]">Upload a document to begin.</div>}

          <div className="mt-auto rounded-2xl border border-[#ebecef] bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Icon name="shield" className="h-4 w-4 text-[#6c5ce7]" /> Grounded answers</div>
            <p className="mt-2 text-xs leading-5 text-[#7e8599]">DocuMind searches the uploaded file before answering and surfaces the supporting passages.</p>
          </div>
        </aside>

        <div className="flex min-h-[calc(100vh-2rem)] min-w-0 flex-col">
          <header className="flex h-[74px] items-center justify-between border-b border-[#eceef4] px-5 sm:px-8">
            <div className="flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#6c5ce7] text-white"><Icon name="spark" className="h-4 w-4" /></div><span className="font-bold">DocuMind</span></div>
            <div className="hidden lg:block"><div className="text-sm font-semibold text-[#293047]">Document Intelligence</div><div className="mt-0.5 text-xs text-[#9298aa]">Ask. Verify. Understand.</div></div>
            <div className="flex items-center gap-3"><span className="hidden rounded-full bg-[#f2f0ff] px-3 py-1.5 text-xs font-semibold text-[#6253d6] sm:inline">Portfolio MVP</span><div className="grid h-9 w-9 place-items-center rounded-full bg-[#252b3d] text-xs font-bold text-white">P</div></div>
          </header>

          {!document ? (
            <div className="flex flex-1 items-center justify-center p-5 sm:p-10">
              <div className="w-full max-w-3xl text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#efecff] text-[#6858df]"><Icon name="spark" className="h-7 w-7" /></div>
                <h1 className="mt-6 text-3xl font-bold tracking-[-.04em] text-[#1c2438] sm:text-5xl">Turn documents into answers.</h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#747c92] sm:text-base">Upload a document and ask questions in plain English. DocuMind retrieves relevant passages first, so answers stay grounded in your source.</p>

                <div
                  className="mt-9 rounded-[24px] border-2 border-dashed border-[#d9d5f8] bg-[#fbfaff] px-6 py-12 transition hover:border-[#a69af4] hover:bg-[#f8f6ff]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); void uploadFile(e.dataTransfer.files?.[0]); }}
                >
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-[#6c5ce7] shadow-sm"><Icon name="upload" /></div>
                  <div className="mt-4 text-base font-semibold">Drop your document here</div>
                  <div className="mt-1 text-sm text-[#8d94a7]">PDF, DOCX, TXT, MD, PPTX, HTML or JSON · up to 20 MB</div>
                  <button disabled={uploading} onClick={() => inputRef.current?.click()} className="mt-6 rounded-xl bg-[#6c5ce7] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-[#5b4bd4] disabled:opacity-60">
                    {uploading ? "Indexing document…" : "Choose a document"}
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-[#8a91a5]"><span>✓ Semantic retrieval</span><span>✓ Source evidence</span><span>✓ Follow-up questions</span></div>
                {error && <div className="mx-auto mt-5 max-w-xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-[#eff0f4] px-5 py-4 sm:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0"><div className="truncate text-sm font-semibold">{document.fileName}</div><div className="mt-1 text-xs text-[#8d94a6]">Ready to query · {formatBytes(document.fileSize)}</div></div>
                  <button onClick={() => inputRef.current?.click()} className="shrink-0 rounded-xl border border-[#e2e4eb] px-3 py-2 text-xs font-semibold text-[#535b71] hover:bg-[#fafafd]">Replace file</button>
                </div>
              </div>

              <div className="scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
                {!hasChat ? (
                  <div className="mx-auto max-w-3xl pt-5 sm:pt-14">
                    <div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f0edff] text-[#6858df]"><Icon name="spark" /></div><h2 className="mt-5 text-2xl font-bold tracking-[-.03em]">What would you like to know?</h2><p className="mt-2 text-sm text-[#81889d]">Try one of these questions or ask your own.</p></div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      {starterQuestions.map((item) => <button key={item} onClick={() => void ask(item)} className="rounded-2xl border border-[#e6e7ed] bg-white p-4 text-left text-sm leading-6 text-[#51596f] transition hover:-translate-y-0.5 hover:border-[#cfc8fb] hover:shadow-md"><Icon name="quote" className="mb-3 h-4 w-4 text-[#6c5ce7]" />{item}</button>)}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-7">
                    {messages.map((message, i) => (
                      <div key={i} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        {message.role === "user" ? (
                          <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-[#252b3d] px-4 py-3 text-sm leading-6 text-white">{message.content}</div>
                        ) : (
                          <div className="w-full">
                            <div className="flex gap-3">
                              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#eeeaff] text-[#6554df]"><Icon name="spark" className="h-4 w-4" /></div>
                              <div className="min-w-0 flex-1"><div className="mb-1 text-xs font-bold uppercase tracking-[.12em] text-[#8174e4]">DocuMind</div><p className="whitespace-pre-wrap text-[15px] leading-7 text-[#333b51]">{message.content}</p></div>
                            </div>
                            {!!message.sources?.length && (
                              <div className="ml-11 mt-4 rounded-2xl border border-[#e9e8f2] bg-[#fafaff] p-3">
                                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#888fa2]">Source evidence</div>
                                <div className="space-y-2">{message.sources.slice(0, 3).map((source, s) => <details key={s} className="rounded-xl border border-[#e6e5ef] bg-white px-3 py-2"><summary className="cursor-pointer list-none text-xs font-semibold text-[#51596d]">{source.filename} <span className="float-right text-[#9aa0af]">View passage</span></summary><p className="mt-2 border-t border-[#eff0f4] pt-2 text-xs leading-5 text-[#747b90]">{source.text || "Relevant passage retrieved from this file."}</p></details>)}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {asking && <div className="flex items-center gap-3 text-sm text-[#7f8799]"><div className="grid h-8 w-8 place-items-center rounded-xl bg-[#eeeaff] text-[#6554df]"><Icon name="spark" className="h-4 w-4" /></div><span className="animate-pulse">Searching the document…</span></div>}
                  </div>
                )}
              </div>

              <div className="border-t border-[#eceef4] bg-white px-5 py-4 sm:px-8">
                <form onSubmit={submit} className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-[#dfe2ea] bg-white p-2 shadow-[0_8px_30px_rgba(27,33,55,.07)] focus-within:border-[#aaa0ee]">
                  <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={asking} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[#a1a6b4]" placeholder="Ask a question about this document…" />
                  <button disabled={!question.trim() || asking} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#6c5ce7] text-white transition hover:bg-[#5949d0] disabled:bg-[#d2cdef]"><Icon name="send" className="h-4 w-4" /></button>
                </form>
                <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between text-[11px] text-[#a0a6b4]"><span>Answers are grounded in retrieved document passages.</span><span>{assistantCount} {assistantCount === 1 ? "answer" : "answers"}</span></div>
                {error && <div className="mx-auto mt-2 max-w-3xl text-xs text-red-600">{error}</div>}
              </div>
            </div>
          )}
        </div>
      </section>
      <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md,.pptx,.html,.json" className="hidden" onChange={(e) => void uploadFile(e.target.files?.[0])} />
    </main>
  );
}
