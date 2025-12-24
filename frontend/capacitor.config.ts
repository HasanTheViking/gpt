import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.smartshopping",
  appName: "Smart Shopping List",
  webDir: "dist",
  server: {
    cleartext: true
  }
};

export default config;
