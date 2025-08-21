'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FaSignOutAlt, FaUsers, FaCog, FaChartLine, FaLock, FaLightbulb, FaStar, FaGem, FaEnvelope, FaBan, FaFileInvoice, FaIdCard, FaBars, FaTimes, FaArrowLeft } from 'react-icons/fa'

export default function ServicesPage() {
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
    { emoji: "🍽️", title: "Elegir Servicios", desc: "Reserva de Comida, Desayuno y Estancia" },
    { emoji: "📅", title: "Asignar Fechas y Cancelaciones", desc: "Reservar días de servicios y cancelar" },
    { emoji: "💰", title: "Saldo a Favor", desc: "Ver montos disponibles" },
    { emoji: "📊", title: "Pagos Mensuales", desc: "Contratar servicios mensuales" },
    { emoji: "⚠️", title: "Adeudos Pendientes", desc: "Ver adeudos por tardanza" },
    { emoji: "🏫", title: "Pago en Recepción", desc: "Servicios del mismo día" },
    { emoji: "📈", title: "Corte Diario", desc: "Resumen de pagos del día" },
    { emoji: "🔐", title: "Función Manual", desc: "Cargar fechas posteriores" },
    { emoji: "📋", title: "Registrar Adeudos", desc: "Control de horarios de salida" },
    { emoji: "🏠", title: "Días de Asueto", desc: "Registrar días no hábiles" },
    { emoji: "💼", title: "Desglose Contable", desc: "Cálculo Ludy y Winston" },
    { emoji: "📤", title: "Exportar Excel", desc: "Reportes en Excel" },
    { emoji: "🔗", title: "Link de Adeudos", desc: "Vinculación con colegiaturas" }
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

  const services = [
    { icon: FaUsers, title: "Elegir Servicios", desc: "Reserva de Comida, Desayuno y Estancia", color: "from-blue-500 to-cyan-500" },
    { icon: FaChartLine, title: "Asignar Fechas y Cancelaciones", desc: "Calendario para reservar días y cancelar", color: "from-purple-500 to-pink-500" },
    { icon: FaGem, title: "Saldo a Favor", desc: "Consultar montos por devoluciones", color: "from-green-500 to-teal-500" },
    { icon: FaFileInvoice, title: "Pagos Mensuales", desc: "Contratar servicios por mes completo", color: "from-indigo-500 to-purple-500" },
    { icon: FaLock, title: "Adeudos Pendientes", desc: "Ver tardanzas y montos adeudados", color: "from-yellow-500 to-orange-500" },
    { icon: FaCog, title: "Pago en Recepción", desc: "Servicios para el mismo día", color: "from-pink-500 to-rose-500" },
    { icon: FaLightbulb, title: "Corte Diario", desc: "Resumen de ingresos del día", color: "from-cyan-500 to-blue-500" },
    { icon: FaIdCard, title: "Función Manual", desc: "Cargar fechas posteriores (Maestro)", color: "from-teal-500 to-green-500" },
    { icon: FaEnvelope, title: "Registrar Adeudos", desc: "Control de horarios de salida", color: "from-violet-500 to-purple-500" },
    { icon: FaFileInvoice, title: "Días de Asueto", desc: "Configurar días no hábiles", color: "from-emerald-500 to-teal-500" },
    { icon: FaChartLine, title: "Desglose Contable", desc: "Calcular montos Ludy y Winston", color: "from-amber-500 to-yellow-500" }
  ]

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
      <header className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Hamburger Menu Button */}
            <button
              onClick={toggleMenu}
              className="relative z-50 p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
            >
              {isMenuOpen ? (
                <FaTimes className="text-white text-xl animate-spin" />
              ) : (
                <FaBars className="text-white text-xl animate-pulse" />
              )}
            </button>

            <div className="animate-slideIn flex items-center gap-4">
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
            <button
              onClick={() => router.push('/dashboard')}
              className="group inline-flex items-center px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 animate-slideIn delay-200 text-sm sm:text-base"
            >
              <FaArrowLeft className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:animate-bounce" />
              <span className="hidden sm:inline">Volver</span>
              <span className="sm:hidden">Volver</span>
            </button>
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
                    // Navegación específica para cada opción
                    if (item.title === "Elegir Servicios") {
                      router.push('/servicios-internos')
                    } else if (item.title === "Asignar Fechas y Cancelaciones") {
                      router.push('/asignar-fechas')
                    } else {
                      console.log(`Navegando a: ${item.title}`)
                    }
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
          <div className="p-4 border-t border-white/20 space-y-2">
            <button
              onClick={() => {
                router.push('/dashboard')
                setIsMenuOpen(false)
              }}
              className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl text-white font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <FaArrowLeft className="animate-pulse" />
              <span>Volver al Inicio</span>
            </button>
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
          <div className="flex justify-center items-center gap-2 text-purple-200">
            <FaStar className="text-yellow-400 animate-pulse" />
            <span className="text-lg sm:text-xl font-semibold text-white">Bienvenido al Ecosistema de servicios integrales Winston</span>
            <FaStar className="text-yellow-400 animate-pulse delay-300" />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={index}
                onClick={() => {
                  if (service.title === "Elegir Servicios") {
                    router.push('/servicios-internos')
                  } else if (service.title === "Asignar Fechas y Cancelaciones") {
                    router.push('/asignar-fechas')
                  } else {
                    console.log(`Navegando a: ${service.title}`)
                  }
                }}
                className={`group bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 hover:border-white/40 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 cursor-pointer animate-slideUp touch-manipulation active:scale-95`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${service.color} rounded-2xl flex items-center justify-center mb-6 group-hover:animate-bounce transition-all duration-300 shadow-lg`}>
                  <Icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors">
                  {service.title}
                </h3>
                <p className="text-blue-200 group-hover:text-white transition-colors">
                  {service.desc}
                </p>
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                </div>
              </div>
            )
          })}
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
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-slideIn { animation: slideIn 0.6s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
        .animate-slideUp { animation: slideUp 0.6s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-600 { animation-delay: 0.6s; }
      `}</style>
    </div>
  )
}
