import React, { useEffect, useRef } from 'react';
import {
  AmInputs,
  AntennaMode,
  FmInputs,
  SPEED_OF_LIGHT,
  SimulationResult,
} from '../physics/antennaMath';

interface GeometryStandingWaveCanvasProps {
  mode: AntennaMode;
  fmInputs: FmInputs;
  amInputs: AmInputs;
  result: SimulationResult;
}

export const GeometryStandingWaveCanvas: React.FC<GeometryStandingWaveCanvasProps> = ({
  mode,
  fmInputs,
  amInputs,
  result,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // Rejilla milimétrica de fondo sutil
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let x = 20; x < width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 20; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const drawDimensionLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      label: string,
      color = '#334155',
      offsetLabelY = -10
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.1;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Marcas de cota en extremos
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const perp = angle + Math.PI / 2;
      const tick = 5;
      [
        [x1, y1],
        [x2, y2],
      ].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.moveTo(px - tick * Math.cos(perp), py - tick * Math.sin(perp));
        ctx.lineTo(px + tick * Math.cos(perp), py + tick * Math.sin(perp));
        ctx.stroke();
      });

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 + offsetLabelY;
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(mx - tw / 2, my - 8, tw, 16);
      ctx.fillStyle = color;
      ctx.fillText(label, mx, my);
      ctx.restore();
    };

    if (mode === 'fm') {
      const cx = width / 2;
      const cy = height * 0.44;
      const maxSpan = width * 0.72;
      // Escala proporcional entre 0.4 m y 3.5 m
      const spanPx = Math.max(150, Math.min(maxSpan, (fmInputs.lengthM / 2.2) * maxSpan * 0.72));
      const gapPx = 12; // Brecha central física de 1.5 cm
      const armPx = (spanPx - gapPx) / 2;
      const rodH = Math.max(4, Math.min(12, fmInputs.diameterMm * 1.1));

      const leftStart = cx - spanPx / 2;
      const rightEnd = cx + spanPx / 2;

      // Onda estacionaria de Corriente I(z) (Azul cobalto #1E40AF) y Voltaje V(z) (Rojo carmesí #DC2626)
      const lambda = SPEED_OF_LIGHT / (fmInputs.freqMHz * 1e6);
      const k = (2 * Math.PI) / lambda;
      const halfL = fmInputs.lengthM / 2;
      const waveAmp = 76;

      // Curva I(z) = sin(k*(L/2 - |z|)) normalizada
      const samples = 160;
      const maxSin = Math.max(0.25, Math.abs(Math.sin(k * halfL)));

      // Relleno sutil bajo corriente
      ctx.beginPath();
      ctx.moveTo(leftStart, cy);
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const z = -halfL + u * fmInputs.lengthM;
        const x = leftStart + u * spanPx;
        const iVal = Math.abs(Math.sin(k * (halfL - Math.abs(z)))) / maxSin;
        const clampedI = Math.min(1.25, iVal);
        ctx.lineTo(x, cy - clampedI * waveAmp);
      }
      ctx.lineTo(rightEnd, cy);
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 64, 175, 0.08)';
      ctx.fill();

      // Trazo I(z)
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const z = -halfL + u * fmInputs.lengthM;
        const x = leftStart + u * spanPx;
        const iVal = Math.abs(Math.sin(k * (halfL - Math.abs(z)))) / maxSin;
        const clampedI = Math.min(1.25, iVal);
        const y = cy - clampedI * waveAmp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Curva V(z) proporcional a cos(k*(L/2 - |z|)) con signo opuesto entre brazos
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const z = -halfL + u * fmInputs.lengthM;
        const x = leftStart + u * spanPx;
        const sign = z < 0 ? -1 : 1;
        const vVal = sign * Math.cos(k * (halfL - Math.abs(z)));
        const y = cy - vVal * (waveAmp * 0.8);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dibujo físico de los brazos conductores del dipolo
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;

      // Brazo izquierdo
      ctx.fillRect(leftStart, cy - rodH / 2, armPx, rodH);
      ctx.strokeRect(leftStart, cy - rodH / 2, armPx, rodH);

      // Brazo derecho
      ctx.fillRect(cx + gapPx / 2, cy - rodH / 2, armPx, rodH);
      ctx.strokeRect(cx + gapPx / 2, cy - rodH / 2, armPx, rodH);

      // Línea coaxial de alimentación en el centro
      ctx.beginPath();
      ctx.moveTo(cx - gapPx / 2, cy);
      ctx.lineTo(cx - gapPx / 2, cy + 44);
      ctx.moveTo(cx + gapPx / 2, cy);
      ctx.lineTo(cx + gapPx / 2, cy + 44);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#94A3B8';
      ctx.fillRect(cx - 32, cy + 44, 64, 24);
      ctx.strokeRect(cx - 32, cy + 44, 64, 24);
      ctx.fillStyle = '#0F172A';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Z₀=${fmInputs.z0Ohm}Ω`, cx, cy + 56);

      // Cotas físicas dinámicas
      const armCm = ((fmInputs.lengthM - 0.015) / 2) * 100;
      drawDimensionLine(
        leftStart,
        cy + 104,
        rightEnd,
        cy + 104,
        `L_física = ${fmInputs.lengthM.toFixed(3)} m (${(fmInputs.lengthM * 100).toFixed(1)} cm)`,
        '#0F172A',
        14
      );
      drawDimensionLine(
        leftStart,
        cy + 26,
        cx - gapPx / 2,
        cy + 26,
        `${armCm.toFixed(1)} cm`,
        '#475569',
        12
      );
      drawDimensionLine(
        cx + gapPx / 2,
        cy + 26,
        rightEnd,
        cy + 26,
        `${armCm.toFixed(1)} cm`,
        '#475569',
        12
      );

      // Brecha central
      ctx.fillStyle = '#DC2626';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillText('Brecha: 1.5 cm', cx, cy - 16);

      // Etiquetas de curvas
      ctx.fillStyle = '#1E40AF';
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('I(z) máx en centro', cx, cy - waveAmp - 16);

      ctx.fillStyle = '#DC2626';
      ctx.textAlign = 'left';
      ctx.fillText('+V máx', rightEnd - 44, cy - waveAmp * 0.8 - 12);
      ctx.fillText('-V máx', leftStart, cy + waveAmp * 0.8 + 14);
    } else {
      // MODO AM: Cilindro embobinado con núcleo + tanque LC + ondas I(z) y V(z)
      const cx = width / 2;
      const cy = height * 0.45;
      const coilW = Math.max(140, Math.min(width * 0.56, (amInputs.coilLengthCm / 20) * 240));
      const coilH = Math.max(44, Math.min(115, (amInputs.coilDiameterCm / 8) * 90));
      const x0 = cx - coilW / 2;
      const y0 = cy - coilH / 2;

      // Núcleo según mu_r
      const coreExtend = 22;
      if (amInputs.muR === 1) {
        // Núcleo de aire (tubo translúcido)
        ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x0 - coreExtend, y0 + 5, coilW + coreExtend * 2, coilH - 10);
        ctx.strokeRect(x0 - coreExtend, y0 + 5, coilW + coreExtend * 2, coilH - 10);
      } else if (amInputs.muR <= 55) {
        // Manojo de clavos de hierro (estriado metálico)
        ctx.fillStyle = '#CBD5E1';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x0 - coreExtend, y0 + 6, coilW + coreExtend * 2, coilH - 12);
        ctx.strokeRect(x0 - coreExtend, y0 + 6, coilW + coreExtend * 2, coilH - 12);
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 0.9;
        for (let r = y0 + 12; r < y0 + coilH - 10; r += 6) {
          ctx.beginPath();
          ctx.moveTo(x0 - coreExtend, r);
          ctx.lineTo(x0 + coilW + coreExtend, r);
          ctx.stroke();
        }
      } else {
        // Barra de ferrita oscura
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x0 - coreExtend, y0 + 6, coilW + coreExtend * 2, coilH - 12);
        ctx.strokeRect(x0 - coreExtend, y0 + 6, coilW + coreExtend * 2, coilH - 12);
      }

      // Espiras de cobre proporcionales a N
      const visualTurns = Math.min(56, Math.max(12, Math.round(amInputs.turns * 0.42)));
      const pitch = coilW / visualTurns;
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.1;
      for (let i = 0; i < visualTurns; i++) {
        const tx = x0 + i * pitch + pitch * 0.5;
        ctx.beginPath();
        ctx.ellipse(tx, cy, pitch * 0.38, coilH / 2 + 2, 0, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();
      }

      // Distribución envolvente de corriente de tanque I(z) y voltaje inducido V(z)
      const waveTop = y0 - 52;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const u = i / 100;
        const x = x0 + u * coilW;
        // Flujo magnético e I máximo en centro del solenoide
        const env = Math.sin(u * Math.PI) * 0.35 + 0.65;
        const y = waveTop + (1 - env) * 42;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Voltaje en extremos de bobina (crece linealmente hacia los terminales)
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const u = i / 100;
        const x = x0 + u * coilW;
        const vNorm = Math.abs(u - 0.5) * 2;
        const y = waveTop + (1 - vNorm) * 40;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.9;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Conexión al capacitor paralelo C y etapa receptora Z0
      const tankY = cy + coilH / 2 + 44;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, cy + coilH / 2);
      ctx.lineTo(x0, tankY);
      ctx.lineTo(x0 + coilW, tankY);
      ctx.lineTo(x0 + coilW, cy + coilH / 2);
      ctx.stroke();

      // Símbolo de capacitor C en el centro de la línea inferior
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 10, tankY - 12, 20, 24);
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - 5, tankY - 10);
      ctx.lineTo(cx - 5, tankY + 10);
      ctx.moveTo(cx + 5, tankY - 10);
      ctx.lineTo(cx + 5, tankY + 10);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `C = ${amInputs.capacitancePf} pF  |  L = ${result.inductanceUh?.toFixed(1) ?? '—'} µH  |  Z₀ = ${amInputs.z0Ohm} Ω`,
        cx,
        tankY + 24
      );

      // Cotas físicas
      drawDimensionLine(
        x0,
        y0 + coilH + 14,
        x0 + coilW,
        y0 + coilH + 14,
        `ℓ_devanado = ${amInputs.coilLengthCm.toFixed(1)} cm (${amInputs.turns} vueltas)`,
        '#0F172A',
        12
      );
      drawDimensionLine(
        x0 - coreExtend - 18,
        y0,
        x0 - coreExtend - 18,
        y0 + coilH,
        `D=${amInputs.coilDiameterCm.toFixed(1)}cm`,
        '#475569',
        -12
      );

      ctx.fillStyle = '#1E40AF';
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Densidad de flujo Φ(z) / I(z)', cx, waveTop - 8);
    }
  }, [mode, fmInputs, amInputs, result]);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-3 h-0.5 bg-[#1E40AF] inline-block" />
            Corriente estacionaria I(z)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-[#DC2626] inline-block" />
            Voltaje V(z)
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          {mode === 'fm'
            ? `λ = ${result.wavelengthM.toFixed(3)} m · L/λ = ${(fmInputs.lengthM / result.wavelengthM).toFixed(3)}`
            : `Alambre enrollado: ${result.enteredLengthM.toFixed(2)} m · Núcleo μ_r = ${amInputs.muR}`}
        </span>
      </div>

      <div className="relative w-full h-[390px] border border-slate-200 rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        {mode === 'fm'
          ? 'En el punto de alimentación central la corriente alcanza su valor máximo mientras el voltaje es mínimo (baja impedancia ~73 Ω en resonancia). En los extremos abiertos la corriente se anula y el voltaje alcanza su máximo.'
          : 'El campo magnético variable induce una fuerza electromotriz proporcional a N·μ_r·A. En resonancia paralela (f₀ = 1 / 2π√LC), las reactancias inductiva y capacitiva se cancelan maximizando la impedancia hacia el detector.'}
      </p>
    </div>
  );
};
