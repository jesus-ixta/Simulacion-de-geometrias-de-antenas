import React, { useEffect, useRef, useState } from 'react';
import {
  AmInputs,
  AntennaMode,
  FmInputs,
  SimulationResult,
  SweepPoint,
} from '../physics/antennaMath';

interface SwrSweepCanvasProps {
  mode: AntennaMode;
  fmInputs: FmInputs;
  amInputs: AmInputs;
  result: SimulationResult;
}

export const SwrSweepCanvas: React.FC<SwrSweepCanvasProps> = ({
  mode,
  fmInputs,
  amInputs,
  result,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<SweepPoint | null>(null);

  const sweep = result.sweep;
  const currentFreq = mode === 'fm' ? fmInputs.freqMHz : amInputs.freqKHz;
  const fMin = sweep[0]?.freq ?? (mode === 'fm' ? 88 : 530);
  const fMax = sweep[sweep.length - 1]?.freq ?? (mode === 'fm' ? 108 : 1700);
  const maxSwrPlot = 10;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(360, rect.height);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const pad = { top: 26, right: 24, bottom: 44, left: 54 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const mapX = (f: number) => pad.left + ((f - fMin) / (fMax - fMin)) * plotW;
    const mapY = (swr: number) => {
      const clamped = Math.max(1, Math.min(maxSwrPlot, swr));
      return pad.top + ((maxSwrPlot - clamped) / (maxSwrPlot - 1)) * plotH;
    };

    // Zona aceptable ROE <= 2.0 sombreada suavemente
    const yLimit = mapY(2.0);
    ctx.fillStyle = 'rgba(5, 150, 105, 0.06)';
    ctx.fillRect(pad.left, yLimit, plotW, pad.top + plotH - yLimit);

    // Rejilla Y (ROE: 1, 2, 4, 6, 8, 10)
    const yTicks = [1, 2, 4, 6, 8, 10];
    yTicks.forEach((v) => {
      const y = mapY(v);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.strokeStyle = v === 2 ? '#059669' : '#E2E8F0';
      ctx.lineWidth = v === 2 ? 1.4 : 1;
      if (v === 2) ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = v === 2 ? '#047857' : '#64748B';
      ctx.font = v === 2 ? '600 11px "IBM Plex Mono", monospace' : '400 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${v.toFixed(1)}`, pad.left - 8, y);
    });

    // Etiqueta límite ROE = 2.0
    ctx.fillStyle = '#047857';
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Límite aceptable ROE = 2.0', pad.left + 8, yLimit - 4);

    // Rejilla X (Frecuencia)
    const xTickCount = mode === 'fm' ? 5 : 6;
    for (let i = 0; i <= xTickCount; i++) {
      const f = fMin + (i / xTickCount) * (fMax - fMin);
      const x = mapX(f);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '400 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(mode === 'fm' ? f.toFixed(0) : Math.round(f).toString(), x, pad.top + plotH + 8);
    }

    // Ejes principales
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Títulos de ejes
    ctx.fillStyle = '#334155';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Frecuencia (${result.fResUnit})`, pad.left + plotW / 2, height - 10);

    ctx.save();
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ROE (VSWR)', 0, 0);
    ctx.restore();

    // Curva ROE vs Frecuencia
    if (sweep.length > 1) {
      ctx.beginPath();
      sweep.forEach((pt, idx) => {
        const x = mapX(pt.freq);
        const y = mapY(pt.swr);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Línea vertical de resonancia si está en rango
    if (result.fResonance >= fMin && result.fResonance <= fMax) {
      const rx = mapX(result.fResonance);
      ctx.beginPath();
      ctx.moveTo(rx, pad.top);
      ctx.lineTo(rx, pad.top + plotH);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#475569';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`f_res=${result.fResonance.toFixed(1)}`, rx, pad.top + 10);
    }

    // Punto rojo de operación actual
    const opX = mapX(currentFreq);
    const opY = mapY(result.swr);

    ctx.beginPath();
    ctx.moveTo(opX, pad.top + plotH);
    ctx.lineTo(opX, opY);
    ctx.lineTo(pad.left, opY);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(opX, opY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#DC2626';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#DC2626';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.textAlign = opX > width * 0.72 ? 'right' : 'left';
    const labelOffset = opX > width * 0.72 ? -10 : 10;
    ctx.fillText(
      `f₀=${currentFreq}${mode === 'fm' ? ' MHz' : ' kHz'} · ROE=${result.swr.toFixed(2)}`,
      opX + labelOffset,
      Math.max(pad.top + 16, opY - 10)
    );

    // Crosshair interactivo al pasar el mouse
    if (hoverPoint) {
      const hx = mapX(hoverPoint.freq);
      const hy = mapY(hoverPoint.swr);
      ctx.beginPath();
      ctx.moveTo(hx, pad.top);
      ctx.lineTo(hx, pad.top + plotH);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1E40AF';
      ctx.fill();
    }
  }, [mode, fmInputs, amInputs, result, sweep, currentFreq, fMin, fMax, hoverPoint]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || sweep.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const padLeft = 54;
    const padRight = 24;
    const plotW = rect.width - padLeft - padRight;
    const relX = e.clientX - rect.left - padLeft;
    if (relX < 0 || relX > plotW) {
      setHoverPoint(null);
      return;
    }
    const targetF = fMin + (relX / plotW) * (fMax - fMin);
    let nearest = sweep[0];
    let minD = Math.abs(sweep[0].freq - targetF);
    for (let i = 1; i < sweep.length; i++) {
      const d = Math.abs(sweep[i].freq - targetF);
      if (d < minD) {
        minD = d;
        nearest = sweep[i];
      }
    }
    setHoverPoint(nearest);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-3 h-0.5 bg-[#1E40AF] inline-block" />
            Curva ROE(f)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" />
            Punto de operación f₀
          </span>
        </div>

        <div className="font-mono text-[11px] text-slate-600 tabular-nums">
          {hoverPoint ? (
            <span>
              Cursor: {hoverPoint.freq.toFixed(1)} {result.fResUnit} · ROE {hoverPoint.swr.toFixed(2)} · Z={hoverPoint.rOhm.toFixed(0)}
              {hoverPoint.xOhm >= 0 ? '+j' : '-j'}
              {Math.abs(hoverPoint.xOhm).toFixed(0)} Ω
            </span>
          ) : (
            <span>Mueve el cursor sobre la gráfica para medir</span>
          )}
        </div>
      </div>

      <div className="relative w-full h-[390px] border border-slate-200 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverPoint(null)}
          className="w-full h-full block cursor-crosshair"
        />
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        {mode === 'fm'
          ? 'El dipolo de media onda presenta un ancho de banda amplio en FM (~10–15% de f₀ con ROE ≤ 2.0). La frecuencia mínima de la curva corresponde a f_res donde la reactancia X_A se anula.'
          : 'El circuito tanque LC de la bobina AM posee un factor de calidad Q elevado, generando un valle de sintonía selectivo en torno a f_res = 1 / (2π√LC) para rechazar estaciones adyacentes.'}
      </p>
    </div>
  );
};
