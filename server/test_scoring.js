const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// CONFIG
const API_KEY = process.env.GEMINI_API_KEY;
// FIX: Using the working model
const MODEL_NAME = "gemini-flash-latest"; 
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// SCORING RULES
const POINTS = {
    VALID_UNIQUE: 10,
    VALID_DUPLICATE: 5,
    INVALID: 0
};

// MOCK DATA (Letter 'I')
const letter = "I";
const players = [
    { 
        id: "Player1", scores: 0,
        // India Gate (Monument) -> INVALID (0)
        // Ink (Unique) -> VALID UNIQUE (10)
        currentInput: { name: "Isha", place: "India Gate", animal: "Iguana", thing: "Ink" } 
    },
    { 
        id: "Player2", scores: 0,
        // India (Shared) -> VALID DUPLICATE (5)
        // Iguana (Shared) -> VALID DUPLICATE (5)
        currentInput: { name: "Ishant", place: "India", animal: "Iguana", thing: "Ice" } 
    },
    { 
        id: "Player3", scores: 0,
        // India (Shared) -> VALID DUPLICATE (5)
        // Impala (Unique) -> VALID UNIQUE (10)
        currentInput: { name: "Ibrahim", place: "India", animal: "Impala", thing: "Igloo" } 
    }
];

async function testGameLogic() {
    console.log(`\n🧪 TESTING SCORING LOGIC FOR LETTER: '${letter}'`);
    console.log("------------------------------------------------");
    
    // 1. PREPARE INPUTS
    const inputsToCheck = {};
    players.forEach(p => inputsToCheck[p.id] = p.currentInput);

    // 2. AI VALIDATION
    console.log("🤖 Asking AI to validate...");
    const validationMask = await validateWithGemini(inputsToCheck, letter);
    
    // 3. CALCULATE SCORES
    console.log("🧮 Calculating Scores...");
    const results = calculateScores(players, inputsToCheck, validationMask);

    // 4. PRINT RESULTS
    console.log("\n📊 FINAL RESULTS:");
    Object.keys(results).forEach(pid => {
        const res = results[pid];
        console.log(`\n👤 ${pid}:`);
        console.log(`   Total Score: ${res.roundScore}`);
        console.table(res.breakdown); 
    });
}

// --- LOGIC FUNCTIONS ---

async function validateWithGemini(inputs, letter) {
    // UPDATED PROMPT: More explicit about Countries and Animals
    const prompt = `
    You are the referee for "Name Place Animal Thing". 
    Current Letter: "${letter}"
    
    STRICT RULES:
    1. **Starts With**: All answers MUST start with the letter "${letter}".
    2. **NAME**: Must be a valid human name.
    3. **PLACE**: 
       - ✅ ACCEPT: Countries (e.g. India, Indonesia), Cities, States.
       - ❌ REJECT: Monuments (e.g. India Gate, Taj Mahal), Landmarks, Buildings.
    4. **ANIMAL**: 
       - ✅ ACCEPT: Any living creature (Mammals, Birds, Reptiles like Iguana).
    5. **THING**: Must be a non-living object.
    
    Input JSON:
    ${JSON.stringify(inputs)}

    Task:
    Return a JSON Object where every field is strictly boolean (true = valid, false = invalid).
    RETURN ONLY RAW JSON. NO MARKDOWN.
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // console.log("AI DEBUG:", text); // Uncomment to see raw AI text
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("AI Error:", e.message);
        return {};
    }
}

function calculateScores(players, inputs, validationMask) {
    const frequencyMap = {};

    // Step A: Count Frequencies of VALID answers
    players.forEach(p => {
        const pValid = validationMask[p.id];
        if(!pValid) return;

        ['name', 'place', 'animal', 'thing'].forEach(cat => {
            // Only count if AI says it is valid
            if (pValid[cat]) {
                const val = inputs[p.id][cat].trim().toLowerCase();
                const key = `${cat}_${val}`;
                frequencyMap[key] = (frequencyMap[key] || 0) + 1;
            }
        });
    });

    // Step B: Assign Points
    const roundResults = {};
    players.forEach(p => {
        const pInput = inputs[p.id];
        const pValid = validationMask[p.id];
        let roundScore = 0;
        const breakdown = {};

        ['name', 'place', 'animal', 'thing'].forEach(cat => {
            const val = pInput[cat].trim().toLowerCase();
            const key = `${cat}_${val}`;
            const isValid = pValid[cat];
            
            if (!isValid) {
                breakdown[cat] = `0 (Invalid)`; // Wrong
            } else if (frequencyMap[key] > 1) {
                breakdown[cat] = `5 (Duplicate)`; // Shared
                roundScore += POINTS.VALID_DUPLICATE;
            } else {
                breakdown[cat] = `10 (Unique)`; // Unique
                roundScore += POINTS.VALID_UNIQUE;
            }
        });

        roundResults[p.id] = { roundScore, breakdown };
    });

    return roundResults;
}

testGameLogic();