/**
 * @file ollama.provider.js
 * @description Adaptador para Ollama local (qwen2.5-coder:7b u otro modelo Open Source).
 * Permite ejecutar consultas de Lenguaje Natural de forma 100% offline.
 */

const SYSTEM_PROMPT = `
Eres un analista experto en MongoDB y en los viajes amarillos de NYC Taxi & Limousine Commission.
Traduce la pregunta a un Aggregation Pipeline de solo lectura para 'yellow_trips'.

ESQUEMA:
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
  "total_amount": 11.3
}

REGLAS:
1. Responde únicamente un arreglo JSON crudo de etapas de agregación.
2. Solo utiliza $match, $group, $sort, $limit, $project y $addFields.
3. Usa únicamente campos del esquema mostrado.
4. Incluye $limit (máximo 100) en rankings y resultados.
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
