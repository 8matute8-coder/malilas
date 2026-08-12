import React, { useState } from 'react';

export default function CalculadoraCajaModal({ isOpen, onClose, onConfirmSale }) {
  if (!isOpen) return null;

  const [currentInput, setCurrentInput] = useState('');
  const [breakdown, setBreakdown] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [saleNumberToday, setSaleNumberToday] = useState(() => Math.floor(100 + Math.random() * 900));

  const totalAcumulado = breakdown.reduce((sum, item) => sum + item.monto, 0);

  const formatPrice = (num) => Math.round(Number(num) || 0).toLocaleString('es-AR');

  const handleDigit = (digit) => {
    if (digit === '.' && currentInput.includes('.')) return;
    if (digit === '0' && currentInput === '0') return;
    if (digit === '00' && (currentInput === '' || currentInput === '0')) return;

    if (currentInput === '0' && digit !== '.') {
      setCurrentInput(digit);
    } else {
      setCurrentInput(prev => prev + digit);
    }
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
      setBreakdown(prev => [
        ...prev,
        { id: Date.now() + Math.random(), monto: val }
      ]);
      setCurrentInput('');
    }
  };

  const handleRemoveBreakdownItem = (id) => {
    setBreakdown(prev => prev.filter(item => item.id !== id));
  };

  const handleResetAll = () => {
    setBreakdown([]);
    setCurrentInput('');
  };

  const handleFinishPayment = () => {
    let finalTotal = totalAcumulado;

    if (currentInput !== '') {
      const pendingVal = parseFloat(currentInput);
      if (!isNaN(pendingVal) && pendingVal > 0) {
        finalTotal += pendingVal;
      }
    }

    if (finalTotal <= 0) return;

    if (onConfirmSale) {
      onConfirmSale(finalTotal, breakdown);
    }

    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setBreakdown([]);
      setCurrentInput('');
      setSaleNumberToday(Math.floor(100 + Math.random() * 900));
      onClose();
    }, 1200);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-lg border-2 border-emerald-500 overflow-hidden flex flex-col justify-between my-2 animate-fade-in transition-all duration-300">
      
      {/* Header Bar Desplegable */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-surface-container-highest bg-emerald-50/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-700 text-xl">point_of_sale</span>
          <h2 className="text-base font-black text-on-surface">Calculadora de Venta Rápida POS</h2>
          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border border-emerald-300">
            N° {saleNumberToday}
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-surface-container-high text-secondary border border-surface-container-highest flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold shadow-2xs"
          title="Ocultar Calculadora"
        >
          <span>✕ Ocultar Calculadora</span>
        </button>
      </div>

      {/* Content Body */}
      {isSuccess ? (
        <div className="p-8 text-center flex flex-col items-center justify-center gap-3 animate-fade-in bg-emerald-50/30">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner animate-bounce">
            <span className="material-symbols-outlined text-4xl">check</span>
          </div>
          <div>
            <h3 className="text-xl font-black text-emerald-900">¡Venta Registrada Exitosamente!</h3>
            <p className="text-xs font-bold text-secondary mt-1">
              Monto: ${formatPrice(totalAcumulado > 0 ? totalAcumulado : currentInput)} — Registrado en Contabilidad 💵
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 sm:p-5 flex flex-col gap-3">
          
          {/* Visor Dual POS (Total Acumulado + Visor Entrada) */}
          <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-700/80 p-4 rounded-2xl text-white shadow-md flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                TOTAL ACUMULADO VENTA
              </span>
              {currentInput !== '' && (
                <button
                  type="button"
                  onClick={handleClearCurrent}
                  className="text-[10px] bg-red-500/30 hover:bg-red-500/50 text-red-200 px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
                >
                  Borrar Monto
                </button>
              )}
            </div>

            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                ${formatPrice(totalAcumulado)}
              </span>
              <span className="text-base font-bold text-emerald-200">
                {currentInput !== '' ? `Monto: $${formatPrice(currentInput)}` : '$0'}
              </span>
            </div>
          </div>

          {/* Desglose de Suma Horizontal Pills (1 sola línea de alto, scrolleable lateralmente) */}
          <div className="flex items-center justify-between gap-2 bg-surface-container-low px-3.5 py-2 rounded-xl border border-surface-container-highest">
            <span className="text-[10px] font-black text-secondary uppercase shrink-0">
              Sumas ({breakdown.length}):
            </span>

            {breakdown.length === 0 ? (
              <span className="text-[11px] text-secondary/70 italic truncate">
                Ingresa un monto y presiona (+) para sumar
              </span>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none flex-1">
                {breakdown.map((item) => (
                  <span
                    key={item.id}
                    className="bg-emerald-100 text-emerald-950 border border-emerald-300 font-extrabold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs"
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

          {/* Keypad Grid 4x4 Numpad (ESTRUCTURA UNIVERSAL CALCULADORA POS) */}
          <div className="grid grid-cols-4 gap-2">
            {/* Fila 1: 7, 8, 9, CE */}
            <button
              type="button"
              onClick={() => handleDigit('7')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleDigit('8')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleDigit('9')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              9
            </button>
            <button
              type="button"
              onClick={handleClearCurrent}
              className="py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-extrabold text-sm flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="CE - Limpiar completamente el monto tipeado"
            >
              CE
            </button>

            {/* Fila 2: 4, 5, 6, Backspace */}
            <button
              type="button"
              onClick={() => handleDigit('4')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleDigit('5')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleDigit('6')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              6
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Borrar último dígito"
            >
              <span className="material-symbols-outlined text-xl">backspace</span>
            </button>

            {/* Fila 3: 1, 2, 3, + (row-span-2) */}
            <button
              type="button"
              onClick={() => handleDigit('1')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleDigit('2')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleDigit('3')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              3
            </button>
            <button
              type="button"
              onClick={handleAddAmount}
              className="row-span-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-3xl flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer"
              title="Sumar al total acumulado"
            >
              +
            </button>

            {/* Fila 4: 0, 00, , */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-on-surface transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleDigit('00')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-bold text-sm text-secondary transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              00
            </button>
            <button
              type="button"
              onClick={() => handleDigit('.')}
              className="py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest font-black text-xl text-secondary transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              ,
            </button>
          </div>

          {/* Footer Action Button */}
          <div className="pt-2 w-full">
            <button
              type="button"
              disabled={totalAcumulado <= 0 && currentInput === ''}
              onClick={handleFinishPayment}
              className={`w-full py-4 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                (totalAcumulado > 0 || currentInput !== '')
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 cursor-pointer'
                  : 'bg-surface-container-high text-secondary cursor-not-allowed opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-xl">point_of_sale</span>
              <span>
                REGISTRAR VENTA {totalAcumulado > 0 ? `($${formatPrice(totalAcumulado)})` : (currentInput !== '' ? `($${formatPrice(currentInput)})` : '')}
              </span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
