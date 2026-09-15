import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const iosDir = resolve(join(here, '..', 'ios', 'App', 'App'));
const plistPath = join(iosDir, 'Info.plist');
const appDelegatePath = join(iosDir, 'AppDelegate.swift');

function patchInfoPlist() {
  let plist = readFileSync(plistPath, 'utf8');

  const backgroundModes = `\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>audio</string>\n\t</array>\n`;
  if (!plist.includes('<key>UIBackgroundModes</key>')) {
    plist = plist.replace('</dict>\n</plist>', `${backgroundModes}</dict>\n</plist>`);
  }

  const micUsage = `\t<key>NSMicrophoneUsageDescription</key>\n\t<string>Il microfono serve solo per l'analizzatore audio e la misura del livello ambientale, quando li avvii tu.</string>\n`;
  if (!plist.includes('<key>NSMicrophoneUsageDescription</key>')) {
    plist = plist.replace('</dict>\n</plist>', `${micUsage}</dict>\n</plist>`);
  }

  writeFileSync(plistPath, plist);
  console.log('Info.plist aggiornato (UIBackgroundModes audio + permesso microfono)');
}

function patchAppDelegate() {
  let swift = readFileSync(appDelegatePath, 'utf8');

  if (!swift.includes('import AVFoundation')) {
    swift = swift.replace('import UIKit', 'import UIKit\nimport AVFoundation');
  }

  const audioSessionCode = `        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            NSLog("SpeakerCleaner: impossibile configurare la sessione audio")
        }`;

  if (!swift.includes('AVAudioSession.sharedInstance()')) {
    swift = swift.replace('        return true', audioSessionCode + '\n        return true');
  }

  writeFileSync(appDelegatePath, swift);
  console.log('AppDelegate.swift aggiornato (AVAudioSession playback)');
}

patchInfoPlist();
patchAppDelegate();