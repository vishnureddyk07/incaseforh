/**
 * Generates a unique, deterministic device ID from device characteristics
 * This ID is used as evidence to identify the specific device that triggered the SOS
 */

export function generateUniqueDeviceId(): string {
  // Collect device characteristics
  const deviceInfo = {
    // User Agent - identifies browser and OS
    userAgent: navigator.userAgent,
    
    // Screen dimensions - unique for most devices
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenColorDepth: window.screen.colorDepth,
    screenPixelDepth: window.screen.pixelDepth,
    
    // Device memory if available (Chrome only)
    deviceMemory: (navigator as any).deviceMemory || 'unknown',
    
    // Hardware concurrency
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    
    // Language
    language: navigator.language,
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    // Platform
    platform: navigator.platform,
    
    // Vendor
    vendor: navigator.vendor,
  };

  // Create a fingerprint string
  const fingerprint = Object.entries(deviceInfo)
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

  // Generate a hash-like ID from the fingerprint
  // Using a simple but deterministic hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Make it readable: convert to base36 and take first 12 characters
  // Add a prefix to make it identifiable as a device ID
  const hashStr = Math.abs(hash).toString(36).toUpperCase();
  const deviceId = `DEVICE_${hashStr.slice(0, 12).padEnd(12, '0')}`;

  return deviceId;
}

/**
 * Store and retrieve device ID from localStorage
 * Ensures same device always has same ID
 */
export function getOrCreateDeviceId(): string {
  const DEVICE_ID_KEY = 'incase_device_id_v1';
  
  // Check if we already have a device ID stored
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate new device ID
    deviceId = generateUniqueDeviceId();
    try {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch (e) {
      console.warn('Could not store device ID in localStorage:', e);
      // Still return the generated ID even if storage failed
    }
  }
  
  return deviceId;
}

/**
 * Format device ID for display in UI (shorter version)
 */
export function formatDeviceIdForDisplay(deviceId: string): string {
  // Show last 8 characters plus prefix
  return deviceId.slice(0, 7) + '...' + deviceId.slice(-4);
}
