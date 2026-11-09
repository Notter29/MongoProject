/**
 * @file pipeline.validator.js
 * @description Validador y sanitizador de seguridad para Aggregation Pipelines generados por IA.
 * 
 * REGLA ESTRICTA DE EVALUACIÓN (Ítem 4.5 del PDF):
 * "La consulta generada deberá estar restringida a las operaciones y colecciones autorizadas.
 *  No se permitirá ejecutar código arbitrario generado por la IA ni aceptar operaciones de modificación."
 */

const ETAPAS_PERMITIDAS = new Set([
  '$match',
  '$group',
  '$sort',
  '$limit',
  '$skip',
  '$project',
  '$addFields',
  '$count',
  '$facet',
  '$unwind'
]);

const OPERADORES_BLOQUEADOS = new Set([
  '$out',
  '$merge',
  '$where',
  '$function',
  '$accumulator',
  'drop',
  'delete',
  'update',
  'insert'
]);

/**
 * Valida y sanea un pipeline generado por un modelo de lenguaje.
 * @param {Array<Object>} pipeline
 * @returns {Array<Object>} Pipeline seguro validado
 * @throws {Error} Si contiene etapas no permitidas o riesgos de seguridad
 */
function validarPipelineSeguro(pipeline) {
  if (!Array.isArray(pipeline)) {
    throw new Error('El pipeline generado debe ser un arreglo de etapas JSON.');
  }

  if (pipeline.length === 0) {
    throw new Error('El pipeline no puede estar vacío.');
  }

  if (pipeline.length > 15) {
    throw new Error('El pipeline excede la complejidad máxima permitida (15 etapas).');
  }

  let tieneLimite = false;

  for (let i = 0; i < pipeline.length; i++) {
    const etapa = pipeline[i];

    if (!etapa || typeof etapa !== 'object' || Array.isArray(etapa)) {
      throw new Error(`La etapa #${i + 1} no es un objeto válido.`);
    }

    const keys = Object.keys(etapa);
    if (keys.length === 0) {
      throw new Error(`La etapa #${i + 1} está vacía.`);
    }

    for (const key of keys) {
      // Validar si es una etapa autorizada
      if (!ETAPAS_PERMITIDAS.has(key)) {
        throw new Error(
          `Seguridad: La etapa '${key}' no está autorizada. Solo se permiten operaciones analíticas de solo lectura.`
        );
      }

      if (OPERADORES_BLOQUEADOS.has(key)) {
        throw new Error(`Seguridad: Operación prohibida detectada: '${key}'.`);
      }

      if (key === '$limit') {
        tieneLimite = true;
        const limiteValor = etapa['$limit'];
        if (typeof limiteValor !== 'number' || limiteValor <= 0 || limiteValor > 100) {
          etapa['$limit'] = 50; // Limitar a un tope seguro
        }
      }

      // Inspeccionar sub-operadores recursivamente como texto para prevenir $where o javascript
      const etapaString = JSON.stringify(etapa[key]);
      if (etapaString.includes('$where') || etapaString.includes('$function')) {
        throw new Error('Seguridad: Se prohíbe el uso de $where o funciones Javascript en consultas generadas.');
      }
    }
  }

  // Si el pipeline no tiene un $limit al final, inyectar uno prudente (50 registros)
  if (!tieneLimite) {
    pipeline.push({ $limit: 50 });
  }

  return pipeline;
}

module.exports = {
  validarPipelineSeguro,
  ETAPAS_PERMITIDAS
};
