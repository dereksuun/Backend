import OpenAI from "openai";
import { env } from "../../env.js";

export class NvidiaAiProvider {
  private readonly client: OpenAI | null;

  constructor() {
    this.client = env.NVIDIA_API_KEY
      ? new OpenAI({
          apiKey: env.NVIDIA_API_KEY,
          baseURL: env.NVIDIA_BASE_URL
        })
      : null;
  }

  get available() {
    return Boolean(this.client);
  }

  async completeJson(prompt: string, model = env.NVIDIA_MAIN_MODEL) {
    if (!this.client) {
      throw new Error("nvidia_ai_not_configured");
    }

    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "Voce e uma camada de inteligencia financeira educativa. Responda somente JSON valido, sem markdown, sem recomendacao direta de compra ou venda e sem inventar numeros."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    });

    return completion.choices[0]?.message?.content ?? "";
  }
}
