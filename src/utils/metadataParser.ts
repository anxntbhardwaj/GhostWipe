import { MetadataProfile } from "../types";

// Helper to convert array buffer to string safely, preventing RangeError
function bufferToString(buf: ArrayBuffer, offset: number, length: number): string {
  if (offset < 0 || offset >= buf.byteLength) return "";
  const actualLength = Math.min(length, buf.byteLength - offset);
  if (actualLength <= 0) return "";
  const bytes = new Uint8Array(buf, offset, actualLength);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] > 0 && bytes[i] < 128) {
      str += String.fromCharCode(bytes[i]);
    }
  }
  return str;
}

// Check PNG text chunks (frequently used by AI generators like Stable Diffusion / Midjourney)
function parsePngMetadata(buffer: ArrayBuffer): Record<string, string> {
  const metadata: Record<string, string> = {};
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < 8) return metadata;
    if (view.getUint32(0) !== 0x89504E47) return metadata;
    
    let offset = 8;
    while (offset < buffer.byteLength - 12) {
      const length = view.getUint32(offset);
      const type = bufferToString(buffer, offset + 4, 4);
      
      if (type === "tEXt" || type === "iTXt") {
        try {
          const sliceOffset = offset + 8;
          const actualLength = Math.min(length, buffer.byteLength - sliceOffset);
          if (actualLength > 0) {
            const textBytes = new Uint8Array(buffer, sliceOffset, actualLength);
            let nullIndex = -1;
            for (let i = 0; i < textBytes.length; i++) {
              if (textBytes[i] === 0) {
                nullIndex = i;
                break;
              }
            }
            if (nullIndex !== -1) {
              const decoder = new TextDecoder();
              const key = decoder.decode(textBytes.slice(0, nullIndex)).trim();
              const val = decoder.decode(textBytes.slice(nullIndex + 1)).trim();
              if (key && val) {
                metadata[key] = val;
              }
            }
          }
        } catch (e) {
          console.warn("Error reading PNG text chunk metadata:", e);
        }
      }
      
      offset += 12 + length; // Length (4) + Type (4) + Data + CRC (4)
    }
  } catch (err) {
    console.error("PNG parser error:", err);
  }
  return metadata;
}

// Very basic JPEG EXIF tag finder (scans for APP1 marker)
function parseJpegMetadata(buffer: ArrayBuffer): Record<string, string> {
  const metadata: Record<string, string> = {};
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < 4) return metadata;
    if (view.getUint16(0) !== 0xFFD8) return metadata; // Not a JPEG
    
    let offset = 2;
    const length = buffer.byteLength;
    
    while (offset < length - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) { // APP1 - EXIF marker
        const app1Length = view.getUint16(offset + 2);
        const exifHeader = bufferToString(buffer, offset + 4, 4);
        if (exifHeader === "Exif") {
          metadata["EXIF_PRESENT"] = "true";
        }
        offset += 2 + app1Length;
      } else if ((marker & 0xFF00) === 0xFF00) {
        if (marker === 0xFFD9 || marker === 0xFFDA) break; // Start of Scan or End of Image
        const sectionLength = view.getUint16(offset + 2);
        offset += 2 + sectionLength;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.error("JPEG parser error:", err);
  }
  return metadata;
}

// Basic PDF metadata dictionary text scanner
function parsePdfMetadata(buffer: ArrayBuffer): Record<string, string> {
  const text = bufferToString(buffer, 0, Math.min(buffer.byteLength, 50000));
  const metadata: Record<string, string> = {};
  
  const matches = {
    Author: /\/Author\s*\((.*?)\)/,
    Producer: /\/Producer\s*\((.*?)\)/,
    Creator: /\/Creator\s*\((.*?)\)/,
    CreationDate: /\/CreationDate\s*\(D:(.*?)\)/,
    Title: /\/Title\s*\((.*?)\)/,
  };
  
  for (const [key, regex] of Object.entries(matches)) {
    const match = text.match(regex);
    if (match && match[1]) {
      metadata[key] = match[1];
    }
  }
  return metadata;
}

// Consolidates native metadata with high-fidelity simulated vulnerabilities for immersive diagnostics
export function parseFileMetadata(file: File, buffer: ArrayBuffer, simulated: boolean = false): MetadataProfile {
  const id = Math.random().toString(36).substr(2, 9);
  const filename = file.name;
  const size = file.size;
  const mimeType = file.type || getFallbackMime(filename);
  
  let nativeTags: Record<string, string> = {};
  
  if (mimeType.includes("png")) {
    nativeTags = parsePngMetadata(buffer);
  } else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    nativeTags = parseJpegMetadata(buffer);
  } else if (mimeType.includes("pdf")) {
    nativeTags = parsePdfMetadata(buffer);
  }

  // Scan first 150KB of content as safe ASCII
  const textContent = bufferToString(buffer, 0, Math.min(buffer.byteLength, 150000));

  // Determine if it looks AI generated organically
  const hasAiKey = Object.keys(nativeTags).some(
    k => k.toLowerCase().includes("parameters") || k.toLowerCase().includes("prompt") || k.toLowerCase().includes("software") && nativeTags[k].toLowerCase().includes("diffusion")
  ) || textContent.includes("StableDiffusion") || textContent.includes("Midjourney") || textContent.includes("DALL-E");

  const nativePrompt = nativeTags["parameters"] || nativeTags["prompt"] || undefined;

  let gps = undefined;
  let device = undefined;
  let author = undefined;
  let aiTrace = undefined;
  const structureConflicts: string[] = [];

  if (simulated) {
    // ONLY run simulated mock metadata when simulated === true
    const simulatedLocations = [
      { latitude: 40.785091, longitude: -73.968285, altitude: 42, precision: "Highly Accurate (2m)", name: "Central Park, New York" },
      { latitude: 48.8584, longitude: 2.2945, altitude: 312, precision: "High Accuracy (5m)", name: "Eiffel Tower, Paris" },
      { latitude: 35.6586, longitude: 139.7454, altitude: 18, precision: "Cell Tower Triangulation (180m)", name: "Tokyo Tower, Japan" },
      { latitude: -33.8568, longitude: 151.2153, altitude: 4, precision: "Highly Accurate (1m)", name: "Sydney Opera House, Australia" }
    ];

    const simulatedCameras = [
      { make: "Apple", model: "iPhone 15 Pro Max", serialNumber: "APL-S88190XF72B", lensModel: "Apple Main 24mm f/1.78", software: "A17 Pro Custom Engine v17.4" },
      { make: "Sony", model: "ILCE-7RM5 (Alpha 7R V)", serialNumber: "SNY-9921098", lensModel: "FE 24-70mm F2.8 GM II", software: "Sony Firmware v2.01" },
      { make: "Canon", model: "EOS R6 Mark II", serialNumber: "CAN-009819A21", lensModel: "RF 50px F1.2 L USM", software: "Digital Photo Professional 4" },
      { make: "Fujifilm", model: "X-T5", serialNumber: "FUJ-XT5-80219", lensModel: "XF 35px F1.4 R", software: "FUJIFILM Camera App" }
    ];

    const simulatedAuthors = [
      { creator: "Anant Bhardwaj", artist: "@anxntbhardwaj", copyright: "Copyright © 2026. All rights reserved." },
      { creator: "John Whistleblower", artist: "Anonymous Source", copyright: "Creative Commons Zero (CC0)" },
      { creator: "PR Agency Media Liaison", artist: "Creative Services", copyright: "Internal Distribution Only" }
    ];

    const selectedLoc = simulatedLocations[Math.floor((filename.length) % simulatedLocations.length)];
    const selectedCam = simulatedCameras[Math.floor((filename.length + 3) % simulatedCameras.length)];
    const selectedAuth = simulatedAuthors[Math.floor((filename.length + 7) % simulatedAuthors.length)];

    gps = {
      latitude: selectedLoc.latitude,
      longitude: selectedLoc.longitude,
      altitude: selectedLoc.altitude,
      timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      precision: selectedLoc.precision
    };

    device = {
      make: selectedCam.make,
      model: selectedCam.model,
      serialNumber: selectedCam.serialNumber,
      lensModel: selectedCam.lensModel,
      software: nativeTags["Software"] || nativeTags["CreatorTool"] || selectedCam.software
    };

    author = {
      creator: nativeTags["Author"] || nativeTags["Artist"] || selectedAuth.creator,
      artist: selectedAuth.artist,
      copyright: nativeTags["Copyright"] || selectedAuth.copyright
    };

    // AI Trace Simulation
    const traceabilityScore = hasAiKey ? 95 : 78;
    aiTrace = {
      traceabilityScore,
      promptDetected: nativePrompt || "Hyper-realistic cybernetic hummingbird flying inside a deep obsidian biome, octane render, neon glass details, dark purple overlay, Space Grotesk layout, 120fps, high fidelity, fine art",
      generatorTool: hasAiKey ? "Stable Diffusion Automatic1111" : "Midjourney v6.1",
      manifestPresent: hasAiKey || Math.random() > 0.5,
      watermarkFootprint: hasAiKey ? "C2PA Verified" : "Frequency Matrix Pattern",
      aiWatermarkConfidence: hasAiKey ? 100 : 85
    };

    if (Math.random() > 0.4) {
      structureConflicts.push("Timestamp Conflict: Capture date indicates 2024, but Camera software logs firmwares released in 2026.");
    }
    if (Math.random() > 0.5) {
      structureConflicts.push("Physical Lens Inconsistency: Hardware listed as iPhone 15 wide sensor, but focal zoom EXIF indicates impossible DSLR 70mm lens coefficients.");
    }
  } else {
    // REAL & AUTHENTIC METADATA EXTRACTION
    // Parse real XMP metadata out of the text content if present
    const tiffMake = textContent.match(/<tiff:Make>(.*?)<\/tiff:Make>/i) || textContent.match(/tiff:Make="([^"]+)"/i) || textContent.match(/Make="([^"]+)"/i);
    const tiffModel = textContent.match(/<tiff:Model>(.*?)<\/tiff:Model>/i) || textContent.match(/tiff:Model="([^"]+)"/i) || textContent.match(/Model="([^"]+)"/i);
    const auxLens = textContent.match(/<aux:LensModel>(.*?)<\/aux:LensModel>/i) || textContent.match(/aux:LensModel="([^"]+)"/i) || textContent.match(/LensModel="([^"]+)"/i);
    const softTool = textContent.match(/<xmp:CreatorTool>(.*?)<\/xmp:CreatorTool>/i) || textContent.match(/CreatorTool="([^"]+)"/i) || textContent.match(/<pdf:Producer>(.*?)<\/pdf:Producer>/i) || textContent.match(/Producer="([^"]+)"/i);
    const authCr = textContent.match(/<dc:creator>\s*<rdf:Seq>\s*<rdf:li>(.*?)<\/rdf:li>/i) || textContent.match(/creator="([^"]+)"/i) || textContent.match(/Author="([^"]+)"/i);
    const cprG = textContent.match(/<dc:rights>\s*<rdf:Alt>\s*<rdf:li[^>]*>(.*?)<\/rdf:li>/i) || textContent.match(/Copyright="([^"]+)"/i);
    
    // GPS XMP parsing
    const xmpLat = textContent.match(/exif:GPSLatitude="([^"]+)"/i) || textContent.match(/<exif:GPSLatitude>(.*?)<\/exif:GPSLatitude>/i);
    const xmpLon = textContent.match(/exif:GPSLongitude="([^"]+)"/i) || textContent.match(/<exif:GPSLongitude>(.*?)<\/exif:GPSLongitude>/i);

    const realMake = tiffMake ? tiffMake[1] : undefined;
    const realModel = tiffModel ? tiffModel[1] : undefined;
    const realLens = auxLens ? auxLens[1] : undefined;
    const realSoft = softTool ? softTool[1] : undefined;
    const realCreator = authCr ? authCr[1] : (nativeTags["Author"] || nativeTags["Artist"] || undefined);
    const realCopyright = cprG ? cprG[1] : (nativeTags["Copyright"] || undefined);

    if (realMake || realModel || realLens || realSoft) {
      device = {
        make: realMake || "Unknown Make",
        model: realModel || "Unknown Model",
        serialNumber: undefined,
        lensModel: realLens || "Standard Optics",
        software: realSoft
      };
    }

    if (realCreator || realCopyright) {
      author = {
        creator: realCreator || "Unknown",
        artist: undefined,
        copyright: realCopyright
      };
    }

    if (xmpLat && xmpLon) {
      const latVal = parseFloat(xmpLat[1]);
      const lonVal = parseFloat(xmpLon[1]);
      if (!isNaN(latVal) && !isNaN(lonVal)) {
        gps = {
          latitude: latVal,
          longitude: lonVal,
          altitude: 0,
          timestamp: new Date().toISOString(),
          precision: "Extracted Target Coordinates"
        };
      }
    }

    // AI settings
    if (hasAiKey) {
      aiTrace = {
        traceabilityScore: 90,
        promptDetected: nativePrompt,
        generatorTool: nativeTags["Software"] || (textContent.includes("StableDiffusion") ? "Stable Diffusion" : (textContent.includes("Midjourney") ? "Midjourney Creator" : "Generative AI Platform")),
        manifestPresent: true,
        watermarkFootprint: "Metadata Chunks Detected" as any,
        aiWatermarkConfidence: 95
      };
    }
  }

  // Calculate high accuracy risk score
  let score = 0;
  if (gps) score += 40;
  if (device) score += 20;
  if (author?.creator) score += 20;
  if (aiTrace) score += 15;
  if (structureConflicts.length > 0) score += 5;

  score = Math.min(100, score);

  let verdict: "LOW" | "MEDIUM" | "HIGH" | "FORENSIC CRITICAL" = "LOW";
  if (score >= 75) verdict = "FORENSIC CRITICAL";
  else if (score >= 45) verdict = "HIGH";
  else if (score >= 20) verdict = "MEDIUM";

  return {
    id,
    filename,
    size,
    mimeType,
    riskScore: score,
    verdict,
    gps,
    device,
    author,
    aiTrace,
    structureConflicts
  };
}

function getFallbackMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "heic": return "image/heic";
    case "pdf": return "application/pdf";
    case "zip": return "application/zip";
    default: return "image/jpeg";
  }
}
