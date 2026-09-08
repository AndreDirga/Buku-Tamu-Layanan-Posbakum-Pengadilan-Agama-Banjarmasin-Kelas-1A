import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Upload, SwitchCamera, Sparkles } from 'lucide-react';
import { compressImageToTargetKb, getDataUrlSizeKb } from '../../utils/imageCompressor';

interface CameraSelfieProps {
  photoDataUrl: string | null;
  onPhotoCaptured: (dataUrl: string) => void;
  onPhotoCleared: () => void;
}

export const CameraSelfie: React.FC<CameraSelfieProps> = ({
  photoDataUrl,
  onPhotoCaptured,
  onPhotoCleared,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [flash, setFlash] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute exact photo size in KB
  const photoSizeKb = useMemo(() => {
    return photoDataUrl ? getDataUrlSizeKb(photoDataUrl) : null;
  }, [photoDataUrl]);

  // Start Camera
  const startCamera = async () => {
    setIsStartingCamera(true);
    setCameraError(null);

    // Stop previous stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung pada peramban ini');
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau izin belum diberikan. Anda dapat mengunggah foto selfie langsung dari galeri/file.'
      );
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Stop camera when unmounting or photo is captured
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!photoDataUrl) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [photoDataUrl, facingMode]);

  // Capture current frame from video stream and automatically compress to ~150 KB
  const capturePhoto = async () => {
    if (!videoRef.current || isCompressing) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front-camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    setIsCompressing(true);
    try {
      // Automatically compress and convert to strictly target ~150 KB
      const result = await compressImageToTargetKb(canvas, 150);
      stopCamera();
      onPhotoCaptured(result.dataUrl);
    } catch (err) {
      console.error('Camera compression failed, using direct canvas fallback:', err);
      const fallbackUrl = canvas.toDataURL('image/jpeg', 0.78);
      stopCamera();
      onPhotoCaptured(fallbackUrl);
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle manual file upload and automatically compress to ~150 KB
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (.jpg, .jpeg, .png)');
      return;
    }

    setIsCompressing(true);
    try {
      // Automatically compress and convert uploaded photo to ~150 KB
      const result = await compressImageToTargetKb(file, 150);
      stopCamera();
      onPhotoCaptured(result.dataUrl);
    } catch (err) {
      console.error('File compression failed:', err);
      alert('Gagal memproses foto selfie. Silakan coba file lain.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRetake = () => {
    onPhotoCleared();
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="block text-[11px] font-semibold text-slate-700">
            Foto Selfie / Wajah Pengunjung <span className="text-rose-600">*</span>
          </label>
          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-300">
            Maks 150 KB
          </span>
        </div>
        {photoDataUrl && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Foto terverifikasi ({photoSizeKb} KB)</span>
          </span>
        )}
      </div>

      <p className="text-[10px] text-slate-500">
        Posisikan wajah Anda di dalam bingkai oval. Foto otomatis dikonversi berukuran maksimal ~150 KB demi efisiensi dan keamanan basis data.
      </p>

      {/* Main Camera / Preview Box */}
      <div className="relative w-full aspect-4/3 max-w-xs mx-auto bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300">
        {flash && (
          <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150 opacity-100" />
        )}

        {/* Compressing spinner overlay */}
        {isCompressing && (
          <div className="absolute inset-0 bg-slate-900/90 z-40 flex flex-col items-center justify-center text-white text-xs gap-2 p-4 text-center">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="font-bold text-slate-100">Mengonversi Foto ke 150 KB...</span>
            <span className="text-[10px] text-slate-300">Mengoptimalkan resolusi dan ketajaman wajah</span>
          </div>
        )}

        {photoDataUrl ? (
          /* Captured Photo Preview */
          <div className="relative w-full h-full">
            <img
              src={photoDataUrl}
              alt="Selfie Pengunjung"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1.5 rounded-lg text-[10px]">
              <div className="flex items-center gap-1 font-medium text-emerald-400">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Tersimpan {photoSizeKb} KB</span>
              </div>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded font-medium transition"
              >
                <RefreshCw className="w-3 h-3" />
                Ambil Ulang
              </button>
            </div>
          </div>
        ) : cameraError ? (
          /* Camera Error / Fallback Upload Mode */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-300 bg-slate-800 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <p className="text-[10px] text-slate-300 max-w-xs">{cameraError}</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={startCamera}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
              >
                <Upload className="w-3 h-3" />
                Unggah Foto
              </button>
            </div>
          </div>
        ) : (
          /* Active Camera Stream View */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Oval Face Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-40 h-52 border-2 border-dashed border-emerald-400/80 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                <div className="w-36 h-48 border border-emerald-300/40 rounded-[50%]" />
              </div>
            </div>

            {/* Flip Camera button if mobile */}
            <button
              type="button"
              onClick={toggleCameraFacing}
              title="Balik Kamera"
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-xs transition"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
            </button>

            {isStartingCamera && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white text-[11px] gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                Menyiapkan kamera...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!photoDataUrl && !cameraError && (
        <div className="flex items-center justify-center gap-2 pt-0.5">
          <button
            type="button"
            disabled={isCompressing || isStartingCamera}
            onClick={capturePhoto}
            className="flex-1 max-w-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-60"
          >
            <Camera className="w-4 h-4" />
            <span>Ambil Foto Selfie (~150 KB)</span>
          </button>
          <button
            type="button"
            disabled={isCompressing}
            onClick={() => fileInputRef.current?.click()}
            title="Unggah dari file (Otomatis dikompresi ke 150 KB)"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

