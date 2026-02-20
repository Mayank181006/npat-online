const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// CONFIG
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const primaryModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });  

const POINTS = {
    VALID_UNIQUE: 10,
    VALID_DUPLICATE: 5,
    INVALID: 0,
    EMPTY: 0
};

const withTimeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`AI Request Timed Out after ${ms}ms`)), ms)
        )
    ]);
};

async function processRoundResults(players, letter) {
    const inputsToCheck = {};
    players.forEach(p => {
        if(p.currentInput) inputsToCheck[p.id] = p.currentInput;
    });

    const validationMask = await validateWithGemini(inputsToCheck, letter);
    return calculateScores(players, inputsToCheck, validationMask);
}

async function validateWithGemini(inputs, letter) {
    const prompt = `
    You are the referee for "Name Place Animal Thing". 
    Current Letter: "${letter}"
    
    STRICT RULES:
    1. Starts With: All answers MUST start with the letter "${letter}".
    2. NAME: Must be a valid human name.
    3. PLACE: 
       - ACCEPT: Countries, Cities, States, Continents.
       - REJECT: Monuments, Local Streets, Shops, Buildings.
    4. ANIMAL: 
       - ACCEPT: Any living creature.
    5. THING: Must be a non-living object.
    
    Input JSON:
    ${JSON.stringify(inputs)}

    Task:
    Return a JSON Object where every field is strictly boolean (true = valid, false = invalid).
    CRITICAL INSTRUCTION: You MUST use the exact same ID keys from the Input JSON in your Output JSON. Do not rename them.
    RETURN ONLY RAW JSON. NO MARKDOWN.
    `;

    // Extra-aggressive JSON cleaner in case the AI still wraps it in markdown
    const cleanAndParse = (text) => {
        let cleanText = text.replace(/```(json)?/gi, '').replace(/```/g, '').trim();
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        if(start !== -1 && end !== -1) {
            cleanText = cleanText.substring(start, end + 1);
        }
        return JSON.parse(cleanText);
    };

    try {
        console.log(`🤖 [AI] Asking Primary Model for letter ${letter}...`);
        const result = await withTimeout(primaryModel.generateContent(prompt), 8000);
        const rawText = result.response.text();
        console.log(`✅ [AI] Success! Raw Output:\n`, rawText); // Now you can see the grade!
        return cleanAndParse(rawText);
    } catch (error1) {
        console.warn(`⚠️ [AI] Primary Model Failed: ${error1.message}`);
        try {
            console.log(`🤖 [AI] Asking Fallback Model...`);
            const result2 = await withTimeout(fallbackModel.generateContent(prompt), 5000);
            return cleanAndParse(result2.response.text());
        } catch (error2) {
            console.error(`🚨 [AI] Both Models Failed! Using Offline Fallback.`);
            return basicFallbackValidation(inputs, letter);
        }
    }
}

function calculateScores(players, inputs, validationMask) {
    const frequencyMap = {};

    players.forEach(p => {
        const pInput = inputs[p.id];
        // Ensure we fallback to false if the ID is missing for some reason
        const pValid = validationMask[p.id] || { name:false, place:false, animal:false, thing:false };
        
        if(!pInput || !validationMask[p.id]) return;

        ['name', 'place', 'animal', 'thing'].forEach(cat => {
            if (pValid[cat]) {
                const val = pInput[cat].trim().toLowerCase();
                const key = `${cat}_${val}`;
                frequencyMap[key] = (frequencyMap[key] || 0) + 1;
            }
        });
    });

    const roundResults = {};
    players.forEach(p => {
        const pInput = inputs[p.id] || { name:"", place:"", animal:"", thing:"" };
        const pValid = validationMask[p.id] || { name:false, place:false, animal:false, thing:false };
        
        let roundScore = 0;
        const breakdown = {};

        ['name', 'place', 'animal', 'thing'].forEach(cat => {
            const val = pInput[cat]?.trim().toLowerCase() || "";
            const key = `${cat}_${val}`;
            const isValid = pValid[cat];

            if (!isValid || val === "") {
                breakdown[cat] = POINTS.INVALID; 
            } else if (frequencyMap[key] > 1) {
                breakdown[cat] = POINTS.VALID_DUPLICATE; 
                roundScore += POINTS.VALID_DUPLICATE;
            } else {
                breakdown[cat] = POINTS.VALID_UNIQUE; 
                roundScore += POINTS.VALID_UNIQUE;
            }
        });

        p.scores += roundScore;

        roundResults[p.id] = {
            roundScore,
            totalScore: p.scores,
            breakdown, 
            validation: pValid 
        };
    });

    return roundResults;
}

function basicFallbackValidation(inputs, letter) {
    const mask = {};
    for (const [id, data] of Object.entries(inputs)) {
        mask[id] = {};
        ['name', 'place', 'animal', 'thing'].forEach(cat => {
            const val = data[cat] || "";
            mask[id][cat] = val.trim().length > 0 && 
                            val.trim().toLowerCase().startsWith(letter.toLowerCase());
        });
    }
    return mask;
}

module.exports = { processRoundResults };