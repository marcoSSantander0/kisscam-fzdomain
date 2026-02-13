import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { appConfig } from "./src/config";

type Tab = "capture" | "history";
type CaptureScreen = "camera" | "preview";
type UploadState = "idle" | "uploading" | "ok" | "error";

type ImageItem = {
  id: string;
  url: string;
  createdAt: string;
};

type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
  mimeType: "image/jpeg" | "image/png";
};

type FrameOption = {
  id: string;
  label: string;
  portraitSource: ImageSourcePropType | null;
  landscapeSource: ImageSourcePropType | null;
};

const HISTORY_POLL_MS = 5000;

const FRAME_OPTIONS: FrameOption[] = [
  { id: "none", label: "Sin marco", portraitSource: null, landscapeSource: null },
  {
    id: "frame-1",
    label: "Corazones",
    portraitSource: require("./assets/frames/frame-1-portrait.png"),
    landscapeSource: require("./assets/frames/frame-1-landscape.png"),
  },
  {
    id: "frame-2",
    label: "Lazos",
    portraitSource: require("./assets/frames/frame-2-portrait.png"),
    landscapeSource: require("./assets/frames/frame-2-landscape.png"),
  },
  {
    id: "frame-3",
    label: "Brillos",
    portraitSource: require("./assets/frames/frame-3-portrait.png"),
    landscapeSource: require("./assets/frames/frame-3-landscape.png"),
  },
  {
    id: "frame-4",
    label: "Flores",
    portraitSource: require("./assets/frames/frame-4-portrait.png"),
    landscapeSource: require("./assets/frames/frame-4-landscape.png"),
  },
  {
    id: "frame-5",
    label: "Doble borde",
    portraitSource: require("./assets/frames/frame-5-portrait.png"),
    landscapeSource: require("./assets/frames/frame-5-landscape.png"),
  },
  {
    id: "frame-6",
    label: "Noche romantica",
    portraitSource: require("./assets/frames/frame-6-portrait.png"),
    landscapeSource: require("./assets/frames/frame-6-landscape.png"),
  },
];

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function absoluteImageUrl(baseUrl: string, url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function resolveFrameSource(frame: FrameOption, isLandscapePhoto: boolean): ImageSourcePropType | null {
  if (isLandscapePhoto) {
    return frame.landscapeSource ?? frame.portraitSource;
  }
  return frame.portraitSource ?? frame.landscapeSource;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <KissCamApp />
    </SafeAreaProvider>
  );
}

function KissCamApp() {
  const cameraRef = useRef<CameraView | null>(null);
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [tab, setTab] = useState<Tab>("capture");
  const [captureScreen, setCaptureScreen] = useState<CaptureScreen>("camera");
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [captureMessage, setCaptureMessage] = useState<string>("");
  const [selectedFrameId, setSelectedFrameId] = useState("none");
  const [historyItems, setHistoryItems] = useState<ImageItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const baseUrl = normalizeBaseUrl(appConfig.kisscamBaseUrl);
  const isScreenLandscape = width > height;

  const selectedFrame = useMemo(
    () => FRAME_OPTIONS.find((item) => item.id === selectedFrameId) ?? FRAME_OPTIONS[0],
    [selectedFrameId],
  );

  const previewAspectRatio = useMemo(() => {
    if (capturedPhoto && capturedPhoto.height > 0) {
      return capturedPhoto.width / capturedPhoto.height;
    }
    return isScreenLandscape ? 16 / 9 : 3 / 4;
  }, [capturedPhoto, isScreenLandscape]);

  const isLandscapePhoto = capturedPhoto ? capturedPhoto.width > capturedPhoto.height : isScreenLandscape;
  const selectedFrameSource = resolveFrameSource(selectedFrame, isLandscapePhoto);
  const previewMaxWidth = Math.min(width - 24, isScreenLandscape ? 900 : 700);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => {
      // Keep app usable even if lock is not available on current platform.
    });

    return () => {
      void ScreenOrientation.unlockAsync().catch(() => {
        // no-op
      });
    };
  }, []);

  const fetchHistory = useCallback(
    async (manual = false) => {
      if (manual) {
        setHistoryLoading(true);
      }

      try {
        const response = await fetch(`${baseUrl}/api/images`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`GET /api/images ${response.status}`);
        }

        const payload = (await response.json()) as ImageItem[];
        setHistoryItems(Array.isArray(payload) ? payload : []);
        setHistoryError(null);
      } catch (error) {
        console.error("fetchHistory error:", error);
        setHistoryError("No se pudo cargar historial del servidor.");
      } finally {
        if (manual) {
          setHistoryLoading(false);
        }
      }
    },
    [baseUrl],
  );

  useEffect(() => {
    if (tab !== "history") {
      return;
    }

    void fetchHistory(true);
    const timer = setInterval(() => {
      void fetchHistory();
    }, HISTORY_POLL_MS);

    return () => clearInterval(timer);
  }, [fetchHistory, tab]);

  const takePhoto = async () => {
    try {
      setCaptureMessage("");

      const picture = await cameraRef.current?.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
        exif: false,
      });

      if (!picture?.uri) {
        setCaptureMessage("No se pudo capturar la foto.");
        return;
      }

      const normalized = await ImageManipulator.manipulateAsync(picture.uri, [], {
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      if (!normalized?.uri || !normalized.width || !normalized.height) {
        setCaptureMessage("No se pudo procesar la foto.");
        return;
      }

      setCapturedPhoto({
        uri: normalized.uri,
        width: normalized.width,
        height: normalized.height,
        mimeType: "image/jpeg",
      });
      setCaptureScreen("preview");
      setUploadState("idle");
      setSelectedFrameId("none");
    } catch (error) {
      console.error("takePhoto error:", error);
      setCaptureMessage("Error al tomar foto.");
    }
  };

  const uploadPhoto = () => {
    if (!capturedPhoto) {
      return;
    }

    if (!appConfig.uploadToken || appConfig.uploadToken === "CHANGE_ME") {
      setUploadState("error");
      setCaptureMessage("Configura UPLOAD_TOKEN en .env.");
      return;
    }

    const extension = capturedPhoto.mimeType === "image/png" ? "png" : "jpg";
    const formData = new FormData();
    formData.append(
      "photo",
      {
        uri: capturedPhoto.uri,
        name: `kisscam-${Date.now()}.${extension}`,
        type: capturedPhoto.mimeType,
      } as never,
    );

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/api/upload`);
    xhr.setRequestHeader("X-Upload-Token", appConfig.uploadToken);

    xhr.onloadstart = () => {
      setUploadState("uploading");
      setCaptureMessage("Subiendo...");
    };

    xhr.onerror = () => {
      setUploadState("error");
      setCaptureMessage("Error de red al subir.");
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadState("ok");
        setCaptureMessage("Foto subida correctamente.");
        void fetchHistory();
        return;
      }

      let errorText = `Error de subida (${xhr.status}).`;
      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string };
        if (payload.error) {
          errorText = payload.error;
        }
      } catch {
        // fallback
      }
      setUploadState("error");
      setCaptureMessage(errorText);
    };

    xhr.send(formData);
  };

  const deleteImage = async (id: string) => {
    if (!appConfig.uploadToken || appConfig.uploadToken === "CHANGE_ME") {
      setHistoryError("Configura UPLOAD_TOKEN para eliminar fotos.");
      return;
    }

    setDeletingId(id);
    setHistoryError(null);

    try {
      const response = await fetch(`${baseUrl}/api/images/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          "X-Upload-Token": appConfig.uploadToken,
        },
      });

      if (!response.ok) {
        let errorText = `No se pudo eliminar (${response.status}).`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) {
            errorText = payload.error;
          }
        } catch {
          // fallback
        }
        throw new Error(errorText);
      }

      setHistoryItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("deleteImage error:", error);
      if (error instanceof Error) {
        setHistoryError(error.message);
      } else {
        setHistoryError("No se pudo eliminar la imagen.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const askDeleteImage = (id: string) => {
    Alert.alert("Eliminar foto", "Esta accion no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void deleteImage(id);
        },
      },
    ]);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centeredDark} edges={["top", "bottom"]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#e53f73" />
        <Text style={styles.helperText}>Cargando permisos de camara...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centeredDark} edges={["top", "bottom"]}>
        <StatusBar style="light" />
        <Text style={styles.helperText}>Se requiere permiso de camara.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Conceder permiso</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={tab === "capture" && captureScreen === "camera" ? [] : ["top", "bottom"]}>
      <StatusBar style={tab === "capture" && captureScreen === "camera" ? "light" : "dark"} />

      {tab === "capture" && captureScreen === "camera" ? (
        <View style={styles.cameraScreen}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />

          <View
            style={[
              styles.cameraOverlay,
              {
                paddingTop: insets.top + 10,
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            <View style={styles.captureTopBar}>
              <Pressable style={styles.topBarBtn} onPress={() => setTab("history")}>
                <Text style={styles.topBarBtnText}>Historial</Text>
              </Pressable>
              <Text style={styles.captureTitle}>Kiss Cam Operador</Text>
              <View style={styles.topBarSpacer} />
            </View>

            <View style={styles.captureBottomBar}>
              <Text style={styles.endpointText} numberOfLines={1}>
                {baseUrl}
              </Text>
              <Pressable style={styles.shutterOuter} onPress={takePhoto} accessibilityLabel="Tomar foto">
                <View style={styles.shutterInner} />
              </Pressable>
              <Text style={styles.captureHint}>Toca para capturar</Text>
              {captureMessage ? <Text style={styles.helperText}>{captureMessage}</Text> : null}
            </View>
          </View>
        </View>
      ) : null}

      {tab === "capture" && captureScreen === "preview" && capturedPhoto ? (
        <View style={styles.previewScreen}>
          <View style={styles.previewHeader}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                setCaptureScreen("camera");
                setUploadState("idle");
                setCaptureMessage("");
              }}
            >
              <Text style={styles.secondaryBtnText}>Repetir</Text>
            </Pressable>
            <Text style={styles.previewTitle}>Previsualizacion</Text>
            <Pressable style={styles.secondaryBtn} onPress={() => setTab("history")}>
              <Text style={styles.secondaryBtnText}>Historial</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.previewScroll}
            contentContainerStyle={styles.previewScrollContent}
          >
            <View style={[styles.previewStage, { width: previewMaxWidth, aspectRatio: previewAspectRatio }]}>
              <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} resizeMode="cover" />
              {selectedFrameSource ? <Image source={selectedFrameSource} style={styles.previewOverlay} resizeMode="stretch" /> : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frameList}>
              {FRAME_OPTIONS.map((frame) => {
                const frameSource = resolveFrameSource(frame, isLandscapePhoto);
                return (
                  <Pressable
                    key={frame.id}
                    style={frame.id === selectedFrameId ? styles.frameCardActive : styles.frameCard}
                    onPress={() => setSelectedFrameId(frame.id)}
                  >
                    {frameSource ? (
                      <Image source={frameSource} style={[styles.frameThumb, { aspectRatio: previewAspectRatio }]} resizeMode="stretch" />
                    ) : (
                      <View style={[styles.frameThumbEmpty, { aspectRatio: previewAspectRatio }]}>
                        <Text style={styles.frameThumbEmptyText}>Sin marco</Text>
                      </View>
                    )}
                    <Text style={styles.frameLabel}>{frame.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.previewActions}>
              <Pressable
                style={uploadState === "uploading" ? styles.primaryBtnDisabled : styles.primaryBtn}
                onPress={uploadPhoto}
                disabled={uploadState === "uploading"}
              >
                <Text style={styles.primaryBtnText}>{uploadState === "uploading" ? "Subiendo..." : "Subir"}</Text>
              </Pressable>
            </View>

            {captureMessage ? (
              <Text style={uploadState === "error" ? styles.errorText : styles.helperTextDark}>{captureMessage}</Text>
            ) : null}

            {uploadState === "ok" ? (
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  setCaptureScreen("camera");
                  setCapturedPhoto(null);
                  setUploadState("idle");
                  setCaptureMessage("");
                }}
              >
                <Text style={styles.secondaryBtnText}>Nueva foto</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {tab === "history" ? (
        <View style={styles.historyScreen}>
          <Text style={styles.historyTitle}>Historial del servidor</Text>
          <View style={styles.historyActions}>
            <Pressable style={styles.secondaryBtn} onPress={() => setTab("capture")}>
              <Text style={styles.secondaryBtnText}>Captura</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => void fetchHistory(true)} disabled={historyLoading}>
              <Text style={styles.secondaryBtnText}>{historyLoading ? "Actualizando..." : "Actualizar"}</Text>
            </Pressable>
          </View>

          {historyError ? <Text style={styles.errorText}>{historyError}</Text> : null}

          <FlatList
            data={historyItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.historyList}
            ListEmptyComponent={<Text style={styles.helperTextDark}>No hay fotos en el servidor.</Text>}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <Image source={{ uri: absoluteImageUrl(baseUrl, item.url) }} style={styles.historyImage} resizeMode="cover" />
                <View style={styles.historyMeta}>
                  <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                  <Pressable
                    style={deletingId === item.id ? styles.deleteBtnDisabled : styles.deleteBtn}
                    onPress={() => askDeleteImage(item.id)}
                    disabled={deletingId === item.id}
                  >
                    <Text style={styles.deleteBtnText}>{deletingId === item.id ? "Eliminando..." : "Eliminar"}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141016",
  },
  centeredDark: {
    flex: 1,
    backgroundColor: "#141016",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 12,
  },
  cameraScreen: {
    flex: 1,
    position: "relative",
  },
  cameraView: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  captureTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarBtn: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.44)",
    backgroundColor: "rgba(12,10,13,0.42)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  topBarBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  topBarSpacer: {
    minWidth: 92,
  },
  captureTitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  captureBottomBar: {
    alignItems: "center",
    gap: 9,
  },
  endpointText: {
    color: "#f3d7e0",
    fontSize: 12,
    textAlign: "center",
    backgroundColor: "rgba(12,10,13,0.35)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fff",
  },
  captureHint: {
    color: "#f3d7e0",
    fontSize: 12,
  },
  previewScreen: {
    flex: 1,
    backgroundColor: "#fff7fa",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  previewTitle: {
    color: "#2f2430",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    gap: 12,
    alignItems: "center",
  },
  previewStage: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#efe8ed",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  previewOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  frameList: {
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  frameCard: {
    width: 112,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ead7df",
    backgroundColor: "#fff",
    padding: 5,
  },
  frameCardActive: {
    width: 112,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e53f73",
    backgroundColor: "#fff",
    padding: 5,
  },
  frameThumb: {
    width: "100%",
    borderRadius: 0,
  },
  frameThumbEmpty: {
    width: "100%",
    borderRadius: 0,
    backgroundColor: "#f3edf2",
    alignItems: "center",
    justifyContent: "center",
  },
  frameThumbEmptyText: {
    color: "#6e5d66",
    fontSize: 11,
  },
  frameLabel: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 11,
    color: "#6c5a64",
  },
  previewActions: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#e53f73",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  primaryBtnDisabled: {
    backgroundColor: "#dfa0b8",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: "#eee4ea",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: "#2f2430",
    fontWeight: "600",
    fontSize: 14,
  },
  helperText: {
    color: "#f5e4eb",
    textAlign: "center",
  },
  helperTextDark: {
    color: "#6f5d68",
    textAlign: "center",
  },
  errorText: {
    color: "#b8224d",
    textAlign: "center",
  },
  historyScreen: {
    flex: 1,
    backgroundColor: "#fff7fa",
    paddingHorizontal: 12,
  },
  historyTitle: {
    textAlign: "center",
    color: "#2f2430",
    fontSize: 25,
    fontWeight: "700",
    marginBottom: 8,
  },
  historyActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  historyList: {
    gap: 10,
    flexGrow: 1,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1dbe4",
    borderRadius: 12,
    overflow: "hidden",
  },
  historyImage: {
    width: "100%",
    height: 220,
  },
  historyMeta: {
    padding: 10,
    gap: 8,
  },
  historyDate: {
    color: "#6e5d67",
    fontSize: 12,
  },
  deleteBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#b8224d",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteBtnDisabled: {
    alignSelf: "flex-start",
    backgroundColor: "#d68a9f",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
