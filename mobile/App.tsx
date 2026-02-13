import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { appConfig } from "./src/config";

type Screen = "camera" | "preview";
type UploadState = "idle" | "uploading" | "ok" | "error";

export default function App() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [screen, setScreen] = useState<Screen>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string>("");

  const takePhoto = async () => {
    try {
      setMessage("");
      const picture = await cameraRef.current?.takePictureAsync({
        quality: 0.9,
      });
      if (!picture?.uri) {
        setMessage("No se pudo capturar la foto.");
        return;
      }
      setPhotoUri(picture.uri);
      setScreen("preview");
      setUploadState("idle");
    } catch (error) {
      console.error("takePhoto error:", error);
      setMessage("Error al tomar foto.");
    }
  };

  const uploadPhoto = () => {
    if (!photoUri) {
      return;
    }

    if (!appConfig.uploadToken || appConfig.uploadToken === "CHANGE_ME") {
      setUploadState("error");
      setMessage("Configura UPLOAD_TOKEN en app config.");
      return;
    }

    const endpoint = `${appConfig.kisscamBaseUrl}/api/upload`;
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
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("X-Upload-Token", appConfig.uploadToken);

    xhr.onloadstart = () => {
      setUploadState("uploading");
      setMessage("Subiendo...");
    };

    xhr.onerror = () => {
      setUploadState("error");
      setMessage("Error de red al subir.");
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadState("ok");
        setMessage("Foto subida correctamente.");
        return;
      }

      let errorText = `Error de subida (${xhr.status}).`;
      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string };
        if (payload.error) {
          errorText = payload.error;
        }
      } catch {
        // fallback simple
      }
      setUploadState("error");
      setMessage(errorText);
    };

    xhr.send(formData);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#e53f73" />
        <Text style={styles.helperText}>Cargando permisos de camara...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.helperText}>Se requiere permiso de camara.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Conceder permiso</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {screen === "camera" ? (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.bottomBar}>
            <Text style={styles.title}>Kiss Cam Operador</Text>
            <Text style={styles.endpointText}>{appConfig.kisscamBaseUrl}</Text>
            <Pressable style={styles.primaryBtn} onPress={takePhoto}>
              <Text style={styles.primaryBtnText}>Tomar foto</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {screen === "preview" && photoUri ? (
        <View style={styles.previewWrap}>
          <Text style={styles.previewTitle}>Previsualizacion</Text>
          <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                setScreen("camera");
                setUploadState("idle");
                setMessage("");
              }}
            >
              <Text style={styles.secondaryBtnText}>Repetir</Text>
            </Pressable>
            <Pressable
              style={uploadState === "uploading" ? styles.primaryBtnDisabled : styles.primaryBtn}
              onPress={uploadPhoto}
              disabled={uploadState === "uploading"}
            >
              <Text style={styles.primaryBtnText}>
                {uploadState === "uploading" ? "Subiendo..." : "Subir"}
              </Text>
            </Pressable>
          </View>

          {message ? (
            <Text style={uploadState === "error" ? styles.errorText : styles.helperText}>{message}</Text>
          ) : null}

          {uploadState === "ok" ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                setScreen("camera");
                setPhotoUri(null);
                setUploadState("idle");
                setMessage("");
              }}
            >
              <Text style={styles.secondaryBtnText}>Nueva foto</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151217",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#151217",
    padding: 16,
  },
  cameraWrap: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  bottomBar: {
    padding: 14,
    gap: 10,
    backgroundColor: "#0f0d11",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  endpointText: {
    color: "#bca9b5",
    fontSize: 12,
    textAlign: "center",
  },
  previewWrap: {
    flex: 1,
    padding: 12,
    gap: 12,
    backgroundColor: "#fff7fa",
  },
  previewTitle: {
    color: "#2f2430",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  previewImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 14,
    backgroundColor: "#f2e7ec",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  primaryBtn: {
    backgroundColor: "#e53f73",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnDisabled: {
    backgroundColor: "#df8fad",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: "#efe5eb",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: "#2f2430",
    fontWeight: "600",
    fontSize: 15,
  },
  helperText: {
    color: "#6f5d68",
    textAlign: "center",
  },
  errorText: {
    color: "#b8224d",
    textAlign: "center",
  },
});
