'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaUser, FaLock, FaEye, FaEyeSlash, FaGraduationCap, FaStar, FaLightbulb } from 'react-icons/fa'
import { loginUser } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Por favor, complete todos los campos')
      setIsLoading(false)
      return
    }

    try {
      const result = await loginUser(username.trim(), password)
      
      if (result.success && result.user) {
        login(result.user)
        router.push('/services')
      } else {
        setError(result.error || 'Error de autenticación')
      }
    } catch (error) {
      console.error('Error en login:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-400/20 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-400/20 rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-32 left-20 w-12 h-12 bg-pink-400/20 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute bottom-20 right-32 w-24 h-24 bg-cyan-400/20 rounded-full animate-pulse delay-500"></div>
        
        {/* Animated grid */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), 
                              radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)`
          }}></div>
        </div>
        
        {/* Moving particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-ping delay-200"></div>
        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-white/40 rounded-full animate-ping delay-800"></div>
        <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-white/40 rounded-full animate-ping delay-1200"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-fadeIn">
            {/* Header with animated elements */}
            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-8 py-8 text-center overflow-hidden">
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
              <h1 className="text-3xl font-bold text-white mb-2 animate-slideDown delay-200">
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
            <div className="px-8 py-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div className="animate-slideUp delay-200">
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FaUser className="text-blue-500" />
                    Usuario
                  </label>
                  <div className="relative group">
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-300 placeholder-gray-400 hover:border-blue-300 transform focus:scale-105 text-gray-900 font-medium text-base"
                      placeholder="Ingrese su usuario"
                      disabled={isLoading}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="animate-slideUp delay-400">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FaLock className="text-purple-500" />
                    Contraseña
                  </label>
                  <div className="relative group">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-4 pr-12 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-gray-400 hover:border-purple-300 transform focus:scale-105 text-gray-900 font-medium"
                      placeholder="Ingrese su contraseña"
                      disabled={isLoading}
                      style={{ 
                        letterSpacing: showPassword ? 'normal' : '0.1em',
                        fontSize: showPassword ? '16px' : '18px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-all duration-200 hover:scale-110"
                      disabled={isLoading}
                    >
                      {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                    </button>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
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
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 text-center border-t border-gray-100">
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
