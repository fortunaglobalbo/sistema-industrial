'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SignatureCanvasProps {
  onChange: (base64Image: string | null) => void;
  value: string | null;
}

export default function SignatureCanvas({ onChange, value }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Inicializar dimensiones físicas del canvas al montar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      // Ajustar resolución interna al tamaño del layout visible
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Configurar el contexto para el trazo
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      // Si ya hay un valor (por ejemplo, si se vuelve a renderizar), no lo borramos
      // Pero si cambiamos de tamaño, el canvas se limpia nativamente.
      setIsEmpty(true);
      onChange(null);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Limpiar el canvas
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  };

  // Obtener las coordenadas del puntero
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Iniciar el dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevenir scrolling en móviles
    if (e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  // Dibujar trazo
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevenir scrolling en móviles
    if (e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Finalizar dibujo y propagar el base64 al formulario
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Obtener la imagen en formato PNG Base64
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden h-48 bg-slate-50 cursor-crosshair">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-slate-400 font-medium text-sm">
            Firme aquí (Dedo o Mouse)
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full block touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">
          {!isEmpty ? '✓ Firma capturada' : 'Firma requerida para conformidad'}
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          Limpiar Firma
        </button>
      </div>
    </div>
  );
}
