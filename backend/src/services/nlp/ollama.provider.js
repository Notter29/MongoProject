/**
 * @file ollama.provider.js
 * @description Adaptador para Ollama local (qwen2.5-coder:7b u otro modelo Open Source).
 * Permite ejecutar consultas de Lenguaje Natural de forma 100% offline.
 */

const SYSTEM_PROMPT = `
Eres un DBA experto en MongoDB y analista de grandes volúmenes de datos.
Tu tarea es traducir preguntas en lenguaje natural sobre una base de datos de comercio electrónico (+20 GB) a un Aggregation Pipeline nativo de MongoDB para la colección 'eventos'.

ESQUEMA DEL DOCUMENTO EN 'eventos':
{
  "_id": ObjectId("..."),
  "event_time": ISODate("2019-11-17T14:22:10.000Z"),
  "event_type": "purchase" | "view" | "cart" | "remove_from_cart",
  "product_id": NumberLong(1005115),
  "category_id": NumberLong(2053013555631882655),
  "category_code": "electronics.smartphone",
  "brand": "apple",
  "price": 999.00,
  "user_id": NumberLong(549109608),
  "user_session": "8b7d42e1-93c0-4a12-b84f-1029384756ab"
}

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un arreglo JSON de etapas de agregación (por ejemplo: [ { "$match": ... }, { "$group": ... }, { "$sort": ... }, { "$limit": ... } ]).
2. NUNCA agregues explicaciones, bloques de markdown con comillas triples (\`\`\`json), ni texto conversacional. Solo el arreglo JSON crudo.
3. Si la pregunta se refiere a "ventas" o "compras", filtra por { "event_type": "purchase" }.
4. Solo usa etapas seguras de lectura: $match, $group, $sort, $limit, $project, $addFields.
5. Incluye siempre un $limit razonable (ej. 10 a 25) si se piden rankings o tops.
`;

class OllamaProvider {
  constructor() {
    this.url = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
    this.model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
  }

  /**
   * Genera el pipeline utilizando Ollama local.
   * @param {string} pregunta
   * @returns {Promise<Array<Object>>}
   */
  async generarPipeline(pregunta) {
    const prompt = `${SYSTEM_PROMPT}\nPregunta del usuario: "${pregunta}"\nResponde solo con el JSON Array:`;

    const requestBody = {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1,
        num_predict: 1024
      }
    };

    let response;
    try {
      response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    } catch (err) {
      throw new Error(`No se pudo conectar al servicio local de Ollama en ${this.url}. Asegúrate de que Ollama esté ejecutándose ('ollama serve'). Detalle: ${err.message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en Ollama (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawResponse = data.response;

    if (!rawResponse) {
      throw new Error('Ollama no generó ninguna respuesta.');
    }

    let cleanJson = rawResponse.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    // A veces los modelos locales envuelven el array en { "pipeline": [...] }
    let parsed = JSON.parse(cleanJson);
    if (!Array.isArray(parsed) && parsed.pipeline && Array.isArray(parsed.pipeline)) {
      parsed = parsed.pipeline;
    }

    return parsed;
  }
}

module.exports = new OllamaProvider();
