import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { TaskType } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;

if (!GEMINI_API_KEY) {
  console.error("Missing Google Generative AI API Key. Please add GEMINI_API_KEY to your .env file.");
}

// Initialize LangChain components
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GEMINI_API_KEY,
  modelName: "gemini-embedding-2",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

const model = new ChatGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY,
  modelName: "gemini-2.0-flash",
  maxOutputTokens: 2048,
});

let vectorStore: MemoryVectorStore;
let faqs: { question: string; answer: string }[] = [
  { question: "Hi", answer: "Hello! I am the SAFE Intelligence Assistant. You can ask me about wildfire simulations, the Rothermel model, or fire risk analytics." },
  { question: "What is SAFE?", answer: "SAFE (Smart Analytics for Fire Emergencies) is a high-fidelity wildfire intelligence and simulation platform using Rothermel's surface fire spread model." },
  { question: "How does the simulation model work?", answer: "The simulation uses the Rothermel model, which considers fuel types, moisture, wind speed, and slope to predict fire behavior." },
  { question: "What data sources does SAFE use?", answer: "SAFE integrates real-time environmental data including temperature, humidity, wind vectors, and vegetation maps." },
  { question: "Is the simulation real-time?", answer: "Yes, the simulation runs in real-time using WebGL-accelerated 3D rendering for high-performance visualization." },
  { question: "What is the Rothermel model?", answer: "The Rothermel Surface Fire Spread Model is a mathematical formula used to predict the rate of spread and intensity of forest fires." },
  { question: "Who created SAFE?", answer: "SAFE was developed as part of the Reboot the Earth hackathon to provide advanced wildfire analytics." }
];

async function initializeKnowledgeBase() {
  console.log("Initializing knowledge base...");
  
  // 1. Generate FAQs first (has robust fallbacks)
  await generateFAQs();

  // 2. Load documents for vector store
  const docsToLoad = ['README.md', 'ARCHITECTURE.md', 'SIMULATION_MODEL.md'];
  const allDocs: Document[] = [];

  for (const fileName of docsToLoad) {
    const filePath = path.join(process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      allDocs.push(new Document({ pageContent: content, metadata: { source: fileName } }));
    }
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  try {
    const splitDocs = await textSplitter.splitDocuments(allDocs);
    vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    console.log("Knowledge base (Vector Store) initialized.");
  } catch (error) {
    console.warn("Vector store initialization failed (quota likely reached). AI will answer from general knowledge.");
  }
}

async function generateFAQs() {
  // Check if we already have faqs to avoid redundant API calls
  if (faqs.length > 2) return;

  try {
    const response = await model.invoke([
      ["system", "You are an AI assistant for the SAFE (Smart Analytics for Fire Emergencies) project. Based on the documentation provided, generate 5 frequently asked questions and their answers. Format as a JSON array of objects with 'question' and 'answer' keys."],
      ["human", "Generate the FAQs now."]
    ]);
    
    const content = response.content as string;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      faqs = JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn("Could not generate dynamic FAQs (quota reached), using high-fidelity fallbacks.");
    faqs = [
      { question: "What is SAFE?", answer: "SAFE (Smart Analytics for Fire Emergencies) is a high-fidelity wildfire intelligence and simulation platform using Rothermel's surface fire spread model." },
      { question: "How does the simulation model work?", answer: "The simulation uses the Rothermel model, which considers fuel types, moisture, wind speed, and slope to predict fire behavior." },
      { question: "What data sources does SAFE use?", answer: "SAFE integrates real-time environmental data including temperature, humidity, wind vectors, and vegetation maps." },
      { question: "Is the simulation real-time?", answer: "Yes, the simulation runs in real-time using WebGL-accelerated 3D rendering for high-performance visualization." },
      { question: "What is the Rothermel model?", answer: "The Rothermel Surface Fire Spread Model is a mathematical formula used to predict the rate of spread and intensity of forest fires." }
    ];
  }
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  console.log(`[Chat] Incoming message: "${message}"`);

  try {
    let contextText = "";
    
    // 1. Search for relevant context if vector store is ready
    if (vectorStore) {
      try {
        const contextDocs = await vectorStore.similaritySearch(message, 3);
        contextText = contextDocs.map(d => d.pageContent).join("\n\n");
        console.log(`[Chat] Found ${contextDocs.length} context documents.`);
      } catch (err) {
        console.error("[Chat] Vector search error:", err);
      }
    }

    // 2. Generate response
    console.log("[Chat] Invoking Gemini model...");
    const response = await model.invoke([
      ["system", `You are a helpful assistant for the SAFE project. ${contextText ? `Use the following context to answer the user's question. If you don't know the answer based on the context, use your general knowledge but clarify that it's not explicitly in the docs.\n\nContext:\n${contextText}` : "The internal knowledge base is currently being initialized or unavailable. Please answer based on your general knowledge of wildfire safety and the SAFE (Smart Analytics for Fire Emergencies) project."}`],
      ["human", message]
    ]);

    console.log(`[Chat] Gemini response: "${(response.content as string).substring(0, 50)}..."`);
    res.json({ response: response.content });
  } catch (error: any) {
    console.error("[Chat] Error:", error.message);
    res.status(500).json({ error: "I'm currently experiencing high traffic. Please try again in a moment." });
  }
});

app.get('/api/faq', (req, res) => {
  res.json(faqs);
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initializeKnowledgeBase();
});
