import React, { useRef, useState, useEffect } from 'react';
import { Eraser, CheckCircle2, PenTool, Check } from 'lucide-react';

interface SignaturePadProps {
  signatureDataUrl: string | null;
  onSignatureSaved: (dataUrl: string) => void;
  onSignatureCleared: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  signatureDataUrl,
  onSignatureSaved,
  onSignatureCleared,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Resize canvas according to container
  const initCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineWidth = 2.5;

    // If already saved, redraw saved image
    if (signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = signatureDataUrl;
      setHasStrokes(true);
      setIsSaved(true);
    }
  };

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSaved) setIsSaved(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasStrokes(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Auto-save signature so guest doesn't need to click extra button
    const canvas = canvasRef.current;
    if (canvas && hasStrokes) {
      const pngDataUrl = canvas.toDataURL('image/png');
      setIsSaved(true);
      onSignatureSaved(pngDataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    setIsSaved(false);
    onSignatureCleared();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;

    // Generate transparent PNG
    const pngDataUrl = canvas.toDataURL('image/png');
    setIsSaved(true);
    onSignatureSaved(pngDataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold text-slate-700">
          Tanda Tangan Digital Pengunjung <span className="text-rose-600">*</span>
        </label>
        {isSaved && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Tanda tangan tersimpan
          </span>
        )}
      </div>

      <p className="text-[10px] text-slate-400">
        Goreskan tanda tangan Anda pada kotak berikut menggunakan jari atau stylus.
      </p>

      {/* Signature Canvas Box */}
      <div
        ref={containerRef}
        className={`relative w-full h-36 bg-white rounded-xl border transition-all overflow-hidden ${
          isSaved
            ? 'border-emerald-500 bg-emerald-50/20'
            : 'border-slate-300 hover:border-emerald-400'
        }`}
      >
        {/* Subtle Guidelines */}
        <div className="absolute inset-x-4 bottom-6 border-b border-dashed border-slate-200 pointer-events-none flex justify-between">
          <span className="text-[9px] text-slate-300 font-sans select-none">Tanda Tangan Digital</span>
          <span className="text-[9px] text-slate-300 font-sans select-none">✕ Posbakum PA Banjarmasin</span>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="relative z-10 w-full h-full cursor-crosshair touch-none"
        />

        {!hasStrokes && !signatureDataUrl && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
            <PenTool className="w-5 h-5 mb-1 opacity-40 text-emerald-600" />
            <span className="text-[11px] font-medium text-slate-400">Sentuh & goreskan tanda tangan di sini</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasStrokes && !signatureDataUrl}
          className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-slate-300 flex items-center gap-1 transition"
        >
          <Eraser className="w-3.5 h-3.5 text-slate-500" />
          Hapus
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasStrokes || isSaved}
          className={`px-4 py-1 text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-xs ${
            isSaved
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
              : 'bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Tersimpan
            </>
          ) : (
            <>
              <PenTool className="w-3.5 h-3.5" />
              Simpan Tanda Tangan
            </>
          )}
        </button>
      </div>
    </div>
  );
};
