/**
 * @file gemini.provider.js
 * @description Adaptador para la API REST de Google Gemini (gemini-2.5-flash / gemini-1.5-flash).
 */

const SYSTEM_PROMPT = `
Eres un analista experto en MongoDB y en los viajes amarillos de NYC Taxi & Limousine Commission.
Traduce la pregunta a un Aggregation Pipeline de solo lectura para la colección 'yellow_trips'.

ESQUEMA DEL DOCUMENTO:
{
  "pickup_datetime": ISODate("2019-01-01T00:46:40Z"),
  "dropoff_datetime": ISODate("2019-01-01T00:53:20Z"),
  "passenger_count": 1,
  "trip_distance": 1.6,
  "pickup_location_id": 141,
  "dropoff_location_id": 237,
  "payment_type": 1,
  "fare_amount": 7.0,
  "tip_amount": 1.0,
  "total_amount": 11.3,
  "source_file": "yellow_tripdata_2019-01.parquet"
}

REGLAS:
1. Responde únicamente un arreglo JSON crudo de etapas de agregación.
2. Solo utiliza $match, $group, $sort, $limit, $project y $addFields.
3. Usa únicamente campos del esquema mostrado; no inventes colecciones ni datos.
4. Incluye $limit (máximo 100) en rankings y resultados.
5. Las fechas deben expresarse en formato ISO.
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
