'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaSignOutAlt, FaStar, FaBars, FaTimes, FaUtensils } from 'react-icons/fa'
import NotificationsBell from '@/components/NotificationsBell'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const menuItems = [
    { emoji: "🍽️", title: "Desayunos, Estancias y Comidas", desc: "Servicios de alimentación escolar" }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin"></div>
          </div>
          <span className="text-white text-lg font-medium animate-pulse">Cargando el futuro...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
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

      {/* Header */}
      <header className="relative z-10 bg-transparent">
        {/* Barra superior a todo lo ancho */}
        <div className="w-full bg-white/10 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between">
            {/* Hamburger Menu Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleMenu}
                className="p-2 sm:p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                {isMenuOpen ? (
                  <FaTimes className="text-white text-xl" />
                ) : (
                  <FaBars className="text-white text-xl" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="group inline-flex items-center px-3 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 text-sm"
              >
                <FaSignOutAlt className="mr-2 h-4 w-4 group-hover:animate-bounce" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

            <div className="animate-slideIn flex items-center gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/95 rounded-xl flex items-center justify-center overflow-hidden">
                  <Image
                    src="/leon.jpg"
                    alt="León Winston"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                  <p className="text-white flex items-center gap-2 text-base sm:text-lg font-bold">
                    <FaStar className="text-yellow-300 animate-pulse text-lg" />
                    <span className="hidden sm:inline">Bienvenido, </span>
                    <span className="truncate max-w-[180px] sm:max-w-none">
                      {user.alumno_nombre_completo}
                    </span>
                    <span className="text-blue-200 mx-2">•</span>
                    <span className="font-mono font-bold text-yellow-200">{user.alumno_ref}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationsBell />
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
          onClick={toggleMenu}
        />
      )}

      {/* Hamburger Menu */}
      <div className={`fixed top-0 left-0 h-full w-80 sm:w-96 bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 border-r border-white/20 backdrop-blur-xl z-40 transform transition-transform duration-300 ease-in-out ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/95 rounded-lg flex items-center justify-center overflow-hidden">
                <Image
                  src="/leon.jpg"
                  alt="León Winston"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-cover rounded-md"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Menú Principal</h2>
                <p className="text-blue-200 text-sm">Winston Churchill</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105 active:scale-95 hover:translate-x-2 animate-slideUp touch-manipulation`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => {
                    router.push('/services')
                    setIsMenuOpen(false)
                  }}
                >
                  <div className="text-2xl animate-bounce" style={{ animationDelay: `${index * 0.1}s` }}>
                    {item.emoji}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                    <p className="text-blue-200 text-xs">{item.desc}</p>
                  </div>
                  <div className="text-white/50">›</div>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Footer */}
          <div className="p-4 border-t border-white/20">
            <button
              onClick={() => {
                handleLogout()
                setIsMenuOpen(false)
              }}
              className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl text-white font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <FaSignOutAlt className="animate-pulse" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 animate-fadeIn">
          <div className="relative flex justify-center mb-3">
            <div className="absolute w-20 h-20 sm:w-24 sm:h-24 bg-yellow-300/30 blur-2xl rounded-full" />
            <FaStar className="text-yellow-300 text-5xl sm:text-6xl animate-glow" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-white tracking-wide">Bienvenido</span>
        </div>

        {/* Main Service Card */}
        <div className="flex justify-center">
          <div
            onClick={() => router.push('/services')}
            className="group bg-white/10 backdrop-blur-xl rounded-3xl p-12 sm:p-16 border border-white/20 hover:border-white/40 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 cursor-pointer animate-slideUp touch-manipulation active:scale-95 max-w-md w-full"
          >
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mb-8 group-hover:animate-bounce transition-all duration-300 shadow-lg mx-auto">
                <FaUtensils className="text-white text-4xl" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-blue-200 transition-colors">
                Desayunos, Estancias y Comidas
              </h3>
              <p className="text-blue-200 group-hover:text-white transition-colors text-lg">
                Servicios de alimentación y cuidado escolar
              </p>
              <div className="mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slideIn { animation: slideIn 0.6s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
        .animate-slideUp { animation: slideUp 0.6s ease-out; }

        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }

        @keyframes glow {
          0% { filter: drop-shadow(0 0 0 rgba(250,204,21,.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 18px rgba(250,204,21,.9)); transform: scale(1.06); }
          100% { filter: drop-shadow(0 0 0 rgba(250,204,21,.5)); transform: scale(1); }
        }

        .animate-glow { animation: glow 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
