import { GoogleGenAI, Type } from "@google/genai";
import { PaperData } from '../types';

const paperSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "The main title of the research paper."
    },
    abstract: {
      type: Type.STRING,
      description: "The abstract section of the paper, with each paragraph wrapped in <p> tags."
    },
    sections: {
      type: Type.ARRAY,
      description: "An array of the main sections of the paper (e.g., Introduction, Methods, Results, Conclusion).",
      items: {
        type: Type.OBJECT,
        properties: {
          heading: {
            type: Type.STRING,
            description: "The heading or title of the section (e.g., '1. Introduction', '2.1 Methods')."
          },
          content: {
            type: Type.STRING,
            description: "The full text content of the section. IMPORTANT: Every distinct paragraph must be enclosed in its own HTML <p> tag. For example: '<p>This is the first paragraph.</p><p>This is the second paragraph.</p>'"
          }
        },
        required: ["heading", "content"]
      }
    },
    references: {
      type: Type.ARRAY,
      description: "The list of references or bibliography at the end of the paper.",
      items: {
        type: Type.STRING
      }
    }
  },
  required: ["title", "abstract", "sections", "references"]
};

export const restructurePaper = async (text: string, apiKey: string): Promise<PaperData> => {
    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please provide a valid API key.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert academic paper formatter. I will provide you with the raw text extracted from a PDF. Your task is to analyze this text, identify its structure (title, abstract, sections, references), and reformat it into a clean, logical JSON structure.

When processing the sections, it is crucial that you identify not only the main sections (e.g., '1. Introduction', '2. Methods') but also all of their subsections (e.g., '2.1 Data Collection', '2.2 Statistical Analysis', '2.2.1 Sub-analysis'). Each section and subsection, no matter how small, must be created as a separate object in the "sections" array. Do not group subsections under a single parent section's content.

This is the most important rule: For the 'content' of each section and the 'abstract', you MUST wrap every individual paragraph from the source text in its own HTML <p> tag. For example, a section with two paragraphs should be formatted as "<p>First paragraph text.</p><p>Second paragraph text.</p>". Do not merge paragraphs together. Preserve all original text, including any references to figures or tables (e.g., "As shown in Figure 1..."). Do not extract or process any actual images or tables, just keep the text that refers to them.

The final output must be in JSON format conforming to the provided schema. Ensure the reference list is correctly identified and formatted as an array of strings.

Here is the raw text:
---
${text}
---
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: paperSchema,
      },
    });

    const jsonString = response.text;
    const data = JSON.parse(jsonString);
    // Ensure abstract is also wrapped in a <p> tag if it isn't already, for consistency.
    if (data.abstract && !data.abstract.trim().startsWith('<p>')) {
        data.abstract = `<p>${data.abstract}</p>`;
    }
    return data as PaperData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    let detailedErrorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
        detailedErrorMessage = error.message;
    }
    // Provide a more descriptive error to the user.
    throw new Error(`Failed to process the paper with AI. This might be due to an invalid API key, network issues (like CORS), or a billing problem. Original error: ${detailedErrorMessage}`);
  }
};