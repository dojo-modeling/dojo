import { createTheme } from '@material-ui/core/styles';

export default createTheme({
  palette: {
    // type: 'dark',
    primary: {
      main: '#1976d2',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
    },
    warning: {
      contrastText: '#fff',
      dark: '#e65100',
      light: '#ff9800',
      main: '#ed6c02',
    },
    background: {
      default: '#fff'
    },
  },
  body: {
    backgroundColor: '#fff'
  },
  overrides: {
    MuiTableCell: {
      root: {
        padding: 0
      }
    }
  }
});
