\# GhostWipe



\*\*A 100% offline-first, in-browser file metadata sanitizer.\*\*



GhostWipe strips EXIF, GPS, and hardware-identifier metadata from your files entirely on your own device — no uploads, no servers, no logs. Everything runs in sandboxed browser memory and is discarded the moment you close the tab.



🔗 \*\*Live app:\*\* \[GhostWipe.netlify.app](https://GhostWipe.netlify.app)

📦 \*\*Repo:\*\* \[github.com/anxntbhardwaj/GhostWipe](https://github.com/anxntbhardwaj/GhostWipe)



\---



\## Why GhostWipe



Photos and documents carry more than what you see. Modern files routinely embed:



\- GPS coordinates of where a photo was taken

\- Camera/device make, model, and serial number

\- Timestamps down to the second

\- Software/editing history

\- Author, creator, and producer fields (PDFs)

\- Adobe XMP blocks with revision history



Sharing a file online, in a support ticket, in a marketplace listing, or with a stranger can leak all of this without you realizing it. GhostWipe removes it — locally, instantly, and without needing to trust a third-party server with your files.



\---



\## Features



\- 🛰️ \*\*Zero-network architecture\*\* — files never leave your device. No upload, no API call, no telemetry.

\- 🧼 \*\*Full metadata wipe\*\* — destroys EXIF, GPS, hardware IDs, timestamps, and editing history via canvas re-encoding (images) or targeted binary overwrite (PDFs).

\- 🏷️ \*\*Neutral metadata mode\*\* — optionally replaces stripped headers with generic, non-identifying placeholder tags instead of leaving the file header empty.

\- 🔀 \*\*High-entropy renaming\*\* — replaces the original filename with a random 12-character alphanumeric string.

\- 🖼️ \*\*Broad format support\*\* — JPEG, PNG, and WebP via canvas rasterization; PDF and XMP-bearing files via a binary ArrayBuffer sweep.

\- ⚡ \*\*Instant, local processing\*\* — no queues, no waiting on a remote service.



\---



\## How it works



\### Phase 1: Local in-memory file loading



When a file is loaded via drag-and-drop or the file picker, GhostWipe reads it using the browser's native `File` API and creates a local reference with `URL.createObjectURL()` — used only for in-tab preview rendering, never written to disk or transmitted anywhere.



The file is then classified by MIME type and extension, and routed to one of two pipelines:



\- \*\*Raster images\*\* (JPEG, PNG, WebP) → Canvas Rasterization Pipeline

\- \*\*Vector/document files\*\* (PDF, SVG) → ArrayBuffer Binary Sweep



\### Phase 2: Sanitization



\*\*Pipeline A — Canvas rasterization (images).\*\* The source image is loaded into an `HTMLImageElement` and redrawn onto an off-screen `<canvas>` via `ctx.drawImage()`. This extracts only the visual pixel matrix and leaves the entire original file container — EXIF block, camera profile, software strings, capture timestamp, embedded thumbnail — behind. The canvas is then re-encoded into a fresh binary blob with `canvas.toBlob()` / `canvas.toDataURL()`, producing a file with a clean, minimal header from scratch.



\*\*Pipeline B — ArrayBuffer binary sweep (PDFs and XMP-bearing files).\*\* The file is read into an `ArrayBuffer`/`Uint8Array` and scanned as raw bytes:



\- \*\*PDF dictionary keys\*\* — `/Author`, `/Creator`, `/Producer`, `/CreationDate`, `/ModDate`, `/Title` are located and every character inside their value parentheses is overwritten with blank (`0x20`) bytes, neutralizing the field without breaking the file structure.

\- \*\*XMP metadata blocks\*\* — Adobe XMP structures (`<x:xmpmeta>` … `</x:xmpmeta>`) are located and the entire block is overwritten with blank spacer bytes, removing embedded camera serials, editing-software identifiers, and revision history tables.



\### Phase 3: High-entropy renaming



The original filename — which often encodes capture dates, device names, or project details — is discarded. A new name is generated from a lowercase alphanumeric character set (`a–z`, `0–9`) using a 12-iteration randomization loop, with the original file extension re-attached (e.g. `5y9x2k8v1m7q.jpg`).



\### Phase 4: Output mode



\- \*\*Full Wipe (Max Sterile Mode).\*\* The output header contains only the structural fields required for rendering (dimensions, color profile). No EXIF, GPS, IPTC, or XMP data is present.

\- \*\*Neutral Metadata Mode.\*\* Runs the full wipe first, then writes back a small set of generic, non-identifying placeholder fields (e.g. blank/default camera-make and camera-model tags, no GPS block) so the header isn't unusually empty. This mode does not fabricate a camera identity, GPS location, or capture history, and does not alter or strip content-provenance signals (such as C2PA data) on files that carry them — the goal is an unremarkable header, not a false origin story.



\### Phase 5: Export and cleanup



The sanitized output is packaged into a `Blob` and offered as a download via a generated `a.download` link. Immediately after, `URL.revokeObjectURL()` is called on all temporary object URLs, and in-memory buffers (pixel arrays, byte views, React state) are cleared, allowing garbage collection to flush the data from RAM.



\---



\## Usage



1\. Visit \[GhostWipe.netlify.app](https://GhostWipe.netlify.app), or run it locally (below).

2\. Drag and drop a file, or use the file picker.

3\. Choose a mode:

&#x20;  - \*\*Full Wipe\*\* — strips everything, no replacement metadata.

&#x20;  - \*\*Neutral Metadata\*\* — strips everything, then writes back generic placeholder fields.

4\. Download the sanitized, randomly-renamed file.



No account, no install, no internet connection required after the page has loaded.



\---



\## Running locally



```bash

git clone https://github.com/anxntbhardwaj/GhostWipe.git

cd GhostWipe

npm install

npm run dev

```



Because GhostWipe makes no network calls once loaded, you can verify offline behavior by disabling your network connection after the initial page load and confirming the app still functions.



\---



\## Privacy \& security notes



\- No file, filename, or metadata is ever transmitted anywhere. Confirm this yourself in your browser's Network tab — there should be zero outgoing requests during processing.

\- Sanitization happens per-file, in memory, and nothing is written to disk except the final file you choose to download.

\- Because processing is entirely client-side, GhostWipe's guarantees depend on running it from a source you trust (this repo, or a build you've audited yourself).



\---



\## Contributing



Issues and PRs are welcome — especially around expanding format support (RAW, HEIC, additional vector formats) and improving sanitization coverage for edge-case metadata fields.





