import React from 'react';

import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';

import isEmpty from 'lodash/isEmpty';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  BarController,
  BarElement,
  // registerables // Use this if we want to register everything instead
} from 'chart.js';

// Only selects used modules so that library/webpack tree-shakes properly
ChartJS.register(
  BarElement,
  CategoryScale,
  BarController,
  LinearScale,
  Title,
  Tooltip,
);

function formatStatNumber(value, sigFigures) {
  try {
    if (value === null) {
      return value;
    }

    const parsed = Number(value);

    if (isNaN(parsed)) {
      return value;
    }

    return Number.isInteger(parsed) ? parsed : parsed.toFixed(sigFigures);
  } catch(e) {
    console.error('Error formatting stat number, e:', e);
    return '-';
  }
}

function loadConfig(labels, datasets) {

  return {
    data: {
      labels, // All labels per each tick
      datasets: [{
        label: datasets.label, // Count or lone label when opening tooltip
        data: datasets.data, // array data itself
        showLine: true,
        minBarLength: 4,
        barPercentage: 1,
        backgroundColor: '#66BB6A',
        borderRadius: 1,
      }]
    },

    options:
    {
      // Nearest/x/intersect Important to easily hover any bar/bin with low values
      interaction: {
        intersect: false,
        mode: "nearest",
        axis: 'x',
      },

      plugins: {
        tooltip: {
          callbacks: {
            title: (datasets) => {
              const dataset = datasets[0];
              const currentIdx = dataset.dataIndex;
              const currentLabel = dataset.label;
              const nextLabel = labels[currentIdx + 1];

              return `${currentLabel} to ${nextLabel}`;
            }
          }
        },
        legend: {
          display: false,
        },
      },

      aspectRatio: 1.5,
      responsive: true,

      scales: {
        y: {
          beginAtZero: true,
          grid: {
            drawBorder: false,
            display: true,
            drawOnChartArea: true,
            // grid color:
            color: "lightgray",
          },
          ticks: {
            suggestedMin: 0,
            suggestedMax: 500,

            beginAtZero: true,
            padding: 6, // padding between tick and graph border line

            font: {
              size: 12,
              weight: 400,
              lineHeight: 2,
            },
          },
        },
        // Display x ticks without labels:
        x: {
          offset: true, // Offset to display bar chart fully at origin
          max: datasets.data.length - 1, // max index; from 10 data, max index should be 9
          // Yes Ticks:
          grid: {
            display: true,
            drawBorder: false,
            drawOnChartArea: false,
          }, // No label:
          ticks: {
            display: false,
            autoSkip: false
          },
        },
        // Display X labels without ticks
        xAxis2: {
          offset: false, // No offset to start gray histogram ticks at origin
          // No ticks:
          grid: {
            display: false,
            drawBorder: false,
            drawOnChartArea: false,
          },
          // Yes Label:
          ticks: {
            callback: function(val, index) {
              const label = this.getLabelForValue(val);
              return formatStatNumber(label, 2);
            },
            display: true,
            font: {
              size: 11,
              weight: 400,
              style: "normal",
            },
          }
        }
      }
    }
  };
}

/**
 *
 * */
export default React.memo(withStyles((theme) => ({
  cardContent: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(0.5)
    }
  },
  chartContainer: {
    background: theme.palette.common.white,
    padding: '1rem',
  },
  cardTextValue: {
    fontWeight: '100',
    [theme.breakpoints.down('xs')]: {
      fontSize: '0.7rem'
    }
  },
  colorHint: {
    color: theme.palette.secondary.main
  }
}))(({ classes, statistics={}, histogramData, ...props }) => {

  const { data=[], labels=[] } = histogramData;
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef();
  const hasData = !isEmpty(data) && !isEmpty(labels);

  const statKeys = Object.keys(statistics);

  const renderChart = () => {
    if (!canvasRef.current || !hasData) { return; }

    const ctx = canvasRef.current;
    const config = loadConfig(labels, {data, label: 'Count'});

    chartRef.current= new ChartJS(ctx, {
      type: 'bar',
      data: config.data,
      options: config.options,
    });

  };

  const destroyChart = () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
  };

  React.useEffect(() => {
    renderChart();
    return destroyChart;
  }, []);

  return (
    <div>

      <Paper
        elevation={1}
        className={classes.chartContainer}
        style={{display: hasData ? 'block' : 'none'}}
      >
        <canvas
          ref={canvasRef}
          role='img'
          {...props}
        >
          {'Loading...'}
        </canvas>
      </Paper>

      <br />

      {!statKeys.length && (
        <>
          <Typography paragraph variant="h6">
            No statistics available for this column
          </Typography>
          <Typography variant="caption">
            This may be a multi-part annotated column, which contains + in its name. Multi-part columns
            don't show any statistics yet. You may <span className={classes.colorHint}>clear</span> the annotation in order to view individual column statistics.
          </Typography>
        </>
      )}

      <Grid
        container
        spacing={2}
      >
        {statKeys
         .map(statName => (
           <Grid
             item
             xs={6}
             key={`${statName}-${statistics[statName]}`}
           >
             <Card>
               <CardContent className={classes.cardContent}>
                 <Typography
                   gutterBottom
                   color="textSecondary"
                 >
                   {statName}
                 </Typography>

                 <Typography
                   className={classes.cardTextValue}
                   variant="h5"
                   component="h5"
                 >
                   {formatStatNumber(statistics[statName], 4)}
                 </Typography>

               </CardContent>
             </Card>
           </Grid>
         ))}

      </Grid>

    </div>
  );
}));

