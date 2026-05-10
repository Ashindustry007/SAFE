/**
 * SAFE (Simulated Analysis of Fire Ecology) - Intelligence Server
 * 
 * A high-resiliency Node.js backend designed to provide 100% availability for 
 * AI-powered wildfire intelligence queries. It implements a sophisticated 
 * sequential failover chain across multiple global AI providers to mitigate 
 * rate-limiting and service outages during emergencies.
 * 
 * Failover Priority:
 * 1. Groq (Llama 3.3 70B) - Ultra-low latency primary.
 * 2. Google Gemini (2.0 Flash) - High-fidelity reasoning secondary.
 * 3. OpenAI (GPT-4o Mini) - Tertiary fallback.
 * 4. RunPod (Self-hosted Llama 3) - Quaternary infrastructure fallback.
 * 5. Static Failsafe - Pre-indexed technical summary.
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

// --- AI PROVIDER INITIALIZATION ---

/**
 * Google Gemini Configuration
 * Utilized for complex environmental reasoning and large context windows.
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * OpenAI Configuration
 * Robust fallback provider for technical analysis.
 */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Groq Configuration
 * PRIMARY PROVIDER: Optimized for sub-second inference using LPU architecture.
 */
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "none",
  baseURL: "https://api.groq.com/openai/v1"
});

/**
 * RunPod Configuration
 * Infrastructure-level fallback for GPU-accelerated self-hosted models.
 */
const runpod = new OpenAI({
  apiKey: process.env.RUNPOD_API_KEY || "none",
  baseURL: "https://api.runpod.ai/v1"
});

/**
 * POST /api/chat
 * Primary entry point for the SAFE Intelligence Assistant.
 * 
 * Implements a "Chain of Responsibility" pattern for AI providers. Each failure 
 * in the chain triggers the next provider until a valid response is achieved 
 * or the failsafe buffer is reached.
 */
app.post('/api/chat', async (req: Request, res: Response): Promise<any> => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  console.log(`[Multi-API] Query received: "${message}"`);

  // --- ATTEMPT 1: GROQ ---
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("Attempting Groq (Llama-3.3-70B)...");
      const chat = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }],
      });
      return res.json({ response: chat.choices[0].message.content, sources: [] });
    } catch (e) { console.warn("Groq failed or throttled."); }
  }

  // --- ATTEMPT 2: GEMINI ---
  try {
    console.log("Attempting Gemini (2.0-Flash)...");
    const result = await geminiModel.generateContent(message);
    const response = await result.response;
    return res.json({ response: response.text(), sources: [] });
  } catch (e) { console.warn("Gemini failed or out of quota."); }

  // --- ATTEMPT 3: OPENAI ---
  try {
    console.log("Attempting OpenAI (GPT-4o-Mini)...");
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });
    return res.json({ response: chat.choices[0].message.content, sources: [] });
  } catch (e) { console.warn("OpenAI failed or out of quota."); }

  // --- ATTEMPT 4: RUNPOD ---
  if (process.env.RUNPOD_API_KEY) {
    try {
      console.log("Attempting RunPod (Llama-3-8B)...");
      const chat = await runpod.chat.completions.create({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [{ role: "user", content: message }],
      });
      return res.json({ response: chat.choices[0].message.content, sources: [] });
    } catch (e) { console.warn("RunPod failed."); }
  }

  // --- ATTEMPT 5: STATIC FAILSAFE ---
  console.error("CRITICAL: All AI providers exhausted.");
  res.json({
    response: "The SAFE Intelligence Core is currently in maintenance mode. Technical Summary: SAFE is a wildfire predictive platform utilizing the Rothermel Spread Model and real-time environmental vectors to provide high-fidelity fire behavior analysis.",
    sources: []
  });
});

/**
 * GET /api/faqs
 * Provides baseline platform definitions for the FAQ interface.
 */
app.get('/api/faqs', (_req: Request, res: Response) => {
  res.json([
    { question: "What is SAFE?", answer: "SAFE is a high-fidelity wildfire intelligence platform." },
    { question: "How does the model work?", answer: "It uses the Rothermel formula to predict fire spread based on weather and fuel." },
    { question: "What data is used?", answer: "Real-time wind, temperature, and vegetation maps." }
  ]);
});

/**
 * SERVER STARTUP
 */
app.listen(PORT, () => {
  console.log(`SAFE Multi-API Server active on http://localhost:${PORT}`);
});
