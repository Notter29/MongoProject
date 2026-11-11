/**
 * @file charts.js
 * @description Funciones de inicialización y actualización de gráficos interactivos con Chart.js.
 */

let chartVentas = null;
let chartTopZonas = null;
let chartRutas = null;
let chartIngresosDistritos = null;
let chartPropinas = null;
let chartDistancias = null;

const chartColors = {
  cyan: '#171717',
  blue: '#46515d',
  purple: '#8a929a',
  green: '#262626',
  amber: '#e3ad00',
  rose: '#f43f5e',
  grid: '#e3e5e8',
  text: '#5f6368'
};
const chartPalette = [
  '#171717', '#e3ad00', '#46515d', '#8a929a', '#b7bdc3',
  '#6f7881', '#d3a400', '#303840', '#9da3a9', '#555d65',
  '#d8dadd', '#818991'
];

// Configuración común de Chart.js
Chart.defaults.color = chartColors.text;
Chart.defaults.borderColor = chartColors.grid;
Chart.defaults.font.family = "'Inter', sans-serif";

function renderChartVentas(ctx, labels, dataIngresos, dataViajes) {
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
          backgroundColor: 'rgba(23, 23, 23, 0.08)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Viajes',
          data: dataViajes,
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

function renderChartTopZonas(ctx, labels, dataViajes) {
  if (chartTopZonas) chartTopZonas.destroy();

  chartTopZonas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Viajes',
          data: dataViajes,
          backgroundColor: 'rgba(70, 81, 93, 0.78)',
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

function renderChartRutas(ctx, labels, dataViajes) {
  if (chartRutas) chartRutas.destroy();

  chartRutas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Viajes',
          data: dataViajes,
          backgroundColor: chartPalette.slice(0, 10),
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
        y: { beginAtZero: true }
      }
    }
  });
}

function renderChartIngresosDistritos(ctx, labels, dataIngresos) {
  if (chartIngresosDistritos) chartIngresosDistritos.destroy();

  chartIngresosDistritos = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: dataIngresos,
          backgroundColor: chartPalette,
          borderWidth: 2,
          borderColor: '#181818'
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

function renderChartPropinas(ctx, labels, dataPorcentajes) {
  if (chartPropinas) chartPropinas.destroy();

  chartPropinas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Propina como % de tarifa',
          data: dataPorcentajes,
          backgroundColor: 'rgba(227, 173, 0, 0.78)',
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

function renderChartDistancias(ctx, labels, dataViajes) {
  if (chartDistancias) chartDistancias.destroy();
  chartDistancias = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Viajes',
        data: dataViajes,
        backgroundColor: 'rgba(70, 81, 93, 0.78)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}
