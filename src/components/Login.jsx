import React, { useState } from 'react';

// Encriptación SHA-256 de "malila2026" (sin almacenar contraseña en texto plano)
const ENCRYPTED_PASSWORD_HASH = "029ec4ff82b7c5e4c2ee5be3bbd97610174ad858411e81e629e5857ea020b5ff";

export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyPassword = async (input) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const inputHash = await verifyPassword(password.trim());
      if (inputHash === ENCRYPTED_PASSWORD_HASH) {
        // Guardar sesión persistente indefinida
        localStorage.setItem('lamalila_auth_token', 'logged_in_belen');
        localStorage.setItem('lamalila_auth_timestamp', new Date().toISOString());
        onLoginSuccess();
      } else {
        setError('Contraseña incorrecta. Inténtalo nuevamente.');
      }
    } catch (err) {
      console.error(err);
      setError('Error verificando la credencial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 md:p-10 w-full max-w-sm flex flex-col items-center gap-6 shadow-xl border border-surface-container-highest animate-fade-in">
        {/* Logo */}
        <div className="w-24 h-24 rounded-full border-2 border-primary/20 p-1 flex items-center justify-center shadow-sm">
          <img 
            src="./logo.jpg" 
            alt="La Malila Logo" 
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center">
          <h2 className="text-2xl font-black text-primary tracking-tight">Bienvenida Belén</h2>
          <p className="text-xs text-secondary font-medium mt-1">Ingresa tu contraseña</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {error && (
            <div className="bg-error-container/30 border border-error/30 text-error text-xs font-bold p-3 rounded-2xl text-center">
              ⚠️ {error}
            </div>
          )}

          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-xl">
              lock
            </span>
            
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full bg-surface-container-low border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3.5 pl-11 pr-11 text-sm outline-none font-medium text-on-surface"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors p-1"
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#68a335] hover:bg-[#5a912b] text-white font-bold py-3.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-base mt-2"
          >
            {loading ? (
              <span>Verificando...</span>
            ) : (
              <span>Ingresar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
