import React from 'react';
import { ThemeProvider } from '@material-ui/core/styles';
import { addDecorator } from "@storybook/react";
import { MemoryRouter } from 'react-router-dom';

import theme from '../client/theme';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

export const decorators = [
  (Story) => (
    <ThemeProvider theme={theme}>
       <MemoryRouter>
         <Story />
       </MemoryRouter>
     </ThemeProvider>
  ),
];
