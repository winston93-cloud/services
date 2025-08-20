'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaUser, FaGraduationCap, FaStar, FaLightbulb } from 'react-icons/fa'
import { loginAlumno } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginForm() {
  const [numeroControl, setNumeroControl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!numeroControl.trim()) {
      setError('Por favor, ingrese su número de control')
      setIsLoading(false)
      return
    }

    try {
      const result = await loginAlumno(numeroControl.trim())
      
      if (result.success && result.user) {
        login(result.user)
        router.push('/dashboard')
      } else {
        setError(result.error || 'Número de control no encontrado')
      }
    } catch (error) {
      console.error('Error en login:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Diagonal Background Effect */}
      <div className="absolute inset-0">
        {/* Base blanca */}
        <div className="absolute inset-0 bg-white"></div>
        {/* Diagonal 1: Blanco a Azul Marino (top-left to bottom-right) */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-200 via-blue-600 to-blue-900 opacity-90"></div>
        {/* Diagonal 2: Azul Marino a Blanco (bottom-left to top-right) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 via-blue-600 via-blue-200 to-white opacity-70 mix-blend-multiply"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md mx-auto">
          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-fadeIn">
            {/* Header with animated elements */}
            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-6 sm:px-8 sm:py-8 text-center overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent animate-shimmer"></div>
              </div>
              
              {/* Logo without rotation */}
              <div className="relative z-10 w-20 h-20 bg-white/95 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-float overflow-hidden">
                <Image 
                  src="/leon.jpg" 
                  alt="León Escolar" 
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded-xl"
                />
              </div>
              
              {/* Title with gradient text */}
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 animate-slideDown delay-200">
                <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Sistema Integral de Servicios
                </span>
              </h1>
              
              <div className="flex items-center justify-center gap-2 text-blue-100 animate-slideUp">
                <FaStar className="text-yellow-300 animate-pulse" />
                <p className="text-sm">Instituto Winston Churchill</p>
                <FaStar className="text-yellow-300 animate-pulse delay-300" />
              </div>
            </div>

            {/* Form Section */}
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Número de Control Field */}
                <div className="animate-slideUp delay-200">
                  <label htmlFor="numeroControl" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FaUser className="text-blue-500" />
                    Num. de Control
                  </label>
                  <div className="relative group">
                    <input
                      id="numeroControl"
                      type="text"
                      value={numeroControl}
                      onChange={(e) => setNumeroControl(e.target.value)}
                      className="block w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-300 placeholder-gray-400 hover:border-blue-300 transform focus:scale-105 text-gray-900 font-medium text-base"
                      placeholder="Ingrese su número de control"
                      disabled={isLoading}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-4 animate-shakeError">
                    <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none animate-slideUp delay-600"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Iniciando sesión...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <FaGraduationCap className="animate-bounce" />
                      <span>Iniciar Sesión</span>
                      <FaLightbulb className="animate-pulse" />
                    </div>
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 sm:px-8 sm:py-6 text-center border-t border-gray-100">
              <p className="text-xs text-gray-600 font-medium animate-fadeIn delay-800">
                © 2025 Sistema Integral de Servicios. 🚀 Innovación y tecnología.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
        .animate-slideDown { animation: slideDown 0.6s ease-out; }
        .animate-slideUp { animation: slideUp 0.6s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
        .animate-shakeError { animation: shakeError 0.5s ease-in-out; }
        .animate-spin-slow { 
          animation: spinSlow 3s linear infinite; 
          display: inline-block;
          transform-origin: center;
        }
        
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-800 { animation-delay: 0.8s; }
        .delay-1000 { animation-delay: 1s; }
        .delay-1200 { animation-delay: 1.2s; }
      `}</style>
    </div>
  )
}
