export interface MetadataProfile {
  id: string;
  filename: string;
  size: number; // in bytes
  mimeType: string;
  riskScore: number; // 0 - 100
  verdict: "LOW" | "MEDIUM" | "HIGH" | "FORENSIC CRITICAL";
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    timestamp?: string;
    precision?: string;
  };
  device?: {
    make?: string;
    model?: string;
    serialNumber?: string;
    lensModel?: string;
    software?: string;
  };
  author?: {
    creator?: string;
    artist?: string;
    copyright?: string;
  };
  aiTrace?: {
    traceabilityScore: number; // 0 - 100
    promptDetected?: string;
    generatorTool?: string;
    manifestPresent: boolean;
    watermarkFootprint: "None" | "LSB Steganography" | "Frequency Matrix Pattern" | "C2PA Verified";
    aiWatermarkConfidence: number; // 0 - 100
  };
  structureConflicts: string[];
}

export type CleanProfile = "NUCLEAR" | "STEALTH" | "CREATIVE" | "SOCIAL" | "CUSTOM";

export interface CleanTemplate {
  id: CleanProfile;
  name: string;
  description: string;
  removeGPS: boolean;
  spoofGPS: boolean;
  removeIdentity: boolean;
  removeDevice: boolean;
  removeAI?: boolean;
  randomizeTimestamps: boolean;
  recompress: boolean;
}

export interface VaultItem {
  id: string;
  filename: string;
  mimeType: string;
  originalSize: number;
  encryptedSize: number;
  addedAt: string;
  thumbnailUrl?: string;
}

export interface SecurityTip {
  title: string;
  category: "Location" | "Device" | "Identity" | "AI Trace" | "General";
  riskDetails: string;
  advice: string;
}

export interface BatchItem {
  id: string;
  filename: string;
  size: number;
  status: "idle" | "scanning" | "scanned" | "cleaning" | "completed" | "failed";
  profile?: MetadataProfile;
  error?: string;
}
