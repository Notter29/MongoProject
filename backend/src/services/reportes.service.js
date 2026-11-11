const eventosRepository = require('../repositories/eventos.repository');

function limitar(valor, predeterminado, maximo = 100) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? Math.min(numero, maximo) : predeterminado;
}

class ReportesService {
  obtenerEstadisticasSistema() {
    return eventosRepository.obtenerEstadisticasDB();
  }

  obtenerInforme1Viajes(fechaInicio, fechaFin) {
    return eventosRepository.obtenerViajesPorPeriodo(fechaInicio, fechaFin);
  }

  obtenerInforme2Zonas(limite) {
    return eventosRepository.obtenerZonasRecogida(limitar(limite, 10));
  }

  obtenerInforme3Rutas(limite) {
    return eventosRepository.obtenerRutasPopulares(limitar(limite, 10));
  }

  obtenerInforme4Distritos(limite) {
    return eventosRepository.obtenerIngresosPorDistrito(limitar(limite, 10));
  }

  obtenerInforme5Pagos() {
    return eventosRepository.obtenerFormasPago();
  }

  obtenerInforme6Distancias() {
    return eventosRepository.obtenerDistribucionDistancias();
  }

  obtenerInforme7Horarios() {
    return eventosRepository.obtenerDemandaHoraria();
  }

  obtenerInforme8Propinas(limite) {
    return eventosRepository.obtenerPropinasPorZona(limitar(limite, 10));
  }

  obtenerInforme10ViajesRecientes(limite) {
    return eventosRepository.obtenerViajesRecientes(limitar(limite, 25));
  }

  buscarZonas(consulta) {
    return eventosRepository.buscarZonas(consulta);
  }
}

module.exports = new ReportesService();
