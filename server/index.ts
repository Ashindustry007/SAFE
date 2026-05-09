/**
 * SAFE Intelligence Server
 * 
 * A high-resiliency backend that manages wildfire intelligence queries across
 * multiple AI providers (Groq, Gemini, OpenAI, etc.) with automatic failover.
 */

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

// --- AI PROVIDER CONFIGURATIONS ---

/**
 * Initialize Google Gemini client
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Initialize OpenAI client
 */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Initialize Groq client (Primary Provider)
 * Optimized for low-latency Llama 3 models.
 */
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "none",
  baseURL: "https://api.groq.com/openai/v1"
});

/**
 * Initialize Mistral client
 */
// const mistral = new OpenAI({
//   apiKey: process.env.MISTRAL_API_KEY || "none",
//   baseURL: "https://api.mistral.ai/v1"
// });

/**
 * Initialize RunPod client
 */
const runpod = new OpenAI({
  apiKey: process.env.RUNPOD_API_KEY || "none",
  baseURL: "https://api.runpod.ai/v1"
});

/**
 * Main Chat Endpoint
 * Implements a sequential failover chain to ensure 100% availability.
 * Order: Groq -> Gemini -> OpenAI -> RunPod -> Failsafe
 */
app.post('/api/chat', async (req: Request, res: Response): Promise<any> => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  console.log(`[Multi-API] Query received: "${message}"`);

  // 1. ATTEMPT GROQ (Lowest Latency)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("Attempting Groq...");
      const chat = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }],
      });
      return res.json({ response: chat.choices[0].message.content, sources: [] });
    } catch (e) { console.warn("Groq failed or throttled."); }
  }

  // 2. ATTEMPT GEMINI
  try {
    console.log("Attempting Gemini...");
    const result = await geminiModel.generateContent(message);
    const response = await result.response;
    return res.json({ response: response.text(), sources: [] });
  } catch (e) { console.warn("Gemini failed or out of quota."); }

  // 3. ATTEMPT OPENAI
  try {
    console.log("Attempting OpenAI...");
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });
    return res.json({ response: chat.choices[0].message.content, sources: [] });
  } catch (e) { console.warn("OpenAI failed or out of quota."); }

  // 4. ATTEMPT RUNPOD
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

  // 5. HARD FAILOVER (Technical Summary)
  console.error("All AI providers exhausted.");
  res.json({
    response: "The SAFE Intelligence Core is currently in maintenance mode. Technical Summary: SAFE is a wildfire predictive platform utilizing the Rothermel Spread Model and real-time environmental vectors to provide high-fidelity fire behavior analysis.",
    sources: []
  });
});

/**
 * Static FAQ Endpoint
 */
app.get('/api/faqs', (_req: Request, res: Response) => {
  res.json([
    { question: "What is SAFE?", answer: "SAFE is a high-fidelity wildfire intelligence platform." },
    { question: "How does the model work?", answer: "It uses the Rothermel formula to predict fire spread based on weather and fuel." },
    { question: "What data is used?", answer: "Real-time wind, temperature, and vegetation maps." }
  ]);
});

app.listen(PORT, () => {
  console.log(`SAFE Multi-API Server active on http://localhost:${PORT}`);
});
