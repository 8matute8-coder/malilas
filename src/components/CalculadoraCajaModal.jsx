import React, { useState, useEffect } from 'react';

// Web Audio API Audio Synthesizer (Instant, 0 latency, 0 external files)
const playSumBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.error(e);
  }
};

const playCashRegisterChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Metallic latch click sound
    const oscNoise = ctx.createOscillator();
    const gainNoise = ctx.createGain();
    oscNoise.type = 'square';
    oscNoise.frequency.setValueAtTime(150, ctx.currentTime);
    gainNoise.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNoise.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    oscNoise.connect(gainNoise);
    gainNoise.connect(ctx.destination);
    oscNoise.start();
    oscNoise.stop(ctx.currentTime + 0.05);

    // Bell chime 1 (high pitch)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.04); // E6
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // A6
    gain1.gain.setValueAtTime(0.35, ctx.currentTime + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime + 0.04);
    osc1.stop(ctx.currentTime + 0.45);

    // Bell chime 2 (crisp resonance)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2637.02, ctx.currentTime + 0.1); // E7
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.55);

  } catch (e) {
    console.error(e);
  }
};

export default function CalculadoraCajaModal({ isOpen, onClose, onConfirmSale, sales = [] }) {
  const [currentInput, setCurrentInput] = useState('');
  const [breakdown, setBreakdown] = useState([]);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const formatPrice = (num) => Math.round(Number(num)).toLocaleString('es-AR');

  const totalAcumulado = breakdown.reduce((sum, item) => sum + item.monto, 0);

  // Numero de Venta del dia
  const todaySalesCount = (sales || []).filter(s => {
    if (!s.fecha) return false;
    return new Date(s.fecha).toDateString() === new Date().toDateString();
  }).length;
  const saleNumberToday = todaySalesCount + 1;

  // Bloquear scroll de fondo en navegadores moviles al abrir la calculadora
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (digit === '.' && currentInput.includes('.')) return;
    if (currentInput.length >= 10) return;
    setCurrentInput(prev => prev + digit);
  };

  const handleBackspace = () => {
    setCurrentInput(prev => prev.slice(0, -1));
  };

  const handleClearCurrent = () => {
    setCurrentInput('');
  };

  const handleAddAmount = () => {
    const val = parseFloat(currentInput);
    if (val > 0) {
      playSumBeep();
      setBreakdown(prev => [
        ...prev,
        { id: Date.now() + Math.random(), monto: val, label: 'Suma' }
      ]);
      setCurrentInput('');
    }
  };

  const handleRemoveBreakdownItem = (id) => {
    setBreakdown(prev => prev.filter(item => item.id !== id));
  };

  const handleResetAll = () => {
    setCurrentInput('');
    setBreakdown([]);
  };

  const handleFinishPayment = () => {
    if (totalAcumulado <= 0) return;

    playCashRegisterChime();
    setPaidAmount(totalAcumulado);
    setShowSuccessAnimation(true);

    setTimeout(() => {
      onConfirmSale(totalAcumulado, breakdown);
      handleResetAll();
      setShowSuccessAnimation(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[120] bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 pb-20 sm:pb-4 h-[100dvh] w-screen overflow-hidden animate-fade-in">
      
      {/* Visual Animation Overlay for VENTA REALIZADA */}
      {showSuccessAnimation ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-emerald-500 w-full max-w-sm text-center flex flex-col items-center gap-4 animate-bounce-in relative overflow-hidden my-auto mx-4">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute left-6 top-4 text-3xl animate-bounce">💵</span>
            <span className="absolute right-8 top-8 text-3xl animate-pulse">💸</span>
            <span className="absolute left-10 bottom-6 text-3xl animate-bounce delay-100">💰</span>
            <span className="absolute right-6 bottom-4 text-3xl animate-pulse delay-200">🪙</span>
          </div>

          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-lg border-2 border-emerald-300 transform transition-transform scale-110">
            <span className="material-symbols-outlined text-5xl">point_of_sale</span>
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-full inline-block mb-2 border border-emerald-200 shadow-2xs">
              Venta N° {saleNumberToday} del día
            </span>
            <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">
              ¡VENTA REGISTRADA!
            </h3>
            <span className="text-3xl font-black text-emerald-600 block mt-2">
              ${formatPrice(paidAmount)}
            </span>
            <p className="text-xs font-bold text-secondary mt-1">
              Guardado en Contabilidad 💵
            </p>
          </div>

          <div className="w-full bg-emerald-50 border border-emerald-200 py-2 rounded-xl text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Caja Actualizada</span>
          </div>
        </div>
      ) : (
        /* REDESIGNED POS TERMINAL CARD (Positioned safely above bottom mobile nav) */
        <div className="bg-white rounded-3xl shadow-2xl border border-surface-container-low w-full max-w-sm overflow-hidden flex flex-col justify-between max-h-[calc(100dvh-75px)] sm:max-h-[90vh] my-auto">
          
          {/* Header Bar */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-surface-container-highest bg-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-xl">point_of_sale</span>
              <h2 className="text-base font-black text-on-surface">Caja Registradora POS</h2>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                N° {saleNumberToday}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary flex items-center justify-center transition-colors cursor-pointer font-bold"
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Content Body */}
          <div className="p-3 sm:p-4 flex-1 overflow-y-auto flex flex-col gap-2.5 justify-between">
            
            {/* Visor Dual POS (Total Acumulado + Visor Entrada) */}
            <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-700/80 p-3.5 rounded-2xl text-white shadow-md shrink-0 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                  TOTAL ACUMULADO VENTA
                </span>
                {currentInput !== '' && (
                  <button
                    type="button"
                    onClick={handleClearCurrent}
                    className="text-[10px] bg-red-500/30 hover:bg-red-500/50 text-red-200 px-2 py-0.5 rounded-md font-bold transition-colors"
                  >
                    Borrar Monto
                  </button>
                )}
              </div>

              <div className="flex justify-between items-baseline mt-0.5">
                <span className="text-3xl font-black tracking-tight text-white">
                  ${formatPrice(totalAcumulado)}
                </span>
                <span className="text-sm font-bold text-emerald-200">
                  {currentInput !== '' ? `Monto: $${formatPrice(currentInput)}` : '$0'}
                </span>
              </div>
            </div>

            {/* Desglose de Suma Horizontal Pills (1 sola línea de alto, scrolleable lateralmente) */}
            <div className="flex items-center justify-between gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container-highest shrink-0">
              <span className="text-[10px] font-black text-secondary uppercase shrink-0">
                Sumas ({breakdown.length}):
              </span>

              {breakdown.length === 0 ? (
                <span className="text-[11px] text-secondary/70 italic truncate">
                  Ingresa un monto y presiona (+) para sumar
                </span>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none flex-1">
                  {breakdown.map((item, idx) => (
                    <span
                      key={item.id}
                      className="bg-emerald-100 text-emerald-950 border border-emerald-300 font-extrabold text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      <span>${formatPrice(item.monto)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBreakdownItem(item.id)}
                        className="text-emerald-800 hover:text-error font-bold text-xs p-0.5 ml-0.5 cursor-pointer"
                        title="Quitar suma"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {breakdown.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="text-[10px] text-error font-extrabold hover:underline shrink-0 ml-1 cursor-pointer"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Keypad Grid 4x4 Numpad */}
            <div className="grid grid-cols-4 gap-1.5 shrink-0">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleDigit('7')}
                className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleDigit('8')}
                className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleDigit('9')}
                className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                9
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 sm:py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                title="Borrar último dígito"
              >
                <span className="material-symbols-outlined text-xl">backspace</span>
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleDigit('4')}
                className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleDigit('5')}
                className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleDigit('6')}
                className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleDigit('1')}
                className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                1
              </button>

              {/* Row 3 & 4 with Tall Green '+' Button */}
              <div className="col-span-3 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDigit('2')}
                  className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('3')}
                  className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('00')}
                  className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-xs text-secondary transition-all active:scale-95 shadow-2xs"
                >
                  00
                </button>

                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="col-span-2 py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('.')}
                  className="py-2.5 sm:py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-secondary transition-all active:scale-95 shadow-2xs"
                >
                  ,
                </button>
              </div>

              {/* Tall '+' Button Spanning 2 Rows */}
              <button
                type="button"
                onClick={handleAddAmount}
                className="row-span-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-3xl flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer"
                title="Sumar al total acumulado"
              >
                +
              </button>
            </div>

          </div>

          {/* Footer Action Button (100% Guaranteed Visible on ANY Mobile Screen) */}
          <div className="p-3 bg-white border-t border-surface-container-highest shrink-0 w-full flex justify-center">
            <button
              type="button"
              disabled={totalAcumulado <= 0}
              onClick={handleFinishPayment}
              className={`w-full py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                totalAcumulado > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 cursor-pointer'
                  : 'bg-surface-container-high text-secondary cursor-not-allowed opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-xl">point_of_sale</span>
              <span>REGISTRAR VENTA {totalAcumulado > 0 ? `($${formatPrice(totalAcumulado)})` : ''}</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
