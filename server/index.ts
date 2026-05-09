import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

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
// Configuration from Python script
const DEFAULT_MODEL = "gpt-4o";

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = new ChatOpenAI({
  modelName: "meta-llama/Meta-Llama-3-8B-Instruct",
  apiKey: process.env.RUNPOD_API_KEY,
  configuration: { baseURL: "https://api.runpod.ai/v1" },
});

let vectorStore: MemoryVectorStore;
let faqs: { question: string; answer: string }[] = [
  { question: "What is SAFE?", answer: "SAFE (Smart Analytics for Fire Emergencies) is a high-fidelity wildfire intelligence and simulation platform using Rothermel's surface fire spread model." },
  { question: "How does the simulation model work?", answer: "The simulation uses the Rothermel model, which considers fuel types, moisture, wind speed, and slope to predict fire behavior." },
  { question: "What data sources does SAFE use?", answer: "SAFE integrates real-time environmental data including temperature, humidity, wind vectors, and vegetation maps." },
  { question: "What is the Rothermel model?", answer: "The Rothermel Surface Fire Spread Model is a mathematical formula used to predict the rate of spread and intensity of forest fires." }
];

async function initializeKnowledgeBase() {
  console.log("Initializing knowledge base via Triton...");
  
  const docsToLoad = ['README.md', 'ARCHITECTURE.md', 'SIMULATION_MODEL.md'];
  const allDocs: Document[] = [];

  for (const fileName of docsToLoad) {
    const filePath = path.join(process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      allDocs.push(new Document({ 
        pageContent: content, 
        metadata: { source: fileName, fullPath: filePath } 
      }));
    }
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  });

  try {
    const splitDocs = await textSplitter.splitDocuments(allDocs);
    vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    console.log("Triton Knowledge Base initialized.");
  } catch (error: any) {
    console.warn("Vector store initialization failed:", error.message);
  }
}

// Ported from Python: extract sources and line numbers
function extractSources(docs: any[]) {
  const sources: any[] = [];
  const seen = new Set();

  for (const doc of docs) {
    const filename = doc.metadata.source;
    const content = doc.pageContent;
    const fullText = fs.readFileSync(path.join(process.cwd(), filename), 'utf-8');
    
    // Simple line number estimation
    const startIndex = fullText.indexOf(content.substring(0, 50));
    if (startIndex !== -1) {
      const startLine = fullText.substring(0, startIndex).split('\n').length;
      const endLine = startLine + content.split('\n').length - 1;
      
      const key = `${filename}:${startLine}-${endLine}`;
      if (!seen.has(key)) {
        seen.add(key);
        sources.push({ file: filename, lines: [startLine, endLine] });
      }
    }
  }
  return sources;
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  console.log(`[Triton Chat] Query: "${message}"`);

  try {
    let contextText = "";
    let sources: any[] = [];
    
    if (vectorStore) {
      const contextDocs = await vectorStore.similaritySearch(message, 4);
      contextText = contextDocs.map(d => `${d.metadata.source}: ${d.pageContent}`).join("\n\n");
      sources = extractSources(contextDocs);
    }

    const response = await model.invoke([
      ["system", `You are a technical documentation assistant. Answer the user's question using only the provided context chunks.
      Rules:
      - If the context is insufficient, say you do not know based on the provided context.
      - Keep the answer concise and factual.
      - Do not invent APIs, arguments, or behaviors not supported by context.
      
      Context:
      ${contextText}`],
      ["human", message]
    ]);

    res.json({ 
      response: response.content,
      sources: sources 
    });
  } catch (error: any) {
    console.error("[OpenAI] Error:", error.message);
    const fallback = `The SAFE Intelligence Core is currently in high-load failsafe mode. 
    
    Project Summary: SAFE (Smart Analytics for Fire Emergencies) is a predictive platform for wildfire management. It utilizes the Rothermel Surface Fire Spread Model to calculate fire intensity and rate of spread based on fuel, weather, and topography. Our system integrates real-time environmental data (Wind, Temp, Humidity) with satellite vegetation maps to provide regional risk assessments and high-fidelity 3D simulations.
    
    You can continue to ask about the Rothermel model, Risk Analysis, or our Data Sources using the suggestions in the sidebar.`;
    res.json({ response: fallback });
  }
});

app.get('/api/faq', (req, res) => {
  res.json(faqs);
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initializeKnowledgeBase();
});
