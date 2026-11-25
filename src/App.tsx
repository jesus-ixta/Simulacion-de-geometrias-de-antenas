import React, { useMemo, useState } from 'react';
import { Radio, Waves, Activity, Ruler } from 'lucide-react';
import {
  AmInputs,
  AntennaMode,
  FmInputs,
  simulateAmCoil,
  simulateFmDipole,
} from './physics/antennaMath';
import { ControlsPanel } from './components/ControlsPanel';
import { PolarPatternCanvas } from './components/PolarPatternCanvas';
import { GeometryStandingWaveCanvas } from './components/GeometryStandingWaveCanvas';
import { SwrSweepCanvas } from './components/SwrSweepCanvas';
import { ResultsPanel } from './components/ResultsPanel';

type GraphTab = 'pattern' | 'geometry' | 'swr';

const DEFAULT_FM: FmInputs = {
  freqMHz: 98.1,
  lengthM: 1.452,
  diameterMm: 4.0,
  z0Ohm: 75,
  polarization: 'vertical',
};

const DEFAULT_AM: AmInputs = {
  freqKHz: 1000,
  coilDiameterCm: 1.2,
  coilLengthCm: 6.5,
  turns: 40,
  muR: 120,
  capacitancePf: 66,
  z0Ohm: 2500,
};

export default function App() {
  const [mode, setMode] = useState<AntennaMode>('fm');
  const [graphTab, setGraphTab] = useState<GraphTab>('pattern');
  const [fmInputs, setFmInputs] = useState<FmInputs>(DEFAULT_FM);
  const [amInputs, setAmInputs] = useState<AmInputs>(DEFAULT_AM);

  const result = useMemo(() => {
    return mode === 'fm' ? simulateFmDipole(fmInputs) : simulateAmCoil(amInputs);
  }, [mode, fmInputs, amInputs]);

  const handleReset = () => {
    if (mode === 'fm') {
      setFmInputs(DEFAULT_FM);
    } else {
      setAmInputs(DEFAULT_AM);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Encabezado Académico */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 text-balance">
              Simulador Electromagnético de Antenas AM/FM — Laboratorio Virtual ETF-1026
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Asignatura: Teoría Electromagnética · Unidad 4: Antenas
            </p>
          </div>

          {/* Selector de Modo mediante pestañas claras */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl shrink-0"
            role="tablist"
            aria-label="Modo de simulación de antena"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'fm'}
              onClick={() => setMode('fm')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer text-left sm:text-center ${
                mode === 'fm'
                  ? 'bg-[#1E40AF] text-white'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              Modo 1: Dipolo Media Onda (λ/2) · FM (88–108 MHz)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'am'}
              onClick={() => setMode('am')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer text-left sm:text-center ${
                mode === 'am'
                  ? 'bg-[#1E40AF] text-white'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              Modo 2: Bobina de Ferrita / Cuadro · AM (530–1700 kHz)
            </button>
          </div>
        </div>
      </header>

      {/* Mesa de Trabajo de Laboratorio (3 Columnas en Escritorio) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)_340px] gap-5 items-start">
          {/* Columna Izquierda: Parámetros de Entrada y Geometría */}
          <ControlsPanel
            mode={mode}
            fmInputs={fmInputs}
            amInputs={amInputs}
            result={result}
            onFmChange={setFmInputs}
            onAmChange={setAmInputs}
            onResetDefaults={handleReset}
          />

          {/* Columna Central: Visualización Gráfica en Tiempo Real */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#1E40AF] shrink-0" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Visualización Electromagnética en Tiempo Real
                </h2>
              </div>

              {/* Pestañas Gráficas A, B, C */}
              <div
                className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
                role="tablist"
                aria-label="Tipo de gráfica"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={graphTab === 'pattern'}
                  onClick={() => setGraphTab('pattern')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    graphTab === 'pattern'
                      ? 'bg-white text-[#1E40AF] border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 shrink-0" />
                  <span>A · Patrón 2D / 3D</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={graphTab === 'geometry'}
                  onClick={() => setGraphTab('geometry')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    graphTab === 'geometry'
                      ? 'bg-white text-[#1E40AF] border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5 shrink-0" />
                  <span>B · Geometría e I(z)/V(z)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={graphTab === 'swr'}
                  onClick={() => setGraphTab('swr')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    graphTab === 'swr'
                      ? 'bg-white text-[#1E40AF] border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>C · Respuesta ROE</span>
                </button>
              </div>
            </div>

            {graphTab === 'pattern' && (
              <PolarPatternCanvas mode={mode} fmInputs={fmInputs} amInputs={amInputs} />
            )}
            {graphTab === 'geometry' && (
              <GeometryStandingWaveCanvas
                mode={mode}
                fmInputs={fmInputs}
                amInputs={amInputs}
                result={result}
              />
            )}
            {graphTab === 'swr' && (
              <SwrSweepCanvas
                mode={mode}
                fmInputs={fmInputs}
                amInputs={amInputs}
                result={result}
              />
            )}
          </section>

          {/* Columna Derecha: Resultados Calculados y Reporte */}
          <ResultsPanel
            mode={mode}
            fmInputs={fmInputs}
            amInputs={amInputs}
            result={result}
          />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Laboratorio Virtual ETF-1026 · Modelo de FEM inducida (Balanis) y solenoide Wheeler/Nagaoka
          </span>
          <span className="font-mono">
            c = 299,792,458 m/s · η₀ = 376.73 Ω
          </span>
        </div>
      </footer>
    </div>
  );
}
