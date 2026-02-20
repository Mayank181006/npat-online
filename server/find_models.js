require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function getModels() {
  console.log("🔍 Asking Google for available models...");
  
  try {
    const response = await fetch(URL);
    const data = await response.json();

    if (data.error) {
        console.error("❌ API Error:", data.error.message);
        return;
    }

    if (!data.models) {
        console.log("❌ No models found. Your key might be valid but has no access.");
        return;
    }

    console.log("\n✅ AVAILABLE MODELS (Copy one of these names):");
    console.log("---------------------------------------------");
    data.models.forEach(model => {
        // We only care about models that support 'generateContent'
        if (model.supportedGenerationMethods.includes("generateContent")) {
            console.log(`Name: ${model.name.replace("models/", "")}`);
        }
    });
    console.log("---------------------------------------------\n");

  } catch (error) {
    console.error("Network Error:", error);
  }
}

getModels();