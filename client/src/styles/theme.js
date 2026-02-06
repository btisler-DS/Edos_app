/**
 * EDOS Theme System
 *
 * Centralized color tokens and styling utilities.
 * All colors are defined here as CSS custom property names and values.
 */

// Color palette - the raw values
export const colors = {
  // Backgrounds (darkest to lightest)
  bgDeep: '#0d0d1a',
  bgBase: '#12122a',
  bgSurface: '#16162a',
  bgElevated: '#1a1a3a',
  bgInput: '#1e1e3a',
  bgHover: '#2a2a4a',
  bgSelected: '#2a2a5a',

  // Borders
  borderSubtle: '#1a1a3a',
  borderDefault: '#2a2a4a',
  borderStrong: '#3a3a5a',

  // Text
  textPrimary: '#eeeeee',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  textFaint: '#666666',

  // Accent - Indigo
  accentPrimary: '#4f46e5',
  accentPrimaryHover: '#4338ca',
  accentPrimaryMuted: 'rgba(79, 70, 229, 0.1)',
  accentPrimaryBorder: 'rgba(79, 70, 229, 0.3)',
  accentLight: '#a5b4fc',

  // Semantic - Success
  successBg: '#1a2a1a',
  successBorder: '#2a4a2a',
  successText: '#86efac',
  successSolid: '#059669',
  successSolidHover: '#047857',

  // Semantic - Error
  errorBg: '#2a1a1a',
  errorBorder: '#4a2a2a',
  errorText: '#fca5a5',
  errorTextStrong: '#f87171',
  errorSolid: '#ff4757',

  // Semantic - Warning
  warningBg: '#2a2a1a',
  warningBorder: '#4a4a2a',
  warningText: '#fcd34d',

  // Semantic - Info
  infoBg: '#1a2a3a',
  infoBorder: '#2a3a4a',
  infoText: '#7dd3fc',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
};

// Spacing scale
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
};

// Font sizes
export const fontSize = {
  xs: '11px',
  sm: '12px',
  md: '13px',
  base: '14px',
  lg: '15px',
  xl: '18px',
};

// Border radius
export const radius = {
  sm: '3px',
  md: '4px',
  lg: '6px',
  xl: '8px',
  xxl: '12px',
};

// Transitions
export const transitions = {
  fast: '0.15s',
  normal: '0.2s',
  slow: '0.3s',
};

// Z-index scale
export const zIndex = {
  base: 1,
  dropdown: 100,
  overlay: 150,
  modal: 200,
  tooltip: 1000,
};

// Breakpoints
export const breakpoints = {
  mobile: 768,
};

// Common style patterns (reusable style objects)
export const patterns = {
  // Buttons
  buttonPrimary: {
    background: colors.accentPrimary,
    color: '#fff',
    border: 'none',
    borderRadius: radius.lg,
    cursor: 'pointer',
    fontWeight: 500,
    transition: `background ${transitions.normal}`,
  },

  buttonSecondary: {
    background: 'transparent',
    color: colors.textMuted,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius.lg,
    cursor: 'pointer',
    transition: `all ${transitions.normal}`,
  },

  buttonGhost: {
    background: 'transparent',
    border: 'none',
    color: colors.textFaint,
    cursor: 'pointer',
    transition: `color ${transitions.fast}`,
  },

  // Inputs
  input: {
    background: colors.bgInput,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius.xl,
    color: colors.textPrimary,
    outline: 'none',
  },

  inputFocused: {
    borderColor: colors.accentPrimary,
  },

  // Cards/Panels
  panel: {
    background: colors.bgBase,
    borderRight: `1px solid ${colors.borderDefault}`,
  },

  card: {
    background: colors.bgInput,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius.xl,
    boxShadow: `0 4px 20px ${colors.shadow}`,
  },

  // List items
  listItem: {
    borderBottom: `1px solid ${colors.borderSubtle}`,
    transition: `background ${transitions.fast}`,
    cursor: 'pointer',
  },

  listItemActive: {
    background: colors.bgHover,
  },

  // Text styles
  textLabel: {
    fontSize: fontSize.xs,
    fontWeight: 600,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  textTitle: {
    fontSize: fontSize.base,
    fontWeight: 500,
    color: colors.textPrimary,
  },

  textMeta: {
    fontSize: fontSize.sm,
    color: colors.textFaint,
  },
};

// CSS custom properties string for injection
export const cssVariables = `
:root {
  /* Backgrounds */
  --bg-deep: ${colors.bgDeep};
  --bg-base: ${colors.bgBase};
  --bg-surface: ${colors.bgSurface};
  --bg-elevated: ${colors.bgElevated};
  --bg-input: ${colors.bgInput};
  --bg-hover: ${colors.bgHover};
  --bg-selected: ${colors.bgSelected};

  /* Borders */
  --border-subtle: ${colors.borderSubtle};
  --border-default: ${colors.borderDefault};
  --border-strong: ${colors.borderStrong};

  /* Text */
  --text-primary: ${colors.textPrimary};
  --text-secondary: ${colors.textSecondary};
  --text-muted: ${colors.textMuted};
  --text-faint: ${colors.textFaint};

  /* Accent */
  --accent-primary: ${colors.accentPrimary};
  --accent-primary-hover: ${colors.accentPrimaryHover};
  --accent-light: ${colors.accentLight};

  /* Semantic */
  --success-bg: ${colors.successBg};
  --success-border: ${colors.successBorder};
  --success-text: ${colors.successText};
  --success-solid: ${colors.successSolid};

  --error-bg: ${colors.errorBg};
  --error-border: ${colors.errorBorder};
  --error-text: ${colors.errorText};
  --error-solid: ${colors.errorSolid};

  --info-bg: ${colors.infoBg};
  --info-border: ${colors.infoBorder};
  --info-text: ${colors.infoText};

  /* Spacing */
  --space-xs: ${spacing.xs};
  --space-sm: ${spacing.sm};
  --space-md: ${spacing.md};
  --space-lg: ${spacing.lg};
  --space-xl: ${spacing.xl};

  /* Radius */
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};

  /* Transitions */
  --transition-fast: ${transitions.fast};
  --transition-normal: ${transitions.normal};
}
`;

// Utility to apply hover styles (for onMouseOver/onMouseOut handlers)
export const hoverHandlers = {
  primaryButton: {
    onMouseOver: (e) => { e.target.style.background = colors.accentPrimaryHover; },
    onMouseOut: (e) => { e.target.style.background = colors.accentPrimary; },
  },
  secondaryButton: {
    onMouseOver: (e) => {
      e.target.style.borderColor = colors.accentPrimary;
      e.target.style.color = colors.textSecondary;
    },
    onMouseOut: (e) => {
      e.target.style.borderColor = colors.borderStrong;
      e.target.style.color = colors.textMuted;
    },
  },
  ghostButton: {
    onMouseOver: (e) => { e.target.style.color = colors.textSecondary; },
    onMouseOut: (e) => { e.target.style.color = colors.textFaint; },
  },
  dangerButton: {
    onMouseOver: (e) => {
      e.target.style.color = colors.errorTextStrong;
      e.target.style.background = colors.bgHover;
    },
    onMouseOut: (e) => {
      e.target.style.color = colors.textFaint;
      e.target.style.background = 'transparent';
    },
  },
};

export default {
  colors,
  spacing,
  fontSize,
  radius,
  transitions,
  zIndex,
  breakpoints,
  patterns,
  cssVariables,
  hoverHandlers,
};
