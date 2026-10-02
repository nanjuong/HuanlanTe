import { useCallback, useRef, useState } from 'react';
import Slider from '@react-native-community/slider';
import * as MediaLibrary from 'expo-media-library';
import { useLocales } from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import {
  Aperture,
  ChevronDown,
  CircleHelp,
  Focus,
  Grid2X2,
  Image as ImageIcon,
  LockKeyhole,
  ScanLine,
  Settings2,
  Sun,
  Zap,
} from 'lucide-react-native';
import {
  Camera,
  type CameraRef,
  type Frame,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getSystemLanguage, translate, type Lang, type TranslationKey } from './src/i18n';

const COLORS = {
  black: '#080A08',
  panel: '#111511',
  line: '#313831',
  muted: '#8A948A',
  white: '#F3F5EF',
  lime: '#CEFF54',
  red: '#FF5B50',
};

const INITIAL_HISTOGRAM = [8, 12, 18, 25, 34, 41, 46, 51, 56, 62, 70, 78, 84, 80, 67, 48];

type ControlPanel = 'exposure' | 'focus' | 'white-balance' | null;

function durationToProgress(value: number, range: { min: number; max: number }) {
  return Math.log(value / range.min) / Math.log(range.max / range.min);
}

function progressToDuration(progress: number, range: { min: number; max: number }) {
  return range.min * (range.max / range.min) ** progress;
}

function formatShutter(value: number) {
  return value < 1 ? `1/${Math.round(1 / value)}` : `${value.toFixed(1)}s`;
}

export default function App() {
  const locales = useLocales();
  const [selectedLang, setSelectedLang] = useState<Lang | null>(null);
  const lang = selectedLang ?? getSystemLanguage(locales);
  const t = (key: TranslationKey) => translate(lang, key);
  const toggleLang = () => setSelectedLang(lang === 'zh' ? 'en' : 'zh');

  const cameraRef = useRef<CameraRef>(null);
  const lastHistogramUpdate = useRef(0);
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [panel, setPanel] = useState<ControlPanel>('exposure');
  const [histogramVisible, setHistogramVisible] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [exposureBias, setExposureBias] = useState(0);
  const [iso, setIso] = useState(200);
  const [isoRange, setIsoRange] = useState({ min: 50, max: 3200 });
  const [shutter, setShutter] = useState(1 / 250);
  const [shutterRange, setShutterRange] = useState({ min: 1 / 8000, max: 1 });
  const [lensPosition, setLensPosition] = useState(0.5);
  const [focusLocked, setFocusLocked] = useState(false);
  const [exposureLocked, setExposureLocked] = useState(false);
  const [whiteBalanceLocked, setWhiteBalanceLocked] = useState(false);
  const [histogram, setHistogram] = useState(INITIAL_HISTOGRAM);
  const [latestPhoto, setLatestPhoto] = useState<string | null>(null);
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
    granularPermissions: ['photo'],
  });

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput({
    containerFormat: 'jpeg',
    quality: 0.96,
    qualityPrioritization: 'quality',
  });

  const publishHistogram = useCallback((values: number[]) => {
    const now = Date.now();
    if (now - lastHistogramUpdate.current >= 250) {
      lastHistogramUpdate.current = now;
      setHistogram(values);
    }
  }, []);

  const processFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      try {
        const plane = frame.getPlanes()[0];
        if (!plane) return;

        const pixels = new Uint8Array(plane.getPixelBuffer());
        const bins = new Array(16).fill(0);
        const stride = Math.max(1, Math.floor(pixels.length / 384));
        let samples = 0;

        for (let index = 0; index < pixels.length; index += stride) {
          bins[Math.min(15, pixels[index] >> 4)] += 1;
          samples += 1;
        }

        if (samples > 0) {
          for (let index = 0; index < bins.length; index += 1) {
            bins[index] = Math.round((bins[index] / samples) * 100);
          }
          scheduleOnRN(publishHistogram, bins);
        }
      } finally {
        frame.dispose();
      }
    },
    [publishHistogram],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    targetResolution: { width: 320, height: 180 },
    dropFramesWhileBusy: true,
    onFrame: processFrame,
  });

  const runCameraAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      Alert.alert(t('cameraControlUnavailable'), error instanceof Error ? error.message : t('deviceNotSupported'));
    }
  };

  const capturePhoto = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsCapturing(true);
    try {
      const { filePath } = await photoOutput.capturePhotoToFile({}, {});
      if (!mediaPermission?.granted) {
        const permission = await requestMediaPermission();
        if (!permission.granted) {
          Alert.alert(t('photoCaptured'), t('noAlbumPermission'));
          setLatestPhoto(`file://${filePath}`);
          return;
        }
      }

      const asset = await MediaLibrary.Asset.create(`file://${filePath}`);
      setLatestPhoto(await asset.getUri());
    } catch (error) {
      Alert.alert(t('captureFailed'), error instanceof Error ? error.message : t('checkCameraPermission'));
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleFocusLock = () => {
    const controller = cameraRef.current?.controller;
    if (!controller?.device.supportsFocusLocking) return;
    void runCameraAction(async () => {
      if (focusLocked) {
        await controller.resetFocus();
        setExposureLocked(false);
        setWhiteBalanceLocked(false);
      } else {
        await controller.setFocusLocked(lensPosition);
      }
      setFocusLocked(!focusLocked);
    });
  };

  const toggleExposureLock = () => {
    const controller = cameraRef.current?.controller;
    if (!controller?.device.supportsExposureLocking) return;
    void runCameraAction(async () => {
      if (exposureLocked) {
        await controller.resetFocus();
        setFocusLocked(false);
        setWhiteBalanceLocked(false);
      } else {
        await controller.lockCurrentExposure();
      }
      setExposureLocked(!exposureLocked);
    });
  };

  const toggleWhiteBalanceLock = () => {
    const controller = cameraRef.current?.controller;
    if (!controller?.device.supportsWhiteBalanceLocking) return;
    void runCameraAction(async () => {
      if (whiteBalanceLocked) {
        await controller.resetFocus();
        setFocusLocked(false);
        setExposureLocked(false);
      } else {
        await controller.lockCurrentWhiteBalance();
      }
      setWhiteBalanceLocked(!whiteBalanceLocked);
    });
  };

  const isReady = hasPermission && device !== undefined;
  const isIOS = Platform.OS === 'ios';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" hidden />
      {isReady ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          outputs={[photoOutput, frameOutput]}
          isActive
          exposure={exposureBias}
          enableNativeZoomGesture
          enableNativeTapToFocusGesture
          onStarted={() => {
            const currentController = cameraRef.current?.controller;
            if (currentController?.device.supportsExposureLocking) {
              setIsoRange({ min: currentController.minISO, max: currentController.maxISO });
              setShutterRange({ min: currentController.minExposureDuration, max: currentController.maxExposureDuration });
              setIso(currentController.iso || 200);
              setShutter(currentController.exposureDuration || 1 / 250);
            }
          }}
          onError={(error) => Alert.alert(t('cameraError'), error.message)}
        />
      ) : (
        <View style={styles.previewFallback}>
          <View style={styles.previewMark} />
          <Text style={styles.fallbackEyebrow}>{t('appEyebrow')}</Text>
          <Text style={styles.fallbackTitle}>{hasPermission ? t('noCameraFound') : t('viewfinderWaiting')}</Text>
          <Text style={styles.fallbackCopy}>
            {hasPermission ? t('runOnSupportedDevice') : t('allowCameraAccess')}
          </Text>
          {!hasPermission && (
            <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
              <Text style={styles.permissionButtonText}>{t('openCamera')}</Text>
            </Pressable>
          )}
        </View>
      )}

      <View pointerEvents="none" style={styles.vignette} />
      {gridVisible && isReady && (
        <View pointerEvents="none" style={styles.grid}>
          <View style={styles.gridVertical} />
          <View style={styles.gridHorizontal} />
        </View>
      )}

      <View style={styles.topBar}>
        <View>
          <Text style={styles.wordmark}>幻澜特</Text>
          <Text style={styles.wordmarkSub}>HUANLANTE · 01</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={gridVisible ? t('hideGrid') : t('showGrid')}
            onPress={() => setGridVisible((value) => !value)}
            style={styles.iconButton}
          >
            <Grid2X2 color={gridVisible ? COLORS.lime : COLORS.white} size={19} strokeWidth={1.6} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={histogramVisible ? t('hideHistogram') : t('showHistogram')}
            onPress={() => setHistogramVisible((value) => !value)}
            style={styles.iconButton}
          >
            <ScanLine color={histogramVisible ? COLORS.lime : COLORS.white} size={19} strokeWidth={1.6} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('captureSettings')}
            onPress={() => Alert.alert(t('captureSettings'), t('rawLogVideoRoadmap'))}
            style={styles.iconButton}
          >
            <Settings2 color={COLORS.white} size={19} strokeWidth={1.6} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('switchLanguage')}
            onPress={toggleLang}
            style={styles.iconButton}
          >
            <Text style={styles.langButtonText}>{lang === 'zh' ? 'EN' : '中'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.readoutRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('live')}</Text>
        </View>
        <Text style={styles.readoutText}>{t('photoReadout')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('toggleTorch')}
          onPress={() => {
            const currentController = cameraRef.current?.controller;
            if (currentController?.device.hasTorch) {
              void runCameraAction(() => currentController.setTorchMode(currentController.torchMode === 'on' ? 'off' : 'on'));
            }
          }}
          style={styles.flashButton}
        >
          <Zap color={COLORS.white} size={16} strokeWidth={1.7} />
        </Pressable>
      </View>

      <View style={styles.centerSpacer} />

      <View style={styles.meterArea}>
        <View style={styles.exposureMeter}>
          <Sun color={COLORS.lime} size={15} strokeWidth={1.8} />
          <Text style={styles.meterText}>{exposureBias > 0 ? '+' : ''}{exposureBias.toFixed(1)} EV</Text>
          <View style={styles.meterTrack}>
            <View style={styles.meterCenter} />
            <View style={[styles.meterIndicator, { left: `${50 + exposureBias * 12}%` }]} />
          </View>
          <Text style={styles.meterLock}>{exposureLocked ? t('exposureLocked') : t('exposureAuto')}</Text>
        </View>
        {histogramVisible && isReady && (
          <View style={styles.histogram} accessibilityLabel={t('histogramAccessibility')}>
            {histogram.map((height, index) => (
              <View
                key={index}
                style={[styles.histogramBar, { height: `${Math.max(5, height)}%`, opacity: 0.42 + (index / 16) * 0.58 }]}
              />
            ))}
          </View>
        )}
        <View style={styles.exposureReadouts}>
          <Text style={styles.readoutStrong}>ISO {Math.round(iso)}</Text>
          <View style={styles.readoutDivider} />
          <Text style={styles.readoutStrong}>1/{Math.max(1, Math.round(1 / shutter))}</Text>
          <View style={styles.readoutDivider} />
          <Text style={styles.readoutStrong}>ƒ/{device?.lensAperture.toFixed(1) ?? '—'}</Text>
          <View style={styles.readoutDivider} />
          <Text style={styles.readoutText}>{device?.localizedName ?? t('cameraFallback')}</Text>
        </View>
      </View>

      <View style={styles.bottomDock}>
        <View style={styles.panelTabs}>
          <PanelTab title={t('exposurePanel')} active={panel === 'exposure'} onPress={() => setPanel('exposure')} />
          <PanelTab title={t('focusPanel')} active={panel === 'focus'} onPress={() => setPanel('focus')} />
          <PanelTab title={t('whiteBalancePanel')} active={panel === 'white-balance'} onPress={() => setPanel('white-balance')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={exposureLocked ? t('unlockExposure') : t('lockExposure')}
            onPress={toggleExposureLock}
            style={[styles.lockButton, exposureLocked && styles.lockButtonActive]}
          >
            <LockKeyhole color={exposureLocked ? COLORS.black : COLORS.white} size={15} />
          </Pressable>
        </View>

        <View style={styles.controlContent}>
          {panel === 'exposure' && (
            <>
              <ControlRow label="EV" value={`${exposureBias > 0 ? '+' : ''}${exposureBias.toFixed(1)}`}>
                <Slider
                  accessibilityLabel={t('exposureComp')}
                  minimumValue={-2}
                  maximumValue={2}
                  step={0.1}
                  value={exposureBias}
                  onValueChange={setExposureBias}
                  onSlidingComplete={(value) => {
                    setExposureBias(value);
                    if (cameraRef.current?.controller?.device.supportsExposureBias) {
                      void runCameraAction(() => cameraRef.current!.controller!.setExposureBias(value));
                    }
                  }}
                  minimumTrackTintColor={COLORS.lime}
                  maximumTrackTintColor="#495149"
                  thumbTintColor={COLORS.lime}
                  style={styles.slider}
                />
              </ControlRow>
              <ControlRow label="ISO" value={`${Math.round(iso)}`}>
                <Slider
                  accessibilityLabel="ISO"
                  disabled={!isIOS || !device?.supportsExposureLocking}
                  minimumValue={isoRange.min}
                  maximumValue={isoRange.max}
                  step={Math.max(1, Math.round((isoRange.max - isoRange.min) / 100))}
                  value={iso}
                  onValueChange={setIso}
                  onSlidingComplete={(value) => {
                    setIso(value);
                    const currentController = cameraRef.current?.controller;
                    if (isIOS && currentController?.device.supportsExposureLocking) {
                      void runCameraAction(() => currentController.setExposureLocked(shutter, value));
                      setExposureLocked(true);
                    }
                  }}
                  minimumTrackTintColor={COLORS.lime}
                  maximumTrackTintColor="#495149"
                  thumbTintColor={COLORS.lime}
                  style={styles.slider}
                />
              </ControlRow>
              <ControlRow label={t('shutterLabel')} value={formatShutter(shutter)}>
                <Slider
                  accessibilityLabel={t('shutterSpeed')}
                  disabled={!isIOS || !device?.supportsExposureLocking}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={durationToProgress(shutter, shutterRange)}
                  onValueChange={(progress) => setShutter(progressToDuration(progress, shutterRange))}
                  onSlidingComplete={(progress) => {
                    const value = progressToDuration(progress, shutterRange);
                    setShutter(value);
                    const currentController = cameraRef.current?.controller;
                    if (isIOS && currentController?.device.supportsExposureLocking) {
                      void runCameraAction(() => currentController.setExposureLocked(value, iso));
                      setExposureLocked(true);
                    }
                  }}
                  minimumTrackTintColor={COLORS.lime}
                  maximumTrackTintColor="#495149"
                  thumbTintColor={COLORS.lime}
                  style={styles.slider}
                />
              </ControlRow>
              <View style={styles.presetRow}>
                {['AUTO', '1/60', '1/125', '1/250', '1/500'].map((value, index) => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      if (index === 0) {
                        setExposureLocked(false);
                        setFocusLocked(false);
                        setWhiteBalanceLocked(false);
                        void runCameraAction(() => cameraRef.current?.controller?.resetFocus() ?? Promise.resolve());
                      } else {
                        const nextShutter = 1 / Number(value.slice(2));
                        setShutter(nextShutter);
                        setExposureLocked(true);
                        void runCameraAction(() => cameraRef.current?.controller?.setExposureLocked(nextShutter, iso) ?? Promise.resolve());
                      }
                    }}
                    style={[styles.preset, index === 0 && !exposureLocked && styles.presetActive, index > 0 && exposureLocked && shutter === 1 / Number(value.slice(2)) && styles.presetActive]}
                  >
                    <Text style={[styles.presetText, (index === 0 && !exposureLocked) || (index > 0 && exposureLocked && shutter === 1 / Number(value.slice(2))) ? styles.presetTextActive : null]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {panel === 'focus' && (
            <>
              <ControlRow label={focusLocked ? t('focusManual') : t('focusAuto')} value={focusLocked ? lensPosition.toFixed(2) : 'AF'}>
                <Slider
                  accessibilityLabel={t('manualFocus')}
                  disabled={!isIOS || !device?.supportsFocusLocking}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={lensPosition}
                  onValueChange={setLensPosition}
                  onSlidingComplete={(value) => {
                    setLensPosition(value);
                    const currentController = cameraRef.current?.controller;
                    if (isIOS && currentController?.device.supportsFocusLocking) {
                      void runCameraAction(() => currentController.setFocusLocked(value));
                      setFocusLocked(true);
                    }
                  }}
                  minimumTrackTintColor={COLORS.lime}
                  maximumTrackTintColor="#495149"
                  thumbTintColor={COLORS.lime}
                  style={styles.slider}
                />
              </ControlRow>
              <View style={styles.focusActions}>
                <Pressable
                  style={styles.focusAction}
                  onPress={() => {
                    if (focusLocked) {
                      toggleFocusLock();
                    } else {
                      void runCameraAction(() => cameraRef.current?.controller?.lockCurrentFocus() ?? Promise.resolve());
                      setFocusLocked(true);
                    }
                  }}
                >
                  <Focus color={COLORS.lime} size={16} />
                  <Text style={styles.focusActionText}>{focusLocked ? t('restoreAutoFocus') : t('lockCurrentFocus')}</Text>
                </Pressable>
                <Text style={styles.capabilityText}>{isIOS ? t('iosManualLens') : t('manualFocusIosOnly')}</Text>
              </View>
            </>
          )}

          {panel === 'white-balance' && (
            <View style={styles.wbContent}>
              <View>
                <Text style={styles.controlLabel}>{t('whiteBalance')}</Text>
                <Text style={styles.controlValue}>{whiteBalanceLocked ? t('locked') : t('autoWhiteBalance')}</Text>
              </View>
              <Pressable
                style={[styles.wbButton, whiteBalanceLocked && styles.wbButtonActive]}
                onPress={toggleWhiteBalanceLock}
                accessibilityRole="button"
                accessibilityLabel={whiteBalanceLocked ? t('unlockWb') : t('lockCurrentWb')}
              >
                <LockKeyhole color={whiteBalanceLocked ? COLORS.black : COLORS.lime} size={16} />
                <Text style={[styles.wbButtonText, whiteBalanceLocked && styles.wbButtonTextActive]}>{whiteBalanceLocked ? t('locked') : t('lockCurrentValue')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.cameraControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('recentPhoto')}
            onPress={() => latestPhoto && Alert.alert(t('recentShot'), t('savedToAlbum'))}
            style={styles.thumbnailButton}
          >
            {latestPhoto ? <Image source={{ uri: latestPhoto }} style={styles.thumbnail} /> : <ImageIcon color={COLORS.white} size={21} strokeWidth={1.5} />}
          </Pressable>

          <View style={styles.captureCluster}>
            <View style={styles.modeSwitch}>
              <Pressable onPress={() => Alert.alert(t('videoFeature'), t('videoRoadmap'))} style={styles.modeItem}>
                <Text style={styles.modeText}>{t('videoMode')}</Text>
              </Pressable>
              <View style={styles.modeItem}>
                <Text style={[styles.modeText, styles.modeTextActive]}>{t('photoMode')}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('takePhoto')}
              disabled={isCapturing || !isReady}
              onPress={() => void capturePhoto()}
              style={[styles.shutterOuter, isCapturing && styles.shutterDisabled]}
            >
              <View style={styles.shutterInner} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('flipCamera')}
            onPress={() => setCameraPosition((position) => (position === 'back' ? 'front' : 'back'))}
            style={styles.flipButton}
          >
            <Aperture color={COLORS.white} size={22} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t('roadmapFooter')}</Text>
          <CircleHelp color={COLORS.muted} size={14} />
          <ChevronDown color={COLORS.muted} size={14} />
        </View>
      </View>
    </View>
  );
}

function PanelTab({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.panelTab}>
      <Text style={[styles.panelTabText, active && styles.panelTabTextActive]}>{title}</Text>
      {active && <View style={styles.panelTabIndicator} />}
    </Pressable>
  );
}

function ControlRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <View style={styles.controlRow}>
      <View style={styles.controlMeta}>
        <Text style={styles.controlLabel}>{label}</Text>
        <Text style={styles.controlValue}>{value}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  previewFallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#101410' },
  previewMark: { width: 132, height: 132, borderWidth: 1, borderColor: '#52604C', borderRadius: 66, marginBottom: 26, alignItems: 'center', justifyContent: 'center' },
  fallbackEyebrow: { color: COLORS.lime, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 12 },
  fallbackTitle: { color: COLORS.white, fontSize: 24, fontFamily: 'Georgia' },
  fallbackCopy: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  permissionButton: { backgroundColor: COLORS.lime, paddingHorizontal: 20, paddingVertical: 13, marginTop: 22 },
  permissionButtonText: { color: COLORS.black, fontWeight: '700', fontSize: 13 },
  vignette: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 8, 5, 0.15)' },
  grid: { ...StyleSheet.absoluteFill, top: '17%', bottom: '42%', alignItems: 'center', justifyContent: 'center', opacity: 0.22 },
  gridVertical: { position: 'absolute', width: '33.3%', height: '100%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E5EEE0' },
  gridHorizontal: { position: 'absolute', height: '33.3%', width: '100%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5EEE0' },
  topBar: { position: 'absolute', top: 52, left: 22, right: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: COLORS.white, fontFamily: 'Georgia', fontSize: 25, letterSpacing: 2 },
  wordmarkSub: { color: '#B7BFB2', fontSize: 8, fontFamily: 'monospace', letterSpacing: 1.2, marginTop: 4 },
  topActions: { flexDirection: 'row', gap: 7 },
  iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,10,8,0.38)', borderWidth: 1, borderColor: 'rgba(243,245,239,0.17)' },
  langButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  readoutRow: { position: 'absolute', top: 120, left: 22, right: 22, flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: { height: 24, paddingHorizontal: 8, backgroundColor: 'rgba(8,10,8,0.55)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red },
  liveText: { color: COLORS.white, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  readoutText: { color: '#D5DBD1', fontSize: 10, fontFamily: 'monospace' },
  flashButton: { marginLeft: 'auto', width: 34, height: 34, backgroundColor: 'rgba(8,10,8,0.38)', alignItems: 'center', justifyContent: 'center' },
  centerSpacer: { flex: 1 },
  meterArea: { position: 'absolute', left: 22, right: 22, bottom: 348, gap: 13 },
  exposureMeter: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterText: { color: COLORS.white, fontSize: 10, fontFamily: 'monospace', width: 38 },
  meterTrack: { flex: 1, height: 14, justifyContent: 'center' },
  meterCenter: { position: 'absolute', left: '50%', height: 8, width: 1, backgroundColor: '#D4DCD0' },
  meterIndicator: { position: 'absolute', width: 5, height: 14, backgroundColor: COLORS.lime },
  meterLock: { width: 48, textAlign: 'right', color: COLORS.muted, fontSize: 8, fontFamily: 'monospace' },
  histogram: { height: 45, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'flex-end', gap: 2, backgroundColor: 'rgba(8,10,8,0.52)' },
  histogramBar: { flex: 1, backgroundColor: COLORS.lime, minHeight: 2 },
  exposureReadouts: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readoutStrong: { color: COLORS.white, fontSize: 10, fontFamily: 'monospace', fontWeight: '700' },
  readoutDivider: { width: 1, height: 11, backgroundColor: 'rgba(243,245,239,0.3)' },
  bottomDock: { minHeight: 324, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 30, backgroundColor: 'rgba(8,10,8,0.94)', borderTopWidth: 1, borderColor: 'rgba(243,245,239,0.12)' },
  panelTabs: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.line },
  panelTab: { height: 38, minWidth: 82, alignItems: 'center', justifyContent: 'center' },
  panelTabText: { color: COLORS.muted, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  panelTabTextActive: { color: COLORS.lime },
  panelTabIndicator: { position: 'absolute', bottom: -1, left: 18, right: 18, height: 2, backgroundColor: COLORS.lime },
  lockButton: { marginLeft: 'auto', width: 31, height: 31, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  lockButtonActive: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  controlContent: { minHeight: 120, paddingTop: 17 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 49 },
  controlMeta: { width: 72 },
  controlLabel: { color: COLORS.muted, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },
  controlValue: { color: COLORS.white, fontSize: 13, fontFamily: 'monospace', marginTop: 4 },
  slider: { flex: 1, height: 34 },
  presetRow: { flexDirection: 'row', gap: 6, marginLeft: 87, marginTop: 8 },
  preset: { minWidth: 47, height: 28, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  presetActive: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  presetText: { color: '#A8B0A5', fontSize: 8, fontFamily: 'monospace' },
  presetTextActive: { color: COLORS.black, fontWeight: '700' },
  focusActions: { marginLeft: 87, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  focusAction: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  focusActionText: { color: COLORS.white, fontSize: 10 },
  capabilityText: { color: COLORS.muted, fontSize: 8, fontFamily: 'monospace' },
  wbContent: { minHeight: 98, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wbButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.line },
  wbButtonActive: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  wbButtonText: { color: COLORS.lime, fontSize: 10, fontWeight: '700' },
  wbButtonTextActive: { color: COLORS.black },
  cameraControls: { height: 93, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  thumbnailButton: { width: 46, height: 46, borderWidth: 1, borderColor: '#687268', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  captureCluster: { alignItems: 'center', justifyContent: 'center' },
  modeSwitch: { flexDirection: 'row', gap: 19, marginBottom: 10 },
  modeItem: { minWidth: 48, alignItems: 'center' },
  modeText: { color: COLORS.muted, fontSize: 8, fontFamily: 'monospace', fontWeight: '700' },
  modeTextActive: { color: COLORS.lime },
  shutterOuter: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  shutterDisabled: { opacity: 0.45 },
  shutterInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.white },
  flipButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  footerRow: { height: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  footerText: { color: COLORS.muted, fontSize: 7, fontFamily: 'monospace', letterSpacing: 0.5 },
});
