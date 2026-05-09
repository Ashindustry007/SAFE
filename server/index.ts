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

const PORT = process.env.PORT || 3001;
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
let faqs: { question: string; answer: string }[] = [];

async function initializeKnowledgeBase() {
  console.log("Initializing knowledge base...");
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

  const splitDocs = await textSplitter.splitDocuments(allDocs);
  vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  
  console.log("Knowledge base initialized.");
  
  // Generate initial FAQs if none exist (simplified for demo)
  generateFAQs();
}

async function generateFAQs() {
  try {
    const response = await model.invoke([
      ["system", "You are an AI assistant for the SAFE (Smart Analytics for Fire Emergencies) project. Based on the documentation provided, generate 5-7 frequently asked questions and their answers. Format as a JSON array of objects with 'question' and 'answer' keys."],
      ["human", "Generate the FAQs now."]
    ]);
    
    // Simple extraction of JSON from response
    const content = response.content as string;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      faqs = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback static FAQs if generation fails
      faqs = [
        { question: "What is SAFE?", answer: "SAFE (Smart Analytics for Fire Emergencies) is a high-fidelity wildfire intelligence and simulation platform." },
        { question: "What model does the simulation use?", answer: "The simulation is based on the Rothermel Surface Fire Spread Model." }
      ];
    }
  } catch (error) {
    console.error("Error generating FAQs:", error);
  }
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    // 1. Search for relevant context
    const contextDocs = await vectorStore.similaritySearch(message, 3);
    const contextText = contextDocs.map(d => d.pageContent).join("\n\n");

    // 2. Generate response
    const response = await model.invoke([
      ["system", `You are a helpful assistant for the SAFE project. Use the following context to answer the user's question. If you don't know the answer based on the context, use your general knowledge but clarify that it's not explicitly in the docs.\n\nContext:\n${contextText}`],
      ["human", message]
    ]);

    res.json({ response: response.content });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/faq', (req, res) => {
  res.json(faqs);
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initializeKnowledgeBase();
});
