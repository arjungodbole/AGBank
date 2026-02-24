"use client";

import { useRef, useState, useEffect } from "react";

interface ChipScannerProps {
  denominations: { color: string; value: number }[];
  onResult: (total: number) => void;
  onClose: () => void;
}

export default function ChipScanner({
  denominations,
  onResult,
  onClose,
}: ChipScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        setError("Could not access camera. Please allow camera permissions.");
      }
    };

    startCamera();

    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const captureFrame = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.8));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scanChips = async () => {
    if (!capturedImage) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/scan-chips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedImage,
          denominations,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to scan chips");
      }

      const { total } = await response.json();
      onResult(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan chips");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Scan Your Chips
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-red-800 text-sm">
              {error}
            </div>
          )}

          {capturedImage ? (
            <div className="space-y-3">
              <img
                src={capturedImage}
                alt="Captured chips"
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={retake}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Retake
                </button>
                <button
                  onClick={scanChips}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Scanning..." : "Scan Chips"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-gray-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={captureFrame}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Capture
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Upload Photo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
