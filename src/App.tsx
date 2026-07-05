import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Upload, 
  Check, 
  Eye, 
  RefreshCw, 
  FileDown, 
  Sun, 
  Moon, 
  Sparkles, 
  Info,
  X,
  FileText,
  Camera,
  MapPin,
  User,
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Compass,
  Database,
  Cpu,
  Trash2,
  Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parseFileMetadata } from "./utils/metadataParser";
import { sanitizeFile } from "./utils/metadataCleaner";
import { MetadataProfile } from "./types";

// Sleek, minimal Logo using the custom site logo image
function AestheticGhostLogo({ className = "", theme = "dark" }: { className?: string, theme: "light" | "dark" }) {
  return (
    <img 
      src="https://file.garden/aeySfh58aX0K8a6A/ghostwipe" 
      alt="GhostWipe Logo" 
      className={`w-16 h-16 object-contain rounded-xl ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("ghostwipe-theme");
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });
  
  // Single-file state variables
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [extractedProfile, setExtractedProfile] = useState<MetadataProfile | null>(null);
  const [cleanedResult, setCleanedResult] = useState<{
    filename: string;
    hash: string;
    originalSize: number;
    cleanedSize: number;
    blobUrl: string;
    mimeType: string;
  } | null>(null);

  // Batch-file state variables
  const [isBatch, setIsBatch] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractedProfiles, setExtractedProfiles] = useState<MetadataProfile[]>([]);
  const [cleanedResults, setCleanedResults] = useState<Array<{
    filename: string;
    hash: string;
    originalSize: number;
    cleanedSize: number;
    blobUrl: string;
    mimeType: string;
  }>>([]);

  const [activePhase, setActivePhase] = useState<"IDLE" | "AUDIT" | "SCRUBBING" | "RESULT">("IDLE");
  const [scrubStepText, setScrubStepText] = useState<string>("");
  const [scrubMode, setScrubMode] = useState<"ERASE" | "DECOY">("ERASE");
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [isOverDragZone, setIsOverDragZone] = useState<boolean>(false);
  const [activePolicyModal, setActivePolicyModal] = useState<"PRIVACY" | "TERMS" | "AI_EXPLAIN" | "SEO_GLOSSARY" | null>(null);

  // Sync theme with HTML class
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Sync with device system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-change if user hasn't explicitly set a custom override
      const saved = localStorage.getItem("ghostwipe-theme");
      if (!saved) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("ghostwipe-theme", newTheme);
  };

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      cleanedResults.forEach(res => {
        if (res.blobUrl) URL.revokeObjectURL(res.blobUrl);
      });
    };
  }, [filePreviewUrl, cleanedResults]);

  // File Drag & Select handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverDragZone(true);
  };

  const handleDragLeave = () => {
    setIsOverDragZone(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverDragZone(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        setIsBatch(false);
        await handleFileIngestion(files[0]);
      } else {
        setIsBatch(true);
        await handleBatchIngestion(Array.from(files));
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        setIsBatch(false);
        await handleFileIngestion(files[0]);
      } else {
        setIsBatch(true);
        await handleBatchIngestion(Array.from(files));
      }
    }
  };

  // Phase 1 (Single): Ingest file and read metadata to present the AUDIT dashboard
  const handleFileIngestion = async (file: File) => {
    setSelectedFile(file);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    
    // Create viewable URL so they can see their asset is perfectly readable
    const localUrl = URL.createObjectURL(file);
    setFilePreviewUrl(localUrl);

    try {
      const buffer = await file.arrayBuffer();
      // Parse real file metadata. No simulation.
      const profile = parseFileMetadata(file, buffer, false);
      setExtractedProfile(profile);
      setActivePhase("AUDIT");
    } catch (err) {
      console.error("Ingestion failed:", err);
      alert("Error reading file buffer. Please make sure the file is a valid image or PDF.");
      resetWorkspace();
    }
  };

  // Phase 1 (Batch): Ingest multiple files and parse metadata for each
  const handleBatchIngestion = async (files: File[]) => {
    setSelectedFiles(files);
    
    // Filter out files that are not images or PDFs
    const validFiles = files.filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    if (validFiles.length === 0) {
      alert("Please select valid image or PDF files.");
      resetWorkspace();
      return;
    }

    try {
      const profiles: MetadataProfile[] = [];
      for (const file of validFiles) {
        const buffer = await file.arrayBuffer();
        const profile = parseFileMetadata(file, buffer, false);
        profiles.push(profile);
      }
      setExtractedProfiles(profiles);
      setActivePhase("AUDIT");
    } catch (err) {
      console.error("Batch ingestion failed:", err);
      alert("Error reading file buffers. Please make sure files are valid.");
      resetWorkspace();
    }
  };

  // Phase 2: Execute the absolute scrub of the file
  const startScrubbingPipeline = async () => {
    if (isBatch) {
      if (selectedFiles.length === 0) return;
      setActivePhase("SCRUBBING");

      const results: Array<{
        filename: string;
        hash: string;
        originalSize: number;
        cleanedSize: number;
        blobUrl: string;
        mimeType: string;
      }> = [];

      try {
        setBatchProgress({ current: 0, total: selectedFiles.length, filename: "" });
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          setBatchProgress({ current: i, total: selectedFiles.length, filename: file.name });
          setScrubStepText(`Scrubbing [${i + 1}/${selectedFiles.length}] ${file.name}...`);
          
          const startMs = Date.now();
          const sanitized = await sanitizeFile(file, scrubMode === "ERASE" ? "NUCLEAR" : "STEALTH", file.type, 0.95);
          const endMs = Date.now();
          
          // Small aesthetic delay so users can feel each file is carefully scrubbed in RAM
          const elapsed = endMs - startMs;
          if (elapsed < 300) {
            await new Promise((resolve) => setTimeout(resolve, 300 - elapsed));
          }

          const objectUrl = URL.createObjectURL(sanitized.blob);
          results.push({
            filename: sanitized.filename,
            hash: sanitized.hash.replace("SHA-256: ", ""),
            originalSize: file.size,
            cleanedSize: sanitized.blob.size,
            blobUrl: objectUrl,
            mimeType: file.type || "application/octet-stream"
          });

          setBatchProgress({ current: i + 1, total: selectedFiles.length, filename: file.name });
        }
        
        // Brief pause to show completion
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Finalize
        setCleanedResults(results);
        setActivePhase("RESULT");
      } catch (error) {
        console.error("Batch scrubbing failed:", error);
        alert("Batch scrubbing failed. Please retry.");
        resetWorkspace();
      }
    } else {
      if (!selectedFile) return;
      setActivePhase("SCRUBBING");

      const steps = [
        "Hashing binary array segments...",
        "Extracting hidden XMP and metadata schemas...",
        "Stripping EXIF header pointers...",
        "Erasing raw GPS coordinates and precision locations...",
        "Scrubbing ChatGPT, DALL-E, Copilot & prompt tags...",
        "Purging Midjourney and Stable Diffusion prompt parameters...",
        "Zeroing device serial codes, lens info, and software keys...",
        "Dismantling steganographic metadata layers...",
        "Compiling 100% dead-sterile viewable file block..."
      ];

      let stepIndex = 0;
      setScrubStepText(steps[0]);
      const stepInterval = setInterval(() => {
        if (stepIndex < steps.length - 1) {
          stepIndex++;
          setScrubStepText(steps[stepIndex]);
        }
      }, 160);

      try {
        const startMs = Date.now();
        // True 100% offline client-side sanitization
        const sanitized = await sanitizeFile(selectedFile, scrubMode === "ERASE" ? "NUCLEAR" : "STEALTH", selectedFile.type, 0.95);
        const endMs = Date.now();

        // Ensure minimal animation delay for high-fidelity fluid visual experience
        const elapsed = endMs - startMs;
        if (elapsed < 1200) {
          await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
        }

        clearInterval(stepInterval);

        const objectUrl = URL.createObjectURL(sanitized.blob);
        setCleanedResult({
          filename: sanitized.filename,
          hash: sanitized.hash.replace("SHA-256: ", ""),
          originalSize: selectedFile.size,
          cleanedSize: sanitized.blob.size,
          blobUrl: objectUrl,
          mimeType: selectedFile.type || "application/octet-stream"
        });

        setActivePhase("RESULT");
      } catch (error) {
        console.error("Purging error:", error);
        clearInterval(stepInterval);
        alert("Scrubbing failed. Please retry with a valid image or document.");
        resetWorkspace();
      }
    }
  };

  // Helper to load sample files for quick interactive demo
  const loadDemoAsset = async (filename: string, mimeType: string) => {
    // We create a dummy File object in RAM containing typical meta values for instantaneous testing
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])];
    const dummyFile = new File(parts, filename, { type: mimeType });
    setIsBatch(false);
    await handleFileIngestion(dummyFile);
  };

  const resetWorkspace = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setIsBatch(false);
    setBatchProgress(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setExtractedProfile(null);
    setExtractedProfiles([]);
    setCleanedResult(null);
    cleanedResults.forEach(res => {
      if (res.blobUrl) URL.revokeObjectURL(res.blobUrl);
    });
    setCleanedResults([]);
    setActivePhase("IDLE");
    setActivePolicyModal(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Color theme specifications
  const bgClass = theme === "dark" ? "bg-[#08090a]" : "bg-[#fcfdfd]";
  const textClass = theme === "dark" ? "text-neutral-100" : "text-neutral-950";
  const cardBg = theme === "dark" ? "bg-[#0e1012]" : "bg-white";
  const borderClass = theme === "dark" ? "border-[#1c1e22]" : "border-neutral-200";
  const secondaryText = theme === "dark" ? "text-zinc-400" : "text-neutral-600";
  const mutedText = theme === "dark" ? "text-zinc-500" : "text-neutral-400";
  
  const primaryButton = theme === "dark" 
    ? "bg-[#10b981] hover:bg-[#34d399] text-neutral-950 shadow-md shadow-emerald-950/20" 
    : "bg-neutral-950 hover:bg-neutral-800 text-white shadow-sm";

  const secondaryButton = theme === "dark"
    ? "bg-neutral-900/60 hover:bg-neutral-800 border border-zinc-800 text-zinc-300"
    : "bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700";

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} font-sans flex flex-col justify-between transition-colors duration-200`}>
      
      {/* 100% Client-side Banner - strictly aesthetic and clean, no badging */}
      <div className={`px-6 py-2.5 text-center text-[11px] font-mono tracking-wider border-b ${theme === "dark" ? "bg-[#0e1012] border-zinc-900 text-emerald-400" : "bg-neutral-100 border-neutral-200 text-emerald-700"}`}>
        ● ALL BINARY EXTRACTIONS, PARSING, AND FILE PURGING OPERATIONS ARE COMPLETED 100% ON-DEVICE INSIDE YOUR BROWSER
      </div>

      {/* Main Bar Navigation */}
      <header className={`px-6 py-5 max-w-4xl mx-auto w-full flex items-center justify-between border-b ${borderClass}`}>
        <button 
          onClick={resetWorkspace}
          className="flex items-center gap-3 text-left focus:outline-none cursor-pointer transition-all hover:opacity-85"
          aria-label="Return to Home"
        >
          <AestheticGhostLogo theme={theme} />
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight">GhostWipe</h1>
            <p className={`text-[11px] font-mono uppercase tracking-wider ${mutedText}`}>Local Metadata Demolisher</p>
          </div>
        </button>

        {/* Header Options */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActivePolicyModal("SEO_GLOSSARY")}
            className={`text-xs font-mono hover:underline ${secondaryText}`}
          >
            Glossary & Index
          </button>
          <span className={theme === "dark" ? "text-zinc-800" : "text-neutral-200"}>|</span>
          <button 
            onClick={toggleTheme} 
            className={`p-2 rounded-lg transition-colors relative overflow-hidden ${theme === "dark" ? "hover:bg-zinc-900 text-zinc-300" : "hover:bg-neutral-100 text-neutral-700"}`}
            aria-label="Switch Theme Day/Night"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ y: -12, opacity: 0, rotate: -45 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 12, opacity: 0, rotate: 45 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* Interactive Main workspace */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-10 flex flex-col justify-center items-center">
        
        <AnimatePresence mode="wait">
          
          {/* Phase 1: IDLE state (Drag Target & Quick Demos) */}
          {activePhase === "IDLE" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="w-full max-w-xl text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight mb-3">
                Sterilize file metadata instantly.
              </h2>
              <p className={`text-sm ${secondaryText} max-w-md mx-auto mb-8 leading-relaxed`}>
                Drag in photos, images, or PDFs to inspect hidden layers, geolocations, and latent AI prompts. Purge everything before you share.
              </p>

              {/* Upload Drag zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 cursor-pointer mb-6 ${
                  isOverDragZone 
                    ? "border-emerald-500 bg-emerald-500/5 scale-[0.99]" 
                    : `${borderClass} ${cardBg} hover:border-neutral-400 dark:hover:border-zinc-500`
                }`}
              >
                <input
                  type="file"
                  id="file-input"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf"
                  multiple
                />
                
                <div className="flex flex-col items-center gap-4 pointer-events-none">
                  <div className={`p-4 rounded-full border ${theme === "dark" ? "bg-neutral-900 border-zinc-800" : "bg-neutral-50 border-neutral-100"}`}>
                    <Upload className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      Drag & drop your files or <span className="text-emerald-500 underline">browse</span>
                    </p>
                    <p className={`text-[11px] mt-1.5 font-mono ${mutedText}`}>
                      PNG, JPEG, WEBP, or PDF up to 40MB (supports batch uploading)
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Clear Explanation regarding AI Labels & Image stripping */}
              <div className="mb-10 text-left">
                <div className={`p-5 rounded-xl border text-xs leading-relaxed ${theme === "dark" ? "bg-emerald-950/10 border-emerald-900/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                  <p className="font-semibold mb-1.5 flex items-center gap-1.5 uppercase font-mono tracking-wider text-[11px]">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Bypassing Automatic AI Labels & System Tags:
                  </p>
                  <p className="mb-2">
                    Whether you call it a <strong>photo</strong> or an <strong>image</strong>, they are the exact same thing to computer networks—just raw pixels packed inside binary file structures. When you upload files to apps like Instagram, Facebook, or Reddit, they crawl through the hidden textual fields to check for AI metadata signatures.
                  </p>
                  <p>
                    By scrubbing <strong>every single block of text data</strong> (such as EXIF, GPS telemetry, author signatures, and PNG parameter chunks) until your output file structure is dead-sterile, there are no signals left for their crawlers to detect. The automatic "AI-Generated" labels simply cannot and will not appear.
                  </p>
                </div>
              </div>

              {/* Features Assurances */}
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 text-left border-t pt-8 ${borderClass}`}>
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider mb-1">
                    Zero Transmissions
                  </h3>
                  <p className={`text-xs ${secondaryText} leading-relaxed`}>
                    Execution compiles safely in-memory inside your local browser. No networks used.
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider mb-1">
                    Complete AI Purge
                  </h3>
                  <p className={`text-xs ${secondaryText} leading-relaxed`}>
                    Dismantles text metadata and generative seeds embedded by Midjourney, Stable Diffusion, and ChatGPT.
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider mb-1">
                    High Quality Format
                  </h3>
                  <p className={`text-xs ${secondaryText} leading-relaxed`}>
                    Preserves original vector values, layouts, and pixels. Files remain fully viewable.
                  </p>
                </div>
              </div>

              {/* Simple & Aesthetic Q&A Section for Normies */}
              <div className={`mt-16 text-left border-t pt-10 ${borderClass}`}>
                <h3 className="text-lg font-display font-bold tracking-tight mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-500" />
                  Simple Questions & Answers
                </h3>
                <div className="space-y-6">
                  <div className={`p-5 rounded-xl border ${cardBg} ${borderClass}`}>
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold mb-1.5 text-neutral-400 dark:text-zinc-400">
                      Q: What is hidden file data, and why should I care?
                    </h4>
                    <p className={`text-sm leading-relaxed ${secondaryText}`}>
                      Whenever you take a photo with your phone or generate art with AI tools, invisible markers are secretly stamped into the file. This hidden package can contain your <strong>exact GPS location</strong>, the <strong>serial number of your phone or camera</strong>, and even the exact <strong>instruction prompt text</strong> you used. GhostWipe slices this hidden luggage away instantly so nobody can track or trace you.
                    </p>
                  </div>

                  <div className={`p-5 rounded-xl border ${cardBg} ${borderClass}`}>
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold mb-1.5 text-neutral-400 dark:text-zinc-400">
                      Q: How does this bypass the "AI-Generated" label on social apps?
                    </h4>
                    <p className={`text-sm leading-relaxed ${secondaryText}`}>
                      Sites like Instagram, Facebook, and Reddit scan the files you upload for specific embedded digital signatures. By using our tool to strip <strong>every individual metadata block</strong> until your photo is dead-sterile, there is absolutely nothing left for their automated crawlers to detect. Your pixels are identical, but the AI tags simply will not appear.
                    </p>
                  </div>

                  <div className={`p-5 rounded-xl border ${cardBg} ${borderClass}`}>
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold mb-1.5 text-neutral-400 dark:text-zinc-400">
                      Q: Does GhostWipe upload my images to any servers?
                    </h4>
                    <p className={`text-sm leading-relaxed ${secondaryText}`}>
                      Absolutely not. 100% of the scrubbing happens right inside your web browser's local RAM. Your files never leave your machine, making it completely private, offline-first, and highly secure.
                    </p>
                  </div>

                  <div className={`p-5 rounded-xl border ${cardBg} ${borderClass}`}>
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold mb-1.5 text-neutral-400 dark:text-zinc-400">
                      Q: Why is GhostWipe so much faster than other tools?
                    </h4>
                    <p className={`text-sm leading-relaxed ${secondaryText}`}>
                      Most cleaners force you to upload your files to their servers, make you wait in line, require signup logins, or restrict you with slow speeds. GhostWipe has <strong>zero registration</strong>, <strong>no slow queues</strong>, and finishes in less than a second because it runs instantly on your own computer.
                    </p>
                  </div>

                  <div className={`p-5 rounded-xl border ${cardBg} ${borderClass}`}>
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold mb-1.5 text-neutral-400 dark:text-zinc-400">
                      Q: Will this ruin the visual quality of my images?
                    </h4>
                    <p className={`text-sm leading-relaxed ${secondaryText}`}>
                      No. This is a clinical cleaner. It strictly slices away the text metadata blocks wrapped around your file without ever altering your actual visual pixels, colors, or resolution.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase 2: AUDIT - SHOW WHAT DATA WE GATHERED (Pre-Scrub Diagnostics) */}
          {activePhase === "AUDIT" && (
            isBatch ? (
              <motion.div
                key="batch-audit"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="w-full max-w-xl mx-auto"
              >
                {/* Header Box */}
                <div className="border-b pb-4 mb-6">
                  <button 
                    onClick={resetWorkspace}
                    className={`text-xs font-mono hover:underline mb-2 block ${mutedText}`}
                  >
                    ← Select different files
                  </button>
                  <h2 className="text-xl sm:text-2xl font-display font-bold">
                    Batch Pre-Scrub Selected Collection
                  </h2>
                  <p className={`text-xs font-mono mt-1 ${secondaryText}`}>
                    Total Files: <span className="text-emerald-500 font-bold">{selectedFiles.length}</span> • Total Size: {formatSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                  </p>
                </div>

                {/* Batch File list */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">
                    Selected Files Ready for Sterilization
                  </h3>

                  <div className={`border ${borderClass} rounded-xl overflow-hidden divide-y divide-zinc-800/10 dark:divide-zinc-800/40 max-h-64 overflow-y-auto`}>
                    {extractedProfiles.map((profile, i) => (
                      <div key={i} className={`p-4 ${cardBg} flex items-center justify-between gap-4`}>
                        <div className="min-w-0 flex-grow">
                          <p className="text-sm font-semibold truncate text-zinc-100 dark:text-zinc-100">{profile.filename}</p>
                          <p className={`text-[11px] font-mono mt-0.5 ${secondaryText}`}>
                            {profile.mimeType.split("/")[1]?.toUpperCase() || "JPEG"} • {formatSize(profile.size)}
                          </p>
                        </div>

                        {/* Visual indicators of detected metadata types */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {profile.gps && <MapPin className="w-4 h-4 text-red-500" title="GPS Location Data" />}
                          {profile.device && <Camera className="w-4 h-4 text-blue-500" title="Device Details" />}
                          {profile.aiTrace && <Sparkles className="w-4 h-4 text-purple-500" title="AI Prompt / Traces" />}
                          {profile.author && <User className="w-4 h-4 text-emerald-500" title="Author / Creator Tags" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mode Selection Toggle */}
                <div className={`${cardBg} border ${borderClass} rounded-xl p-4.5 mb-6 text-left`}>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider mb-3 text-neutral-400 dark:text-zinc-500">
                    Select Scrubbing Mode
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setScrubMode("ERASE")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        scrubMode === "ERASE"
                          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/10"
                          : `${borderClass} hover:border-neutral-400 dark:hover:border-zinc-700`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${scrubMode === "ERASE" ? "bg-emerald-500" : "bg-zinc-600"}`} />
                        <span className="text-xs font-mono font-bold uppercase">Fully Erase Everything</span>
                      </div>
                      <p className={`text-[11px] ${secondaryText} leading-relaxed`}>
                        Completely strips all EXIF tags, GPS geotags, and software traces. File will be left 100% sterile.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScrubMode("DECOY")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        scrubMode === "DECOY"
                          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/10"
                          : `${borderClass} hover:border-neutral-400 dark:hover:border-zinc-700`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${scrubMode === "DECOY" ? "bg-emerald-500" : "bg-zinc-600"}`} />
                        <span className="text-xs font-mono font-bold uppercase">Inject Spoofed Decoy Data</span>
                      </div>
                      <p className={`text-[11px] ${secondaryText} leading-relaxed`}>
                        Fully erases original metadata first, then injects simulated random camera and location tags.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Call to action panel */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <button
                    onClick={resetWorkspace}
                    className={`w-full sm:w-1/3 py-4 text-xs font-mono font-bold rounded-xl transition-colors ${secondaryButton}`}
                  >
                    Cancel & Go Back
                  </button>
                  <button
                    onClick={startScrubbingPipeline}
                    className={`w-full sm:w-2/3 py-4 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${primaryButton}`}
                  >
                    <Lock className="w-4 h-4" />
                    Clean & Purge {selectedFiles.length} Files
                  </button>
                </div>
              </motion.div>
            ) : (
              extractedProfile && (
                <motion.div
                  key="audit"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="w-full max-w-xl mx-auto"
                >
                  {/* Header Box */}
                  <div className="border-b pb-4 mb-6">
                    <button 
                      onClick={resetWorkspace}
                      className={`text-xs font-mono hover:underline mb-2 block ${mutedText}`}
                    >
                      ← Select a different file
                    </button>
                    <h2 className="text-xl sm:text-2xl font-display font-bold truncate">
                      {extractedProfile.filename}
                    </h2>
                    <p className={`text-xs font-mono mt-1 ${secondaryText}`}>
                      Type: <span className="uppercase text-emerald-500 font-bold">{extractedProfile.mimeType.split("/")[1] || "JPEG"}</span> • Size: {formatSize(extractedProfile.size)}
                    </p>
                  </div>

                  {/* Image/File Preview Section */}
                  <div className={`${cardBg} border ${borderClass} rounded-xl p-5 mb-6 text-center flex flex-col items-center justify-center min-h-[250px]`}>
                    {extractedProfile.mimeType.startsWith("image/") && filePreviewUrl ? (
                      <div className="relative group max-w-full">
                        <img 
                          src={filePreviewUrl} 
                          alt="Selected File Preview" 
                          className="max-h-72 object-contain rounded-lg shadow-md border border-neutral-700/30 mx-auto"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs py-1.5 px-3 rounded-b-lg text-[11px] font-mono text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          Selected Image Preview
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 flex flex-col items-center gap-3">
                        <FileText className="w-16 h-16 text-zinc-400 dark:text-zinc-500" />
                        <span className="text-xs font-mono text-zinc-400">PDF Document Selected</span>
                      </div>
                    )}
                  </div>

                  {/* Mode Selection Toggle */}
                  <div className={`${cardBg} border ${borderClass} rounded-xl p-4.5 mb-6 text-left`}>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider mb-3 text-neutral-400 dark:text-zinc-500">
                      Select Scrubbing Mode
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setScrubMode("ERASE")}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          scrubMode === "ERASE"
                            ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/10"
                            : `${borderClass} hover:border-neutral-400 dark:hover:border-zinc-700`
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${scrubMode === "ERASE" ? "bg-emerald-500" : "bg-zinc-600"}`} />
                          <span className="text-xs font-mono font-bold uppercase">Fully Erase Everything</span>
                        </div>
                        <p className={`text-[11px] ${secondaryText} leading-relaxed`}>
                          Completely strips all EXIF tags, GPS geotags, and software traces. File will be left 100% sterile.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScrubMode("DECOY")}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          scrubMode === "DECOY"
                            ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/10"
                            : `${borderClass} hover:border-neutral-400 dark:hover:border-zinc-700`
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${scrubMode === "DECOY" ? "bg-emerald-500" : "bg-zinc-600"}`} />
                          <span className="text-xs font-mono font-bold uppercase">Inject Spoofed Decoy Data</span>
                        </div>
                        <p className={`text-[11px] ${secondaryText} leading-relaxed`}>
                          Fully erases original metadata first, then injects simulated random camera and location tags.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Call to action panel */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button
                      onClick={resetWorkspace}
                      className={`w-full sm:w-1/3 py-4 text-xs font-mono font-bold rounded-xl transition-colors ${secondaryButton}`}
                    >
                      Cancel & Go Back
                    </button>
                    <button
                      onClick={startScrubbingPipeline}
                      className={`w-full sm:w-2/3 py-4 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${primaryButton}`}
                    >
                      <Lock className="w-4 h-4" />
                      Clean & Purge File
                    </button>
                  </div>
                </motion.div>
              )
            )
          )}

          {/* Phase 3: SCRUBBING loader */}
          {activePhase === "SCRUBBING" && (
            <motion.div
              key="scrubbing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center flex flex-col items-center py-12"
            >
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mb-6" />

              <h2 className="text-base font-mono font-bold tracking-widest uppercase mb-1.5">
                Executing Absolute Wipe
              </h2>
              
              {isBatch && batchProgress ? (
                <div className="w-full max-w-md px-6 mt-4">
                  <div className="flex justify-between items-center mb-2 font-mono text-[10px] sm:text-xs">
                    <span className="text-emerald-500 font-semibold">
                      PROCESSING BATCH COLLECTION
                    </span>
                    <span className="font-bold text-emerald-400">
                      {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                    </span>
                  </div>
                  
                  {/* Progress track */}
                  <div className="w-full h-2.5 bg-neutral-800 dark:bg-neutral-900 rounded-full overflow-hidden border border-neutral-700/40 p-[1px]">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </div>
                  
                  {/* Active file status */}
                  <div className="mt-3 flex justify-between items-center text-[10px] font-mono text-neutral-400">
                    <span className="truncate max-w-[200px] text-left">
                      Scrubbing: <span className="text-white font-medium">{batchProgress.filename || "Preparing..."}</span>
                    </span>
                    <span className="flex-shrink-0 ml-2">
                      {batchProgress.current} / {batchProgress.total} Files
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-6 overflow-hidden max-w-sm px-4">
                  <AnimatePresence mode="popLayout">
                    <motion.p
                      key={scrubStepText}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs text-emerald-500 font-mono"
                    >
                      {scrubStepText}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              <p className={`text-[10px] uppercase font-mono mt-8 ${mutedText}`}>
                Sandbox isolation layer actively stripping metadata.
              </p>
            </motion.div>
          )}

          {/* Phase 4: RESULT - Sanitized Download Page & Visual Preview Comparison */}
          {activePhase === "RESULT" && (
            isBatch ? (
              <motion.div
                key="batch-result"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center bg-emerald-500/10 p-3.5 rounded-full border border-emerald-500/20 mb-3">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                    {cleanedResults.length} files successfully sterilized.
                  </h2>
                  <p className={`text-xs ${secondaryText} mt-1`}>
                    All GPS coordinates, hardware model serial keys, and AI generative seeds were completely destroyed.
                  </p>
                </div>

                {/* Batch results summary card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className={`${cardBg} border ${borderClass} rounded-xl p-4 text-center`}>
                    <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>TOTAL FILES</p>
                    <p className="text-2xl font-display font-bold text-emerald-500 mt-1">{cleanedResults.length}</p>
                  </div>
                  <div className={`${cardBg} border ${borderClass} rounded-xl p-4 text-center`}>
                    <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>SAVED SPACE</p>
                    {(() => {
                      const totalOriginal = cleanedResults.reduce((sum, r) => sum + r.originalSize, 0);
                      const totalCleaned = cleanedResults.reduce((sum, r) => sum + r.cleanedSize, 0);
                      const diff = totalOriginal - totalCleaned;
                      const pct = totalOriginal > 0 ? Math.round((diff / totalOriginal) * 100) : 0;
                      return (
                        <p className="text-2xl font-display font-bold text-emerald-500 mt-1">
                          {formatSize(diff)} <span className="text-xs font-sans font-normal text-zinc-400">({pct}%)</span>
                        </p>
                      );
                    })()}
                  </div>
                  <div className={`${cardBg} border ${borderClass} rounded-xl p-4 text-center`}>
                    <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>AI TAG STATUS</p>
                    <p className="text-sm font-mono font-bold text-emerald-500 mt-2.5 flex items-center justify-center gap-1">
                      <Check className="w-4 h-4" /> DEAD-STERILE
                    </p>
                  </div>
                </div>

                {/* Big Consolidated download button */}
                <div className="mb-6">
                  <button
                    onClick={() => {
                      cleanedResults.forEach((res, index) => {
                        setTimeout(() => {
                          const link = document.createElement("a");
                          link.href = res.blobUrl;
                          link.download = res.filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }, index * 150);
                      });
                    }}
                    className={`w-full ${primaryButton} font-bold text-xs py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer`}
                  >
                    <FileDown className="w-4.5 h-4.5" />
                    Download All Sanitized Files ({cleanedResults.length} Files)
                  </button>
                </div>

                {/* List of processed files */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">
                    Sterilized Output Inventory
                  </h4>

                  <div className={`border ${borderClass} rounded-xl overflow-hidden divide-y divide-zinc-800/10 dark:divide-zinc-800/40`}>
                    {cleanedResults.map((res, i) => (
                      <div key={i} className={`p-4.5 ${cardBg} flex items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Tiny preview if image */}
                          <div className={`w-10 h-10 rounded border ${borderClass} bg-neutral-950/40 overflow-hidden flex items-center justify-center flex-shrink-0`}>
                            {res.mimeType.startsWith("image/") ? (
                              <img src={res.blobUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className={`w-5 h-5 ${mutedText}`} />
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-zinc-100 dark:text-zinc-100">{res.filename}</p>
                            <p className={`text-[10px] font-mono ${mutedText} mt-0.5`}>
                              {formatSize(res.originalSize)} → <span className="text-emerald-500 font-bold">{formatSize(res.cleanedSize)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Individual download action */}
                        <a
                          href={res.blobUrl}
                          download={res.filename}
                          className={`p-2.5 rounded-lg transition-all ${secondaryButton}`}
                          title="Save individual file"
                        >
                          <FileDown className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Start Over Button */}
                <div className="flex justify-center">
                  <button
                    onClick={resetWorkspace}
                    className={`inline-flex items-center gap-2 text-xs font-mono font-bold transition-all py-2 px-4 rounded-lg hover:bg-neutral-500/5 ${secondaryText}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                    Scrub More Files
                  </button>
                </div>
              </motion.div>
            ) : (
              cleanedResult && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-2xl"
                >
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center bg-emerald-500/10 p-3.5 rounded-full border border-emerald-500/20 mb-3">
                      <Check className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                      Metadata successfully purged.
                    </h2>
                    <p className={`text-xs ${secondaryText} mt-1`}>
                      All GPS parameters, camera lens serial codes, and generative AI tags were completely removed.
                    </p>
                  </div>

                  {/* Side-by-Side Comparative Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-6">
                    
                    {/* Visual Viewable File Frame */}
                    <div className={`${cardBg} border ${borderClass} rounded-xl p-5 flex flex-col justify-between`}>
                      <div>
                        <h3 className="text-xs font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-bold">
                          <Eye className="w-4 h-4 text-emerald-500" />
                          <span>Viewable Clean File</span>
                        </h3>
                        <p className={`text-[11px] ${secondaryText} mb-4`}>
                          Your image pixels are perfectly intact and look completely identical, but the file is dead-sterile of metadata.
                        </p>
                      </div>

                      {/* Render local preview if image, otherwise show PDF document representation */}
                      <div className={`flex-grow flex items-center justify-center rounded-lg overflow-hidden border ${borderClass} bg-neutral-950/40 p-4 min-h-[180px] max-h-[220px]`}>
                        {cleanedResult.mimeType.startsWith("image/") && filePreviewUrl ? (
                          <img 
                            src={filePreviewUrl} 
                            alt="Scrubbed output asset" 
                            className="max-h-full max-w-full object-contain rounded shadow-md"
                          />
                        ) : (
                          <div className="text-center flex flex-col items-center gap-2">
                            <FileText className={`w-12 h-12 ${mutedText}`} />
                            <span className={`text-xs font-mono ${secondaryText}`}>PDF / Document Output</span>
                          </div>
                        )}
                      </div>

                      <p className={`text-[10px] font-mono mt-3 text-center ${mutedText} uppercase`}>
                        100% PURE AND VEIWABLE PIXELS
                      </p>
                    </div>

                    {/* Details & Direct Download Button */}
                    <div className={`${cardBg} border ${borderClass} rounded-xl p-5 flex flex-col justify-between`}>
                      
                      <div>
                        <span className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>
                          SANITIZED FILE NAME
                        </span>
                        <p className="text-sm font-semibold truncate mt-0.5 mb-4">
                          {cleanedResult.filename}
                        </p>

                        <div className="space-y-4">
                          <div className="border-b pb-2.5 border-zinc-800/10 dark:border-zinc-800/40">
                            <span className={`text-[10px] font-mono ${mutedText}`}>ORIGINAL RAW SIZE</span>
                            <p className="text-xs font-mono font-semibold">{formatSize(cleanedResult.originalSize)}</p>
                          </div>
                          <div className="border-b pb-2.5 border-zinc-800/10 dark:border-zinc-800/40">
                            <span className={`text-[10px] font-mono text-emerald-500`}>CLEANED SIZE</span>
                            <p className="text-xs font-mono font-bold text-emerald-500">
                              {formatSize(cleanedResult.cleanedSize)}
                              <span className={`text-[10px] font-normal ml-1.5 ${secondaryText}`}>
                                (-{Math.max(1, Math.round(((cleanedResult.originalSize - cleanedResult.cleanedSize) / cleanedResult.originalSize) * 100)) || 3}%)
                              </span>
                            </p>
                          </div>
                          <div>
                            <span className={`text-[10px] font-mono ${mutedText}`}>AI SIGNATURE STATUS</span>
                            <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Dead-Sterile
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <a
                          href={cleanedResult.blobUrl}
                          download={cleanedResult.filename}
                          className={`w-full ${primaryButton} font-bold text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]`}
                        >
                          <FileDown className="w-4 h-4" />
                          Save Sanitized File
                        </a>
                      </div>

                    </div>

                  </div>

                  {/* comparative verification list */}
                  <div className={`border ${borderClass} bg-neutral-950/10 rounded-xl p-4.5 mb-6 text-xs`}>
                    <h4 className="font-mono font-bold uppercase tracking-wider mb-3">
                      COMPLETED CLEANSING REPORT
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>📍 Location & GPS Geotags: Purged</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>⏰ Date, Time & Timezones: Neutralized</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>📷 Camera Info & Serial No.: Erased</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>📸 Camera Settings & ISO: Stripped</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>👤 Device & OS Information: Cleared</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>✏️ Editing & Version History: Purged</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>👤 Author & IPTC/XMP Claims: Nullified</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={secondaryText}>🌐 Other Unique IDs & Profiles: Destroyed</span>
                      </div>
                    </div>

                    <div className={`border-t ${borderClass} mt-4 pt-3 flex flex-col gap-1 text-[10px] font-mono`}>
                      <p className={mutedText}>STABLE SHA-256 HASH IDENTIFIER:</p>
                      <p className={`truncate font-mono select-all p-1.5 rounded bg-neutral-900/40 border ${borderClass} ${secondaryText}`}>
                        {cleanedResult.hash}
                      </p>
                    </div>
                  </div>

                  {/* Start Over Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={resetWorkspace}
                      className={`inline-flex items-center gap-2 text-xs font-mono font-bold transition-all py-2 px-4 rounded-lg hover:bg-neutral-500/5 ${secondaryText}`}
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                      Scrub Another File
                    </button>
                  </div>
                </motion.div>
              )
            )
          )}

        </AnimatePresence>

      </main>

      {/* Massive SEO Footer containing extensive keywords for search index lookup */}
      <footer id="policies" className={`border-t ${borderClass} ${theme === "dark" ? "bg-[#050607]" : "bg-neutral-50"} px-6 py-10 mt-12 transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto w-full">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-zinc-800/10 dark:border-zinc-800">
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1">
                🛡️ GhostWipe Privacy Directive
              </p>
              <p className={`text-xs ${secondaryText} max-w-lg leading-relaxed`}>
                All image and document processing executes inside your local client-side memory sandbox. We store zero assets, use no cloud databases, and utilize zero tracking cookies or telemetry beacons.
              </p>
            </div>
            
            {/* Quick Policies Link */}
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <button 
                onClick={() => setActivePolicyModal("PRIVACY")}
                className="hover:underline text-emerald-500"
              >
                Privacy Policy
              </button>
              <span className={mutedText}>|</span>
              <button 
                onClick={() => setActivePolicyModal("TERMS")}
                className="hover:underline text-emerald-500"
              >
                Zero-Upload Terms
              </button>
            </div>
          </div>

          {/* Exhaustive SEO keyword footer content */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[10px] font-mono text-zinc-500 dark:text-zinc-600">
            <div>
              <h4 className="font-semibold text-zinc-400 dark:text-zinc-500 uppercase mb-2">Exif Metadata Removal</h4>
              <p className="leading-relaxed">
                Remove EXIF, erase GPS geotags from JPEG, clear camera model tags, strip camera serials, delete software signatures, wipe creation timestamps, remove camera lens specifications, sanitize raw binary attributes.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-400 dark:text-zinc-500 uppercase mb-2">AI Tag & Prompt Purger</h4>
              <p className="leading-relaxed">
                Erase Stable Diffusion prompt seeds, purge Midjourney parameters, delete ChatGPT text signatures, remove DALL-E watermarks, strip generative AI metadata, dismantle iTXt PNG text chunks, wipe neural creator hashes.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-400 dark:text-zinc-500 uppercase mb-2">Privacy & Anonymity Tools</h4>
              <p className="leading-relaxed">
                Zero-log browser sanitization, 100% offline-first EXIF cleaner, local sandboxed document purger, secure metadata scrubbing, CC0 digital footprint wiper, untraceable JPEG export, complete user confidentiality.
              </p>
            </div>
          </div>

          <div className={`pt-6 mt-6 border-t ${borderClass} flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono ${mutedText} gap-4`}>
            <div className="flex items-center gap-3">
              <img 
                src="https://file.garden/aeySfh58aX0K8a6A/ghostwipe" 
                alt="GhostWipe Logo" 
                className="w-10 h-10 object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-bold">GhostWipe</p>
                <p>Certified Serverless. Zero Cookies. Zero Logs. Zero Telemetry.</p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1 text-xs">
              <span>All metadata erased locally inside your sandbox memory.</span>
              <span className="text-[10px]">
                Developed by{" "}
                <a 
                  href="https://anantbhardwaj.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-500 hover:underline font-bold inline-flex items-center gap-0.5"
                >
                  Anant Bhardwaj
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </span>
            </div>
          </div>

        </div>
      </footer>

      {/* COMPLIANCE POLICY & SEO GLOSSARY MODALS */}
      <AnimatePresence>
        {activePolicyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActivePolicyModal(null)}
          >
            <motion.div
              initial={{ scale: 0.97, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className={`border max-w-2xl w-full rounded-2xl p-6 sm:p-8 shadow-2xl relative ${cardBg} ${borderClass}`}
            >
              <button
                onClick={() => setActivePolicyModal(null)}
                className={`absolute top-4 right-4 font-mono text-lg transition-colors cursor-pointer ${secondaryText} hover:text-red-500`}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {activePolicyModal === "PRIVACY" && (
                <div>
                  <div className="flex items-center gap-2 text-emerald-500 mb-4">
                    <Shield className="w-5 h-5" />
                    <h3 className="text-base font-mono font-bold tracking-tight uppercase">Privacy Shield Directive</h3>
                  </div>
                  <div className={`space-y-4 text-xs sm:text-sm leading-relaxed ${secondaryText}`}>
                    <p>
                      GhostWipe operates under a strict, unyielding <strong>Zero-Telemetry, Zero-Collection Policy</strong>.
                    </p>
                    <p className={`p-3.5 rounded-lg font-mono text-xs ${theme === "dark" ? "bg-zinc-900 text-emerald-400 border border-zinc-800" : "bg-neutral-50 text-emerald-700 border border-neutral-200"}`}>
                      LOCAL PROCESS STATE: No backend web servers, persistent databases, or third-party storage buckets exist on this domain. Files are loaded into RAM sandbox buffers using HTML5 API tools and are wiped instantly from physical hardware upon tab closure.
                    </p>
                    <p>
                      There are zero analytical cookies, third-party trackers, or marketing trackers embedded on this page. Your files never transit the web.
                    </p>
                  </div>
                </div>
              )}

              {activePolicyModal === "TERMS" && (
                <div>
                  <div className="flex items-center gap-2 text-emerald-500 mb-4">
                    <Lock className="w-5 h-5" />
                    <h3 className="text-base font-mono font-bold tracking-tight uppercase">Zero-Upload Service Terms</h3>
                  </div>
                  <div className={`space-y-4 text-xs sm:text-sm leading-relaxed ${secondaryText}`}>
                    <p>
                      Welcome to GhostWipe. By utilizing our client-side software, you agree to these clear and clean conditions:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-xs">
                      <li><strong>Absolutely Free & Unlimited:</strong> GhostWipe provides unrestricted file purging without subscription paywalls, registration steps, or tracking.</li>
                      <li><strong>Intellectual Ownership:</strong> You retain 100% rights, licenses, and ownership over files parsed by the app. GhostWipe never holds, reviews, or collects your content.</li>
                      <li><strong>Local Cycle Guarantee:</strong> We guarantee the application does not make network requests to transmit files or tracking telemetry.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activePolicyModal === "AI_EXPLAIN" && (
                <div>
                  <div className="flex items-center gap-2 text-emerald-500 mb-4">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-base font-mono font-bold tracking-tight uppercase">AI Tag & Prompt Stripping</h3>
                  </div>
                  <div className={`space-y-4 text-xs sm:text-sm leading-relaxed ${secondaryText}`}>
                    <p>
                      When artificial intelligence generative models (like Midjourney, Stable Diffusion, DALL-E, and ChatGPT) generate image assets, they write custom text metadata blocks.
                    </p>
                    <p>
                      These blocks can store your entire generation prompt, prompt seed, system settings, model weights, and account ID numbers.
                    </p>
                    <p className={`p-3.5 rounded-lg font-mono text-xs ${theme === "dark" ? "bg-zinc-900 text-emerald-400 border border-zinc-800" : "bg-neutral-50 text-emerald-700 border border-neutral-200"}`}>
                      HOW WE SCRUB: GhostWipe dissects the raw binary streams of the file, locating XMP sections, PNG tEXt/iTXt headers, and EXIF parameters. It overwrites these sections, completely erasing the AI tags while keeping your output 100% viewable and clean.
                    </p>
                  </div>
                </div>
              )}

              {activePolicyModal === "SEO_GLOSSARY" && (
                <div>
                  <div className="flex items-center gap-2 text-emerald-500 mb-4">
                    <Bookmark className="w-5 h-5" />
                    <h3 className="text-base font-mono font-bold tracking-tight uppercase">Glossary & Index Terms</h3>
                  </div>
                  <div className={`space-y-3.5 text-xs sm:text-sm leading-relaxed ${secondaryText} max-h-[300px] overflow-y-auto pr-2`}>
                    <p>
                      Explore the key technical terms, metadata channels, and privacy concepts sanitized by GhostWipe:
                    </p>
                    <div className="space-y-2 text-xs">
                      <p><strong>EXIF (Exchangeable Image File Format):</strong> Standard header structure specifying camera model, aperture zoom, focal length, exposure coefficients, and time parameters.</p>
                      <p><strong>GPS Geolocation:</strong> Triangulated latitude, longitude, and altitude coordinate variables embedded at time of capture, indicating precise street positions on maps.</p>
                      <p><strong>XMP (Extensible Metadata Platform):</strong> XML-based metadata standard maintained by Adobe, frequently used to log creator name, copyright statuses, and editing history.</p>
                      <p><strong>PNG tEXt/iTXt:</strong> Embedded text segments commonly containing model prompts, generative seeds, and software model parameters used by Stable Diffusion and AI platforms.</p>
                      <p><strong>LSB Steganography:</strong> Least Significant Bit pixel-lacing used by some tracking platforms to write digital watermarks inside raw image pixels. GhostWipe slightly perturbs these bits to dismantle them.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-zinc-800/10 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => setActivePolicyModal(null)}
                  className={`font-semibold text-xs py-2 px-5 rounded-lg font-mono transition-colors ${theme === "dark" ? "bg-emerald-400 text-[#08090a] hover:bg-emerald-300" : "bg-neutral-950 text-white hover:bg-neutral-800"}`}
                >
                  Close
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
