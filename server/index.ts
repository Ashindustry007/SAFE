import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

// --- PROVIDER CONFIGURATION ---

// 1. Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 2. OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 3. Groq (Recommended for Hackathons)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "none",
  baseURL: "https://api.groq.com/openai/v1"
});

// 4. Mistral
const mistral = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY || "none",
  baseURL: "https://api.mistral.ai/v1"
});

// 5. RunPod
const runpod = new OpenAI({
  apiKey: process.env.RUNPOD_API_KEY || "none",
  baseURL: "https://api.runpod.ai/v1"
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  console.log(`[Multi-API] Query: "${message}"`);

  // --- FAILS_SAFE CHAIN ---
  
  // Try Groq First (if key exists)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("Attempting Groq...");
      const chat = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }],
      });
      return res.json({ response: chat.choices[0].message.content, sources: [] });
    } catch (e) { console.warn("Groq failed."); }
  }

  // Try Gemini
  try {
    console.log("Attempting Gemini...");
    const result = await geminiModel.generateContent(message);
    const response = await result.response;
    return res.json({ response: response.text(), sources: [] });
  } catch (e) { console.warn("Gemini failed."); }

  // Try OpenAI
  try {
    console.log("Attempting OpenAI...");
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });
    return res.json({ response: chat.choices[0].message.content, sources: [] });
  } catch (e) { console.warn("OpenAI failed."); }

  // Try RunPod
  if (process.env.RUNPOD_API_KEY) {
    try {
      console.log("Attempting RunPod...");
      const chat = await runpod.chat.completions.create({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [{ role: "user", content: message }],
      });
      return res.json({ response: chat.choices[0].message.content, sources: [] });
    } catch (e) { console.warn("RunPod failed."); }
  }

  // Final Fallback
  console.error("All APIs exhausted.");
  res.json({ response: "SAFE Intelligence is in standby mode. Please provide an active API key for Groq, Mistral, or OpenAI to resume full technical analysis.", sources: [] });
});

app.listen(PORT, () => {
  console.log(`SAFE Multi-API Server active on http://localhost:${PORT}`);
});
