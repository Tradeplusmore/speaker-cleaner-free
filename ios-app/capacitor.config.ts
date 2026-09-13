import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tradeplusmore.speakercleaner',
  appName: 'Speaker Cleaner',
  webDir: 'www',
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    backgroundColor: '#000000'
  }
};

export default config;