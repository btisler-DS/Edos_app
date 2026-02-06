import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { colors, radius, spacing, fontSize } from '../styles/theme';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: colors.bgDeep,
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: colors.bgSurface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    boxShadow: `0 4px 24px ${colors.shadowStrong}`,
  },
  logo: {
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  label: {
    display: 'block',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.bgInput,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius.lg,
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    outline: 'none',
    transition: `border-color 0.2s`,
  },
  inputFocused: {
    borderColor: colors.accentPrimary,
  },
  button: {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.accentPrimary,
    color: '#fff',
    border: 'none',
    borderRadius: radius.lg,
    fontSize: fontSize.lg,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s, opacity 0.2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    padding: spacing.md,
    background: colors.errorBg,
    border: `1px solid ${colors.errorBorder}`,
    borderRadius: radius.md,
    color: colors.errorText,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  setupNote: {
    fontSize: fontSize.sm,
    color: colors.infoText,
    background: colors.infoBg,
    border: `1px solid ${colors.infoBorder}`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
};

function Login() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focused, setFocused] = useState(null);

  const {
    authConfigured,
    authLoading,
    authError,
    login,
    setupPassword,
    clearAuthError,
  } = useAppStore();

  const isSetupMode = !authConfigured;
  const showConfirm = isSetupMode && password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isSetupMode
    ? password.length >= 8 && passwordsMatch && !authLoading
    : password.length > 0 && !authLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isSetupMode) {
      await setupPassword(password);
    } else {
      await login(password);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (authError) clearAuthError();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.title}>EDOS</div>
          <div style={styles.subtitle}>
            {isSetupMode ? 'Set Up Remote Access' : 'Sign In'}
          </div>
        </div>

        {isSetupMode && (
          <div style={styles.setupNote}>
            Create a password to enable secure remote access to your inquiries.
          </div>
        )}

        {authError && (
          <div style={styles.error}>
            {authError}
          </div>
        )}

        <form style={styles.form} onSubmit={handleSubmit}>
          <div>
            <label style={styles.label}>
              {isSetupMode ? 'Create Password' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              style={{
                ...styles.input,
                ...(focused === 'password' ? styles.inputFocused : {}),
              }}
              placeholder={isSetupMode ? 'Minimum 8 characters' : 'Enter password'}
              autoFocus
              disabled={authLoading}
            />
          </div>

          {showConfirm && (
            <div>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                style={{
                  ...styles.input,
                  ...(focused === 'confirm' ? styles.inputFocused : {}),
                  ...(confirmPassword && !passwordsMatch ? { borderColor: colors.errorTextStrong } : {}),
                }}
                placeholder="Re-enter password"
                disabled={authLoading}
              />
              {confirmPassword && !passwordsMatch && (
                <div style={{ ...styles.hint, color: colors.errorText, marginTop: spacing.xs }}>
                  Passwords do not match
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(canSubmit ? {} : styles.buttonDisabled),
            }}
            disabled={!canSubmit}
            onMouseOver={(e) => canSubmit && (e.target.style.background = colors.accentPrimaryHover)}
            onMouseOut={(e) => canSubmit && (e.target.style.background = colors.accentPrimary)}
          >
            {authLoading
              ? 'Please wait...'
              : isSetupMode
                ? 'Set Password & Continue'
                : 'Sign In'
            }
          </button>
        </form>

        {!isSetupMode && (
          <div style={styles.hint}>
            Enter your EDOS password to continue
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
