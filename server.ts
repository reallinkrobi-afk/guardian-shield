import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { ChildDeviceState, RemoteCommandRequest, AISafetyReport, GeofenceZone, AudioClipItem, DeviceFile, DeviceSummary } from "./src/types.js";
import { DEFAULT_DEVICE_STATE } from "./src/defaultState.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Support high payload limit for base64 images and live audio/video stream chunks
app.use(express.json({ limit: '35mb' }));

// Enable CORS for mobile APK & remote clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Persistence directory and file path
const DATA_DIR = path.join(process.cwd(), "data");
const DEVICES_FILE = path.join(DATA_DIR, "devices.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Multi-Device Registry: Keyed by unique deviceId
let registeredDevices: Record<string, ChildDeviceState> = {};

// In-Memory Live Streams Cache for high-performance low-latency video, screen & audio streaming
interface LiveStreamBuffer {
  cameraFrame?: { frame: string; timestamp: number; camera: string };
  screenFrame?: { frame: string; timestamp: number };
  audioChunk?: { audio: string; timestamp: number; seq: number };
}
const liveStreams: Record<string, LiveStreamBuffer> = {};

function loadPersistedState() {
  try {
    if (fs.existsSync(DEVICES_FILE)) {
      const data = fs.readFileSync(DEVICES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (typeof parsed === "object" && parsed !== null) {
        // Clean out any legacy mock devices
        const cleaned: Record<string, ChildDeviceState> = {};
        for (const [id, dev] of Object.entries(parsed as Record<string, ChildDeviceState>)) {
          if (id !== "DEV-CHILD-9841" && !dev.location?.address?.includes("Dhaka Central")) {
            cleaned[id] = {
              ...DEFAULT_DEVICE_STATE,
              ...dev,
              stealthSettings: {
                ...DEFAULT_DEVICE_STATE.stealthSettings,
                ...(dev.stealthSettings || {})
              }
            };
          }
        }
        registeredDevices = cleaned;
      }
      console.log(`Loaded ${Object.keys(registeredDevices).length} registered devices from storage.`);
    }
  } catch (err) {
    console.error("Error loading persisted devices state:", err);
  }
}

function savePersistedState() {
  try {
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(registeredDevices, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving devices state to disk:", err);
  }
}

loadPersistedState();

// Initialize Gemini AI Client (Server-side)
const apiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'guardian-shield-parental',
      }
    }
  });
}

// Helper: Get specific device state or fallback
function getDeviceState(deviceId?: string, code?: string): ChildDeviceState {
  if (deviceId && registeredDevices[deviceId]) {
    return registeredDevices[deviceId];
  }
  if (code) {
    const found = Object.values(registeredDevices).find(d => d.pairingCode === code);
    if (found) return found;
  }
  const firstId = Object.keys(registeredDevices)[0];
  if (firstId) {
    return registeredDevices[firstId];
  }
  return { ...DEFAULT_DEVICE_STATE };
}

// 1. GET list of all registered child devices
app.get("/api/devices", (req, res) => {
  const list: DeviceSummary[] = Object.values(registeredDevices).map(d => ({
    deviceId: d.deviceId,
    pairingCode: d.pairingCode,
    deviceModel: d.deviceModel,
    childName: d.childName,
    isOnline: d.isOnline,
    batteryLevel: d.batteryLevel,
    lastSeen: d.lastSeen
  }));
  res.json({ success: true, devices: list });
});

// 2. GET specific device state
app.get("/api/device/state", (req, res) => {
  const deviceId = req.query.deviceId as string | undefined;
  const code = req.query.code as string | undefined;
  const state = getDeviceState(deviceId, code);
  res.json({ success: true, state });
});

// 3. POST pair device by 6-digit code
app.post("/api/device/pair", (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: "Code required" });
  }

  const cleanCode = String(code).trim();
  let found = Object.values(registeredDevices).find(d => d.pairingCode === cleanCode);

  if (found) {
    found.isOnline = true;
    found.lastSeen = "Just now";
    savePersistedState();
    return res.json({ success: true, deviceId: found.deviceId, state: found });
  }

  // If phone hasn't sent telemetry yet, register a placeholder for this code
  const newDevId = `DEV-${cleanCode.replace('-', '')}`;
  registeredDevices[newDevId] = {
    ...DEFAULT_DEVICE_STATE,
    deviceId: newDevId,
    pairingCode: cleanCode,
    childName: `Child Device (${cleanCode})`,
    deviceModel: "Android Mobile",
    isOnline: true,
    lastSeen: "Pairing initiated"
  };
  savePersistedState();
  res.json({ success: true, deviceId: newDevId, state: registeredDevices[newDevId] });
});

// 4. POST reset state (clean zero-state wipe)
app.post("/api/device/reset", (req, res) => {
  const { deviceId } = req.body || {};
  if (deviceId && registeredDevices[deviceId]) {
    delete registeredDevices[deviceId];
    delete liveStreams[deviceId];
  } else {
    registeredDevices = {};
    for (const key of Object.keys(liveStreams)) {
      delete liveStreams[key];
    }
  }
  savePersistedState();
  res.json({ 
    success: true, 
    message: "Device state reset to clean empty state", 
    state: { ...DEFAULT_DEVICE_STATE },
    devices: [] 
  });
});

// 5. POST high-speed real-time stream frame (Camera, Live Screen, Audio Chunks)
app.post("/api/device/stream-frame", (req, res) => {
  const { deviceId, type, frameData, camera, seq } = req.body;
  if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

  if (!liveStreams[deviceId]) {
    liveStreams[deviceId] = {};
  }

  const now = Date.now();
  if (type === 'camera') {
    liveStreams[deviceId].cameraFrame = { frame: frameData, timestamp: now, camera: camera || 'front' };
    if (registeredDevices[deviceId]) {
      registeredDevices[deviceId].latestCameraSnapshot = frameData;
      registeredDevices[deviceId].cameraSnapshotTimestamp = new Date().toISOString();
      registeredDevices[deviceId].isOnline = true;
      registeredDevices[deviceId].lastSeen = "Streaming Camera";
    }
  } else if (type === 'screen') {
    liveStreams[deviceId].screenFrame = { frame: frameData, timestamp: now };
    if (registeredDevices[deviceId]) {
      registeredDevices[deviceId].currentScreenImage = frameData;
      registeredDevices[deviceId].isOnline = true;
      registeredDevices[deviceId].lastSeen = "Sharing Screen";
    }
  } else if (type === 'audio') {
    liveStreams[deviceId].audioChunk = { audio: frameData, timestamp: now, seq: seq || 0 };
    if (registeredDevices[deviceId]) {
      registeredDevices[deviceId].isOnline = true;
      registeredDevices[deviceId].lastSeen = "Streaming Audio";
    }
  }

  res.json({ success: true });
});

// 6. GET high-speed real-time stream frame
app.get("/api/device/stream-frame", (req, res) => {
  const deviceId = (req.query.deviceId as string) || Object.keys(registeredDevices)[0];
  if (!deviceId || !liveStreams[deviceId]) {
    return res.json({ success: true, stream: {} });
  }
  res.json({ success: true, stream: liveStreams[deviceId] });
});

// 7. POST remote command from Parent targeting specific device
app.post("/api/device/command", (req, res) => {
  const { deviceId, command, payload } = req.body as RemoteCommandRequest;
  const targetId = deviceId || Object.keys(registeredDevices)[0];
  
  if (!targetId || !registeredDevices[targetId]) {
    // If no devices yet, create a default entry
    const devId = targetId || "DEV-DEFAULT";
    registeredDevices[devId] = { ...DEFAULT_DEVICE_STATE, deviceId: devId };
  }

  const currentDeviceState = registeredDevices[targetId];
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  switch (command) {
    case 'LOCK_SCREEN':
      currentDeviceState.isLocked = true;
      currentDeviceState.lockReason = payload?.reason || "Parental override lock";
      if (payload?.customMessage) {
        currentDeviceState.customLockMessage = payload.customMessage;
      }
      currentDeviceState.activityHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp,
        type: 'lock',
        title: 'Device Locked Remotely',
        message: `Parent locked screen. Message: "${currentDeviceState.customLockMessage}"`,
        severity: 'danger'
      });
      break;

    case 'UNLOCK_SCREEN':
      currentDeviceState.isLocked = false;
      currentDeviceState.lockReason = "";
      currentDeviceState.activityHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp,
        type: 'lock',
        title: 'Device Unlocked',
        message: 'Parent unlocked device screen access.',
        severity: 'info'
      });
      break;

    case 'SET_CAMERA':
      currentDeviceState.activeCamera = payload?.camera || 'off';
      currentDeviceState.isCameraStreaming = payload?.camera !== 'off';
      currentDeviceState.activityHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp,
        type: 'camera_snapshot',
        title: `Camera ${payload?.camera === 'off' ? 'Disabled' : 'Activated'}`,
        message: `Stealth camera set to ${payload?.camera || 'off'}`,
        severity: 'info'
      });
      break;

    case 'TOGGLE_AUDIO_LISTEN':
      if (!currentDeviceState.audioState) {
        currentDeviceState.audioState = {
          isListening: false,
          decibelLevel: 28,
          audioMode: 'off',
          recordedClipsCount: 0,
          recordedClips: []
        };
      }
      const listenState = payload?.isListening ?? !currentDeviceState.audioState.isListening;
      currentDeviceState.audioState.isListening = listenState;
      currentDeviceState.audioState.audioMode = listenState ? 'surrounding_talk' : 'off';
      if (payload?.transcript) {
        currentDeviceState.audioState.lastTranscript = payload.transcript;
      }
      currentDeviceState.activityHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp,
        type: 'audio_listen',
        title: `Stealth Mic ${listenState ? 'Streaming' : 'Stopped'}`,
        message: `Parent ${listenState ? 'started live ambient voice monitoring' : 'stopped listening feed'}`,
        severity: 'info'
      });
      break;

    case 'SAVE_AUDIO_CLIP':
      if (payload?.clip) {
        if (!currentDeviceState.audioState.recordedClips) {
          currentDeviceState.audioState.recordedClips = [];
        }
        currentDeviceState.audioState.recordedClips.unshift(payload.clip);
        currentDeviceState.audioState.recordedClipsCount = currentDeviceState.audioState.recordedClips.length;
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'audio_listen',
          title: 'Ambient Audio Recorded',
          message: `Saved audio clip: "${payload.clip.title}" (${payload.clip.duration})`,
          severity: 'info'
        });
      }
      break;

    case 'CAPTURE_SNAPSHOT':
      if (payload?.snapshotData) {
        currentDeviceState.latestCameraSnapshot = payload.snapshotData;
        currentDeviceState.cameraSnapshotTimestamp = new Date().toISOString();
        if (!currentDeviceState.cameraSnapshots) {
          currentDeviceState.cameraSnapshots = [];
        }
        currentDeviceState.cameraSnapshots.unshift({
          id: `snap-${Date.now()}`,
          url: payload.snapshotData,
          timestamp: new Date().toISOString(),
          camera: currentDeviceState.activeCamera
        });
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'camera_snapshot',
          title: 'Camera Snapshot Captured',
          message: `Captured live snapshot from ${currentDeviceState.activeCamera} camera`,
          severity: 'info'
        });
      }
      break;

    case 'TOGGLE_APP_BLOCK':
      const appName = payload?.appName;
      if (appName) {
        let item = currentDeviceState.appUsageLogs.find(a => a.appName === appName);
        if (item) {
          item.isBlocked = !item.isBlocked;
          if (item.isBlocked) {
            if (!currentDeviceState.blockedApps.includes(appName)) {
              currentDeviceState.blockedApps.push(appName);
            }
          } else {
            currentDeviceState.blockedApps = currentDeviceState.blockedApps.filter(a => a !== appName);
          }
        } else {
          currentDeviceState.blockedApps.push(appName);
          currentDeviceState.appUsageLogs.unshift({
            id: `app-${Date.now()}`,
            appName,
            packageName: `com.app.${appName.toLowerCase().replace(/\s+/g, '')}`,
            category: 'Social',
            durationMinutes: 0,
            lastUsed: 'Just now',
            isBlocked: true,
            isFlagged: false,
            icon: 'Smartphone'
          });
        }
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'app_blocked',
          title: `App ${currentDeviceState.blockedApps.includes(appName) ? 'Blocked' : 'Unblocked'}`,
          message: `${appName} is now ${currentDeviceState.blockedApps.includes(appName) ? 'blocked on child device' : 'allowed'}`,
          severity: currentDeviceState.blockedApps.includes(appName) ? 'warning' : 'info'
        });
      }
      break;

    case 'ADD_GEOFENCE':
      if (payload) {
        const newFence: GeofenceZone = {
          id: `gf-${Date.now()}`,
          name: payload.name || "Custom Zone",
          lat: payload.lat,
          lng: payload.lng,
          radiusMeters: payload.radiusMeters || 300,
          type: payload.type || 'safe',
          activeAlert: false,
          createdAt: new Date().toISOString()
        };
        currentDeviceState.geofences.push(newFence);
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'geofence',
          title: 'Geofence Zone Created',
          message: `Created ${newFence.type} zone "${newFence.name}" (${newFence.radiusMeters}m)`,
          severity: 'info'
        });
      }
      break;

    case 'DELETE_GEOFENCE':
      if (payload?.id) {
        currentDeviceState.geofences = currentDeviceState.geofences.filter(g => g.id !== payload.id);
      }
      break;

    case 'UPLOAD_FILE':
      if (payload?.file) {
        currentDeviceState.fileSystem.unshift(payload.file);
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'file_access',
          title: 'File Uploaded',
          message: `New file added to ${payload.file.folder}: ${payload.file.name}`,
          severity: 'info'
        });
      }
      break;

    case 'DELETE_FILE':
      if (payload?.id) {
        currentDeviceState.fileSystem = currentDeviceState.fileSystem.filter(f => f.id !== payload.id);
      }
      break;

    case 'TRIGGER_SIREN':
      currentDeviceState.activityHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp,
        type: 'sos',
        title: 'Emergency Siren Sounded',
        message: 'Parent triggered loud alarm buzzer on child phone.',
        severity: 'warning'
      });
      break;

    case 'TRIGGER_SOS':
      currentDeviceState.activityHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp,
        type: 'sos',
        title: 'EMERGENCY SOS Triggered by Child!',
        message: 'Child pressed the SOS Panic Alarm button on phone.',
        severity: 'danger'
      });
      break;

    case 'PAIR_DEVICE':
      if (payload?.code) {
        currentDeviceState.pairingCode = payload.code;
        currentDeviceState.isOnline = true;
        currentDeviceState.lastSeen = "Just now";
      }
      break;

    default:
      break;
  }

  savePersistedState();
  res.json({ success: true, state: currentDeviceState });
});

// 8. POST device telemetry update from Child Mobile APK
app.post("/api/device/update", (req, res) => {
  const updates = req.body;
  if (!updates) {
    return res.status(400).json({ error: "No payload" });
  }

  const deviceId = updates.deviceId || `DEV-${updates.pairingCode ? updates.pairingCode.replace('-', '') : 'UNKNOWN'}`;
  
  if (!registeredDevices[deviceId]) {
    registeredDevices[deviceId] = {
      ...DEFAULT_DEVICE_STATE,
      deviceId,
      pairingCode: updates.pairingCode || '',
      childName: updates.childName || `Child Device (${updates.pairingCode || deviceId})`,
      deviceModel: updates.deviceModel || "Android Mobile"
    };
  }

  const currentDeviceState = registeredDevices[deviceId];

  if (updates.deviceModel) currentDeviceState.deviceModel = updates.deviceModel;
  if (updates.childName) currentDeviceState.childName = updates.childName;
  if (updates.pairingCode) currentDeviceState.pairingCode = updates.pairingCode;
  if (updates.currentApp !== undefined) currentDeviceState.currentApp = updates.currentApp;
  if (updates.currentScreenTitle !== undefined) currentDeviceState.currentScreenTitle = updates.currentScreenTitle;
  if (updates.currentScreenContent !== undefined) currentDeviceState.currentScreenContent = updates.currentScreenContent;
  if (updates.currentScreenImage !== undefined) currentDeviceState.currentScreenImage = updates.currentScreenImage;
  
  if (updates.location !== undefined && updates.location.lat) {
    currentDeviceState.location = { ...currentDeviceState.location, ...updates.location };
    currentDeviceState.locationHistory.unshift({ ...currentDeviceState.location });
    if (currentDeviceState.locationHistory.length > 50) {
      currentDeviceState.locationHistory = currentDeviceState.locationHistory.slice(0, 50);
    }
  }
  
  if (updates.batteryLevel !== undefined) currentDeviceState.batteryLevel = updates.batteryLevel;
  if (updates.isCharging !== undefined) currentDeviceState.isCharging = updates.isCharging;
  
  if (updates.latestCameraSnapshot !== undefined) {
    currentDeviceState.latestCameraSnapshot = updates.latestCameraSnapshot;
    currentDeviceState.cameraSnapshotTimestamp = new Date().toISOString();
    if (updates.latestCameraSnapshot) {
      if (!currentDeviceState.cameraSnapshots) currentDeviceState.cameraSnapshots = [];
      currentDeviceState.cameraSnapshots.unshift({
        id: `snap-${Date.now()}`,
        url: updates.latestCameraSnapshot,
        timestamp: new Date().toISOString(),
        camera: currentDeviceState.activeCamera
      });
    }
  }
  
  if (updates.audioState !== undefined) {
    currentDeviceState.audioState = { ...currentDeviceState.audioState, ...updates.audioState };
  }
  if (updates.fileSystem !== undefined) {
    currentDeviceState.fileSystem = updates.fileSystem;
  }
  if (updates.stealthSettings !== undefined) {
    currentDeviceState.stealthSettings = { ...currentDeviceState.stealthSettings, ...updates.stealthSettings };
  }
  if (updates.appUsageLogs !== undefined) {
    currentDeviceState.appUsageLogs = updates.appUsageLogs;
  }
  
  currentDeviceState.lastSeen = "Just now";
  currentDeviceState.isOnline = true;

  savePersistedState();
  res.json({ success: true, state: currentDeviceState });
});

// 9. POST Gemini AI Safety Scan
app.post("/api/gemini/safety-scan", async (req, res) => {
  const { deviceId, screenContent, currentApp, imageBase64 } = req.body;
  const targetId = deviceId || Object.keys(registeredDevices)[0];
  const currentDeviceState = targetId && registeredDevices[targetId] ? registeredDevices[targetId] : { ...DEFAULT_DEVICE_STATE };

  try {
    if (!aiClient) {
      const isRisky = screenContent?.toLowerCase().includes("danger") || 
                      screenContent?.toLowerCase().includes("kill") || 
                      screenContent?.toLowerCase().includes("hate") ||
                      screenContent?.toLowerCase().includes("gambling");

      const localReport: AISafetyReport = {
        timestamp: new Date().toISOString(),
        riskLevel: isRisky ? 'DANGER' : 'SAFE',
        safetyScore: isRisky ? 35 : 98,
        detectedCategories: isRisky ? ['Violence & Hostility', 'Dangerous Content'] : ['Educational & Safe'],
        summary: isRisky 
          ? `Detected potential safety policy violation in active app: ${currentApp || 'Browser'}.`
          : `Clean content monitored on ${currentApp || 'Screen'}. No risks detected.`,
        suggestedAction: isRisky ? 'Temporarily lock app access and notify parent.' : 'Allow continued usage.'
      };

      currentDeviceState.aiSafetyStatus = localReport;
      savePersistedState();
      return res.json({ success: true, report: localReport, deviceState: currentDeviceState });
    }

    const prompt = `Analyze child safety for app: "${currentApp}". Content: "${screenContent}". Return JSON.`;
    const parts: any[] = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ["SAFE", "CAUTION", "DANGER"] },
            safetyScore: { type: Type.NUMBER },
            detectedCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            suggestedAction: { type: Type.STRING }
          },
          required: ["riskLevel", "safetyScore", "detectedCategories", "summary", "suggestedAction"]
        }
      }
    });

    const report: AISafetyReport = {
      timestamp: new Date().toISOString(),
      ...(JSON.parse(response.text || '{}') as AISafetyReport)
    };

    currentDeviceState.aiSafetyStatus = report;
    savePersistedState();
    res.json({ success: true, report, deviceState: currentDeviceState });
  } catch (error: any) {
    console.error("Gemini AI Scan error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`🛡️ Guardian Shield Backend running on port ${PORT}`);
  });
}

startServer();
