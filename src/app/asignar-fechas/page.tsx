'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaArrowLeft, FaCalendarAlt, FaTimes, FaCheckCircle, FaExclamationTriangle, FaTrash, FaClock, FaCreditCard } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { getConceptosPagados, updateConceptoFecha, deleteConceptoPagado, getAllPagosVigentes, PagoDesayuno } from '@/lib/supabase'

export default function AsignarFechasPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [conceptosPagados, setConceptosPagados] = useState<PagoDesayuno[]>([])
  const [isLoadingConceptos, setIsLoadingConceptos] = useState(true)
  const [showDateModal, setShowDateModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedConcepto, setSelectedConcepto] = useState<PagoDesayuno | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadConceptosPagados()
    }
  }, [user])

  const loadConceptosPagados = async () => {
    if (!user) return

    try {
      setIsLoadingConceptos(true)
      const result = await getAllPagosVigentes(user.alumno_ref)
      if (result.success && result.data) {
        setConceptosPagados(result.data)
      }
    } catch (error) {
      console.error('Error cargando pagos:', error)
    } finally {
      setIsLoadingConceptos(false)
    }
  }

  const openDateModal = (concepto: PagoDesayuno) => {
    // Validar si se puede modificar
    if (!canModifyTodayService(concepto.pago_fecha)) {
      alert(getTimeErrorMessage())
      return
    }

    setSelectedConcepto(concepto)
    setSelectedDate(concepto.pago_fecha)
    setCurrentMonth(new Date(concepto.pago_fecha))
    setShowDateModal(true)
  }

  const openCancelModal = (concepto: PagoDesayuno) => {
    // Validar si se puede cancelar
    if (!canModifyTodayService(concepto.pago_fecha)) {
      alert(getTimeErrorMessage())
      return
    }

    setSelectedConcepto(concepto)
    setShowCancelModal(true)
  }

  const handleCancelacion = async () => {
    if (!selectedConcepto || !selectedConcepto.id) return

    try {
      // Eliminar el registro de la base de datos
      const result = await deleteConceptoPagado(selectedConcepto.id)
      
      if (result.success) {
        // Actualizar el estado local removiendo el elemento
        setConceptosPagados(prev => prev.filter(item => item.id !== selectedConcepto.id))
        
        // Cerrar modal
        setShowCancelModal(false)
        setSelectedConcepto(null)
        
        console.log('Servicio cancelado exitosamente:', selectedConcepto.pago_descripcion)
      } else {
        // Mostrar error si falla la eliminación
        console.error('Error al cancelar servicio:', result.error)
        alert(`Error al cancelar el servicio: ${result.error}`)
      }
    } catch (error) {
      console.error('Error cancelando concepto:', error)
      alert('Error inesperado al cancelar el servicio')
    }
  }

  const updateFecha = async (nuevaFecha: string) => {
    if (!selectedConcepto) return

    setIsUpdating(true)
    try {
      const result = await updateConceptoFecha(selectedConcepto.id!, nuevaFecha)
      if (result.success) {
        // Actualizar el estado local
        setConceptosPagados(prev =>
          prev.map(concepto =>
            concepto.id === selectedConcepto.id
              ? { ...concepto, pago_fecha: nuevaFecha }
              : concepto
          )
        )
        setShowDateModal(false)
        setSelectedConcepto(null)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error actualizando fecha:', error)
      alert('Error al actualizar la fecha')
    } finally {
      setIsUpdating(false)
    }
  }

  // Función para validar si una fecha es fin de semana
  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // Domingo o Sábado
  }

  // Función para verificar si una fecha es anterior a hoy
  const isPastDate = (date: Date) => {
    const today = new Date()
    const dateToCheck = new Date(date)
    
    // Normalizar fechas para comparar solo año, mes y día
    today.setHours(0, 0, 0, 0)
    dateToCheck.setHours(0, 0, 0, 0)
    
    return dateToCheck < today
  }

  // Función para validar si se puede modificar un servicio del día actual
  const canModifyTodayService = (fecha: string) => {
    // Validar que la fecha sea válida
    if (!fecha || fecha === '') {
      return false
    }

    // Crear fechas en zona horaria local para evitar problemas de UTC
    const today = new Date()
    const [year, month, day] = fecha.split('-').map(Number)
    const serviceDate = new Date(year, month - 1, day) // month - 1 porque los meses van de 0-11
    
    // Validar que la fecha se haya parseado correctamente
    if (isNaN(serviceDate.getTime())) {
      return false
    }
    
    // Normalizar fechas para comparar solo año, mes y día
    today.setHours(0, 0, 0, 0)
    serviceDate.setHours(0, 0, 0, 0)
    
    // Log temporal para debug del servicio de mañana
    if (fecha === '2025-08-22') {
      console.log('🔍 DEBUG MAÑANA - FECHA:', fecha)
      console.log('🔍 DEBUG MAÑANA - TODAY:', today.toISOString())
      console.log('🔍 DEBUG MAÑANA - SERVICE DATE:', serviceDate.toISOString())
      console.log('🔍 DEBUG MAÑANA - TODAY TIME:', today.getTime())
      console.log('🔍 DEBUG MAÑANA - SERVICE TIME:', serviceDate.getTime())
      console.log('🔍 DEBUG MAÑANA - ES HOY:', today.getTime() === serviceDate.getTime())
      console.log('🔍 DEBUG MAÑANA - ES FUTURO:', serviceDate.getTime() > today.getTime())
      console.log('🔍 DEBUG MAÑANA - ES PASADO:', serviceDate.getTime() < today.getTime())
      console.log('🔍 DEBUG MAÑANA - DIFERENCIA:', serviceDate.getTime() - today.getTime())
      console.log('🔍 DEBUG MAÑANA - DIFERENCIA DÍAS:', (serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    // Si es el día de hoy, verificar la hora
    if (today.getTime() === serviceDate.getTime()) {
      const currentHour = new Date().getHours()
      const currentMinutes = new Date().getMinutes()
      const currentTimeInMinutes = currentHour * 60 + currentMinutes
      const cutoffTimeInMinutes = 9 * 60 // 9:00 AM en minutos
      
      return currentTimeInMinutes < cutoffTimeInMinutes
    }
    
    // Si es un día futuro, siempre se puede modificar
    if (serviceDate.getTime() > today.getTime()) {
      return true
    }
    
    // Si es un día pasado, no se puede modificar
    return false
  }

  // Función para obtener mensaje de error de hora
  const getTimeErrorMessage = () => {
    return "No se pueden realizar cambios o cancelaciones después de las 9:00 AM para servicios del día actual."
  }

  // Generar días del calendario
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const startDate = new Date(firstDayOfMonth)
    
    // Ir al lunes anterior
    const dayOfWeek = firstDayOfMonth.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startDate.setDate(firstDayOfMonth.getDate() - daysToSubtract)
    
    const days = []
    const currentDate = new Date(startDate)
    
    // Generar 42 días (6 semanas)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  // Manejar selección de día
  const handleDayClick = (date: Date) => {
    if (isWeekend(date) || isPastDate(date)) return
    
    const dateString = date.toISOString().split('T')[0]
    setSelectedDate(dateString)
    updateFecha(dateString)
  }

  // Navegar meses
  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(newMonth.getMonth() + direction)
      return newMonth
    })
  }

  // Función para ir rápidamente a un mes específico
  const goToMonth = (monthsFromNow: number) => {
    const today = new Date()
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthsFromNow, 1)
    setCurrentMonth(targetMonth)
  }

  const getProductEmoji = (nombre: string) => {
    const nombreLower = nombre.toLowerCase()
    if (nombreLower.includes('comida')) return '🍽️'
    if (nombreLower.includes('desayuno ch')) return '🥞'
    if (nombreLower.includes('desayuno gde')) return '🍳'
    if (nombreLower.includes('est. mes')) return '🏫'
    if (nombreLower.includes('estancia')) return '👨‍🎓'
    if (nombreLower.includes('media')) return '⏰'
    if (nombreLower.includes('tareas')) return '📚'
    return '🍽️'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <span className="text-white text-lg font-medium animate-pulse">Cargando...</span>
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
        <div className="absolute inset-0 bg-white"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-200 via-blue-600 to-blue-900 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 via-blue-600 via-blue-200 to-white opacity-70 mix-blend-multiply"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-0 sm:h-16 gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/services')}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm sm:text-base"
              >
                <FaArrowLeft className="text-gray-600" />
                <span className="text-gray-700 font-medium">Volver</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Image
                    src="/leon.jpg"
                    alt="León Winston"
                    width={32}
                    height={32}
                    className="w-6 h-6 sm:w-8 sm:h-8 object-cover rounded-md"
                  />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">Asignar Fechas y Cancelaciones</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <p className="text-xs sm:text-sm text-gray-600 font-bold">Alumno:</p>
              <p className="font-semibold text-gray-800 text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{user.alumno_nombre_completo}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="text-purple-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Pagos y Reservas</h2>
                <p className="text-gray-600 text-sm">Haz clic en el calendario para cambiar fechas o cancelar servicios</p>
              </div>
            </div>
            
            {/* Contador visual */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-sm">🍽️</span>
                <span className="text-sm font-medium">Total:</span>
                <span className="text-xl font-bold">{conceptosPagados.length}</span>
              </div>
            </div>
          </div>

          {isLoadingConceptos ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando pagos...</p>
            </div>
          ) : conceptosPagados.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-gray-400 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay pagos vigentes</h3>
              <p className="text-gray-600">Aún no tienes servicios pagados o reservados para asignar fechas.</p>
              <button
                onClick={() => router.push('/servicios-internos')}
                className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
              >
                Ir a Elegir Servicios
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {conceptosPagados.map((concepto, index) => (
                <div
                  key={concepto.id}
                  className={`flex items-center justify-between rounded-lg p-4 border transition-all duration-200 ${
                    concepto.pago_estatus === 1 
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200 hover:shadow-md' 
                      : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-2xl">{getProductEmoji(concepto.pago_descripcion)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">{concepto.pago_descripcion}</h3>
                        {/* Indicador de estatus */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          concepto.pago_estatus === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {concepto.pago_estatus === 1 ? (
                            <>
                              <FaCreditCard className="text-xs" />
                              <span>Pagado</span>
                            </>
                          ) : (
                            <>
                              <FaClock className="text-xs" />
                              <span>Reservado</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Cantidad: {concepto.pago_cantidad}</span>
                        <span>Precio: ${concepto.pago_costo.toFixed(2)}</span>
                        <span>Total: ${(concepto.pago_costo * concepto.pago_cantidad).toFixed(2)}</span>
                      </div>
                      <p className={`font-medium text-sm ${
                        concepto.pago_estatus === 1 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        Fecha programada: {concepto.pago_fecha}
                      </p>
                      
                      {/* Indicador de restricción de hora para servicios del día actual */}
                      {!canModifyTodayService(concepto.pago_fecha) && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700 text-xs">
                            <FaExclamationTriangle className="text-red-500" />
                            <span className="font-medium">
                              No se puede modificar después de las 9:00 AM
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDateModal(concepto)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                        canModifyTodayService(concepto.pago_fecha)
                          ? 'bg-purple-500 text-white hover:bg-purple-600'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                      disabled={!canModifyTodayService(concepto.pago_fecha)}
                      title={
                        !canModifyTodayService(concepto.pago_fecha)
                          ? getTimeErrorMessage()
                          : 'Cambiar fecha del servicio'
                      }
                    >
                      <FaCalendarAlt className="text-sm" />
                      <span className="hidden sm:inline">Cambiar Fecha</span>
                      <span className="sm:hidden">Fecha</span>
                    </button>
                    <button
                      onClick={() => openCancelModal(concepto)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                        canModifyTodayService(concepto.pago_fecha)
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                      disabled={!canModifyTodayService(concepto.pago_fecha)}
                      title={
                        !canModifyTodayService(concepto.pago_fecha)
                          ? getTimeErrorMessage()
                          : 'Cancelar servicio'
                      }
                    >
                      <FaTrash className="text-sm" />
                      <span className="hidden sm:inline">Cancelar</span>
                      <span className="sm:hidden">Cancelar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Calendario Compacto */}
      {showDateModal && selectedConcepto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
            {/* Header compacto */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getProductEmoji(selectedConcepto.pago_descripcion)}</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Cambiar Fecha</h2>
                  <p className="text-xs text-gray-600">{selectedConcepto.pago_descripcion}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDateModal(false)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <FaTimes className="text-gray-600 text-sm" />
              </button>
            </div>

            <div className="p-4">
              {/* Calendario compacto */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                {/* Header del calendario compacto */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    className="w-8 h-8 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center"
                    disabled={isUpdating}
                  >
                    <span className="text-lg text-gray-600">‹</span>
                  </button>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-800 capitalize">
                      {currentMonth.toLocaleDateString('es-ES', { month: 'long' })}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    className="w-8 h-8 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center"
                    disabled={isUpdating}
                  >
                    <span className="text-lg text-gray-600">›</span>
                  </button>
                </div>

                {/* Navegación rápida más pequeña */}
                <div className="flex gap-1 mb-3 justify-center">
                  {[0, 1, 2].map((monthOffset) => {
                    const targetDate = new Date()
                    targetDate.setMonth(targetDate.getMonth() + monthOffset)
                    const isCurrentDisplayed = targetDate.getMonth() === currentMonth.getMonth()
                    
                    return (
                      <button
                        key={monthOffset}
                        type="button"
                        onClick={() => goToMonth(monthOffset)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          isCurrentDisplayed
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-purple-100'
                        }`}
                        disabled={isUpdating}
                      >
                        {targetDate.toLocaleDateString('es-ES', { month: 'short' })}
                      </button>
                    )
                  })}
                </div>

                {/* Días de la semana compactos */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                    <div key={index} className="text-center py-1 text-xs font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Días del calendario compactos */}
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                    const isToday = date.toDateString() === new Date().toDateString()
                    const dateString = date.toISOString().split('T')[0]
                    const isSelected = selectedDate === dateString
                    const isPast = isPastDate(date)
                    const isWeekendDay = isWeekend(date)
                    const isDisabled = isPast || isWeekendDay

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDayClick(date)}
                        disabled={isDisabled || isUpdating}
                        className={`
                          h-8 w-full text-xs font-medium rounded transition-all duration-200
                          ${!isCurrentMonth 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : isDisabled
                              ? 'text-gray-400 bg-gray-200 cursor-not-allowed opacity-50'
                              : isSelected
                                ? 'bg-purple-500 text-white shadow-md'
                                : isToday
                                  ? 'bg-blue-100 text-blue-600 font-bold'
                                  : 'text-gray-700 hover:bg-purple-100 hover:text-purple-600'
                          }
                        `}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fecha seleccionada compacta */}
              {selectedDate && (
                <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-800 text-center">
                    <span className="font-semibold">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </p>
                </div>
              )}

              {/* Botones compactos */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowDateModal(false)}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowDateModal(false)}
                  className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Actualizando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cancelación */}
      {showCancelModal && selectedConcepto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            {/* Header del modal */}
            <div className="relative p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <FaExclamationTriangle className="text-red-600 text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Confirmar Cancelación</h2>
                  <p className="text-gray-600 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <FaTimes className="text-gray-600 text-sm" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-red-500 text-lg mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium mb-2">
                      ¿Estás seguro de que deseas cancelar este servicio?
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-red-100">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getProductEmoji(selectedConcepto.pago_descripcion)}</span>
                        <h3 className="font-semibold text-gray-800">{selectedConcepto.pago_descripcion}</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Fecha programada: <span className="font-medium text-red-600">{selectedConcepto.pago_fecha}</span></p>
                        <p>Precio: <span className="font-medium">${selectedConcepto.pago_costo.toFixed(2)}</span></p>
                        <p>Cantidad: <span className="font-medium">{selectedConcepto.pago_cantidad}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FaTimes className="text-sm" />
                  Cancelar
                </button>
                <button
                  onClick={handleCancelacion}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FaTrash className="text-sm" />
                  Sí, Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
