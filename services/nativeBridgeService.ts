/**
 * NEXA Android Native Java Bridge Service
 * Connects React UI (3D Brain Orb, Voice, Diagnostics) to Native Android Java APIs
 * without changing 1% of the UI design!
 */

declare global {
  interface Window {
    AndroidNexa?: {
      startScreenShare?: () => void;
      stopScreenShare?: () => void;
      triggerHaptic?: (durationMs: number) => void;
      getBatteryLevel?: () => number;
      toggleFlashlight?: (turnOn: boolean) => boolean;
      showNativeToast?: (message: string) => void;
    };
    AndroidScreenShare?: {
      startScreenShare?: () => void;
      stopScreenShare?: () => void;
    };
  }
}

/** Check if running inside actual Android APK environment */
export const isRunningInNativeAndroidApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.AndroidNexa);
};

/** Trigger hardware vibration (Haptic) during NEXA thinking or speaking */
export const triggerNativeHaptic = (durationMs: number = 40): void => {
  try {
    if (window.AndroidNexa?.triggerHaptic) {
      window.AndroidNexa.triggerHaptic(durationMs);
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(durationMs);
    }
  } catch (err) {
    // Fail-safe silent catch
  }
};

/** Get real hardware battery percentage via Android BatteryManager */
export const getNativeBatteryLevel = (): number | null => {
  try {
    if (window.AndroidNexa?.getBatteryLevel) {
      const level = window.AndroidNexa.getBatteryLevel();
      if (typeof level === 'number' && level >= 0) return level;
    }
  } catch (err) {
    // Ignore error
  }
  return null;
};

/** Toggle device camera flashlight */
export const toggleDeviceFlashlight = (turnOn: boolean): boolean => {
  try {
    if (window.AndroidNexa?.toggleFlashlight) {
      return window.AndroidNexa.toggleFlashlight(turnOn);
    }
  } catch (err) {
    // Ignore error
  }
  return false;
};

/** Show native Android Toast notification */
export const showAndroidToast = (message: string): void => {
  try {
    if (window.AndroidNexa?.showNativeToast) {
      window.AndroidNexa.showNativeToast(message);
    }
  } catch (err) {
    // Ignore error
  }
};

/** Start native screen capture for Gemini Live */
export const startNativeScreenShare = (): void => {
  if (window.AndroidNexa?.startScreenShare) {
    window.AndroidNexa.startScreenShare();
  } else if (window.AndroidScreenShare?.startScreenShare) {
    window.AndroidScreenShare.startScreenShare();
  }
};

/** Stop native screen capture */
export const stopNativeScreenShare = (): void => {
  if (window.AndroidNexa?.stopScreenShare) {
    window.AndroidNexa.stopScreenShare();
  } else if (window.AndroidScreenShare?.stopScreenShare) {
    window.AndroidScreenShare.stopScreenShare();
  }
};
