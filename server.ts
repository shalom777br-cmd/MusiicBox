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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API 1: Parse uploaded score (Image/PDF/Text) using Gemini OCR & Music Analysis
  app.post("/api/parse-music", async (req, res) => {
    try {
      const { fileData, mimeType, fileName, textContent } = req.body;

      if (!fileData && !textContent) {
        return res.status(400).json({ error: "Missing file data or content" });
      }

      console.log(`Analyzing music sheet/file: ${fileName || "text data"}`);

      const prompt = `
You are an expert musicologist and sheet music OCR engine specialized in extracting musical note data for music box arrangements.
Analyze the provided musical score (image, PDF, XML, or text notation) and output a clean JSON structure containing the note sequence.

Requirements for Music Box conversion:
1. Extract notes with pitch name (e.g., "C4", "D#4", "G5"), MIDI note number (e.g. 60 for C4), start time in beats (0, 1, 1.5, 2, etc.), duration in beats (e.g. 0.5, 1, 2), velocity (0-127), and whether it belongs to the primary melody.
2. Identify title, composer, time signature (e.g. "4/4", "3/4"), and estimated tempo in BPM.
3. Provide a brief explanation in Japanese of how this score was parsed and suggestions for music box arrangement.

Return ONLY JSON matching this structure:
{
  "title": "Song Title",
  "composer": "Composer Name or Public Domain",
  "timeSignature": "4/4",
  "bpm": 72,
  "keySignature": "C major",
  "summary": "解析概要とオルゴール化のアドバイス",
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
        model: "gemini-3.6-flash",
        contents: { parts: contentsParts },
        config: {
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

      const parsedData = JSON.parse(response.text || "{}");
      res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("Error in /api/parse-music:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "楽譜の解析中にエラーが発生しました",
      });
    }
  });

  // API 2: Optimize note arrangement specifically for music box limitations using Gemini AI
  app.post("/api/optimize-musicbox", async (req, res) => {
    try {
      const { title, notes, combCount = 18, settings } = req.body;

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
        model: "gemini-3.6-flash",
        contents: `${prompt}\nInput notes JSON:\n${JSON.stringify(notes?.slice(0, 150) || [])}`,
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

      const resultData = JSON.parse(response.text || "{}");
      res.json({ success: true, data: resultData });
    } catch (error: any) {
      console.error("Error in /api/optimize-musicbox:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "AI最適化処理中にエラーが発生しました",
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
