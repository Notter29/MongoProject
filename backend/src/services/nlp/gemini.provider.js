/**
 * @file gemini.provider.js
 * @description Adaptador para la API REST de Google Gemini (gemini-2.5-flash / gemini-1.5-flash).
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
2. NUNCA agregues explicaciones, bloques de markdown con comillas triples (\`\`\`json), ni texto introductorio. Solo el arreglo JSON crudo.
3. Si la pregunta se refiere a "ventas" o "compras", filtra por { "event_type": "purchase" }.
4. Solo usa etapas seguras de lectura: $match, $group, $sort, $limit, $project, $addFields.
5. Incluye siempre un $limit razonable (ej. 10 a 25) si se piden rankings o tops.
6. En fechas, usa formato ISO (ej. { "$gte": "2019-10-01T00:00:00.000Z" }).
`;

class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Genera el pipeline utilizando Gemini API REST.
   * @param {string} pregunta
   * @returns {Promise<Array<Object>>}
   */
  async generarPipeline(pregunta) {
    if (!this.apiKey) {
      throw new Error('No se ha configurado GEMINI_API_KEY en el archivo .env.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `Pregunta del usuario: "${pregunta}"` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en API de Gemini (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      throw new Error('La API de Gemini no retornó ninguna respuesta válida.');
    }

    // Limpiar posibles delimitadores y parsear
    let cleanJson = candidate.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const pipeline = JSON.parse(cleanJson);
    return pipeline;
  }
}

module.exports = new GeminiProvider();
