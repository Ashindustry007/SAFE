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

// API Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  console.log(`[Direct Chat] User Query: "${message}"`);

  // Try Gemini First
  try {
    console.log("Attempting Gemini...");
    const result = await geminiModel.generateContent(message);
    const response = await result.response;
    return res.json({ response: response.text(), sources: [] });
  } catch (geminiError: any) {
    console.warn("Gemini Quota Exceeded, attempting OpenAI...");
    
    // Fallback to OpenAI
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
      });
      return res.json({ response: completion.choices[0].message.content, sources: [] });
    } catch (openaiError: any) {
      console.error("Both APIs failed quota check.");
      
      // Professional Local Fallback
      const fallback = "The SAFE Intelligence Core is in failsafe mode. Project Summary: SAFE (Smart Analytics for Fire Emergencies) uses the Rothermel Model to predict wildfire spread by calculating rate of spread and intensity based on real-time wind, fuel, and topography.";
      return res.json({ response: fallback, sources: [] });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Direct-to-API Server active on http://localhost:${PORT}`);
});
