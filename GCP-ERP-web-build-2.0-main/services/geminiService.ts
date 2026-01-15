
import { GoogleGenAI } from "@google/genai";

// Always use process.env.API_KEY directly in initialization as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGeminiResponse = async (
  prompt: string, 
  contextData: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "⚠️ API Key is missing. Please configure GEMINI_API_KEY.";
  }

  try {
    const systemInstruction = `
      You are an expert Coffee Shop Business Consultant and AI Assistant.
      You have access to the shop's sales and inventory data.
      Analyze the provided context data factually.
      
      Tone: Professional, encouraging, and insightful.
      Language: Korean (Hangul).
      
      --- Context Data ---
      ${contextData}
      --------------------
    `;

    // Updated model to gemini-3-flash-preview for Basic Text Tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "죄송합니다. 답변을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 서비스 연결 중 오류가 발생했습니다.";
  }
};
