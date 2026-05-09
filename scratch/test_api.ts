import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-pro";
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function test() {
  console.log("Listing Models...");
  try {
    const response = await axios.get(URL);
    console.log("Models:", response.data.models.map(m => m.name));
  } catch (error) {
    if (error.response) {
      console.log("Error Status:", error.response.status);
      console.log("Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error:", error.message);
    }
  }
}

test();
