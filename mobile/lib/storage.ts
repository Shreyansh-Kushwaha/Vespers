import * as SecureStore from "expo-secure-store";

/**
 * Recovery-code persistence. On native, this lives in the OS keychain via
 * expo-secure-store, which is materially better than the web's localStorage:
 * the code is encrypted at rest and not readable by other apps.
 *
 * On web (Expo for web), SecureStore falls back to localStorage automatically.
 */
const CODE_KEY = "vespers.recovery_code";

export async function loadRecoveryCode(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CODE_KEY);
  } catch {
    return null;
  }
}

export async function saveRecoveryCode(code: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CODE_KEY, code);
  } catch {
    // best-effort; the user can paste the code back next time
  }
}

export async function clearRecoveryCode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CODE_KEY);
  } catch {
    // ignore
  }
}
