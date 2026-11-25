/**
 * Motor de Cálculo Electromagnético Riguroso (Balanis / Kraus / Ulaby)
 * Laboratorio Virtual ETF-1026
 */

export const SPEED_OF_LIGHT = 299792458; // m/s
export const ETA_0 = 119.9169832 * Math.PI; // ~376.730313 Ohm
export const MU_0 = 4e-7 * Math.PI; // H/m
export const EULER_GAMMA = 0.5772156649015329;

export type AntennaMode = 'fm' | 'am';
export type Polarization = 'vertical' | 'horizontal';

export interface FmInputs {
  freqMHz: number;        // 88.0 - 108.0 MHz
  lengthM: number;        // Longitud física total L_fisica (m)
  diameterMm: number;     // Diámetro de varilla (2 - 10 mm)
  z0Ohm: 50 | 75;         // Impedancia característica coaxial (Ohm)
  polarization: Polarization;
}

export interface AmInputs {
  freqKHz: number;        // 530 - 1700 kHz
  coilDiameterCm: number; // Diámetro del tubo (cm)
  coilLengthCm: number;   // Longitud del devanado (cm)
  turns: number;          // Número de vueltas N (20 - 150)
  muR: number;            // Permeabilidad relativa efectiva (1 - 300)
  capacitancePf: number;  // Capacitancia C (pF)
  z0Ohm: number;          // Impedancia del detector (1000 - 5000 Ohm)
}

export interface SweepPoint {
  freq: number; // MHz (FM) o kHz (AM)
  swr: number;
  gamma: number;
  rOhm: number;
  xOhm: number;
}

export type CouplingStatus = 'optimal' | 'acceptable' | 'poor';

export interface SimulationResult {
  mode: AntennaMode;
  wavelengthM: number;
  optimalLengthM: number;     // FM: 0.95 * lambda/2 ; AM: inductancia equivalente o longitud hilo
  enteredLengthM: number;     // FM: lengthM ; AM: longitud total de alambre enrollado
  inductanceUh?: number;      // AM: Inductancia de la bobina (uH)
  optimalCapPf?: number;      // AM: Capacitancia óptima para resonar en f0 (pF)
  qualityFactorQ?: number;    // AM: Factor Q efectivo
  fResonance: number;         // FM: MHz ; AM: kHz
  fResUnit: 'MHz' | 'kHz';
  radiationResistanceOhm: number; // R_r pura
  rInOhm: number;             // Parte real de Z_A en terminales
  xInOhm: number;             // Reactancia jX_A en terminales
  zMagOhm: number;            // |Z_A|
  gammaMag: number;           // |Gamma|
  swr: number;                // ROE / VSWR
  powerTransferredPct: number;// (1 - |Gamma|^2) * 100
  directivityDbi: number;     // Ganancia directiva aproximada (dBi)
  status: CouplingStatus;
  statusLabel: string;
  diagnosticTitle: string;
  diagnosticDetail: string;
  sweep: SweepPoint[];
}

/**
 * Integral Seno Si(x) = int_0^x (sin(t)/t) dt mediante regla de Simpson compuesta
 */
export function sineIntegral(x: number): number {
  if (x === 0) return 0;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const steps = Math.max(40, Math.ceil(ax * 16) * 2);
  const h = ax / steps;
  let sum = 1.0; // lim_{t->0} sin(t)/t = 1
  for (let i = 1; i < steps; i++) {
    const t = i * h;
    const val = Math.sin(t) / t;
    sum += (i % 2 === 0 ? 2 : 4) * val;
  }
  sum += Math.sin(ax) / ax;
  return sign * (h / 3) * sum;
}

/**
 * Integral Coseno Modificada Cin(x) = int_0^x ((1 - cos(t))/t) dt
 * Relación: Cin(x) = gamma + ln(x) - Ci(x)
 */
export function cinIntegral(x: number): number {
  const ax = Math.abs(x);
  if (ax === 0) return 0;
  const steps = Math.max(40, Math.ceil(ax * 16) * 2);
  const h = ax / steps;
  let sum = 0; // lim_{t->0} (1-cos(t))/t = 0
  for (let i = 1; i < steps; i++) {
    const t = i * h;
    const val = (1 - Math.cos(t)) / t;
    sum += (i % 2 === 0 ? 2 : 4) * val;
  }
  sum += (1 - Math.cos(ax)) / ax;
  return (h / 3) * sum;
}

/**
 * Calcula la impedancia compleja de un dipolo cilíndrico (Método FEM inducida, Balanis Cap. 8)
 */
export function computeDipoleImpedance(
  freqHz: number,
  lengthM: number,
  diameterMm: number
): { rIn: number; xIn: number; rRad: number } {
  const lambda = SPEED_OF_LIGHT / freqHz;
  const k = (2 * Math.PI) / lambda;
  const kL = k * lengthM;
  const halfKL = kL / 2;
  const a = (diameterMm / 1000) / 2;

  const siKL = sineIntegral(kL);
  const si2KL = sineIntegral(2 * kL);
  const cinKL = cinIntegral(kL);
  const cin2KL = cinIntegral(2 * kL);

  // Resistencia referida al máximo de corriente (Balanis Ec. 4-70 / 8-60a)
  const rM =
    (ETA_0 / (2 * Math.PI)) *
    (cinKL +
      0.5 * Math.cos(kL) * (2 * cinKL - cin2KL) +
      0.5 * Math.sin(kL) * (si2KL - 2 * siKL));

  // Reactancia referida al máximo de corriente (Balanis Ec. 8-60b)
  // Usando identidad 2Ci(kL) - Ci(2kL) - Ci(2ka^2/L) = 2ln(L/(2a)) - 2Cin(kL) + Cin(2kL) + Cin(2ka^2/L)
  const smallArg = (2 * k * a * a) / Math.max(lengthM, 1e-4);
  const cinSmall = cinIntegral(smallArg);
  const ciTerm =
    2 * Math.log(Math.max(lengthM / (2 * a), 1.5)) -
    2 * cinKL +
    cin2KL +
    cinSmall;

  const xM =
    (ETA_0 / (4 * Math.PI)) *
    (2 * siKL +
      Math.cos(kL) * (2 * siKL - si2KL) -
      Math.sin(kL) * ciTerm);

  // Transformación a terminales de alimentación considerando espesor finito (acota singularidad en L = lambda)
  const omegaThickness = Math.max(4, 2 * Math.log(Math.max(lengthM / a, 2)));
  const sinHalf = Math.sin(halfKL);
  const cosHalf = Math.cos(halfKL);
  const sin2Eff = sinHalf * sinHalf + Math.pow(Math.PI / (2 * omegaThickness), 2) * cosHalf * cosHalf;

  const rIn = Math.max(0.1, rM / sin2Eff);
  const xIn = xM / sin2Eff;

  return { rIn, xIn, rRad: rIn };
}

/**
 * Calcula el factor de campo normalizado del dipolo en plano E para ángulo theta (rad) respecto al eje
 */
export function dipoleFieldFactor(thetaRad: number, lengthM: number, freqHz: number): number {
  const lambda = SPEED_OF_LIGHT / freqHz;
  const halfKL = (Math.PI * lengthM) / lambda;
  const sinT = Math.sin(thetaRad);
  if (Math.abs(sinT) < 1e-5) {
    return 0;
  }
  const num = Math.cos(halfKL * Math.cos(thetaRad)) - Math.cos(halfKL);
  return Math.abs(num / sinT);
}

/**
 * Encuentra el máximo del patrón del dipolo y calcula directividad numérica (dBi)
 */
export function computeDipoleDirectivity(lengthM: number, freqHz: number): { maxField: number; dbi: number } {
  const samples = 180;
  let maxField = 1e-9;
  const values: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const theta = (i / samples) * Math.PI;
    const f = dipoleFieldFactor(theta, lengthM, freqHz);
    values.push(f);
    if (f > maxField) maxField = f;
  }

  // D = 2 / int_0^pi (F/Fmax)^2 sin(theta) dtheta
  let integral = 0;
  const dTheta = Math.PI / samples;
  for (let i = 0; i < samples; i++) {
    const t1 = (i / samples) * Math.PI;
    const t2 = ((i + 1) / samples) * Math.PI;
    const f1 = values[i] / maxField;
    const f2 = values[i + 1] / maxField;
    integral += 0.5 * (f1 * f1 * Math.sin(t1) + f2 * f2 * Math.sin(t2)) * dTheta;
  }
  const D = integral > 1e-9 ? 2 / integral : 1.5;
  return { maxField, dbi: 10 * Math.log10(D) };
}

/**
 * Encuentra la frecuencia de resonancia real (X_A = 0) para el dipolo FM
 */
function findDipoleResonanceMHz(lengthM: number, diameterMm: number): number {
  // Estimación inicial de media onda: f ≈ 0.95 * c / (2 * L)
  const fApproxMHz = (0.95 * SPEED_OF_LIGHT) / (2 * lengthM * 1e6);
  let low = Math.max(20, fApproxMHz * 0.72);
  let high = Math.min(400, fApproxMHz * 1.35);

  const evalX = (fMHz: number) => computeDipoleImpedance(fMHz * 1e6, lengthM, diameterMm).xIn;
  let xLow = evalX(low);

  for (let i = 0; i < 28; i++) {
    const mid = 0.5 * (low + high);
    const xMid = evalX(mid);
    if (xLow * xMid <= 0) {
      high = mid;
    } else {
      low = mid;
      xLow = xMid;
    }
  }
  return 0.5 * (low + high);
}

/**
 * Cálculo completo para Modo 1: Dipolo FM (88 - 108 MHz)
 */
export function simulateFmDipole(inputs: FmInputs): SimulationResult {
  const freqHz = inputs.freqMHz * 1e6;
  const wavelengthM = SPEED_OF_LIGHT / freqHz;
  const optimalLengthM = 0.95 * (wavelengthM / 2);

  const { rIn, xIn, rRad } = computeDipoleImpedance(freqHz, inputs.lengthM, inputs.diameterMm);
  const fResonance = findDipoleResonanceMHz(inputs.lengthM, inputs.diameterMm);

  const z0 = inputs.z0Ohm;
  const numRe = rIn - z0;
  const numIm = xIn;
  const denRe = rIn + z0;
  const denIm = xIn;

  const gammaMag = Math.min(
    0.999,
    Math.hypot(numRe, numIm) / Math.max(1e-9, Math.hypot(denRe, denIm))
  );
  const swr = (1 + gammaMag) / Math.max(1e-6, 1 - gammaMag);
  const powerTransferredPct = (1 - gammaMag * gammaMag) * 100;
  const { dbi } = computeDipoleDirectivity(inputs.lengthM, freqHz);

  // Barrido de frecuencia 88 a 108 MHz (extendido si fRes cae cerca/fuera para mayor claridad)
  const sweepMin = 88.0;
  const sweepMax = 108.0;
  const points = 101;
  const sweep: SweepPoint[] = [];
  for (let i = 0; i < points; i++) {
    const f = sweepMin + (i / (points - 1)) * (sweepMax - sweepMin);
    const imp = computeDipoleImpedance(f * 1e6, inputs.lengthM, inputs.diameterMm);
    const g = Math.min(
      0.999,
      Math.hypot(imp.rIn - z0, imp.xIn) / Math.max(1e-9, Math.hypot(imp.rIn + z0, imp.xIn))
    );
    const s = (1 + g) / Math.max(1e-6, 1 - g);
    sweep.push({ freq: f, swr: Math.min(s, 20), gamma: g, rOhm: imp.rIn, xOhm: imp.xIn });
  }

  let status: CouplingStatus = 'optimal';
  let statusLabel = 'Acoplamiento Óptimo';
  if (swr > 2.0) {
    status = 'poor';
    statusLabel = 'Desacoplada (ROE > 2.0)';
  } else if (swr > 1.5) {
    status = 'acceptable';
    statusLabel = 'Aceptable (1.5 < ROE ≤ 2.0)';
  }

  const diffCm = (inputs.lengthM - optimalLengthM) * 100;
  let diagnosticTitle = '';
  let diagnosticDetail = '';

  if (swr <= 1.35) {
    diagnosticTitle = 'Antena bien acoplada en banda FM';
    diagnosticDetail = `Pérdidas por reflexión menores al ${(100 - powerTransferredPct).toFixed(1)}%. La longitud física coincide con el régimen resonante de media onda para ${inputs.freqMHz.toFixed(1)} MHz.`;
  } else if (swr <= 2.0) {
    diagnosticTitle = 'Acoplamiento aceptable con leve desajuste reactivo';
    diagnosticDetail =
      diffCm > 0
        ? `La antena es ${diffCm.toFixed(1)} cm más larga que la longitud óptima (${(optimalLengthM * 100).toFixed(1)} cm), presentando reactancia inductiva (+j${xIn.toFixed(1)} Ω). Se sugiere recortar ~${Math.abs(diffCm).toFixed(1)} cm (mitad por brazo).`
        : `La antena es ${Math.abs(diffCm).toFixed(1)} cm más corta que la longitud óptima (${(optimalLengthM * 100).toFixed(1)} cm), presentando reactancia capacitiva (-j${Math.abs(xIn).toFixed(1)} Ω). Se sugiere alargar ~${Math.abs(diffCm).toFixed(1)} cm.`;
  } else {
    diagnosticTitle =
      xIn >= 0
        ? 'Antena demasiado larga: desacoplamiento inductivo'
        : 'Antena demasiado corta: desacoplamiento capacitivo';
    diagnosticDetail =
      diffCm > 0
        ? `Presenta reactancia inductiva (+j${xIn.toFixed(1)} Ω) y ROE=${swr.toFixed(2)}. Se sugiere recortar ${Math.abs(diffCm).toFixed(1)} cm totales (${(Math.abs(diffCm) / 2).toFixed(1)} cm por brazo) para sintonizar a ${inputs.freqMHz.toFixed(1)} MHz.`
        : `Presenta reactancia capacitiva (-j${Math.abs(xIn).toFixed(1)} Ω) y ROE=${swr.toFixed(2)}. Se sugiere extender ${Math.abs(diffCm).toFixed(1)} cm totales (${(Math.abs(diffCm) / 2).toFixed(1)} cm por brazo) para alcanzar resonancia.`;
  }

  return {
    mode: 'fm',
    wavelengthM,
    optimalLengthM,
    enteredLengthM: inputs.lengthM,
    fResonance,
    fResUnit: 'MHz',
    radiationResistanceOhm: rRad,
    rInOhm: rIn,
    xInOhm: xIn,
    zMagOhm: Math.hypot(rIn, xIn),
    gammaMag,
    swr,
    powerTransferredPct,
    directivityDbi: dbi,
    status,
    statusLabel,
    diagnosticTitle,
    diagnosticDetail,
    sweep,
  };
}

/**
 * Ecuación de Wheeler/Nagaoka para inductancia de solenoide con núcleo magnético
 * Devuelve inductancia en Henrios (H)
 */
export function computeSolenoidInductanceH(
  diameterCm: number,
  lengthCm: number,
  turns: number,
  muR: number
): number {
  const rCm = diameterCm / 2;
  // Wheeler en uH (convertido desde pulgadas: 9 in -> 22.86 cm, 10 in -> 25.4 cm)
  const lAirUh = (rCm * rCm * turns * turns) / (22.86 * rCm + 25.4 * lengthCm);
  return lAirUh * muR * 1e-6;
}

/**
 * Calcula impedancia del tanque receptor de bobina AM a frecuencia freqHz
 */
export function computeAmCoilImpedance(
  freqHz: number,
  inputs: AmInputs,
  inductanceH: number
): { rIn: number; xIn: number; rRad: number; qEff: number } {
  const omega = 2 * Math.PI * freqHz;
  const lambda = SPEED_OF_LIGHT / freqHz;
  const rM = (inputs.coilDiameterCm / 100) / 2;
  const areaM2 = Math.PI * rM * rM;

  // Resistencia de radiación de dipolo magnético (Balanis Ec. 5-25) con mu_r efectivo
  const rRad = 31171 * Math.pow((inputs.muR * inputs.turns * areaM2) / (lambda * lambda), 2);

  // Resistencia serie efectiva de bobina (cobre por efecto piel + pérdidas del núcleo)
  const wireLenM = inputs.turns * Math.PI * (inputs.coilDiameterCm / 100);
  // Alambre esmaltado típico ~0.5 mm diámetro (AWG 24), profundidad de piel en cobre a f
  const deltaSkin = Math.sqrt(1.68e-8 / (Math.PI * MU_0 * freqHz));
  const wireRadius = 0.00026;
  const effArea = Math.PI * (2 * wireRadius * deltaSkin - deltaSkin * deltaSkin);
  const rCu = 1.68e-8 * (wireLenM / Math.max(1e-9, effArea));

  // Pérdidas del núcleo: aire ~Q_core inf, clavos hierro ~Q_core 35 (corrientes parásitas), ferrita ~Q_core 160
  let qCore = 10000;
  if (inputs.muR > 1 && inputs.muR <= 55) {
    // Núcleo metálico sólido/manojo de clavos -> pérdidas por histéresis/Foucault más altas
    qCore = 35;
  } else if (inputs.muR > 55) {
    // Ferrita RF -> bajas pérdidas
    qCore = 150;
  }
  const rCore = (omega * inductanceH) / qCore;
  const rSeries = Math.max(0.25, rRad + rCu + rCore);
  const qEff = (omega * inductanceH) / rSeries;

  // Circuito tanque paralelo: (R_s + j w L) en paralelo con C
  const cFarads = inputs.capacitancePf * 1e-12;
  const denomL = rSeries * rSeries + Math.pow(omega * inductanceH, 2);
  const gL = rSeries / denomL;
  const bL = -(omega * inductanceH) / denomL;
  const bC = omega * cFarads;

  const gTot = gL;
  const bTot = bL + bC;
  const y2 = gTot * gTot + bTot * bTot;

  const rTank = gTot / Math.max(1e-18, y2);
  const xTank = -bTot / Math.max(1e-18, y2);

  // Transformación de impedancia mediante devanado secundario / toma (tap estándar 7:1 -> relación n² = 49)
  // Permite acoplar el tanque de alta Q (~100 kΩ) a etapas detectoras típicas de 1000 - 5000 Ω
  const tapRatioSq = 49;
  const rIn = rTank / tapRatioSq;
  const xIn = xTank / tapRatioSq;

  return { rIn, xIn, rRad, qEff };
}

/**
 * Cálculo completo para Modo 2: Antena Bobina de Ferrita / Cuadro AM (530 - 1700 kHz)
 */
export function simulateAmCoil(inputs: AmInputs): SimulationResult {
  const freqHz = inputs.freqKHz * 1e3;
  const wavelengthM = SPEED_OF_LIGHT / freqHz;
  const inductanceH = computeSolenoidInductanceH(
    inputs.coilDiameterCm,
    inputs.coilLengthCm,
    inputs.turns,
    inputs.muR
  );
  const inductanceUh = inductanceH * 1e6;

  // Capacitancia óptima para resonar en f0
  const omega0 = 2 * Math.PI * freqHz;
  const optimalCapPf = (1 / (omega0 * omega0 * inductanceH)) * 1e12;

  // Frecuencia de resonancia real del tanque LC (kHz)
  const cFarads = inputs.capacitancePf * 1e-12;
  const fResHz = 1 / (2 * Math.PI * Math.sqrt(Math.max(1e-18, inductanceH * cFarads)));
  const fResonance = fResHz / 1e3;

  const { rIn, xIn, rRad, qEff } = computeAmCoilImpedance(freqHz, inputs, inductanceH);

  const z0 = inputs.z0Ohm;
  const gammaMag = Math.min(
    0.999,
    Math.hypot(rIn - z0, xIn) / Math.max(1e-9, Math.hypot(rIn + z0, xIn))
  );
  const swr = (1 + gammaMag) / Math.max(1e-6, 1 - gammaMag);
  const powerTransferredPct = (1 - gammaMag * gammaMag) * 100;

  // Longitud total de hilo conductor enrollado
  const wireLenM = inputs.turns * Math.PI * (inputs.coilDiameterCm / 100);

  // Barrido en banda AM 530 - 1700 kHz (140 puntos + punto exacto de f0/fRes)
  const sweepMin = 530;
  const sweepMax = 1700;
  const points = 130;
  const freqList: number[] = [];
  for (let i = 0; i < points; i++) {
    freqList.push(sweepMin + (i / (points - 1)) * (sweepMax - sweepMin));
  }
  if (fResonance >= sweepMin && fResonance <= sweepMax) {
    freqList.push(fResonance);
    freqList.push(fResonance - 4);
    freqList.push(fResonance + 4);
  }
  freqList.push(inputs.freqKHz);
  freqList.sort((a, b) => a - b);

  const sweep: SweepPoint[] = freqList.map((fKHz) => {
    const imp = computeAmCoilImpedance(fKHz * 1e3, inputs, inductanceH);
    const g = Math.min(
      0.999,
      Math.hypot(imp.rIn - z0, imp.xIn) / Math.max(1e-9, Math.hypot(imp.rIn + z0, imp.xIn))
    );
    const s = (1 + g) / Math.max(1e-6, 1 - g);
    return { freq: fKHz, swr: Math.min(s, 20), gamma: g, rOhm: imp.rIn, xOhm: imp.xIn };
  });

  let status: CouplingStatus = 'optimal';
  let statusLabel = 'Sintonía Óptima';
  if (swr > 2.0) {
    status = 'poor';
    statusLabel = 'Fuera de Sintonía (ROE > 2.0)';
  } else if (swr > 1.5) {
    status = 'acceptable';
    statusLabel = 'Aceptable (1.5 < ROE ≤ 2.0)';
  }

  const diffCap = inputs.capacitancePf - optimalCapPf;
  let diagnosticTitle = '';
  let diagnosticDetail = '';

  if (swr <= 1.45) {
    diagnosticTitle = 'Circuito tanque LC bien sintonizado y acoplado';
    diagnosticDetail = `Pérdidas por reflexión menores al ${(100 - powerTransferredPct).toFixed(1)}%. La bobina (${inductanceUh.toFixed(1)} µH) resuena en ${fResonance.toFixed(1)} kHz entregando máxima señal a la etapa detectora.`;
  } else if (Math.abs(fResonance - inputs.freqKHz) > 25) {
    diagnosticTitle =
      diffCap > 0
        ? 'Capacitancia excesiva: frecuencia de resonancia por debajo de f₀'
        : 'Capacitancia insuficiente: frecuencia de resonancia por encima de f₀';
    diagnosticDetail = `El tanque resuena en ${fResonance.toFixed(1)} kHz frente a f₀ = ${inputs.freqKHz} kHz (reactancia ${xIn >= 0 ? '+j' : '-j'}${Math.abs(xIn).toFixed(0)} Ω). Se recomienda ajustar C a ${optimalCapPf.toFixed(1)} pF o recalcular el número de vueltas N.`;
  } else {
    diagnosticTitle = 'Resonancia cercana con desajuste de impedancia respecto al detector';
    diagnosticDetail = `En resonancia, la impedancia paralela es ${rIn.toFixed(0)} Ω frente a Z₀ = ${z0} Ω (Q ≈ ${qEff.toFixed(0)}). Considere una toma intermedia (tap) en la bobina o variar la permeabilidad/geometría para acercar R_A a Z₀.`;
  }

  return {
    mode: 'am',
    wavelengthM,
    optimalLengthM: wireLenM,
    enteredLengthM: wireLenM,
    inductanceUh,
    optimalCapPf,
    qualityFactorQ: qEff,
    fResonance,
    fResUnit: 'kHz',
    radiationResistanceOhm: rRad,
    rInOhm: rIn,
    xInOhm: xIn,
    zMagOhm: Math.hypot(rIn, xIn),
    gammaMag,
    swr,
    powerTransferredPct,
    directivityDbi: 1.76, // Dipolo magnético pequeño 10*log10(1.5)
    status,
    statusLabel,
    diagnosticTitle,
    diagnosticDetail,
    sweep,
  };
}
