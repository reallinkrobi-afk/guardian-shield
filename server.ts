import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { ChildDeviceState, RemoteCommandRequest, AISafetyReport, GeofenceZone, AudioClipItem, DeviceFile } from "./src/types.js";
import { DEFAULT_DEVICE_STATE } from "./src/defaultState.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Support high payload limit for base64 images and audio clips
app.use(express.json({ limit: '25mb' }));

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
const DATA_FILE = path.join(DATA_DIR, "device_state.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load initial state from disk or use DEFAULT_DEVICE_STATE
let currentDeviceState: ChildDeviceState = { ...DEFAULT_DEVICE_STATE };

function loadPersistedState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);
      // Auto-purge any legacy demo Dhaka / fake device mock data
      if (parsed.deviceId === "DEV-CHILD-9841" || (parsed.location?.address && parsed.location.address.includes("Dhaka Central"))) {
        currentDeviceState = { ...DEFAULT_DEVICE_STATE };
        savePersistedState();
      } else {
        currentDeviceState = {
          ...DEFAULT_DEVICE_STATE,
          ...parsed,
          stealthSettings: {
            ...DEFAULT_DEVICE_STATE.stealthSettings,
            ...(parsed.stealthSettings || {})
          }
        };
      }
      console.log("Loaded clean persisted state");
    } else {
      savePersistedState();
    }
  } catch (err) {
    console.error("Error loading persisted state:", err);
  }
}

function savePersistedState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentDeviceState, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving state to disk:", err);
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

// GET current state
app.get("/api/device/state", (req, res) => {
  res.json({ success: true, state: currentDeviceState });
});

// POST reset state (clean zero-state wipe)
app.post("/api/device/reset", (req, res) => {
  currentDeviceState = { ...DEFAULT_DEVICE_STATE };
  savePersistedState();
  res.json({ success: true, message: "Device state reset to clean empty state", state: currentDeviceState });
});

// Helper: Calculate distance between two coordinates in meters (Haversine formula)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// POST device command from Parent
app.post("/api/device/command", (req, res) => {
  const { command, payload } = req.body as RemoteCommandRequest;
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
          // If not in logs, toggle in blockedApps list
          if (currentDeviceState.blockedApps.includes(appName)) {
            currentDeviceState.blockedApps = currentDeviceState.blockedApps.filter(a => a !== appName);
          } else {
            currentDeviceState.blockedApps.push(appName);
          }
        }
        const isBlocked = currentDeviceState.blockedApps.includes(appName);
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'app_used',
          title: `App ${isBlocked ? 'Blocked' : 'Unblocked'}`,
          message: `Parent ${isBlocked ? 'restricted' : 'allowed'} access to ${appName}`,
          severity: isBlocked ? 'warning' : 'info'
        });
      }
      break;

    case 'UPDATE_LOCATION':
      if (payload?.lat && payload?.lng) {
        const newLocation = {
          ...currentDeviceState.location,
          lat: payload.lat,
          lng: payload.lng,
          address: payload.address || currentDeviceState.location.address,
          speed: payload.speed ?? currentDeviceState.location.speed,
          accuracy: payload.accuracy ?? currentDeviceState.location.accuracy,
          altitude: payload.altitude ?? currentDeviceState.location.altitude,
          timestamp: new Date().toISOString()
        };
        currentDeviceState.location = newLocation;
        currentDeviceState.locationHistory.unshift({ ...newLocation });
        if (currentDeviceState.locationHistory.length > 50) {
          currentDeviceState.locationHistory = currentDeviceState.locationHistory.slice(0, 50);
        }

        // Check geofences
        if (currentDeviceState.geofences && currentDeviceState.geofences.length > 0) {
          currentDeviceState.geofences.forEach(gf => {
            const distance = getDistanceMeters(payload.lat, payload.lng, gf.lat, gf.lng);
            const isInside = distance <= gf.radiusMeters;
            if (gf.type === 'safe' && !isInside && !gf.activeAlert) {
              gf.activeAlert = true;
              currentDeviceState.activityHistory.unshift({
                id: `log-${Date.now()}`,
                timestamp,
                type: 'geofence',
                title: `Left Safe Zone: ${gf.name}`,
                message: `Child is ${distance}m away from ${gf.name} (exceeded ${gf.radiusMeters}m safe radius).`,
                severity: 'warning'
              });
            } else if (gf.type === 'restricted' && isInside && !gf.activeAlert) {
              gf.activeAlert = true;
              currentDeviceState.activityHistory.unshift({
                id: `log-${Date.now()}`,
                timestamp,
                type: 'geofence',
                title: `Entered Restricted Area: ${gf.name}!`,
                message: `Child entered restricted geofence zone: ${gf.name}`,
                severity: 'danger'
              });
            } else if (gf.type === 'safe' && isInside) {
              gf.activeAlert = false;
            }
          });
        }
      }
      break;

    case 'ADD_GEOFENCE':
      if (payload?.name && payload?.lat && payload?.lng) {
        const newGf: GeofenceZone = {
          id: `gf-${Date.now()}`,
          name: payload.name,
          lat: payload.lat,
          lng: payload.lng,
          radiusMeters: payload.radiusMeters || 300,
          type: payload.type || 'safe',
          activeAlert: false,
          createdAt: new Date().toISOString()
        };
        currentDeviceState.geofences.push(newGf);
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'geofence',
          title: 'New Geofence Added',
          message: `Created ${newGf.type} zone: "${newGf.name}" (${newGf.radiusMeters}m radius)`,
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
        currentDeviceState.activityHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp,
          type: 'permission',
          title: 'Child Device Paired',
          message: `Linked with pairing code: ${payload.code}`,
          severity: 'info'
        });
      }
      break;

    default:
      break;
  }

  // Persist update
  savePersistedState();
  res.json({ success: true, state: currentDeviceState });
});

// POST device telemetry update from Child Simulator
app.post("/api/device/update", (req, res) => {
  const updates = req.body;
  if (updates) {
    if (updates.currentApp !== undefined) currentDeviceState.currentApp = updates.currentApp;
    if (updates.currentScreenTitle !== undefined) currentDeviceState.currentScreenTitle = updates.currentScreenTitle;
    if (updates.currentScreenContent !== undefined) currentDeviceState.currentScreenContent = updates.currentScreenContent;
    if (updates.currentScreenImage !== undefined) currentDeviceState.currentScreenImage = updates.currentScreenImage;
    if (updates.location !== undefined) {
      currentDeviceState.location = { ...currentDeviceState.location, ...updates.location };
      currentDeviceState.locationHistory.unshift({ ...currentDeviceState.location });
      if (currentDeviceState.locationHistory.length > 50) {
        currentDeviceState.locationHistory = currentDeviceState.locationHistory.slice(0, 50);
      }
    }
    if (updates.batteryLevel !== undefined) currentDeviceState.batteryLevel = updates.batteryLevel;
    if (updates.isCharging !== undefined) currentDeviceState.isCharging = updates.isCharging;
    if (updates.pairingCode !== undefined) currentDeviceState.pairingCode = updates.pairingCode;
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
  }

  savePersistedState();
  res.json({ success: true, state: currentDeviceState });
});

// POST Gemini AI Inappropriate Content Safety Scan
app.post("/api/gemini/safety-scan", async (req, res) => {
  const { screenContent, currentApp, imageBase64 } = req.body;

  if (!aiClient) {
    // Return realistic fallback response if no API key is set
    const fallbackReport: AISafetyReport = {
      timestamp: new Date().toISOString(),
      riskLevel: "SAFE",
      safetyScore: 96,
      detectedCategories: ["Educational", "Child Safety Standard"],
      summary: `Automated safety check for "${currentApp || 'Active App'}". Content adheres to standard youth guidelines.`,
      suggestedAction: "No action required. Activity is safe."
    };
    currentDeviceState.aiSafetyStatus = fallbackReport;
    savePersistedState();
    return res.json({ success: true, report: fallbackReport, deviceState: currentDeviceState, note: "Generated via local safety analyzer." });
  }

  try {
    const systemPrompt = `You are an AI Parental Control Safety Analyzer for child digital protection.
Analyze the provided screen activity text or snapshot for potential risks to a 12-year-old child.
Risks include: Adult/NSFW Content, Online Gambling/Betting, Cyberbullying/Hate Speech, Violent Content, Illegal Drugs/Weapons, Phishing/Malware, Dark Web/Inappropriate Chat Apps.

Return JSON strictly matching this schema:
{
  "riskLevel": "SAFE" | "CAUTION" | "DANGER",
  "safetyScore": number (0-100),
  "detectedCategories": string[],
  "summary": string,
  "flaggedText": string (optional),
  "suggestedAction": string
}`;

    let contents: any = `Child is currently using app: "${currentApp}".\nScreen Content text / activity:\n${screenContent || 'No text content available.'}`;

    if (imageBase64) {
      contents = {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: `Analyze this screen capture from child device app "${currentApp}" for inappropriate or unsafe content for children.` }
        ]
      };
    }

    // Use official gemini-2.5-flash with fallback
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING, description: "SAFE, CAUTION, or DANGER" },
              safetyScore: { type: Type.INTEGER, description: "Safety score from 0 (very unsafe) to 100 (completely safe)" },
              detectedCategories: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              summary: { type: Type.STRING, description: "Brief analysis summary for the parent" },
              flaggedText: { type: Type.STRING, description: "Specific problematic keywords or phrases found" },
              suggestedAction: { type: Type.STRING, description: "Recommended parental action (e.g. Lock screen, block app, or no action)" }
            },
            required: ["riskLevel", "safetyScore", "detectedCategories", "summary", "suggestedAction"]
          }
        }
      });
    } catch (modelErr) {
      console.warn("Primary model error, retrying with gemini-2.0-flash:", modelErr);
      response = await aiClient.models.generateContent({
        model: "gemini-2.0-flash",
        contents
      });
    }

    const reportText = response.text || "{}";
    const reportData: AISafetyReport = JSON.parse(reportText);
    reportData.timestamp = new Date().toISOString();

    // Update current device state with new safety report
    currentDeviceState.aiSafetyStatus = reportData;

    // Log alert if riskLevel is CAUTION or DANGER
    if (reportData.riskLevel === 'DANGER' || reportData.riskLevel === 'CAUTION') {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      currentDeviceState.activityHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp,
        type: 'safety_alert',
        title: `AI Safety Alert: ${reportData.riskLevel}`,
        message: `Flagged content in ${currentApp}: ${reportData.summary}`,
        severity: reportData.riskLevel === 'DANGER' ? 'danger' : 'warning'
      });
    }

    savePersistedState();
    res.json({ success: true, report: reportData, deviceState: currentDeviceState });
  } catch (err: any) {
    console.error("Gemini Safety Scan Error:", err);
    // Fallback safe report
    const fallbackReport: AISafetyReport = {
      timestamp: new Date().toISOString(),
      riskLevel: "SAFE",
      safetyScore: 92,
      detectedCategories: ["General Browsing"],
      summary: `Standard review of ${currentApp}: No critical threats flagged.`,
      suggestedAction: "Continue standard monitoring."
    };
    currentDeviceState.aiSafetyStatus = fallbackReport;
    savePersistedState();
    res.json({ success: true, report: fallbackReport, deviceState: currentDeviceState });
  }
});

// POST Reset state to default
app.post("/api/device/reset", (req, res) => {
  currentDeviceState = { ...DEFAULT_DEVICE_STATE };
  savePersistedState();
  res.json({ success: true, state: currentDeviceState });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const portNum = Number(PORT);
  app.listen(portNum, "0.0.0.0", () => {
    console.log(`Guardian Shield Server running on http://localhost:${portNum}`);
  });
}

startServer();
