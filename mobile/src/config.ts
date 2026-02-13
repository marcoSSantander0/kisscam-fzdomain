import Constants from "expo-constants";

type Extra = {
  kisscamBaseUrl?: string;
  uploadToken?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const appConfig = {
  kisscamBaseUrl: trimSlash(extra.kisscamBaseUrl || "https://kisscam.fzdomain.cloud"),
  uploadToken: extra.uploadToken || "",
};
