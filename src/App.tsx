import React, { useState, useEffect } from 'react';
import { ViewMode, ActiveTab, ChildDeviceState, CameraPosition, DeviceSummary } from './types';
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
  const isCapacitor = typeof window !== 'undefined' && (
    Boolean((window as any).Capacitor?.isNativePlatform?.()) || 
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port) ||
    window.location.origin.includes('capacitor://')
  );

  const initialViewMode: ViewMode = (localStorage.getItem('app_view_mode') as ViewMode) || (isCapacitor ? 'child' : 'parent');
  const [viewMode, setViewModeState] = useState<ViewMode>(initialViewMode);

  const setViewMode = (mode: ViewMode) => {
    localStorage.setItem('app_view_mode', mode);
    setViewModeState(mode);
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('location');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);

  // Multi-Device Registry State
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // State holding child device telemetry
  const [deviceState, setDeviceState] = useState<ChildDeviceState>(DEFAULT_DEVICE_STATE);

  // Fetch state from server
  const fetchState = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // 1. Fetch devices list
      const devRes = await fetch(getApiUrl('/api/devices'), { signal: controller.signal });
      if (devRes.ok) {
        const devData = await devRes.json();
        if (devData.success && Array.isArray(devData.devices)) {
          setDevices(devData.devices);
          if (!selectedDeviceId && devData.devices.length > 0) {
            setSelectedDeviceId(devData.devices[0].deviceId);
          }
        }
      }

      // 2. Fetch specific device state
      const targetQuery = selectedDeviceId ? `?deviceId=${selectedDeviceId}` : '';
      const res = await fetch(getApiUrl(`/api/device/state${targetQuery}`), { signal: controller.signal });
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

    if (isCapacitor) {
      if (!savedCode) {
        const codePart1 = Math.floor(100 + Math.random() * 900);
        const codePart2 = Math.floor(100 + Math.random() * 900);
        savedCode = `${codePart1}-${codePart2}`;
        localStorage.setItem('child_pairing_code', savedCode);
      }

      if (!savedDevId) {
        savedDevId = `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
        localStorage.setItem('child_device_id', savedDevId);
      }

      setDeviceState(prev => ({
        ...prev,
        pairingCode: savedCode,
        deviceId: savedDevId
      }));
    }

    fetchState();
    // Poll every 1.5 seconds for live cross-device sync
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [isCapacitor, selectedDeviceId]);

  // Remote command handlers with local fallback
  const sendCommand = async (command: string, payload?: any) => {
    const targetId = selectedDeviceId || deviceState.deviceId;
    try {
      const res = await fetch(getApiUrl('/api/device/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: targetId, command, payload })
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
          break;

        case 'UNLOCK_SCREEN':
          updated.isLocked = false;
          updated.lockReason = "";
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
            audioMode: isListening ? 'surrounding_talk' : 'off'
          };
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

  const handlePairDevice = async (code: string) => {
    try {
      const res = await fetch(getApiUrl('/api/device/pair'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.deviceId) setSelectedDeviceId(data.deviceId);
          if (data.state) setDeviceState(data.state);
          fetchState();
          return;
        }
      }
    } catch (e) {}

    sendCommand('PAIR_DEVICE', { code });
    setDeviceState(prev => ({
      ...prev,
      pairingCode: code,
      isOnline: true,
      lastSeen: "Just now"
    }));
  };

  const handleResetDevice = async () => {
    try {
      const res = await fetch(getApiUrl('/api/device/reset'), { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setDeviceState(data.state);
        if (data.devices) setDevices(data.devices);
        setSelectedDeviceId('');
      }
    } catch (e) {
      setDeviceState(DEFAULT_DEVICE_STATE);
      setDevices([]);
      setSelectedDeviceId('');
    }
    localStorage.removeItem('parent_paired_code');
  };

  const handleRunAIScan = async (content: string, app: string, imageBase64?: string) => {
    try {
      const res = await fetch(getApiUrl('/api/gemini/safety-scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceId: selectedDeviceId || deviceState.deviceId,
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
      console.warn("AI Safety scan error:", err);
    }
  };

  const handleUpdateChildState = async (updates: Partial<ChildDeviceState>) => {
    setDeviceState(prev => ({ ...prev, ...updates }));
    try {
      await fetch(getApiUrl('/api/device/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          deviceId: updates.deviceId || deviceState.deviceId,
          pairingCode: updates.pairingCode || deviceState.pairingCode
        })
      });
    } catch (err) {}
  };

  // IF RUNNING IN ANDROID APK / CAPACITOR: Render Pure Dedicated Child Protection Agent
  if (isCapacitor) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <ChildDeviceSimulator
          deviceState={deviceState}
          onUpdateChildState={handleUpdateChildState}
          onTriggerSOS={handleTriggerSOS}
          onOpenSetupGuide={() => setShowSetupGuide(true)}
          onSendCommand={sendCommand}
        />

        <StealthSetupModal
          isOpen={showSetupGuide}
          onClose={() => setShowSetupGuide(false)}
        />
      </div>
    );
  }

  // IN BROWSER: Render Pure Parent Control Center
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans antialiased">
      
      {/* Universal Top Header */}
      <Header
        viewMode="parent"
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
        safetyScore={deviceState.aiSafetyStatus?.safetyScore || 100}
        riskLevel={deviceState.aiSafetyStatus?.riskLevel || 'SAFE'}
        activeCamera={deviceState.activeCamera}
        isAudioListening={deviceState.audioState?.isListening}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => {
          setSelectedDeviceId(id);
          fetchState();
        }}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          
          {/* Tab 1: Live Hardware GPS Location Tracking */}
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

          {/* Tab 2: Screen AI Radar & Content Safety */}
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
              deviceId={selectedDeviceId}
            />
          )}

          {/* Tab 3: Stealth Dual Camera Live Stream */}
          {activeTab === 'camera' && (
            <CameraStreamView
              activeCamera={deviceState.activeCamera}
              isCameraStreaming={deviceState.isCameraStreaming}
              latestCameraSnapshot={deviceState.latestCameraSnapshot}
              cameraSnapshotTimestamp={deviceState.cameraSnapshotTimestamp || undefined}
              cameraSnapshots={deviceState.cameraSnapshots}
              onSetCamera={handleSetCamera}
              onCaptureSnapshot={handleCaptureSnapshot}
              childName={deviceState.childName}
              deviceId={selectedDeviceId}
            />
          )}

          {/* Tab 4: Ambient Audio & Microphone Listening */}
          {activeTab === 'audio' && (
            <AmbientAudioMonitor
              deviceState={deviceState}
              onSendCommand={sendCommand}
              deviceId={selectedDeviceId}
            />
          )}

          {/* Tab 5: App Controls & Blocking Limits */}
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
        onResetDevice={handleResetDevice}
      />

    </div>
  );
}
