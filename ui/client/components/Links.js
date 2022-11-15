/* eslint-disable sort-imports */
import React from 'react';
import Link from '@material-ui/core/Link';
import { Link as RouteLink } from 'react-router-dom';

/**
 * These helper Link components encapsulates all WebApp Link types.
 * Formats, adds logic, to each type.
 * Types available:
 * - Internal Link that points to a route within the app
 * - Internal Link that points to a route within app, which should be opened in a new tab
 * - External Link that should be both opened in a new tab and added additional security measures
 * */

/*
  See
  https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/noopener
  https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/noreferrer
  */
export const ExternalLink = ({ children, ...props }) => (
  <Link
    target="_blank"
    rel="noopener noreferrer"
    {...props}
  >
    {children}
  </Link>
);

export const InternalLink = ({ children, ...props }) => (
  <Link
    component={RouteLink}
    {...props}
  >
    {children}
  </Link>
);

export const InternalTab = ({ children, ...props }) => (
  <Link
    target="_blank"
    {...props}
  >
    {children}
  </Link>
);
