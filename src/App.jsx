import { useState, useMemo, useRef } from "react";
// npm install pdfjs-dist
// This import path matches pdfjs-dist v4. See README for the one-line worker setup.
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Backend API URL - use environment variable for production, fallback to proxy for dev
const API_URL = import.meta.env.VITE_API_URL || '/api/tutor.php';

const STYLES = {
  visual: { label: "Visual", color: "#2B3A32", accent: "#F2C94C" },
  verbal: { label: "Verbal", color: "#3A2A24", accent: "#B8543E" },
  example: { label: "Example-driven", color: "#233329", accent: "#7A9E7E" },
  step: { label: "Step-by-step", color: "#1F2A38", accent: "#52708A" },
};

const QUESTIONS = [
  {
    q: "You're stuck on a new topic. You'd first reach for...",
    options: [
      { text: "A diagram or picture of how the pieces fit together", style: "visual" },
      { text: "Someone explaining it to you like a story", style: "verbal" },
      { text: "A worked example you can copy the pattern from", style: "example" },
      { text: "A numbered checklist you can follow in order", style: "step" },
    ],
  },
  {
    q: "When you remember something you learned well, you mostly remember...",
    options: [
      { text: "What it looked like on the page or board", style: "visual" },
      { text: "How it was described to you", style: "verbal" },
      { text: "The specific example that made it click", style: "example" },
      { text: "The sequence of steps you did", style: "step" },
    ],
  },
  {
    q: "In a group project, you naturally end up...",
    options: [
      { text: "Sketching the plan on a whiteboard", style: "visual" },
      { text: "Talking the plan through out loud", style: "verbal" },
      { text: "Pulling up a similar project as reference", style: "example" },
      { text: "Writing the task list in order", style: "step" },
    ],
  },
  {
    q: "A confusing paragraph in a textbook is easiest to fix by...",
    options: [
      { text: "Redrawing it as a diagram", style: "visual" },
      { text: "Reading it out loud or explaining it to a friend", style: "verbal" },
      { text: "Finding a concrete example of it in action", style: "example" },
      { text: "Breaking it into smaller ordered steps", style: "step" },
    ],
  },
  {
    q: "Your ideal explanation of a new concept ends with...",
    options: [
      { text: "A labeled picture you can glance back at", style: "visual" },
      { text: "An analogy that sums it up in one line", style: "verbal" },
      { text: "A practice problem to try yourself", style: "example" },
      { text: "A short recipe you can repeat next time", style: "step" },
    ],
  },
];

function scoreToProfile(scores) {
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, Math.round((v / total) * 100)])
  );
}

function dominantStyle(profile) {
  return Object.entries(profile).sort((a, b) => b[1] - a[1])[0][0];
}

// --- Text chunking -------------------------------------------------------
// Splits raw text (typed topic or extracted PDF text) into 1-6 concept-sized
// chunks. This is a simple heuristic for the prototype; swap for a real
// Claude API call to get genuine per-chunk summarization (see README).

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.?!])\s+/)
    .filter((s) => s.length > 0);
}

function chunkText(text, maxCards = 6) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];
  const perCard = Math.max(2, Math.ceil(sentences.length / maxCards));
  const chunks = [];
  for (let i = 0; i < sentences.length; i += perCard) {
    chunks.push(sentences.slice(i, i + perCard).join(" "));
  }
  return chunks.slice(0, maxCards);
}

function firstWords(text, n) {
  return text.split(" ").slice(0, n).join(" ");
}

// --- Card generation -------------------------------------------------------
// Every card carries the same four elements (visual map, big idea, key
// pieces, analogy). The learning style decides which element leads, and how
// the card is laid out, not which elements exist.

function buildCard(chunk, style, index, total) {
  const sentences = splitSentences(chunk);
  const bigIdea = sentences[0] || chunk;
  const keyPieces = sentences.slice(1, 4);
  const topicSnippet = firstWords(chunk, 6);

  return {
    index,
    total,
    style,
    bigIdea,
    visualPoints:
      keyPieces.length > 0
        ? keyPieces
        : [`How ${topicSnippet}... connects to what came before it`],
    keyPieces: keyPieces.length > 0 ? keyPieces : [bigIdea],
    analogy: `Think of "${topicSnippet}..." the way you'd think of a single step in a recipe: it only makes sense in relation to the step before and after it.`,
    example: `Consider how ${topicSnippet} works in practice: imagine a specific situation where this concept applies directly, with concrete details that make the abstract idea clear and memorable.`,
  };
}

function buildCardsFromText(text, style) {
  const chunks = chunkText(text);
  return chunks.map((c, i) => buildCard(c, style, i, chunks.length));
}

// --- Real AI generation via the PHP/Gemini backend --------------------------
// Sends chunked text to api/tutor.php, which calls Gemini with the key kept
// server-side. Falls back to the local generator above if the request fails,
// so a demo never breaks on stage from a network or quota issue.

async function fetchCardsFromBackend(chunks, style) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chunks, style }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Backend request failed: ${response.status}`);
  }
  const data = await response.json();
  if (!data.cards || !Array.isArray(data.cards)) throw new Error("Malformed backend response");
  return data.cards.map((c, i) => ({
    index: i,
    total: data.cards.length,
    style,
    bigIdea: c.bigIdea,
    visualPoints: c.keyPieces,
    keyPieces: c.keyPieces,
    analogy: c.analogy,
    example: c.example,
  }));
}

async function generateCards(text, style) {
  const chunks = chunkText(text);
  if (chunks.length === 0) return [];
  try {
    return await fetchCardsFromBackend(chunks, style);
  } catch (err) {
    console.warn("Falling back to local card generation:", err.message);
    // Return locally generated cards as fallback
    return chunks.map((c, i) => buildCard(c, style, i, chunks.length));
  }
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((it) => it.str).join(" ") + " ";
  }
  return fullText;
}

function Radar({ profile }) {
  const keys = ["visual", "verbal", "example", "step"];
  const cx = 90, cy = 90, r = 68;
  const angle = (i) => (Math.PI * 2 * i) / keys.length - Math.PI / 2;
  const point = (i, val) => {
    const rad = (val / 100) * r;
    return [cx + rad * Math.cos(angle(i)), cy + rad * Math.sin(angle(i))];
  };
  const poly = keys.map((k, i) => point(i, profile[k]).join(",")).join(" ");
  return (
    <svg viewBox="0 0 180 180" style={{ width: "100%", maxWidth: 200 }}>
      {[0.33, 0.66, 1].map((f, i) => (
        <polygon
          key={i}
          points={keys.map((_, j) => point(j, f * 100).join(",")).join(" ")}
          fill="none"
          stroke="#3A4A40"
          strokeWidth="1"
        />
      ))}
      {keys.map((k, i) => {
        const [x, y] = point(i, 100);
        return <line key={k} x1={cx} y1={cy} x2={x} y2={y} stroke="#3A4A40" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="#F2C94C" fillOpacity="0.35" stroke="#F2C94C" strokeWidth="2" />
      {keys.map((k, i) => {
        const [x, y] = point(i, 118);
        return (
          <text
            key={k}
            x={x}
            y={y}
            fontSize="9"
            fill="#D9DED8"
            textAnchor="middle"
            fontFamily="'IBM Plex Sans', sans-serif"
          >
            {STYLES[k].label.split("-")[0]}
          </text>
        );
      })}
    </svg>
  );
}

export default function App() {
  const [stage, setStage] = useState("landing");
  const [qIndex, setQIndex] = useState(0);
  const [scores, setScores] = useState({ visual: 0, verbal: 0, example: 0, step: 0 });
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [overrideStyle, setOverrideStyle] = useState(null);
  const [history, setHistory] = useState([]);
  const [pdfName, setPdfName] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [loadingSource, setLoadingSource] = useState(null); // null | 'topic' | 'pdf'
  const [cardsError, setCardsError] = useState("");
  const fileInputRef = useRef(null);

  const profile = useMemo(() => scoreToProfile(scores), [scores]);
  const style = overrideStyle || (Object.values(scores).some((v) => v > 0) ? dominantStyle(profile) : "visual");
  const theme = STYLES[style];

  const answerQuestion = (chosenStyle) => {
    setScores((s) => ({ ...s, [chosenStyle]: s[chosenStyle] + 1 }));
    if (qIndex + 1 < QUESTIONS.length) {
      setQIndex(qIndex + 1);
    } else {
      setStage("workspace");
    }
  };

  const explainTopic = async () => {
    if (!topic.trim()) return;
    setLoadingSource("topic");
    setCardsError("");
    try {
      const generated = await generateCards(topic, style);
      setCards(generated);
      setCardIndex(0);
      setPdfName(null);
      setHistory((h) => [{ topic: topic.trim(), style }, ...h].slice(0, 6));
    } catch (err) {
      setCardsError("Something went wrong generating cards. Please try again.");
      console.error("Card generation error:", err);
    }
    setLoadingSource(null);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError("");
    setCardsError("");
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPdfError("That file is too large. Please choose a PDF under 5MB.");
      return;
    }
    
    if (file.type !== "application/pdf") {
      setPdfError("That file isn't a PDF. Choose a .pdf file.");
      return;
    }
    setPdfLoading(true);
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) {
        setPdfError("No readable text found in that PDF.");
        setPdfLoading(false);
        return;
      }
      setLoadingSource("pdf");
      const generated = await generateCards(text, style);
      setCards(generated);
      setCardIndex(0);
      setPdfName(file.name);
      setTopic("");
      setHistory((h) => [{ topic: file.name, style }, ...h].slice(0, 6));
    } catch (err) {
      setPdfError("Couldn't read that PDF. Try a different file.");
      console.error("PDF upload error:", err);
    }
    setLoadingSource(null);
    setPdfLoading(false);
  };

  const nudgeProfile = (direction) => {
    setScores((s) => {
      const next = { ...s };
      if (direction === "up") next[style] += 1;
      else {
        const others = Object.keys(next).filter((k) => k !== style);
        const pick = others[Math.floor(Math.random() * others.length)];
        next[pick] += 1;
      }
      return next;
    });
  };

  const font = { body: "'IBM Plex Sans', sans-serif", display: "'Fraunces', serif" };

  if (stage === "landing") {
    return (
      <div
        style={{
          fontFamily: font.body,
          background: "#2B3A32",
          color: "#F1F3ED",
          minHeight: 560,
          padding: "56px 48px",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span 
            style={{ 
              fontFamily: font.display,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 2,
              color: "#F2C94C" 
            }}
          >
            AI TUTOR
          </span>
          <span style={{ fontSize: 13, letterSpacing: 0.3, color: "#B9C4BB" }}>
            an adaptive study companion
          </span>
        </div>
        <h1
          style={{
            fontFamily: font.display,
            fontWeight: 500,
            fontSize: 44,
            lineHeight: 1.15,
            margin: 0,
            maxWidth: 520,
          }}
        >
          Same concept, explained the way your brain actually takes it in.
        </h1>
        <p style={{ maxWidth: 460, color: "#C7D0C9", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Type a topic or upload a page from your textbook. The tutor breaks it into small
          cards, shaped for whether you think in pictures, stories, examples, or steps.
        </p>
        <div>
          <button
            onClick={() => setStage("quiz")}
            style={{
              background: "#F2C94C",
              color: "#2B3A32",
              border: "none",
              padding: "14px 26px",
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: font.body,
            }}
          >
            Find your learning style
          </button>
        </div>
      </div>
    );
  }

  if (stage === "quiz") {
    const current = QUESTIONS[qIndex];
    return (
      <div
        style={{
          fontFamily: font.body,
          background: "#2B3A32",
          color: "#F1F3ED",
          minHeight: 560,
          padding: "48px 48px",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                background: i <= qIndex ? "#F2C94C" : "#4A5A50",
                borderRadius: 2,
              }}
            />
          ))}
        </div>
        <div style={{ maxWidth: 520 }}>
          <p style={{ color: "#9FB0A2", fontSize: 13, margin: "0 0 12px" }}>
            Question {qIndex + 1} of {QUESTIONS.length}
          </p>
          <h2
            style={{
              fontFamily: font.display,
              fontWeight: 500,
              fontSize: 26,
              lineHeight: 1.35,
              margin: 0,
            }}
          >
            {current.q}
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
          {current.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => answerQuestion(opt.style)}
              style={{
                textAlign: "left",
                background: "transparent",
                border: "1px solid #4A5A50",
                color: "#F1F3ED",
                padding: "14px 18px",
                borderRadius: 4,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: font.body,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#F2C94C")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#4A5A50")}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: font.body,
        background: "#F1F3ED",
        minHeight: 560,
        borderRadius: 4,
        display: "flex",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 220,
          background: "#2B3A32",
          color: "#F1F3ED",
          padding: "28px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: "#9FB0A2", margin: "0 0 4px" }}>your profile</p>
          <p style={{ fontFamily: font.display, fontSize: 18, margin: 0 }}>
            Mostly {STYLES[dominantStyle(profile)].label.toLowerCase()}
          </p>
        </div>
        <Radar profile={profile} />
        <div>
          <p style={{ fontSize: 12, color: "#9FB0A2", margin: "0 0 8px" }}>view as</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(STYLES).map(([key, s]) => (
              <button
                key={key}
                onClick={() => setOverrideStyle(key)}
                style={{
                  textAlign: "left",
                  background: style === key ? "#3E4E44" : "transparent",
                  border: "none",
                  color: "#F1F3ED",
                  padding: "8px 10px",
                  borderRadius: 3,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: font.body,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {history.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: "#9FB0A2", margin: "0 0 8px" }}>recent</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {history.map((h, i) => (
                <span key={i} style={{ fontSize: 12, color: "#C7D0C9" }}>
                  {h.topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: "40px 44px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 10, maxWidth: 560, flexWrap: "wrap" }}>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && explainTopic()}
            placeholder="What are you stuck on? e.g. photosynthesis"
            style={{
              flex: 1,
              minWidth: 220,
              padding: "12px 14px",
              borderRadius: 4,
              border: "1px solid #C9CFC6",
              fontSize: 14,
              fontFamily: font.body,
              background: "#fff",
              color: "#1F2A3C",
            }}
          />
          <button
            onClick={explainTopic}
            disabled={loadingSource !== null}
            style={{
              background: theme.accent,
              border: "none",
              color: "#1F2A3C",
              padding: "0 20px",
              borderRadius: 4,
              fontWeight: 500,
              fontSize: 14,
              cursor: loadingSource !== null ? "default" : "pointer",
              fontFamily: font.body,
            }}
          >
            {loadingSource === "topic" ? "Generating..." : "Explain it"}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={pdfLoading || loadingSource !== null}
            style={{
              background: "transparent",
              border: "1px solid #C9CFC6",
              color: "#1F2A3C",
              padding: "0 18px",
              borderRadius: 4,
              fontSize: 14,
              cursor: pdfLoading || loadingSource !== null ? "default" : "pointer",
              fontFamily: font.body,
            }}
          >
            {pdfLoading ? "Reading PDF..." : loadingSource === "pdf" ? "Generating..." : "Upload PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
            style={{ display: "none" }}
          />
        </div>

        {pdfError && (
          <p style={{ color: "#B8543E", fontSize: 13, margin: 0 }}>{pdfError}</p>
        )}
        {cardsError && (
          <p style={{ color: "#B8543E", fontSize: 13, margin: 0 }}>{cardsError}</p>
        )}
        {pdfName && !pdfError && (
          <p style={{ color: "#6B7A70", fontSize: 13, margin: 0 }}>
            Showing cards generated from <strong style={{ color: "#1F2A3C" }}>{pdfName}</strong>
          </p>
        )}

        {pdfLoading && !cards && (
          <p style={{ color: "#6B7A70", fontSize: 14, maxWidth: 420 }}>
            Reading PDF and generating cards...
          </p>
        )}
        {loadingSource && !cards && !pdfLoading && (
          <p style={{ color: "#6B7A70", fontSize: 14, maxWidth: 420 }}>
            Generating explanation cards...
          </p>
        )}
        {!cards && !pdfLoading && !loadingSource && (
          <p style={{ color: "#6B7A70", fontSize: 14, maxWidth: 420 }}>
            Type a topic or upload a page from a textbook. The explanation is broken into
            cards shaped for a <strong style={{ color: "#1F2A3C" }}>{theme.label.toLowerCase()}</strong>{" "}
            learner — switch styles anytime from the sidebar to compare.
          </p>
        )}

        {cards && cards.length > 0 && (
          <CardDeck
            cards={cards}
            cardIndex={cardIndex}
            setCardIndex={setCardIndex}
            theme={theme}
            font={font}
            onRate={nudgeProfile}
            activeStyle={style}
          />
        )}
      </div>
    </div>
  );
}

function CardDeck({ cards, cardIndex, setCardIndex, theme, font, onRate, activeStyle }) {
  const card = cards[cardIndex];
  const style = activeStyle;

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {cards.map((_, i) => (
          <div
            key={i}
            style={{
              height: 3,
              flex: 1,
              background: i === cardIndex ? theme.accent : "#DFE3DA",
              borderRadius: 2,
            }}
          />
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #DFE3DA",
          borderRadius: 6,
          padding: 28,
          minHeight: 260,
        }}
      >
        <p style={{ fontSize: 12, color: theme.accent, fontWeight: 500, margin: "0 0 6px" }}>
          {STYLES[style].label} mode, card {card.index + 1} of {card.total}
        </p>

        {style === "visual" && (
          <div>
            <h3
              style={{
                fontFamily: font.display,
                fontWeight: 500,
                fontSize: 20,
                margin: "0 0 16px",
                color: "#1F2A3C",
              }}
            >
              {card.bigIdea}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {card.visualPoints.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2px solid ${theme.accent}`,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#33403A" }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {style === "verbal" && (
          <div>
            <p
              style={{
                fontFamily: font.display,
                fontSize: 17,
                fontStyle: "italic",
                lineHeight: 1.5,
                color: "#3A2A24",
                borderLeft: `3px solid ${theme.accent}`,
                paddingLeft: 16,
                margin: "0 0 16px",
              }}
            >
              {card.analogy}
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#33403A", margin: 0 }}>
              {card.bigIdea}
            </p>
          </div>
        )}

        {style === "example" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3
              style={{
                fontFamily: font.display,
                fontWeight: 500,
                fontSize: 20,
                margin: 0,
                color: "#1F2A3C",
              }}
            >
              {card.bigIdea}
            </h3>
            <div style={{ background: "#F3F6F1", borderRadius: 4, padding: 16 }}>
              <p style={{ fontSize: 11, color: theme.accent, margin: "0 0 6px", fontWeight: 500 }}>
                worked example
              </p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#33403A" }}>
                {card.example}
              </p>
            </div>
            <div style={{ border: `1px dashed ${theme.accent}`, borderRadius: 4, padding: 16 }}>
              <p style={{ fontSize: 11, color: theme.accent, margin: "0 0 6px", fontWeight: 500 }}>
                your turn
              </p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#33403A" }}>
                Try applying this to a different case of your own, following the same pattern as the example above.
              </p>
            </div>
          </div>
        )}

        {style === "step" && (
          <div>
            <p style={{ fontSize: 12, color: "#6B7A70", margin: "0 0 12px" }}>
              step {card.index + 1} of {card.total}
            </p>
            <h3
              style={{
                fontFamily: font.display,
                fontWeight: 500,
                fontSize: 20,
                margin: "0 0 12px",
                color: "#1F2A3C",
              }}
            >
              {card.bigIdea}
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {card.keyPieces.map((p, i) => (
                <li key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: theme.accent, fontWeight: 500 }}>-</span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#33403A" }}>{p}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
          disabled={cardIndex === 0}
          style={{
            background: "transparent",
            border: "1px solid #DFE3DA",
            borderRadius: 4,
            padding: "8px 16px",
            fontSize: 13,
            cursor: cardIndex === 0 ? "default" : "pointer",
            color: cardIndex === 0 ? "#B5BDB0" : "#33403A",
          }}
        >
          Previous
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onRate("up")}
            style={{
              background: "transparent",
              border: "1px solid #DFE3DA",
              borderRadius: 4,
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              color: "#33403A",
            }}
          >
            This clicked
          </button>
          <button
            onClick={() => onRate("down")}
            style={{
              background: "transparent",
              border: "1px solid #DFE3DA",
              borderRadius: 4,
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              color: "#33403A",
            }}
          >
            Still confusing
          </button>
        </div>

        <button
          onClick={() => setCardIndex((i) => Math.min(cards.length - 1, i + 1))}
          disabled={cardIndex === cards.length - 1}
          style={{
            background: "transparent",
            border: "1px solid #DFE3DA",
            borderRadius: 4,
            padding: "8px 16px",
            fontSize: 13,
            cursor: cardIndex === cards.length - 1 ? "default" : "pointer",
            color: cardIndex === cards.length - 1 ? "#B5BDB0" : "#33403A",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
