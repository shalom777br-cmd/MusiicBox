import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

function safeParseJson<T = any>(text: string | undefined | null): T | null {
  if (!text) return null;
  let cleaned = text.trim();
  // Remove markdown code fence if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/gi, "").replace(/\s*```$/gi, "").trim();
  if (!cleaned) return null;

  // 1. Try standard JSON parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch (_) {
    // Proceed to repair strategy
  }

  // 2. Attempt to repair truncated JSON (common when maxOutputTokens is reached)
  let idx = cleaned.lastIndexOf("}");
  while (idx > 0) {
    const candidate = cleaned.slice(0, idx + 1);
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (ch === "\\") {
        isEscaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
        else if (ch === "[") openBrackets++;
        else if (ch === "]") openBrackets--;
      }
    }

    if (openBraces >= 0 && openBrackets >= 0) {
      let fix = candidate;
      for (let i = 0; i < openBrackets; i++) fix += "]";
      for (let i = 0; i < openBraces; i++) fix += "}";

      try {
        const parsed = JSON.parse(fix);
        if (parsed && typeof parsed === "object") {
          console.log(`Successfully repaired truncated JSON at character ${idx} (recovered partial notes).`);
          return parsed as T;
        }
      } catch (_) {}
    }

    idx = cleaned.lastIndexOf("}", idx - 1);
  }

  console.error("JSON parse failure on text length:", text.length);
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API 1: Parse uploaded score (Image/PDF/Text) using Gemini OCR & Music Analysis
  app.post("/api/parse-music", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { fileData, mimeType, fileName, textContent } = req.body;

      if (!fileData && !textContent) {
        return res.status(400).json({ success: false, error: "ファイルデータまたはテキストが見つかりません" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: "GEMINI_API_KEYが設定されていません。AI StudioのSettingsからAPIキーを設定してください。",
        });
      }

      console.log(`Analyzing music sheet/file: ${fileName || "text data"}`);

      const prompt = `
You are an ultra-precise sheet music OCR and musicology engine specialized in extracting ALL musical note data across ALL measures for music box arrangements.
Analyze the provided musical score (image, PDF, XML, or text notation) and output a clean, exhaustive JSON structure containing every single note sequence across ALL measures from start to finish without truncating or stopping early.

MANDATORY EXHAUSTIVE OCR REQUIREMENTS FOR LONG SCORES:
1. FULL SCORE COVERAGE & ALL MEASURES (全小節・最初から最後まで完全スキャン):
   - Thoroughly scan the ENTIRE score from Measure 1 to the final measure, covering every single system, line, and page.
   - Do NOT stop parsing early or summarize later measures. Parse every single measure sequentially.
2. EXHAUSTIVE NOTE EXTRACTION (全音符・全和音・全声部の漏れなし完全抽出):
   - You MUST extract EVERY SINGLE NOTEHEAD visible on both Treble Staff (Right Hand) and Bass Staff (Left Hand).
   - DO NOT simplify, drop, or summarize harmony notes, inner voices, counterpoint, or bass lines.
   - For CHORDS (multiple noteheads stacked vertically on the same beat): create a separate note object for EACH notehead, all sharing the EXACT same "startTime".
3. ACCIDENTALS & CLEFS (変化記号・調号の全反映):
   - Correctly process key signatures (sharps/flats at measure start) and in-measure accidental signs (#, b, natural) to assign accurate pitch names (e.g. "C#4", "Eb5", "F4") and exact MIDI note numbers.
4. RHYTHMIC TIMING & BEATS (正確な拍位置と音価):
   - Assign "startTime" in exact beats (0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, etc.), accounting for sixteenth notes (0.25 beat), eighth notes (0.5 beat), dotted notes, triplets, and ties.
5. METADATA:
   - Extract Title, Composer, Time Signature (e.g., "4/4", "3/4", "6/8"), Key Signature, and estimated Tempo in BPM.
   - Provide a brief summary in Japanese ("summary") explaining that all measures, voices, chords, and bass notes were fully extracted across the entire piece.

Return ONLY JSON matching this structure:
{
  "title": "Song Title",
  "composer": "Composer Name",
  "timeSignature": "4/4",
  "bpm": 72,
  "keySignature": "C Major",
  "summary": "全小節・全和音・ト音/ヘ音記号のすべての音符を漏れなく最後まで完全抽出しました。",
  "notes": [
    {
      "pitch": "C4",
      "midiNumber": 60,
      "startTime": 0.0,
      "duration": 1.0,
      "velocity": 90,
      "isMelody": true
    }
  ]
}
`;

      const contentsParts: any[] = [{ text: prompt }];

      if (fileData && mimeType) {
        contentsParts.push({
          inlineData: {
            mimeType,
            data: fileData,
          },
        });
      } else if (textContent) {
        contentsParts.push({ text: `Source Score Text/XML Content:\n${textContent}` });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: contentsParts },
        config: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              composer: { type: Type.STRING },
              timeSignature: { type: Type.STRING },
              bpm: { type: Type.NUMBER },
              keySignature: { type: Type.STRING },
              summary: { type: Type.STRING },
              notes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pitch: { type: Type.STRING },
                    midiNumber: { type: Type.INTEGER },
                    startTime: { type: Type.NUMBER },
                    duration: { type: Type.NUMBER },
                    velocity: { type: Type.INTEGER },
                    isMelody: { type: Type.BOOLEAN },
                  },
                  required: ["pitch", "midiNumber", "startTime", "duration"],
                },
              },
            },
            required: ["title", "notes", "summary"],
          },
        },
      });

      const parsedData = safeParseJson(response.text);
      if (!parsedData) {
        console.error("Failed to parse Gemini response for /api/parse-music. Raw response.text:", response.text);
        return res.status(500).json({
          success: false,
          error: "楽譜の解析結果をJSONとして読み込めませんでした。もう一度お試しか、別の画像ファイルをお試しください。",
        });
      }

      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("Error in /api/parse-music:", error);
      let errorMessage = "楽譜の解析中にエラーが発生しました";
      if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("demand")) {
        errorMessage = "現在AIサーバーの負荷が高まっています。少し時間をおいて再度お試しください。";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // API 2: Optimize note arrangement specifically for music box limitations using Gemini AI
  app.post("/api/optimize-musicbox", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { title, notes, combCount = 18, settings } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: "GEMINI_API_KEYが設定されていません。",
        });
      }

      const prompt = `
You are a master music box craftsman and arranger.
Review the following note sequence for the song "${title || "Selected Song"}".
The target music box has a ${combCount}-note comb (e.g. 18-note, 30-note, or 50-note music box).

User preferences:
- Isolate primary melody: ${settings?.removeChords ? "Yes" : "No"}
- Remove low bass/accompaniment: ${settings?.removeBass ? "Yes" : "No"}
- Simplify trills & fast ornaments: ${settings?.simplifyTrills ? "Yes" : "No"}
- Target tempo: ${settings?.tempoBpm || 72} BPM

Please analyze the arrangement and return a refined list of notes optimized for a music box comb (avoiding fast repeated collisions on the same tine < 0.1s, keeping within a resonant 2-3 octave range), along with expert arrangement commentary in Japanese.

Return ONLY JSON:
{
  "optimizedNotes": [
    {
      "pitch": "C4",
      "midiNumber": 60,
      "startTime": 0.0,
      "duration": 1.0,
      "velocity": 90,
      "isMelody": true
    }
  ],
  "arrangementCommentary": "オルゴール編曲のポイント解説（音域調整、同音連続の回避、和音整理など）",
  "difficulty": "初級 / 中級 / 上級"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${prompt}\nInput notes JSON:\n${JSON.stringify(notes?.slice(0, 500) || [])}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              optimizedNotes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pitch: { type: Type.STRING },
                    midiNumber: { type: Type.INTEGER },
                    startTime: { type: Type.NUMBER },
                    duration: { type: Type.NUMBER },
                    velocity: { type: Type.INTEGER },
                    isMelody: { type: Type.BOOLEAN },
                  },
                  required: ["pitch", "midiNumber", "startTime", "duration"],
                },
              },
              arrangementCommentary: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["optimizedNotes", "arrangementCommentary"],
          },
        },
      });

      const resultData = safeParseJson(response.text);
      if (!resultData) {
        console.error("Failed to parse Gemini response for /api/optimize-musicbox. Raw response.text:", response.text);
        return res.status(500).json({
          success: false,
          error: "AI最適化結果をJSONとして読み込めませんでした。再度お試しください。",
        });
      }

      return res.json({ success: true, data: resultData });
    } catch (error: any) {
      console.error("Error in /api/optimize-musicbox:", error);
      let errorMessage = "AI最適化処理中にエラーが発生しました";
      if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("demand")) {
        errorMessage = "現在AIサーバーの負荷が高まっています。少し時間をおいて再度お試しください。";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
