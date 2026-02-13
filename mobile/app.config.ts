import "dotenv/config";
import type { ConfigContext, ExpoConfig } from "expo/config";

const kisscamBaseUrl = process.env.KISSCAM_BASE_URL || "https://kisscam.fzdomain.cloud";
const uploadToken = process.env.UPLOAD_TOKEN || "CHANGE_ME";
const androidPackage = process.env.ANDROID_APPLICATION_ID || "cloud.fzdomain.kisscam";
const iosBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER || "cloud.fzdomain.kisscam";
const easProjectId = process.env.EAS_PROJECT_ID || "e128507d-4336-4153-97d8-2b6f9b24f6f2";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Kiss Cam Operator",
  slug: "kisscam-fzdomain-mobile",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "kisscam",
  plugins: ["expo-camera"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: iosBundleIdentifier,
  },
  android: {
    permissions: ["CAMERA"],
    package: androidPackage,
  },
  extra: {
    kisscamBaseUrl,
    uploadToken,
    androidPackage,
    iosBundleIdentifier,
    eas: {
      projectId: easProjectId,
    },
  },
});
