# ShortForge — Long Video → Shorts Website

একটি সুন্দর, mobile-friendly Long Video → Vertical Shorts web app starter।

## এখন কী করতে পারে
- Long video upload
- 3/5/7/10টি Shorts
- 15/30/45/60 sec duration
- 9:16 vertical output
- 1080×1920 MP4
- Browser preview
- MP4 download
- Dark responsive UI
- Upload progress

## প্রয়োজন
- Node.js 18+
- FFmpeg
- FFprobe

FFmpeg ইনস্টল করে নিশ্চিত করুন:
```bash
ffmpeg -version
ffprobe -version
```

## চালু করা
```bash
npm install
npm start
```

তারপর ব্রাউজারে:
`http://localhost:3000`

## গুরুত্বপূর্ণ
এই সংস্করণটি "smart demo" mode: ভিডিওর timestamp থেকে Shorts বানায়। এটি এখনো transcript-based AI highlight detection, automatic captions, face tracking বা YouTube downloader ব্যবহার করছে না।

Production AI version করতে যোগ করা যাবে:
1. Whisper/অন্য speech-to-text দিয়ে transcript
2. AI দিয়ে hook/highlight scoring
3. Auto captions
4. Face tracking / smart reframe
5. YouTube URL ingest (শুধু আপনার নিজের/অনুমতিপ্রাপ্ত কনটেন্টের জন্য)
6. Cloud storage + background workers
7. User login, queue, history

বড় ভিডিও production-এ serverless hosting-এর বদলে dedicated worker/VPS/Cloud Run ধরনের backend ব্যবহার করা ভালো।
