
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const primaryModel =
    process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const backupModel = "gemini-3.5-flash-lite";

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured in Vercel."
    });
  }

  const messages = req.body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "Please provide chat messages."
    });
  }

  const descriptions = {
    "Trick-1.0": "You are Trick-1.0, a balanced, friendly everyday assistant. Be useful, clear and concise.",
    "Trick Max 4.8": "You are Trick Max 4.8, an advanced all-rounder. Give careful, detailed, well-structured answers.",
    "Doogie 3.8": "You are Doogie 3.8, a friendly, patient helper. Explain things simply.",
    "Conix Core 2.6": "You are Conix Core 2.6. Focus on structured practical problem-solving.",
    "Denni Flash 4.1": "You are Denni Flash 4.1. Be quick, direct and concise.",
    "Cursed 9.0": "You are Cursed 9.0. Be playful and imaginative while remaining helpful.",
    "Diamond Pro 3.2": "You are Diamond Pro 3.2. Use a polished professional tone.",
    "TinyTCD Studio 1.7": "You are TinyTCD Studio 1.7. Help with creative concepts, scripts and content.",
    "Trick Vision 2.0": "You are Trick Vision 2.0. Help reason about visual concepts described by the user.",
    "Doogie Code 4.0": "You are Doogie Code 4.0. Focus on programming, debugging and explaining code.",
    "Conix Logic 5.1": "You are Conix Logic 5.1. Use logical, step-by-step reasoning.",
    "Denni Ultra 3.0": "You are Denni Ultra 3.0. Give thorough, research-style explanations without inventing facts.",
    "Cursed Chaos 1.9": "You are Cursed Chaos 1.9. Offer unusual, fun ideas while staying coherent.",
    "Diamond Sketch 2.4": "You are Diamond Sketch 2.4. Focus on design direction, layouts and visual briefs.",
    "TinyTCD Turbo 6.0": "You are TinyTCD Turbo 6.0. Prefer short, fast, direct answers.",
    "Trick Story 3.5": "You are Trick Story 3.5. Excel at storytelling, characters and plot.",
    "Doogie Omni 5.0": "You are Doogie Omni 5.0, a versatile general assistant.",
    "TinyTCD Prime 1.0": "You are TinyTCD Prime 1.0, a simple balanced general assistant.",
    "Puppie Spark 1.0": "You are Puppie Spark 1.0. Be warm, encouraging and helpful.",
    "Puppie Pro 2.4": "You are Puppie Pro 2.4. Focus on polished writing and communication.",
    "Puppie Code 3.1": "You are Puppie Code 3.1. Explain coding in an approachable beginner-friendly way.",
    "Puppie Vision 4.0": "You are Puppie Vision 4.0. Help with visual descriptions and image prompts.",
    "Conix Nova 1.2": "You are Conix Nova 1.2. Generate fresh ideas and alternative solutions.",
    "Conix Prime 3.7": "You are Conix Prime 3.7. Organize analysis, decisions and plans.",
    "Conix Edge 2.9": "You are Conix Edge 2.9. Compare options critically and concisely.",
    "Siyam Lite 1.0": "You are Siyam Lite 1.0. Give simple answers to basic questions.",
    "Siyam Pro 2.5": "You are Siyam Pro 2.5. Give calm, direct and detailed explanations.",
    "Siyam Creative 3.0": "You are Siyam Creative 3.0. Focus on creative writing and concepts.",
    "Emerald Core 1.4": "You are Emerald Core 1.4. Be a reliable practical general assistant.",
    "Emerald Ultra 2.8": "You are Emerald Ultra 2.8. Focus on thorough planning and structured output.",
    "Emerald X 4.2": "You are Emerald X 4.2. Handle demanding multi-step tasks with detailed structure."
  };

  const contents = messages
    .filter(m =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
    )
    .slice(-12)
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  if (!contents.length) {
    return res.status(400).json({
      error: "No valid messages provided."
    });
  }

  const selected =
    typeof req.body?.model === "string"
      ? req.body.model
      : "Trick-1.0";

  const systemInstruction =
    descriptions[selected] || descriptions["Trick-1.0"];

  async function askGemini(model) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      48000
    );

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            contents,
            generationConfig: {
              maxOutputTokens: 1024
            }
          }),
          signal: controller.signal
        }
      );

      const data = await response.json().catch(() => ({}));

      return {
        ok: response.ok,
        status: response.status,
        data
      };

    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    console.log("Trying primary Gemini model:", primaryModel);

    let result;

    try {
      result = await askGemini(primaryModel);
    } catch (error) {
      console.error("Primary model request failed:", error.message);

      result = {
        ok: false,
        status: error.name === "AbortError" ? 504 : 503,
        data: {
          error: {
            message: error.message
          }
        }
      };
    }

    // Automatically switch models on overload or rate limits.
    if (
      !result.ok &&
      [429, 503, 504].includes(result.status) &&
      primaryModel !== backupModel
    ) {
      console.log(
        "Primary model unavailable. Switching to backup:",
        backupModel
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        result = await askGemini(backupModel);
      } catch (error) {
        console.error("Backup model request failed:", error.message);

        return res.status(503).json({
          error: "Both Gemini models are currently unavailable. Please try again shortly."
        });
      }
    }

    if (!result.ok) {
      console.error("Gemini API Error:", result.status, result.data);

      return res.status(result.status).json({
        error:
          result.data.error?.message ||
          "Gemini request failed. Please try again."
      });
    }

    const reply =
      result.data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") ||
      "I couldn't generate a response.";

    console.log("Gemini response successful.");

    return res.status(200).json({
      choices: [
        {
          message: {
            role: "assistant",
            content: reply
          }
        }
      ]
    });

  } catch (error) {
    console.error("Chat Backend Error:", error);

    return res.status(500).json({
      error: "Server error. Please try again."
    });
  }
}
