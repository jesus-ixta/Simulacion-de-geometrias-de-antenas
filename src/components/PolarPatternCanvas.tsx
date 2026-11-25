import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  AmInputs,
  AntennaMode,
  FmInputs,
  computeDipoleDirectivity,
  dipoleFieldFactor,
} from '../physics/antennaMath';

interface PolarPatternCanvasProps {
  mode: AntennaMode;
  fmInputs: FmInputs;
  amInputs: AmInputs;
}

type PatternDim = '2d' | '3d';

export const PolarPatternCanvas: React.FC<PolarPatternCanvasProps> = ({
  mode,
  fmInputs,
  amInputs,
}) => {
  const [dim, setDim] = useState<PatternDim>('2d');
  const [rotYaw, setRotYaw] = useState(0.55);
  const [rotPitch, setRotPitch] = useState(0.42);
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(340, rect.height);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const freqHz = mode === 'fm' ? fmInputs.freqMHz * 1e6 : amInputs.freqKHz * 1e3;
    const { maxField } =
      mode === 'fm'
        ? computeDipoleDirectivity(fmInputs.lengthM, freqHz)
        : { maxField: 1.0 };

    const evalNormGain = (thetaAxisRad: number): number => {
      if (mode === 'fm') {
        return Math.min(1, dipoleFieldFactor(thetaAxisRad, fmInputs.lengthM, freqHz) / maxField);
      }
      // Dipolo magnético / bobina AM: sin(theta) respecto al eje de la bobina
      return Math.abs(Math.sin(thetaAxisRad));
    };

    if (dim === '2d') {
      const cx = width / 2;
      const cy = height / 2 + 4;
      const radius = Math.min(width, height) * 0.37;
      const dbRings = [0, -5, -10, -15, -20, -30];

      // Anillos de decibeles (-30 dB en el centro, 0 dB en el borde)
      dbRings.forEach((db, idx) => {
        const normR = (db + 30) / 30;
        const r = Math.max(4, normR * radius);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 0 ? '#94A3B8' : '#E2E8F0';
        ctx.lineWidth = idx === 0 ? 1.3 : 1;
        ctx.stroke();

        if (db !== -30) {
          ctx.fillStyle = '#64748B';
          ctx.font = '500 10px "IBM Plex Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${db} dB`, cx + 4, cy - r + 12);
        }
      });

      // Ejes radiales cada 30 grados
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = ((deg - 90) * Math.PI) / 180;
        const x2 = cx + radius * Math.cos(rad);
        const y2 = cy + radius * Math.sin(rad);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = deg % 90 === 0 ? '#CBD5E1' : '#F1F5F9';
        ctx.lineWidth = deg % 90 === 0 ? 1.2 : 1;
        ctx.stroke();

        const lx = cx + (radius + 17) * Math.cos(rad);
        const ly = cy + (radius + 17) * Math.sin(rad);
        ctx.fillStyle = deg % 90 === 0 ? '#334155' : '#64748B';
        ctx.font = deg % 90 === 0 ? '600 11px "IBM Plex Mono", monospace' : '400 10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${deg}°`, lx, ly);
      }

      // Plano H (omnidireccional en el plano perpendicular al eje)
      // Dibujado en rojo carmesí discontinuo
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();

      // Plano E (corte que contiene el eje de la antena)
      // Rotación visual según orientación:
      // FM Vertical -> eje de la antena está en 0°-180° (vertical)
      // FM Horizontal -> eje de la antena está en 90°-270° (horizontal)
      // AM Bobina -> eje de la ferrita dibujado horizontal (90°-270°) o vertical (0°-180°):
      // Usamos 0°-180° como eje de referencia principal (nulo en 0° y 180°), rotando 90° si FM es horizontal
      const axisOffsetRad =
        mode === 'fm' && fmInputs.polarization === 'horizontal' ? Math.PI / 2 : 0;

      ctx.beginPath();
      const N = 360;
      let peakAngleScreen = 0;
      let peakR = 0;

      for (let i = 0; i <= N; i++) {
        const screenAngle = (i * 2 * Math.PI) / N; // 0 arriba (12 en punto)
        const thetaAxis = screenAngle - axisOffsetRad;
        const g = evalNormGain(thetaAxis);
        const db = Math.max(-30, 20 * Math.log10(Math.max(1e-4, g)));
        const r = ((db + 30) / 30) * radius;

        const px = cx + r * Math.sin(screenAngle);
        const py = cy - r * Math.cos(screenAngle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);

        if (r > peakR && screenAngle <= Math.PI) {
          peakR = r;
          peakAngleScreen = screenAngle;
        }
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 64, 175, 0.14)';
      ctx.fill();
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Icono físico de la antena en el origen
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(axisOffsetRad);
      if (mode === 'fm') {
        // Varilla del dipolo con brecha
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(0, -4);
        ctx.moveTo(0, 4);
        ctx.lineTo(0, 24);
        ctx.stroke();
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bobina / ferrita sobre eje vertical (0°-180°)
        ctx.fillStyle = '#334155';
        ctx.fillRect(-5, -22, 10, 44);
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1.4;
        for (let y = -16; y <= 16; y += 5) {
          ctx.beginPath();
          ctx.moveTo(-7, y);
          ctx.lineTo(7, y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Etiquetas de Nulos y Lóbulos Principales
      const null1X = cx + (radius * 0.56) * Math.sin(axisOffsetRad);
      const null1Y = cy - (radius * 0.56) * Math.cos(axisOffsetRad);
      const lobeX = cx + (peakR * 0.65) * Math.sin(peakAngleScreen);
      const lobeY = cy - (peakR * 0.65) * Math.cos(peakAngleScreen);

      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Etiqueta de Lóbulo principal
      ctx.fillStyle = '#1E40AF';
      ctx.fillText('Lóbulo principal (0 dB)', lobeX, lobeY);

      // Etiqueta de Nulo
      ctx.fillStyle = '#DC2626';
      const nullLabel = mode === 'fm' ? 'Nulo (0° / 180°)' : 'Nulo axial (eje)';
      ctx.fillText(nullLabel, null1X, null1Y);
    } else {
      // VISTA 3D INTERACTIVA EN CANVAS HTML5 (Proyección perspectiva + Painter's Algorithm)
      const cx = width / 2;
      const cy = height / 2 + 8;
      const scale = Math.min(width, height) * 0.34;

      const cosY = Math.cos(rotYaw);
      const sinY = Math.sin(rotYaw);
      const cosP = Math.cos(rotPitch);
      const sinP = Math.sin(rotPitch);

      const project = (x: number, y: number, z: number) => {
        // Rotar alrededor de Z (yaw) y luego X (pitch)
        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;
        const z1 = z;

        const y2 = y1 * cosP - z1 * sinP;
        const z2 = y1 * sinP + z1 * cosP;
        const dist = 4.2;
        const persp = dist / (dist - y2 * 0.45);
        return {
          sx: cx + x1 * scale * persp,
          sy: cy - z2 * scale * persp,
          depth: y2,
        };
      };

      // Si FM horizontal, el eje del dipolo va en X; si vertical o AM, va en Z
      const isHoriz = mode === 'fm' && fmInputs.polarization === 'horizontal';

      const nTheta = 28;
      const nPhi = 44;
      const quads: {
        pts: { sx: number; sy: number }[];
        depth: number;
        gain: number;
      }[] = [];

      const getPoint3D = (theta: number, phi: number) => {
        const g = evalNormGain(theta);
        // Coordenadas locales con eje de simetría en Z local
        const lx = g * Math.sin(theta) * Math.cos(phi);
        const ly = g * Math.sin(theta) * Math.sin(phi);
        const lz = g * Math.cos(theta);
        // Si es horizontal, rotar eje Z local hacia eje X mundial
        const wx = isHoriz ? lz : lx;
        const wy = ly;
        const wz = isHoriz ? -lx : lz;
        return { ...project(wx, wy, wz), g };
      };

      for (let i = 0; i < nTheta; i++) {
        const t0 = (i / nTheta) * Math.PI;
        const t1 = ((i + 1) / nTheta) * Math.PI;
        for (let j = 0; j < nPhi; j++) {
          const p0 = (j / nPhi) * 2 * Math.PI;
          const p1 = ((j + 1) / nPhi) * 2 * Math.PI;

          const a = getPoint3D(t0, p0);
          const b = getPoint3D(t1, p0);
          const c = getPoint3D(t1, p1);
          const d = getPoint3D(t0, p1);

          const avgDepth = (a.depth + b.depth + c.depth + d.depth) / 4;
          const avgGain = (a.g + b.g + c.g + d.g) / 4;

          quads.push({
            pts: [a, b, c, d],
            depth: avgDepth,
            gain: avgGain,
          });
        }
      }

      // Ordenar de atrás hacia adelante
      quads.sort((q1, q2) => q1.depth - q2.depth);

      // Dibujar ejes de referencia traseros
      const drawAxis = (
        vx: number,
        vy: number,
        vz: number,
        label: string,
        color: string
      ) => {
        const pNeg = project(-vx, -vy, -vz);
        const pPos = project(vx, vy, vz);
        ctx.beginPath();
        ctx.moveTo(pNeg.sx, pNeg.sy);
        ctx.lineTo(pPos.sx, pPos.sy);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '600 11px "IBM Plex Mono", monospace';
        ctx.fillText(label, pPos.sx + 6, pPos.sy);
      };

      drawAxis(1.25, 0, 0, 'X', '#94A3B8');
      drawAxis(0, 1.25, 0, 'Y', '#94A3B8');
      drawAxis(0, 0, 1.25, 'Z', '#64748B');

      // Renderizar malla 3D con mapa de color científico (azul cobalto -> carmesí en máximo)
      quads.forEach((q) => {
        const g = Math.min(1, Math.max(0, q.gain));
        // Interpolación limpia entre #1E40AF (bajo/medio) y #DC2626 (máximo)
        const r = Math.round(30 + g * (220 - 30));
        const gr = Math.round(64 + g * (38 - 64));
        const b = Math.round(175 + g * (38 - 175));

        ctx.beginPath();
        ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
        ctx.lineTo(q.pts[1].sx, q.pts[1].sy);
        ctx.lineTo(q.pts[2].sx, q.pts[2].sy);
        ctx.lineTo(q.pts[3].sx, q.pts[3].sy);
        ctx.closePath();

        ctx.fillStyle = `rgba(${r}, ${gr}, ${b}, 0.72)`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      // Resaltar orientación física de la antena
      const antA = isHoriz ? project(-0.6, 0, 0) : project(0, 0, -0.6);
      const antB = isHoriz ? project(0.6, 0, 0) : project(0, 0, 0.6);
      ctx.beginPath();
      ctx.moveTo(antA.sx, antA.sy);
      ctx.lineTo(antB.sx, antB.sy);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [mode, fmInputs, amInputs, dim, rotYaw, rotPitch]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dim !== '3d') return;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active || dim !== '3d') return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    setRotYaw((prev) => prev + dx * 0.01);
    setRotPitch((prev) => Math.max(-1.4, Math.min(1.4, prev + dy * 0.01)));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          {dim === '2d' ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-3 h-0.5 bg-[#1E40AF] inline-block" />
                Plano E (elevación)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#DC2626] inline-block" />
                Plano H (azimutal)
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-500">
              Arrastra sobre el gráfico para rotar la esfera de radiación 3D
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {dim === '3d' && (
            <button
              type="button"
              onClick={() => {
                setRotYaw(0.55);
                setRotPitch(0.42);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md bg-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Centrar
            </button>
          )}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setDim('2d')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                dim === '2d'
                  ? 'bg-white text-[#1E40AF] border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Polar 2D
            </button>
            <button
              type="button"
              onClick={() => setDim('3d')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                dim === '3d'
                  ? 'bg-white text-[#1E40AF] border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Patrón 3D
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[390px] border border-slate-200 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full block ${dim === '3d' ? 'cursor-grab active:cursor-grabbing' : ''}`}
        />
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        {mode === 'fm' ? (
          <>
            En el dipolo FM con polarización{' '}
            <strong className="text-slate-800">{fmInputs.polarization}</strong>, la radiación máxima ocurre perpendicular al conductor (lóbulos en 90° y 270° relativos al eje) y existen nulos profundos en las puntas (0° y 180°). Al variar{' '}
            <span className="font-mono">L_física</span> respecto a <span className="font-mono">λ/2</span>, el ancho del haz se estrecha o aparecen lóbulos secundarios.
          </>
        ) : (
          <>
            La bobina AM se comporta como un dipolo magnético: su patrón toroidal presenta{' '}
            <strong className="text-slate-800">nulo de recepción sobre el eje longitudinal</strong> del núcleo (0° y 180°) y máxima inducción electromagnética lateral (90° y 270°).
          </>
        )}
      </p>
    </div>
  );
};
