import React from 'react';
import { Sliders, RotateCcw, Crosshair } from 'lucide-react';
import {
  AmInputs,
  AntennaMode,
  FmInputs,
  SPEED_OF_LIGHT,
  SimulationResult,
} from '../physics/antennaMath';

interface ControlsPanelProps {
  mode: AntennaMode;
  fmInputs: FmInputs;
  amInputs: AmInputs;
  result: SimulationResult;
  onFmChange: (next: FmInputs) => void;
  onAmChange: (next: AmInputs) => void;
  onResetDefaults: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  mode,
  fmInputs,
  amInputs,
  result,
  onFmChange,
  onAmChange,
  onResetDefaults,
}) => {
  const handleAutoAdjustFmLength = () => {
    const lambda = SPEED_OF_LIGHT / (fmInputs.freqMHz * 1e6);
    const opt = Number((0.95 * (lambda / 2)).toFixed(4));
    onFmChange({ ...fmInputs, lengthM: opt });
  };

  const handleAutoAdjustAmCap = () => {
    if (!result.optimalCapPf) return;
    const clamped = Math.min(1000, Math.max(10, Number(result.optimalCapPf.toFixed(1))));
    onAmChange({ ...amInputs, capacitancePf: clamped });
  };

  return (
    <aside className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#1E40AF] shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900">
            Parámetros del Prototipo
          </h2>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          title="Restaurar valores iniciales de laboratorio"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#1E40AF] transition-colors px-2 py-1 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar
        </button>
      </div>

      {mode === 'fm' ? (
        <div className="flex flex-col gap-4">
          {/* Frecuencia FM */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="fm-freq" className="text-xs font-medium text-slate-700">
                Frecuencia central <span className="font-mono italic">f₀</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="fm-freq-num"
                  type="number"
                  min={88.0}
                  max={108.0}
                  step={0.1}
                  value={fmInputs.freqMHz}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onFmChange({
                        ...fmInputs,
                        freqMHz: Math.min(108.0, Math.max(88.0, val)),
                      });
                    }
                  }}
                  className="w-20 text-right font-mono tabular-nums text-xs font-semibold text-[#1E40AF] bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#1E40AF]"
                />
                <span className="text-xs font-mono text-slate-500">MHz</span>
              </div>
            </div>
            <input
              id="fm-freq"
              type="range"
              min={88.0}
              max={108.0}
              step={0.1}
              value={fmInputs.freqMHz}
              onChange={(e) =>
                onFmChange({ ...fmInputs, freqMHz: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>88.0 MHz</span>
              <span>98.0 MHz</span>
              <span>108.0 MHz</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Longitud Física Total */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="fm-length" className="text-xs font-medium text-slate-700">
                Longitud física <span className="font-mono italic">L_física</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="fm-length-num"
                  type="number"
                  min={0.4}
                  max={3.5}
                  step={0.005}
                  value={fmInputs.lengthM}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onFmChange({
                        ...fmInputs,
                        lengthM: Math.min(3.5, Math.max(0.4, val)),
                      });
                    }
                  }}
                  className="w-20 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#1E40AF]"
                />
                <span className="text-xs font-mono text-slate-500">m</span>
              </div>
            </div>
            <input
              id="fm-length"
              type="range"
              min={0.4}
              max={3.5}
              step={0.005}
              value={fmInputs.lengthM}
              onChange={(e) =>
                onFmChange({ ...fmInputs, lengthM: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>0.40 m</span>
              <span>Opt: {result.optimalLengthM.toFixed(3)} m</span>
              <span>3.50 m</span>
            </div>
            <button
              type="button"
              onClick={handleAutoAdjustFmLength}
              className="mt-1 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 shrink-0" />
              <span>Auto-ajustar a longitud óptima 0.95 · λ/2</span>
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Diámetro de varilla */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="fm-diam" className="text-xs font-medium text-slate-700">
                Diámetro de varilla <span className="font-mono italic">d</span>
              </label>
              <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                {fmInputs.diameterMm.toFixed(1)} mm
              </span>
            </div>
            <input
              id="fm-diam"
              type="range"
              min={2}
              max={10}
              step={0.5}
              value={fmInputs.diameterMm}
              onChange={(e) =>
                onFmChange({ ...fmInputs, diameterMm: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>2 mm (alambre)</span>
              <span>6 mm</span>
              <span>10 mm (tubo)</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Línea de transmisión Z0 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              Impedancia de línea coaxial <span className="font-mono italic">Z₀</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {([50, 75] as const).map((zVal) => (
                <button
                  key={zVal}
                  type="button"
                  onClick={() => onFmChange({ ...fmInputs, z0Ohm: zVal })}
                  className={`py-1.5 px-3 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    fmInputs.z0Ohm === zVal
                      ? 'bg-white text-[#1E40AF] border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {zVal} Ω {zVal === 50 ? '(RG-58)' : '(RG-59)'}
                </button>
              ))}
            </div>
          </div>

          {/* Polarización */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              Polarización del dipolo
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => onFmChange({ ...fmInputs, polarization: 'vertical' })}
                className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  fmInputs.polarization === 'vertical'
                    ? 'bg-white text-[#1E40AF] border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vertical
              </button>
              <button
                type="button"
                onClick={() => onFmChange({ ...fmInputs, polarization: 'horizontal' })}
                className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  fmInputs.polarization === 'horizontal'
                    ? 'bg-white text-[#1E40AF] border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Horizontal
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Frecuencia AM */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="am-freq" className="text-xs font-medium text-slate-700">
                Frecuencia central <span className="font-mono italic">f₀</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="am-freq-num"
                  type="number"
                  min={530}
                  max={1700}
                  step={10}
                  value={amInputs.freqKHz}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onAmChange({
                        ...amInputs,
                        freqKHz: Math.min(1700, Math.max(530, val)),
                      });
                    }
                  }}
                  className="w-20 text-right font-mono tabular-nums text-xs font-semibold text-[#1E40AF] bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#1E40AF]"
                />
                <span className="text-xs font-mono text-slate-500">kHz</span>
              </div>
            </div>
            <input
              id="am-freq"
              type="range"
              min={530}
              max={1700}
              step={10}
              value={amInputs.freqKHz}
              onChange={(e) =>
                onAmChange({ ...amInputs, freqKHz: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>530 kHz</span>
              <span>1100 kHz</span>
              <span>1700 kHz</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Geometría del tubo y devanado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="am-diam" className="text-xs font-medium text-slate-700">
                Diámetro tubo
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="am-diam"
                  type="number"
                  min={0.6}
                  max={15}
                  step={0.1}
                  value={amInputs.coilDiameterCm}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) {
                      onAmChange({ ...amInputs, coilDiameterCm: Math.min(15, Math.max(0.6, v)) });
                    }
                  }}
                  className="w-full font-mono tabular-nums text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                />
                <span className="text-xs font-mono text-slate-500">cm</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="am-len" className="text-xs font-medium text-slate-700">
                Long. devanado
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="am-len"
                  type="number"
                  min={1.5}
                  max={30}
                  step={0.5}
                  value={amInputs.coilLengthCm}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) {
                      onAmChange({ ...amInputs, coilLengthCm: Math.min(30, Math.max(1.5, v)) });
                    }
                  }}
                  className="w-full font-mono tabular-nums text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                />
                <span className="text-xs font-mono text-slate-500">cm</span>
              </div>
            </div>
          </div>

          {/* Número de vueltas N */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="am-turns" className="text-xs font-medium text-slate-700">
                Número de vueltas <span className="font-mono italic">N</span>
              </label>
              <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                {amInputs.turns} espiras
              </span>
            </div>
            <input
              id="am-turns"
              type="range"
              min={20}
              max={150}
              step={1}
              value={amInputs.turns}
              onChange={(e) =>
                onAmChange({ ...amInputs, turns: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>20</span>
              <span>85</span>
              <span>150</span>
            </div>
          </div>

          {/* Permeabilidad del núcleo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="am-mur" className="text-xs font-medium text-slate-700">
                Permeabilidad efectiva <span className="font-mono italic">μ_r</span>
              </label>
              <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                {amInputs.muR}
              </span>
            </div>
            <input
              id="am-mur"
              type="range"
              min={1}
              max={300}
              step={1}
              value={amInputs.muR}
              onChange={(e) =>
                onAmChange({ ...amInputs, muR: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => onAmChange({ ...amInputs, muR: 1 })}
                className={`py-1 px-1.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                  amInputs.muR === 1
                    ? 'bg-blue-50 border-[#1E40AF] text-[#1E40AF]'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Aire (1)
              </button>
              <button
                type="button"
                onClick={() => onAmChange({ ...amInputs, muR: 25 })}
                className={`py-1 px-1.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                  amInputs.muR >= 15 && amInputs.muR <= 40
                    ? 'bg-blue-50 border-[#1E40AF] text-[#1E40AF]'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Clavos (25)
              </button>
              <button
                type="button"
                onClick={() => onAmChange({ ...amInputs, muR: 120 })}
                className={`py-1 px-1.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                  amInputs.muR >= 100
                    ? 'bg-blue-50 border-[#1E40AF] text-[#1E40AF]'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Ferrita (120)
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Capacitor de sintonía C */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="am-cap" className="text-xs font-medium text-slate-700">
                Capacitor de sintonía <span className="font-mono italic">C</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="am-cap-num"
                  type="number"
                  min={10}
                  max={1000}
                  step={1}
                  value={amInputs.capacitancePf}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) {
                      onAmChange({ ...amInputs, capacitancePf: Math.min(1000, Math.max(10, v)) });
                    }
                  }}
                  className="w-20 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#1E40AF]"
                />
                <span className="text-xs font-mono text-slate-500">pF</span>
              </div>
            </div>
            <input
              id="am-cap"
              type="range"
              min={10}
              max={1000}
              step={1}
              value={amInputs.capacitancePf}
              onChange={(e) =>
                onAmChange({ ...amInputs, capacitancePf: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={handleAutoAdjustAmCap}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 shrink-0" />
              <span>
                Sintonizar C óptimo ({result.optimalCapPf?.toFixed(1) ?? '—'} pF)
              </span>
            </button>
          </div>

          {/* Impedancia del detector Z0 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="am-z0" className="text-xs font-medium text-slate-700">
                Impedancia del detector <span className="font-mono italic">Z₀</span>
              </label>
              <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                {amInputs.z0Ohm} Ω
              </span>
            </div>
            <input
              id="am-z0"
              type="range"
              min={1000}
              max={5000}
              step={100}
              value={amInputs.z0Ohm}
              onChange={(e) =>
                onAmChange({ ...amInputs, z0Ohm: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>1000 Ω</span>
              <span>3000 Ω</span>
              <span>5000 Ω</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
