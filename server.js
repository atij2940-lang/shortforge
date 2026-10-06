const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
const OUTPUTS = path.join(ROOT, "outputs");

for (const dir of [UPLOADS, OUTPUTS]) fs.mkdirSync(dir, { recursive: true });

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(ROOT, "public")));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, crypto.randomUUID() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

async function durationOf(file) {
  const out = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", file
  ]);
  return Number(out.trim());
}

async function makeClip(input, output, start, duration, captionText) {
  // Portrait crop with blurred background + centered source.
  // This works without an external AI service and provides a polished 9:16 result.
  const filter = [
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=18:2[bg]",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg]",
    "[bg][fg]overlay=(W-w)/2:(H-h)/2[v]"
  ].join(";");

  const args = [
    "-y", "-ss", String(start), "-i", input, "-t", String(duration),
    "-filter_complex", filter,
    "-map", "[v]", "-map", "0:a?",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    output
  ];
  await run("ffmpeg", args);
}

app.post("/api/create-shorts", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "ভিডিও ফাইল দিন।" });

    const count = Math.min(10, Math.max(1, Number(req.body.count || 5)));
    const requested = Math.min(60, Math.max(10, Number(req.body.duration || 30)));
    const total = await durationOf(req.file.path);

    if (!Number.isFinite(total) || total < 1) {
      return res.status(400).json({ error: "ভিডিওর duration পড়া যায়নি। FFmpeg/ffprobe ইনস্টল আছে কি না দেখুন।" });
    }

    const actualDuration = Math.min(requested, Math.max(1, total));
    const jobId = crypto.randomUUID();
    const jobDir = path.join(OUTPUTS, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const results = [];
    const usable = Math.max(0, total - actualDuration);
    const step = count === 1 ? 0 : usable / (count - 1);

    for (let i = 0; i < count; i++) {
      const start = Math.min(i * step, Math.max(0, total - actualDuration));
      const outName = `short-${String(i + 1).padStart(2, "0")}.mp4`;
      const outPath = path.join(jobDir, outName);
      await makeClip(req.file.path, outPath, start, actualDuration);
      results.push({
        name: `Short ${i + 1}`,
        start: Math.round(start),
        duration: Math.round(actualDuration),
        url: `/outputs/${jobId}/${outName}`
      });
    }

    try { fs.unlinkSync(req.file.path); } catch {}
    res.json({
      success: true,
      mode: "smart-demo",
      message: "Shorts তৈরি হয়েছে।",
      sourceDuration: Math.round(total),
      results
    });
  } catch (e) {
    console.error(e);
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    res.status(500).json({
      error: "ভিডিও প্রসেস করা যায়নি।",
      detail: String(e.message || e)
    });
  }
});

app.use("/outputs", express.static(OUTPUTS));

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`AI Shorts Maker running at http://localhost:${PORT}`);
});