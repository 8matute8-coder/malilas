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

export default function CalculadoraCajaModal({ isOpen, onClose, onConfirmSale }) {
  const [currentInput, setCurrentInput] = useState('');
  const [breakdown, setBreakdown] = useState([]);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const formatPrice = (num) => Math.round(Number(num)).toLocaleString('es-AR');

  const totalAcumulado = breakdown.reduce((sum, item) => sum + item.monto, 0);

  // Keyboard Handler for desktop speed
  useEffect(() => {
    if (!isOpen || showSuccessAnimation) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        handleDigit('.');
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === '+' || e.key === 'Enter') {
        if (currentInput !== '') {
          e.preventDefault();
          handleAddAmount();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentInput, breakdown, showSuccessAnimation]);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (digit === '.' && currentInput.includes('.')) return;
    if (currentInput.length >= 8) return; // limit length
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
    if (!isNaN(val) && val > 0) {
      // Reproducir sonido de suma
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

    // 1. Reproducir sonido de Caja Registradora (Cha-ching)
    playCashRegisterChime();

    // 2. Disparar animacion de billetes
    setPaidAmount(totalAcumulado);
    setShowSuccessAnimation(true);

    // 3. Confirmar la venta tras la animacion (1.4s)
    setTimeout(() => {
      onConfirmSale(totalAcumulado, breakdown);
      handleResetAll();
      setShowSuccessAnimation(false);
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      
      {/* Visual Animation Overlay for Pago Realizado */}
      {showSuccessAnimation ? (
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-emerald-500 w-full max-w-sm text-center flex flex-col items-center gap-4 animate-bounce-in relative overflow-hidden">
          
          {/* Floating Money Elements Animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute left-6 top-4 text-3xl animate-bounce">💵</span>
            <span className="absolute right-8 top-8 text-3xl animate-pulse">💸</span>
            <span className="absolute left-10 bottom-6 text-3xl animate-bounce delay-100">💰</span>
            <span className="absolute right-6 bottom-4 text-3xl animate-pulse delay-200">🪙</span>
            <span className="absolute left-1/2 -top-2 text-2xl animate-ping">✨</span>
          </div>

          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-lg border-2 border-emerald-300 transform transition-transform scale-110">
            <span className="material-symbols-outlined text-5xl">point_of_sale</span>
          </div>

          <div>
            <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">
              ¡PAGO REALIZADO!
            </h3>
            <span className="text-3xl font-black text-emerald-600 block mt-2">
              ${formatPrice(paidAmount)}
            </span>
            <p className="text-xs font-bold text-secondary mt-1">
              Venta de caja registrada con éxito 💵
            </p>
          </div>

          <div className="w-full bg-emerald-50 border border-emerald-200 py-2 rounded-xl text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Caja Actualizada</span>
          </div>
        </div>
      ) : (
        /* Standard Calculator Modal Container */
        <div className="bg-white rounded-3xl shadow-2xl border border-surface-container-low w-full max-w-sm overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-surface-container-highest bg-white">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">point_of_sale</span>
              <h2 className="text-lg font-bold text-on-surface">Caja Registradora</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            
            {/* Total Acumulado Box */}
            <div className="bg-emerald-100/70 border border-emerald-200/80 p-4 rounded-2xl text-right shadow-2xs">
              <span className="block text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                Total Acumulado
              </span>
              <span className="text-3xl font-black text-emerald-950 block mt-0.5">
                ${formatPrice(totalAcumulado)}
              </span>
            </div>

            {/* Current Input Visor */}
            <div className="relative">
              <div className="w-full bg-surface-container-low border border-surface-container-highest p-3 rounded-2xl text-right font-black text-2xl text-on-surface shadow-2xs tracking-wider min-h-[52px] flex items-center justify-between">
                <span className="text-xs text-secondary/60 font-bold uppercase tracking-wider">Monto:</span>
                <span>{currentInput !== '' ? `$${formatPrice(currentInput)}` : '$0'}</span>
              </div>
              {currentInput !== '' && (
                <button
                  type="button"
                  onClick={handleClearCurrent}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-error font-bold hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Keypad Grid (Numpad Layout matching screenshot) */}
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleDigit('7')}
                className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleDigit('8')}
                className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleDigit('9')}
                className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                9
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                title="Borrar último dígito"
              >
                <span className="material-symbols-outlined text-xl">backspace</span>
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleDigit('4')}
                className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleDigit('5')}
                className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleDigit('6')}
                className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleDigit('1')}
                className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
              >
                1
              </button>

              {/* Row 3 & 4 with Tall Green '+' Button */}
              <div className="col-span-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDigit('2')}
                  className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('3')}
                  className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('00')}
                  className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-sm text-secondary transition-all active:scale-95 shadow-2xs"
                >
                  00
                </button>

                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="col-span-2 py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-lg text-on-surface transition-all active:scale-95 shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('.')}
                  className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-lg text-secondary transition-all active:scale-95 shadow-2xs"
                >
                  ,
                </button>
              </div>

              {/* Tall '+' Button Spanning 2 Rows */}
              <button
                type="button"
                onClick={handleAddAmount}
                className="row-span-2 rounded-2xl bg-primary hover:bg-surface-tint text-white font-black text-3xl flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer"
                title="Sumar al total acumulado"
              >
                +
              </button>
            </div>

            {/* Historial de Suma (Visor inferior con desglose) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-extrabold text-secondary uppercase tracking-wider">
                  Desglose de Suma ({breakdown.length})
                </span>
                {breakdown.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="text-[11px] text-error font-bold hover:underline"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              <div className="bg-surface-container-low/60 border border-surface-container-highest rounded-2xl p-2.5 max-h-36 overflow-y-auto space-y-1.5 divide-y divide-surface-container-highest/50">
                {breakdown.length === 0 ? (
                  <p className="text-xs text-secondary text-center py-3 italic">
                    Ingresa montos y presiona (+) para sumar
                  </p>
                ) : (
                  breakdown.map((item, idx) => (
                    <div key={item.id} className="flex justify-between items-center pt-1 text-sm font-semibold text-on-surface group">
                      <span className="text-secondary text-xs">Suma {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">${formatPrice(item.monto)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBreakdownItem(item.id)}
                          className="text-secondary hover:text-error text-xs transition-colors p-0.5"
                          title="Quitar esta suma"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Footer Confirmation Button */}
          <div className="p-4 bg-white border-t border-surface-container-highest">
            <button
              type="button"
              disabled={totalAcumulado <= 0}
              onClick={handleFinishPayment}
              className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-md ${
                totalAcumulado > 0
                  ? 'bg-primary hover:bg-surface-tint text-white active:scale-98 cursor-pointer'
                  : 'bg-surface-container-high text-secondary cursor-not-allowed opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-xl">check_circle</span>
              <span>Pago Realizado (${formatPrice(totalAcumulado)})</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
