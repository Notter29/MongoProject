/**
 * @file charts.js
 * @description Funciones de inicialización y actualización de gráficos interactivos con Chart.js.
 */

let chartVentas = null;
let chartTopProductos = null;
let chartMarcas = null;
let chartCategorias = null;
let chartDisminucion = null;

const chartColors = {
  cyan: '#06b6d4',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  grid: '#374151',
  text: '#9ca3af'
};

// Configuración común de Chart.js
Chart.defaults.color = chartColors.text;
Chart.defaults.borderColor = chartColors.grid;
Chart.defaults.font.family = "'Inter', sans-serif";

function renderChartVentas(ctx, labels, dataIngresos, dataCompras) {
  if (chartVentas) chartVentas.destroy();

  chartVentas = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos Diarios ($ USD)',
          data: dataIngresos,
          borderColor: chartColors.cyan,
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Cantidad de Compras',
          data: dataCompras,
          borderColor: chartColors.purple,
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          ticks: {
            callback: (val) => '$' + Number(val).toLocaleString()
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function renderChartTopProductos(ctx, labels, dataUnidades, dataIngresos) {
  if (chartTopProductos) chartTopProductos.destroy();

  chartTopProductos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Unidades Vendidas',
          data: dataUnidades,
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderChartMarcas(ctx, labels, dataIngresos) {
  if (chartMarcas) chartMarcas.destroy();

  chartMarcas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos Totales ($ USD)',
          data: dataIngresos,
          backgroundColor: [
            '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
            '#f59e0b', '#10b981', '#14b8a6', '#6366f1', '#a855f7'
          ],
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => '$' + Number(val).toLocaleString()
          }
        }
      }
    }
  });
}

function renderChartCategorias(ctx, labels, dataIngresos) {
  if (chartCategorias) chartCategorias.destroy();

  chartCategorias = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: dataIngresos,
          backgroundColor: [
            '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
            '#f59e0b', '#10b981', '#14b8a6', '#6366f1', '#a855f7',
            '#64748b', '#78716c'
          ],
          borderWidth: 2,
          borderColor: '#1f2937'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

function renderChartDisminucion(ctx, labels, dataP1, dataP2) {
  if (chartDisminucion) chartDisminucion.destroy();

  chartDisminucion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Periodo 1 (Antes)',
          data: dataP1,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderRadius: 6
        },
        {
          label: 'Periodo 2 (Caída)',
          data: dataP2,
          backgroundColor: 'rgba(244, 63, 94, 0.7)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}
