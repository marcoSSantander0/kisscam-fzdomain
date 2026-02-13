import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { appConfig } from "./src/config";

type Tab = "capture" | "history";
type CaptureScreen = "camera" | "preview";
type UploadState = "idle" | "uploading" | "ok" | "error";

type ImageItem = {
  id: string;
  url: string;
  createdAt: string;
};

type FrameOption = {
  id: string;
  label: string;
  source: ImageSourcePropType | null;
};

const HISTORY_POLL_MS = 5000;

const FRAME_OPTIONS: FrameOption[] = [
  { id: "none", label: "Sin marco", source: null },
  { id: "frame-1", label: "Corazones", source: require("./assets/frames/frame-1.png") },
  { id: "frame-2", label: "Lazos", source: require("./assets/frames/frame-2.png") },
  { id: "frame-3", label: "Brillo", source: require("./assets/frames/frame-3.png") },
  { id: "frame-4", label: "Polaroid", source: require("./assets/frames/frame-4.png") },
  { id: "frame-5", label: "Rayas", source: require("./assets/frames/frame-5.png") },
  { id: "frame-6", label: "Noche", source: require("./assets/frames/frame-6.png") },
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

export default function App() {
  const cameraRef = useRef<CameraView | null>(null);
  const { height, width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [tab, setTab] = useState<Tab>("capture");
  const [captureScreen, setCaptureScreen] = useState<CaptureScreen>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [captureMessage, setCaptureMessage] = useState<string>("");
  const [selectedFrameId, setSelectedFrameId] = useState("none");
  const [historyItems, setHistoryItems] = useState<ImageItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const baseUrl = normalizeBaseUrl(appConfig.kisscamBaseUrl);
  const isLandscape = width > height;
  const selectedFrame = FRAME_OPTIONS.find((item) => item.id === selectedFrameId) ?? FRAME_OPTIONS[0];

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
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
      if (!picture?.uri) {
        setCaptureMessage("No se pudo capturar la foto.");
        return;
      }
      setPhotoUri(picture.uri);
      setCaptureScreen("preview");
      setUploadState("idle");
      setSelectedFrameId("none");
    } catch (error) {
      console.error("takePhoto error:", error);
      setCaptureMessage("Error al tomar foto.");
    }
  };

  const uploadPhoto = () => {
    if (!photoUri) {
      return;
    }

    if (!appConfig.uploadToken || appConfig.uploadToken === "CHANGE_ME") {
      setUploadState("error");
      setCaptureMessage("Configura UPLOAD_TOKEN en .env.");
      return;
    }

    const formData = new FormData();
    formData.append(
      "photo",
      {
        uri: photoUri,
        name: `kisscam-${Date.now()}.jpg`,
        type: "image/jpeg",
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
      <SafeAreaView style={styles.centeredDark}>
        <ActivityIndicator size="large" color="#e53f73" />
        <Text style={styles.helperText}>Cargando permisos de camara...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centeredDark}>
        <Text style={styles.helperText}>Se requiere permiso de camara.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Conceder permiso</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={tab === "history" ? "dark" : "light"} />

      {tab === "capture" ? (
        <>
          {captureScreen === "camera" ? (
            <View style={styles.cameraScreen}>
              <View style={styles.captureTopBar}>
                <Text style={styles.captureTitle}>Kiss Cam Operador</Text>
                <Pressable style={styles.secondaryBtnDark} onPress={() => setTab("history")}>
                  <Text style={styles.secondaryBtnTextLight}>Historial</Text>
                </Pressable>
              </View>
              <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
              <View style={styles.captureBottomBar}>
                <Text style={styles.endpointText}>{baseUrl}</Text>
                <Pressable style={styles.primaryBtn} onPress={takePhoto}>
                  <Text style={styles.primaryBtnText}>Tomar foto</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {captureScreen === "preview" && photoUri ? (
            <View style={styles.previewScreen}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Previsualizacion</Text>
                <Pressable style={styles.secondaryBtn} onPress={() => setTab("history")}>
                  <Text style={styles.secondaryBtnText}>Historial</Text>
                </Pressable>
              </View>

              <View
                style={[
                  styles.previewStage,
                  {
                    height: isLandscape ? Math.max(220, Math.floor(height * 0.58)) : Math.max(320, Math.floor(height * 0.48)),
                  },
                ]}
              >
                <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                {selectedFrame.source ? (
                  <Image source={selectedFrame.source} style={styles.previewOverlay} resizeMode="cover" />
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frameList}>
                {FRAME_OPTIONS.map((frame) => (
                  <Pressable
                    key={frame.id}
                    style={frame.id === selectedFrameId ? styles.frameCardActive : styles.frameCard}
                    onPress={() => setSelectedFrameId(frame.id)}
                  >
                    {frame.source ? (
                      <Image source={frame.source} style={styles.frameThumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.frameThumbEmpty}>
                        <Text style={styles.frameThumbEmptyText}>Sin marco</Text>
                      </View>
                    )}
                    <Text style={styles.frameLabel}>{frame.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.previewActions}>
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
                    setPhotoUri(null);
                    setUploadState("idle");
                    setCaptureMessage("");
                  }}
                >
                  <Text style={styles.secondaryBtnText}>Nueva foto</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </>
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
          <Text style={styles.historyHint}>Auto-refresh cada 5 segundos.</Text>
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
  },
  captureTopBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f0d11",
  },
  captureTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  cameraView: {
    flex: 1,
  },
  captureBottomBar: {
    padding: 14,
    gap: 10,
    backgroundColor: "#0f0d11",
  },
  endpointText: {
    color: "#bca9b5",
    fontSize: 12,
    textAlign: "center",
  },
  previewScreen: {
    flex: 1,
    backgroundColor: "#fff7fa",
    padding: 12,
    gap: 10,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewTitle: {
    color: "#2f2430",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  previewStage: {
    width: "100%",
    borderRadius: 0,
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
  },
  frameCard: {
    width: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ead7df",
    backgroundColor: "#fff",
    padding: 5,
  },
  frameCardActive: {
    width: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e53f73",
    backgroundColor: "#fff",
    padding: 5,
  },
  frameThumb: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 0,
  },
  frameThumbEmpty: {
    width: "100%",
    aspectRatio: 3 / 4,
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
    flexDirection: "row",
    justifyContent: "space-between",
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
  secondaryBtnDark: {
    backgroundColor: "#25202a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  secondaryBtnText: {
    color: "#2f2430",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryBtnTextLight: {
    color: "#f8ecf2",
    fontWeight: "600",
    fontSize: 14,
  },
  helperText: {
    color: "#d6c5cf",
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
    padding: 12,
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
    marginBottom: 6,
  },
  historyHint: {
    textAlign: "center",
    color: "#6f5d68",
    marginBottom: 8,
  },
  historyList: {
    gap: 10,
    paddingBottom: 20,
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
    height: 240,
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
