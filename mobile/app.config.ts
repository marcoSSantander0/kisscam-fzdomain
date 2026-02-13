import "dotenv/config";
import type { ConfigContext, ExpoConfig } from "expo/config";

const kisscamBaseUrl = process.env.KISSCAM_BASE_URL || "https://kisscam.fzdomain.cloud";
const uploadToken = process.env.UPLOAD_TOKEN || "CHANGE_ME";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Kiss Cam Operator",
  slug: "kisscam-fzdomain-mobile",
  version: "1.0.0",
  orientation: "portrait",
  plugins: ["expo-camera"],
  ios: {
    supportsTablet: true,
  },
  android: {
    permissions: ["CAMERA"],
  },
  extra: {
    kisscamBaseUrl,
    uploadToken,
  },
});
