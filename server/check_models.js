require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error("❌ API Key is missing from .env file!");
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            return;
        }

        console.log("✅ AVAILABLE MODELS:");
        data.models.forEach(model => {
            // We only want to see the Gemini text generation models
            if (model.name.includes('gemini')) {
                console.log(`- ${model.name.replace('models/', '')}`);
            }
        });
    } catch (error) {
        console.error("❌ Network Error:", error);
    }
}

listModels();