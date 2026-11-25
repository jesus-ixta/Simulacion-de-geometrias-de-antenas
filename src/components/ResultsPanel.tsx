import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import {
  AmInputs,
  AntennaMode,
  FmInputs,
  SimulationResult,
} from '../physics/antennaMath';

interface ResultsPanelProps {
  mode: AntennaMode;
  fmInputs: FmInputs;
  amInputs: AmInputs;
  result: SimulationResult;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  mode,
  fmInputs,
  amInputs,
  result,
}) => {
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const reactSign = result.xInOhm >= 0 ? '+ j' : '− j';
  const reactAbs = Math.abs(result.xInOhm);
  const reactNature =
    Math.abs(result.xInOhm) < 1.5
      ? 'Resonante (resistiva pura)'
      : result.xInOhm > 0
      ? 'Carácter inductivo (+jX)'
      : 'Carácter capacitivo (−jX)';

  const statusConfig = {
    optimal: {
      icon: CheckCircle2,
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    acceptable: {
      icon: AlertTriangle,
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    poor: {
      icon: XCircle,
      textColor: 'text-[#DC2626]',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  }[result.status];

  const StatusIcon = statusConfig.icon;

  const buildReportRows = (): [string, string, string][] => {
    const common: [string, string, string][] = [
      [
        'Modo de Simulación',
        mode === 'fm'
          ? 'Dipolo Media Onda FM (88-108 MHz)'
          : 'Bobina Ferrita / Cuadro AM (530-1700 kHz)',
        '-',
      ],
      [
        'Frecuencia central de diseño (f0)',
        mode === 'fm' ? fmInputs.freqMHz.toFixed(2) : amInputs.freqKHz.toFixed(0),
        mode === 'fm' ? 'MHz' : 'kHz',
      ],
      ['Longitud de onda espacio libre (λ)', result.wavelengthM.toFixed(4), 'm'],
    ];

    if (mode === 'fm') {
      common.push(
        ['Longitud resonante óptima (0.95·λ/2)', result.optimalLengthM.toFixed(4), 'm'],
        ['Longitud física ingresada (L_fisica)', result.enteredLengthM.toFixed(4), 'm'],
        ['Diámetro de varilla conductora (d)', fmInputs.diameterMm.toFixed(1), 'mm'],
        ['Impedancia de línea coaxial (Z0)', fmInputs.z0Ohm.toString(), 'Ω'],
        ['Polarización', fmInputs.polarization, '-']
      );
    } else {
      common.push(
        ['Diámetro de tubo / bobina', amInputs.coilDiameterCm.toFixed(1), 'cm'],
        ['Longitud del devanado', amInputs.coilLengthCm.toFixed(1), 'cm'],
        ['Número de vueltas (N)', amInputs.turns.toString(), 'espiras'],
        ['Permeabilidad efectiva núcleo (μ_r)', amInputs.muR.toString(), '-'],
        ['Inductancia calculada (L)', (result.inductanceUh ?? 0).toFixed(2), 'µH'],
        ['Capacitancia ingresada (C)', amInputs.capacitancePf.toFixed(1), 'pF'],
        ['Capacitancia óptima sintonía (C_opt)', (result.optimalCapPf ?? 0).toFixed(1), 'pF'],
        ['Impedancia etapa receptora (Z0)', amInputs.z0Ohm.toString(), 'Ω']
      );
    }

    common.push(
      ['Frecuencia de resonancia real (f_res)', result.fResonance.toFixed(2), result.fResUnit],
      ['Resistencia de radiación (Rr)', result.radiationResistanceOhm.toFixed(4), 'Ω'],
      [
        'Impedancia de entrada (ZA = R + jX)',
        `${result.rInOhm.toFixed(2)} ${result.xInOhm >= 0 ? '+ j' : '- j'}${Math.abs(result.xInOhm).toFixed(2)}`,
        'Ω',
      ],
      ['Magnitud impedancia (|ZA|)', result.zMagOhm.toFixed(2), 'Ω'],
      ['Coeficiente de reflexión (|Γ|)', result.gammaMag.toFixed(4), '-'],
      ['Relación de Onda Estacionaria (ROE / VSWR)', result.swr.toFixed(3), ':1'],
      ['Potencia transferida (1 - |Γ|²)', result.powerTransferredPct.toFixed(2), '%'],
      ['Ganancia directiva aproximada (D)', result.directivityDbi.toFixed(2), 'dBi'],
      ['Diagnóstico automático', `${result.diagnosticTitle} - ${result.diagnosticDetail}`, '-']
    );
    return common;
  };

  const handleDownloadCsv = () => {
    const rows = buildReportRows();
    const header = ['Parámetro', 'Valor', 'Unidad SI'];
    const csvLines = [header, ...rows].map((cols) =>
      cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_antena_${mode}_${mode === 'fm' ? fmInputs.freqMHz + 'MHz' : amInputs.freqKHz + 'kHz'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildPlainTextSummary = () => {
    const rows = buildReportRows();
    return [
      'REPORTE DE SIMULACIÓN ELECTROMAGNÉTICA — LABORATORIO VIRTUAL ETF-1026',
      'Asignatura: Teoría Electromagnética | Unidad 4: Antenas',
      '----------------------------------------------------------------------',
      ...rows.map(([k, v, u]) => `${k}: ${v}${u !== '-' ? ' ' + u : ''}`),
    ].join('\n');
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainTextSummary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso si el navegador restringe clipboard en iframe
      setCopied(false);
    }
  };

  return (
    <aside className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
        <h2 className="text-sm font-semibold text-slate-900">
          Resultados Electromagnéticos
        </h2>
        <span className="text-[11px] font-mono text-slate-500">Unidades SI</span>
      </div>

      {/* Estado de acoplamiento explícito (no solo color) */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor}`}
      >
        <div className={`flex items-center gap-2 text-xs font-semibold ${statusConfig.textColor}`}>
          <StatusIcon className="w-4 h-4 shrink-0" />
          <span>{result.statusLabel}</span>
        </div>
        <span className={`font-mono text-xs font-bold tabular-nums ${statusConfig.textColor}`}>
          ROE {result.swr >= 20 ? '>20' : result.swr.toFixed(2)}
        </span>
      </div>

      {/* Grid de métricas SI para tabla de reporte */}
      <div className="grid grid-cols-1 gap-2.5">
        {/* Longitud de onda */}
        <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500">
            Longitud de onda en espacio libre (<span className="font-mono">λ = c / f₀</span>)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
              {result.wavelengthM.toFixed(3)}
            </span>
            <span className="text-xs font-mono text-slate-500">m</span>
          </div>
        </div>

        {/* Longitud teórica vs ingresada (FM) o Inductancia/Capacitancia (AM) */}
        {mode === 'fm' ? (
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
            <div className="text-[11px] font-medium text-slate-500">
              Longitud óptima <span className="font-mono">0.95·λ/2</span> vs. Ingresada
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-1.5">
              <div>
                <div className="text-[10px] text-slate-500">Óptima</div>
                <div className="font-mono text-sm font-bold text-[#1E40AF] tabular-nums">
                  {result.optimalLengthM.toFixed(3)} <span className="text-[11px] font-normal text-slate-500">m</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Ingresada</div>
                <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {result.enteredLengthM.toFixed(3)} <span className="text-[11px] font-normal text-slate-500">m</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
            <div className="text-[11px] font-medium text-slate-500">
              Inductancia (<span className="font-mono">L</span>) y Sintonía (<span className="font-mono">C_opt</span> vs <span className="font-mono">C</span>)
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-1.5">
              <div>
                <div className="text-[10px] text-slate-500">Inductancia L</div>
                <div className="font-mono text-sm font-bold text-[#1E40AF] tabular-nums">
                  {(result.inductanceUh ?? 0).toFixed(1)} <span className="text-[11px] font-normal text-slate-500">µH</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">C óptimo / actual</div>
                <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {(result.optimalCapPf ?? 0).toFixed(0)} / {amInputs.capacitancePf} <span className="text-[11px] font-normal text-slate-500">pF</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Frecuencia de resonancia real */}
        <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500">
            Frecuencia de resonancia real (<span className="font-mono">f_res</span>)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
              {result.fResonance.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500">{result.fResUnit}</span>
          </div>
        </div>

        {/* Impedancia de entrada Z_A = R + jX */}
        <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500">
            Impedancia de entrada (<span className="font-mono">Z_A = R + jX</span>)
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-base font-mono font-bold text-[#1E40AF] tabular-nums">
              {result.rInOhm.toFixed(1)} {reactSign}
              {reactAbs.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">Ω</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>{reactNature}</span>
            {mode === 'am' && (
              <span className="font-mono tabular-nums">
                Rr={result.radiationResistanceOhm.toExponential(2)} Ω
              </span>
            )}
          </div>
        </div>

        {/* Coeficiente de reflexión y ROE */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
            <div className="text-[11px] font-medium text-slate-500">
              Reflexión (<span className="font-mono">|Γ|</span>)
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {result.gammaMag.toFixed(3)}
            </div>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
            <div className="text-[11px] font-medium text-slate-500">
              ROE / VSWR
            </div>
            <div
              className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                result.swr > 2.0 ? 'text-[#DC2626]' : 'text-slate-900'
              }`}
            >
              {result.swr >= 20 ? '> 20.0' : result.swr.toFixed(2)}
              <span className="text-xs font-normal text-slate-500 ml-0.5">:1</span>
            </div>
          </div>
        </div>

        {/* Potencia transferida y Ganancia directiva */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
            <div className="text-[11px] font-medium text-slate-500">
              Potencia transf.
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {result.powerTransferredPct.toFixed(1)}
              <span className="text-xs font-normal text-slate-500 ml-0.5">%</span>
            </div>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg">
            <div className="text-[11px] font-medium text-slate-500">
              Directividad aprox.
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {result.directivityDbi.toFixed(2)}
              <span className="text-xs font-normal text-slate-500 ml-1">dBi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnóstico Automático */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
        <div className="text-xs font-semibold text-slate-900">
          Diagnóstico de laboratorio
        </div>
        <div className="text-xs font-medium text-[#1E40AF]">
          {result.diagnosticTitle}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {result.diagnosticDetail}
        </p>
      </div>

      {/* Botón Exportar Reporte */}
      <button
        type="button"
        onClick={() => setShowSummaryModal(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
      >
        <FileSpreadsheet className="w-4 h-4 shrink-0" />
        <span>Exportar Reporte de Simulación (CSV / Resumen)</span>
      </button>

      {/* Modal de Resumen y Exportación */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-report-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 id="modal-report-title" className="text-base font-semibold text-slate-900">
                  Tabla Resumen para Reporte de Laboratorio
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Laboratorio Virtual ETF-1026 · Unidad 4: Antenas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                aria-label="Cerrar resumen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">Parámetro</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Valor</th>
                      <th className="py-2.5 px-3 font-semibold">Unidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buildReportRows().map(([param, val, unit], idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-700 font-medium">{param}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900 font-semibold">
                          {val}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">{unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado al portapapeles' : 'Copiar Resumen'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar archivo CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
