"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export default function CameraScanner({ onDetected, onClose }: { onDetected: (value: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Point the camera at a barcode.");

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = async () => {
      const BarcodeDetector = (window as typeof window & { BarcodeDetector?: new () => Detector }).BarcodeDetector;
      if (!BarcodeDetector) { setMessage("Camera scanning is not supported here. Type or use a hardware scanner instead."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new BarcodeDetector();
        timer = setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return;
          const [result] = await detector.detect(video.current);
          if (result?.rawValue) onDetected(result.rawValue);
        }, 500);
      } catch { setMessage("Camera access was blocked. Check device permissions or type the barcode."); }
    };
    void start();
    return () => { if (timer) clearInterval(timer); stream?.getTracks().forEach((track) => track.stop()); };
  }, [onDetected]);

  return <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Scan barcode">
    <section className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8">
      <div className="flex items-center justify-between mb-4"><div><h2 className="font-semibold text-text-primary">Scan barcode</h2><p className="text-xs text-text-muted mt-1">{message}</p></div><button type="button" onClick={onClose} className="min-w-11 min-h-11 rounded-full hover:bg-gray-100" aria-label="Close scanner">×</button></div>
      <div className="aspect-square bg-black rounded-2xl overflow-hidden relative"><video ref={video} muted playsInline className="w-full h-full object-cover" /><span className="absolute inset-8 border-2 border-primary rounded-xl pointer-events-none" /></div>
      <button type="button" onClick={onClose} className="w-full mt-4 py-3 rounded-xl border border-border text-sm font-semibold text-text-primary">Enter manually</button>
    </section>
  </div>;
}
