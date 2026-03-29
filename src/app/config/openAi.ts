import OpenAI from "openai";
import { envVars } from ".";

const openAi = new OpenAI({
    apiKey: envVars.OPEN_AI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

export default openAi;