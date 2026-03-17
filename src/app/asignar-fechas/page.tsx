'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaArrowLeft, FaCalendarAlt, FaTimes, FaCheckCircle, FaExclamationTriangle, FaTrash, FaClock, FaCreditCard, FaEdit, FaSearch } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { updateConceptoFecha, deleteConceptoPagado, getAllPagosVigentes, getHistorialCompleto, PagoDesayuno, getConceptosDesayunos, updateConceptoService } from '@/lib/supabase'

export default function AsignarFechasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [conceptosPagados, setConceptosPagados] = useState<PagoDesayuno[]>([])
  const [isLoadingConceptos, setIsLoadingConceptos] = useState(true)
  const [showDateModal, setShowDateModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedConcepto, setSelectedConcepto] = useState<PagoDesayuno | null>(null)
  const [showRestrictionModal, setShowRestrictionModal] = useState(false)
  const [restrictionMessage, setRestrictionMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false)
  const [selectedOrderItems, setSelectedOrderItems] = useState<PagoDesayuno[]>([])
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>('')

  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [historialData, setHistorialData] = useState<{[key: string]: PagoDesayuno[]}>({})
  const [groupedOrders, setGroupedOrders] = useState<{[key: string]: PagoDesayuno[]}>({})
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<string>('')
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false)
  const [showTimeRestrictionModal, setShowTimeRestrictionModal] = useState(false)
  const [timeRestrictionMessage, setTimeRestrictionMessage] = useState('')
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [availableServices, setAvailableServices] = useState<Array<{id: number, desayuno_nombre: string, desayuno_abreviatura: string, costo: number}>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredServices, setFilteredServices] = useState<Array<{id: number, desayuno_nombre: string, desayuno_abreviatura: string, costo: number}>>([])
  const [selectedNewService, setSelectedNewService] = useState<{id: number, desayuno_nombre: string, desayuno_abreviatura: string, costo: number} | null>(null)
  const [isModifying, setIsModifying] = useState(false)

  const loadConceptosPagados = useCallback(async () => {
    if (!user) return

    try {
      setIsLoadingConceptos(true)
      const result = await getAllPagosVigentes(user.alumno_ref)
      if (result.success && result.data) {
        // Agrupar por número de orden
        const groupedOrders: {[key: string]: PagoDesayuno[]} = {}
        result.data.forEach(item => {
          if (item.pago_orden) {
            if (!groupedOrders[item.pago_orden]) {
              groupedOrders[item.pago_orden] = []
            }
            groupedOrders[item.pago_orden].push(item)
          }
        })
        
        setConceptosPagados(result.data) // Mantener la lista original para compatibilidad
        setGroupedOrders(groupedOrders) // Nueva variable de estado para órdenes agrupadas
      }
    } catch (error) {
      console.error('Error cargando pagos:', error)
    } finally {
      setIsLoadingConceptos(false)
    }
  }, [user])


  useEffect(() => {
    if (user) {
      loadConceptosPagados()
    }
  }, [user, loadConceptosPagados])

  const openDateModal = (concepto: PagoDesayuno) => {
    setSelectedConcepto(concepto)
    setSelectedDate(concepto.pago_fecha || '')
    if (concepto.pago_fecha) {
      setCurrentMonth(new Date(concepto.pago_fecha))
    } else {
      setCurrentMonth(new Date()) // Si no hay fecha, usar mes actual
    }
    setShowDateModal(true)
  }

  const openCancelModal = (concepto: PagoDesayuno) => {
    setSelectedConcepto(concepto)
    setShowCancelModal(true)
  }

  const openCancelOrderModal = (orderItems: PagoDesayuno[], orderNumber: string) => {
            setSelectedOrderItems(orderItems)
        setSelectedOrderNumber(orderNumber)
        setShowCancelOrderModal(true)
  }

  const openModifyModal = async (concepto: PagoDesayuno) => {
    console.log('🔍 DEBUG openModifyModal:')
    console.log('  - Concepto:', concepto.pago_descripcion)
    console.log('  - Fecha:', concepto.pago_fecha)
    console.log('  - Estatus:', concepto.pago_estatus)
    console.log('  - isPaidTodayLocked resultado:', isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion))
    
    setSelectedConcepto(concepto)
    setShowModifyModal(true)
    
    // Cargar servicios disponibles
    try {
      const result = await getConceptosDesayunos()
      if (result.success && result.data) {
        // Filtrar el servicio actual para no mostrarlo como opción
        const filtered = result.data.filter(service => 
          service.desayuno_nombre !== concepto.pago_descripcion
        )
        setAvailableServices(filtered)
        setFilteredServices(filtered)
        console.log('  - Servicios disponibles cargados:', filtered.length)
      }
    } catch (error) {
      console.error('Error cargando servicios disponibles:', error)
    }
  }

  const handleServiceModification = async () => {
    if (!selectedConcepto || !selectedNewService || !user) return

    console.log('🔍 DEBUG handleServiceModification:')
    console.log('  - Servicio actual:', selectedConcepto.pago_descripcion)
    console.log('  - Nuevo servicio:', selectedNewService.desayuno_nombre)
    console.log('  - Costo actual:', selectedConcepto.pago_costo)
    console.log('  - Costo nuevo:', selectedNewService.costo)
    console.log('  - Diferencia:', selectedNewService.costo - selectedConcepto.pago_costo)

    setIsModifying(true)
    try {
      // Llamar a la función de actualización del servicio
      const result = await updateConceptoService(
        selectedConcepto.id!,
        selectedNewService.id,
        selectedNewService.desayuno_nombre,
        selectedNewService.costo,
        user.alumno_ref
      )

      console.log('  - Resultado de updateConceptoService:', result)

      if (result.success) {
        setShowModifyModal(false)
        setSelectedNewService(null)
        setSearchTerm('')
        
        // Recargar los datos
        await loadConceptosPagados()
        
        // Mostrar mensaje de éxito con detalles de la transacción
        let message = 'Servicio modificado exitosamente'
        if (result.montoAbonado && result.montoAbonado > 0) {
          message += `. Se abonó $${result.montoAbonado.toFixed(2)} MXN a tu saldo.`
        } else if (result.montoCobrado && result.montoCobrado > 0) {
          message += `. Se descontó $${result.montoCobrado.toFixed(2)} MXN de tu saldo.`
        }
        
        setSuccessMessage(message)
        setShowSuccessModal(true)
      } else {
        console.log('  - ❌ Error en la modificación:', result.error)
        setRestrictionMessage(result.error || 'Error al modificar el servicio')
        setShowRestrictionModal(true)
      }
    } catch (error) {
      console.error('Error modificando servicio:', error)
      setRestrictionMessage('Error inesperado al modificar el servicio')
      setShowRestrictionModal(true)
    } finally {
      setIsModifying(false)
    }
  }

  // Filtrar servicios basado en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredServices(availableServices)
    } else {
      const filtered = availableServices.filter(service =>
        service.desayuno_nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredServices(filtered)
    }
  }, [searchTerm, availableServices])

  const openHistorialModal = async () => {
    if (!user) return
    
    try {
      // Obtener TODAS las órdenes pagadas (estatus 1) del usuario usando la función específica
      const result = await getHistorialCompleto(user.alumno_ref)
      if (result.success && result.data) {
        // Agrupar por número de orden
        const groupedOrders: {[key: string]: PagoDesayuno[]} = {}
        result.data.forEach(item => {
          if (item.pago_orden) {
            if (!groupedOrders[item.pago_orden]) {
              groupedOrders[item.pago_orden] = []
            }
            groupedOrders[item.pago_orden].push(item)
          }
        })
        
        setHistorialData(groupedOrders)
        setShowHistorialModal(true)
      }
    } catch (error) {
      console.error('Error cargando historial:', error)
      alert('Error al cargar el historial')
    }
  }

  const openOrderDetailModal = (orderNumber: string) => {
    setSelectedOrderForDetail(orderNumber)
    setShowOrderDetailModal(true)
  }

  const handleCancelacion = async () => {
    if (!selectedConcepto || !selectedConcepto.id) return

    // Validar si se puede cancelar antes de proceder
    if (!canModifyTodayService(selectedConcepto.pago_fecha, selectedConcepto.pago_estatus, selectedConcepto.pago_descripcion)) {
      const message = selectedConcepto.pago_estatus === 1 
        ? "No se pueden realizar cambios o cancelaciones para servicios pagados del día actual después de las 9:00 AM, ya que el pedido pasó a entrega."
        : "No se pueden realizar cambios o cancelaciones después de las 9:00 AM para servicios del día actual."
      setRestrictionMessage(message)
      setShowRestrictionModal(true)
      setShowCancelModal(false)
      return
    }

    if (!user) {
      alert('Error: Usuario no autenticado')
      return
    }

    try {
      // Eliminar el registro de la base de datos
      const result = await deleteConceptoPagado(selectedConcepto.id, user.alumno_ref)
      
      if (result.success) {
        // Cerrar modal
        setShowCancelModal(false)
        setSelectedConcepto(null)
        
        // Recargar datos de la base de datos para sincronizar la vista
        await loadConceptosPagados()
        
        // Mostrar mensaje de éxito con monto abonado si aplica
        if (result.montoAbonado && result.montoAbonado > 0) {
          setSuccessMessage(`Servicio cancelado exitosamente. Se abonó $${result.montoAbonado.toFixed(2)} MXN a tu saldo.`)
        } else {
          setSuccessMessage('Servicio cancelado exitosamente.')
        }
        setShowSuccessModal(true)
        
        console.log('Servicio cancelado exitosamente:', selectedConcepto.pago_descripcion)
      } else {
        // Mostrar error si falla la eliminación
        console.error('Error al cancelar servicio:', result.error)
        setRestrictionMessage(`Error al cancelar el servicio: ${result.error}`)
        setShowRestrictionModal(true)
      }
    } catch (error) {
      console.error('Error cancelando concepto:', error)
      alert('Error inesperado al cancelar el servicio')
    }
  }

  // Función para cancelar toda la orden
  const handleCancelarOrden = async () => {
    if (conceptosPagados.length === 0) return

    // Verificar si se puede cancelar la orden completa
    // Solo se bloquea si TODOS los servicios están pagados (estatus 1) del día actual después de las 9 AM
    const canCancelOrder = conceptosPagados.some(concepto => 
      concepto.pago_estatus === 2 || // Si hay algún servicio no pagado, se puede cancelar
      !isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) // O si no está bloqueado por horario
    )

    if (!canCancelOrder) {
      setRestrictionMessage("No se puede cancelar la orden completa: todos los servicios están pagados del día actual después de las 9:00 AM.")
      setShowRestrictionModal(true)
      return
    }

    // Mostrar modal de confirmación
    setShowCancelOrderModal(true)
  }

  // Función para ejecutar la cancelación de la orden
  const executeCancelOrder = async () => {
    if (!user) {
      alert('Error: Usuario no autenticado')
      return
    }

    try {
      // Cancelar todos los servicios de la orden
      const cancelPromises = conceptosPagados.map(concepto => 
        deleteConceptoPagado(concepto.id!, user.alumno_ref)
      )
      
      const results = await Promise.all(cancelPromises)
      const allSuccessful = results.every(result => result.success)
      
      if (allSuccessful) {
        // Calcular total abonado
        const totalAbonado = results.reduce((total, result) => {
          return total + (result.montoAbonado || 0)
        }, 0)
        
        // Cerrar modal
        setShowCancelOrderModal(false)
        
        // Recargar datos de la base de datos para sincronizar la vista
        await loadConceptosPagados()
        
        // Mostrar mensaje de éxito con total abonado si aplica
        if (totalAbonado > 0) {
          setSuccessMessage(`Orden cancelada exitosamente. Se abonó $${totalAbonado.toFixed(2)} MXN a tu saldo.`)
        } else {
          setSuccessMessage('Orden cancelada exitosamente.')
        }
        setShowSuccessModal(true)
      } else {
        setRestrictionMessage('Error al cancelar algunos servicios. Intente nuevamente.')
        setShowRestrictionModal(true)
      }
    } catch (error) {
      console.error('Error cancelando orden:', error)
      setRestrictionMessage('Error inesperado al cancelar la orden')
      setShowRestrictionModal(true)
    }
  }

  const updateFecha = async (nuevaFecha: string) => {
    if (!selectedConcepto) return

    console.log('🔍 DEBUG updateFecha:')
    console.log('  - nuevaFecha:', nuevaFecha)
    console.log('  - selectedConcepto.pago_estatus:', selectedConcepto.pago_estatus)

    // Validar si se puede modificar antes de proceder
    const canModify = canModifyTodayService(nuevaFecha, selectedConcepto.pago_estatus, selectedConcepto.pago_descripcion)
    console.log('  - canModifyTodayService resultado:', canModify)
    
    if (!canModify) {
      const message = selectedConcepto.pago_estatus === 1 
        ? "No se puede cambiar la fecha de servicios pagados del día actual después de las 9:00 AM, ya que el pedido pasó a entrega."
        : "No se pueden realizar cambios después de las 9:00 AM para servicios del día actual."
      console.log('  - ❌ Bloqueado, mostrando modal con mensaje:', message)
      setRestrictionMessage(message)
      setShowRestrictionModal(true)
      return
    }

    console.log('  - ✅ Validación pasada, procediendo con actualización...')

    setIsUpdating(true)
    try {
      const result = await updateConceptoFecha(selectedConcepto.id!, nuevaFecha, selectedConcepto.pago_descripcion)
      if (result.success) {
        // Actualizar el estado local
        setConceptosPagados(prev =>
          prev.map(concepto =>
            concepto.id === selectedConcepto.id
              ? { ...concepto, pago_fecha: nuevaFecha }
              : concepto
          )
        )
        
        // También actualizar groupedOrders para mantener la vista sincronizada
        setGroupedOrders(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(orderNumber => {
            updated[orderNumber] = updated[orderNumber].map(concepto =>
              concepto.id === selectedConcepto.id
                ? { ...concepto, pago_fecha: nuevaFecha }
                : concepto
            )
          })
          return updated
        })
        
        setShowDateModal(false)
        setSelectedConcepto(null)
      } else {
        // Mostrar el error de restricción de horario en un modal personalizado
        setRestrictionMessage(result.error || 'Error al actualizar la fecha')
        setShowRestrictionModal(true)
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

  // Helper: formatear fecha local YYYY-MM-DD sin offset de zona horaria
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Función auxiliar para verificar si es un concepto con restricción de tiempo
  const isTimeRestrictedConcept = (descripcion: string) => {
    const lower = descripcion.toLowerCase()
    return lower.includes('desayuno ch') || lower.includes('desayuno gde') || lower.includes('comida')
  }

  // Función para verificar si se puede modificar un servicio de hoy
  const canModifyTodayService = (fecha: string | null, estatus?: number, descripcion?: string) => {
    if (!fecha || !descripcion) return true
    
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    if (fecha === todayString) {
      const currentHour = today.getHours()
      const currentMinute = today.getMinutes()
      
      // Restricción 9:00 AM para Desayuno CH/GDE
      if ((descripcion.toLowerCase().includes('desayuno ch') || descripcion.toLowerCase().includes('desayuno gde')) && 
          (currentHour > 9 || (currentHour === 9 && currentMinute > 0))) {
        return false
      }
      
      // Restricción 12:00 PM para Comida
      if (descripcion.toLowerCase().includes('comida') && 
          (currentHour > 12 || (currentHour === 12 && currentMinute > 0))) {
        return false
      }
    }
    
    return true
  }

  // Función para verificar si un servicio pagado de hoy está bloqueado
  const isPaidTodayLocked = (fecha: string | null, estatus: number, descripcion: string) => {
    if (!fecha || estatus !== 1) return false
    
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    // Solo aplicar restricciones horarias a servicios del día actual
    if (fecha === todayString) {
      const currentHour = today.getHours()
      const currentMinute = today.getMinutes()
      
      // Restricción 9:00 AM para Desayuno CH/GDE
      if ((descripcion.toLowerCase().includes('desayuno ch') || descripcion.toLowerCase().includes('desayuno gde')) && 
          (currentHour > 9 || (currentHour === 9 && currentMinute > 0))) {
        return true
      }
      
      // Restricción 12:00 PM para Comida
      if (descripcion.toLowerCase().includes('comida') && 
          (currentHour > 12 || (currentHour === 12 && currentMinute > 0))) {
        return true
      }
    }
    
    // Para servicios de días futuros, SIEMPRE permitir modificación
    // No hay restricciones de tiempo para fechas futuras
    return false
  }

  // Función para verificar si una fecha es anterior a hoy
  const isPastDate = (date: Date) => {
    const today = new Date()
    const dateToCheck = new Date(date)
    
    // Normalizar fechas para comparar solo año, mes y día
    today.setHours(0, 0, 0, 0)
    dateToCheck.setHours(0, 0, 0, 0)
    
    // Solo bloquear días estrictamente anteriores a hoy (no incluir hoy)
    return dateToCheck < today
  }



  // Generar días del calendario
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
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
    
    // Usar la función formatLocalDate para evitar problemas de zona horaria
    const dateString = formatLocalDate(date)
    
    // Verificar si se está intentando asignar la fecha de hoy después de las 9:00 AM
    const today = new Date()
    const todayString = formatLocalDate(today)
    
    // Comparar por cadenas YYYY-MM-DD en zona horaria local
    const isTodayLocal = dateString === todayString
    
    console.log('🔍 DEBUG handleDayClick:')
    console.log('  - dateString (seleccionado):', dateString)
    console.log('  - todayString (hoy):', todayString)
    console.log('  - isTodayLocal:', isTodayLocal)
    console.log('  - selectedConcepto?.pago_estatus:', selectedConcepto?.pago_estatus)
    console.log('  - showRestrictionModal (estado actual):', showRestrictionModal)
    console.log('  - restrictionMessage (mensaje actual):', restrictionMessage)
    
    if (isTodayLocal) {
      // Solo aplicar restricción de 9:00 para Desayuno CH/GDE
      if (!isTimeRestrictedConcept(selectedConcepto?.pago_descripcion || '')) {
        console.log('  - Concepto no es desayuno/comida: permitir asignación el mismo día')
      } else {
        const currentHour = today.getHours()
        const currentMinutes = today.getMinutes()
        
        console.log('  - Es hoy, verificando hora:', currentHour + ':' + currentMinutes)
        
        if ((selectedConcepto?.pago_descripcion?.toLowerCase().includes('desayuno ch') || 
             selectedConcepto?.pago_descripcion?.toLowerCase().includes('desayuno gde')) && 
            (currentHour > 9 || (currentHour === 9 && currentMinutes > 0))) {
          setShowTimeRestrictionModal(true)
          setTimeRestrictionMessage('No se puede asignar la fecha de hoy después de las 9:00 AM')
          return
        }
        
        // Restricción 12:00 PM para Comida
        if (selectedConcepto?.pago_descripcion?.toLowerCase().includes('comida') && 
            (currentHour > 12 || (currentHour === 12 && currentMinutes > 0))) {
          setShowTimeRestrictionModal(true)
          setTimeRestrictionMessage('No se puede asignar la fecha de hoy después de las 12:00 PM')
          return
        }
      }
    }
    
    console.log('  - ✅ Fecha permitida, procediendo...')
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">Asignar Fechas, Cancelaciones y Modificaciones</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <p className="text-xs sm:text-sm text-gray-600 font-bold">Alumno:</p>
              <p className="font-semibold text-gray-800 text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{user?.alumno_nombre_completo}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col gap-4 mb-6">
            {/* Primera fila: Botones, Estatus y Número de Orden */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Estatus y Número de Orden */}
              {conceptosPagados.length > 0 && (
                <div className="flex flex-col gap-3">
                  {/* Primera fila: Estatus y Número de Orden */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Estatus de la Orden */}
                    <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl text-base font-bold shadow-lg border-2 ${
                      conceptosPagados.every(item => item.pago_estatus === 1)
                        ? 'bg-gradient-to-r from-green-400 to-green-500 text-white border-green-600'
                        : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-600'
                    }`}>
                      {conceptosPagados.every(item => item.pago_estatus === 1) ? (
                        <>
                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                            <FaCreditCard className="text-white text-sm" />
                          </div>
                          <span>Estatus de la Orden: Pagada</span>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                            <FaClock className="text-white text-sm" />
                          </div>
                          <span>Estatus de la Orden: Pendiente de pago</span>
                        </>
                      )}
                    </div>
                    
                    {/* Número de Orden */}
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                      <span className="text-gray-600 text-sm font-medium">📋</span>
                      <span className="text-gray-700 text-sm font-semibold">
                        Orden: {conceptosPagados[0]?.pago_orden || 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Segunda fila: Desglose por estatus */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-2 border border-purple-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <FaCreditCard className="text-green-600 text-xs" />
                        <span className="text-xs font-medium text-gray-700">Pagados</span>
                      </div>
                      <div className="text-sm font-bold text-green-600">
                        ${conceptosPagados
                          .filter(item => item.pago_estatus === 1)
                          .reduce((sum, item) => sum + (item.pago_costo * item.pago_cantidad), 0)
                          .toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {conceptosPagados.filter(item => item.pago_estatus === 1).length} {conceptosPagados.filter(item => item.pago_estatus === 1).length === 1 ? 'servicio' : 'servicios'}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-2 border border-purple-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <FaClock className="text-orange-600 text-xs" />
                        <span className="text-xs font-medium text-gray-700">Pendientes</span>
                      </div>
                      <div className="text-sm font-bold text-orange-600">
                        ${conceptosPagados
                          .filter(item => item.pago_estatus === 2)
                          .reduce((sum, item) => sum + (item.pago_costo * item.pago_cantidad), 0)
                          .toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {conceptosPagados.filter(item => item.pago_estatus === 2).length} {conceptosPagados.filter(item => item.pago_estatus === 2).length === 1 ? 'servicio' : 'servicios'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botones de acción y contador */}
              <div className="flex items-center gap-3">
                {/* Botón Historial */}
                <button
                  onClick={() => openHistorialModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors shadow-lg"
                  title="Ver historial de órdenes pagadas"
                >
                  <FaCheckCircle className="text-sm" />
                  <span className="hidden sm:inline">Historial</span>
                  <span className="sm:hidden">Hist</span>
                </button>
                
                {/* Contador visual */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🍽️</span>
                    <span className="text-sm font-medium">Total:</span>
                    <span className="text-xl font-bold">{conceptosPagados.length}</span>
                    {conceptosPagados.some(item => item.pago_estatus === 3) && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full ml-2">
                        🚨 EMG
                      </span>
                    )}
                  </div>
                </div>
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
            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([orderNumber, orderItems]) => {
                const totalOrder = orderItems.reduce((sum, item) => sum + (item.pago_costo * item.pago_cantidad), 0)
                const isOrderPaid = orderItems.every(item => item.pago_estatus === 1)
                const isEmergencyOrder = orderItems.some(item => item.pago_estatus === 3)
                
                let orderStatus, orderStatusColor, orderStatusBg, orderStatusBorder
                
                if (isEmergencyOrder) {
                  orderStatus = 'Emergencia'
                  orderStatusColor = 'text-red-600'
                  orderStatusBg = 'bg-red-100'
                  orderStatusBorder = 'border-red-200'
                } else if (isOrderPaid) {
                  orderStatus = 'Pagada'
                  orderStatusColor = 'text-green-600'
                  orderStatusBg = 'bg-green-100'
                  orderStatusBorder = 'border-green-200'
                } else {
                  orderStatus = 'Reservada'
                  orderStatusColor = 'text-yellow-600'
                  orderStatusBg = 'bg-yellow-100'
                  orderStatusBorder = 'border-yellow-200'
                }
                
                return (
                  <div key={orderNumber} className={`border-2 ${orderStatusBorder} rounded-xl overflow-hidden`}>
                    {/* Header de la Orden */}
                    <div className={`${orderStatusBg} p-4 border-b ${orderStatusBorder}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {isEmergencyOrder ? '🚨' : '📋'}
                            </span>
                            <div>
                              <h3 className="font-bold text-gray-800">
                                Orden: {orderNumber}
                                {isEmergencyOrder && (
                                  <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                                    EMERGENCIA
                                  </span>
                                )}
                              </h3>
                              <p className={`text-sm font-medium ${orderStatusColor}`}>
                                Estatus: {orderStatus}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-800">${totalOrder.toFixed(2)}</div>
                            <div className="text-sm text-gray-600">{orderItems.length} servicios</div>
                          </div>
                          
                          {/* Botón Cancelar Orden Completa */}
                          <button
                            onClick={() => openCancelOrderModal(orderItems, orderNumber)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-lg ${
                              orderItems.some(item => isPaidTodayLocked(item.pago_fecha, item.pago_estatus, item.pago_descripcion)) || isEmergencyOrder
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                            title={
                              isEmergencyOrder
                                ? 'No se puede cancelar: las órdenes de emergencia no se pueden cancelar'
                                : orderItems.some(item => isPaidTodayLocked(item.pago_fecha, item.pago_estatus, item.pago_descripcion))
                                  ? 'No se puede cancelar: algunos servicios están bloqueados por horario'
                                  : 'Cancelar toda la orden'
                            }
                            disabled={orderItems.some(item => isPaidTodayLocked(item.pago_fecha, item.pago_estatus, item.pago_descripcion)) || isEmergencyOrder}
                          >
                            <FaTrash className="text-sm" />
                            <span className="hidden sm:inline">Cancelar Orden</span>
                            <span className="sm:hidden">Cancelar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Servicios de la Orden */}
                    <div className="bg-white">
                      {/* Mensaje de emergencia si aplica */}
                      {isEmergencyOrder && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                          <div className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-red-500 text-lg mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-red-800 mb-1">🚨 Orden de Emergencia</h4>
                              <p className="text-red-700 text-sm">
                                Esta orden fue procesada como servicio de emergencia. Los servicios pueden ser entregados sin pago inmediato.
                                El total debe pagarse en caja: <strong>${totalOrder.toFixed(2)} MXN</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                                            {orderItems.map((concepto, index) => (
                        <div
                          key={concepto.id}
                          className={`flex items-center justify-between p-4 border-b border-gray-100 transition-all duration-200 hover:bg-gray-50 ${
                            index === orderItems.length - 1 ? 'border-b-0' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                              <span className="text-2xl">{getProductEmoji(concepto.pago_descripcion)}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-800">
                                  {concepto.pago_descripcion}
                                  {concepto.pago_estatus === 3 && (
                                    <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                                      EMERGENCIA
                                    </span>
                                  )}
                                </h3>
                              </div>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span>Cantidad: {concepto.pago_cantidad}</span>
                                <span>Precio: ${concepto.pago_costo.toFixed(2)}</span>
                                <span>Total: ${(concepto.pago_costo * concepto.pago_cantidad).toFixed(2)}</span>
                              </div>
                              <p className={`font-medium text-sm ${
                                concepto.pago_estatus === 1 ? 'text-green-600' : 'text-yellow-600'
                              }`}>
                                {concepto.pago_fecha ? (
                                  `Fecha programada: ${concepto.pago_fecha}`
                                ) : (
                                  <span className="text-red-600 font-semibold">⚠️ Sin fecha asignada</span>
                                )}
                              </p>
                              {isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-red-700 text-xs">
                                    <FaExclamationTriangle className="text-red-500" />
                                    <span className="font-medium">
                                      No se puede modificar: servicio pagado del día de hoy después de las 9:00 AM.
                                    </span>
                                  </div>
                                </div>
                              )}
                              {concepto.pago_estatus === 3 && (
                                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-orange-700 text-xs">
                                    <FaExclamationTriangle className="text-orange-500" />
                                    <span className="font-medium">
                                      Servicio de emergencia: no se puede modificar, cancelar o cambiar fecha.
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
                                isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) || concepto.pago_estatus === 3
                                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                  : 'bg-purple-500 text-white hover:bg-purple-600'
                              }`}
                              title={
                                concepto.pago_estatus === 3
                                  ? 'No disponible: servicios de emergencia no se pueden modificar'
                                  : isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion)
                                    ? 'No disponible: servicio pagado del día de hoy después de las 9:00 AM'
                                    : 'Cambiar fecha del servicio'
                              }
                              disabled={isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) || concepto.pago_estatus === 3}
                            >
                              <FaCalendarAlt className="text-sm" />
                              <span className="hidden sm:inline">Cambiar Fecha</span>
                              <span className="sm:hidden">Fecha</span>
                            </button>
                            
                            {/* Botón Modificar Servicio */}
                            <button
                              onClick={() => openModifyModal(concepto)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                                isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) || concepto.pago_estatus === 3
                                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                              title={
                                concepto.pago_estatus === 3
                                  ? 'No disponible: servicios de emergencia no se pueden modificar'
                                  : isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion)
                                    ? 'No disponible: servicio pagado del día de hoy después de las 9:00 AM'
                                    : 'Modificar servicio por otro'
                              }
                              disabled={isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) || concepto.pago_estatus === 3}
                            >
                              <FaEdit className="text-sm" />
                              <span className="hidden sm:inline">Modificar</span>
                              <span className="sm:hidden">Modificar</span>
                            </button>
                            
                            {/* Botón Cancelar Individual */}
                            <button
                              onClick={() => openCancelModal(concepto)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                                isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) || concepto.pago_estatus === 3
                                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}
                              title={
                                concepto.pago_estatus === 3
                                  ? 'No disponible: servicios de emergencia no se pueden cancelar'
                                  : isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion)
                                    ? 'No disponible: servicio pagado del día de hoy después de las 9:00 AM'
                                    : 'Cancelar servicio individual'
                              }
                              disabled={isPaidTodayLocked(concepto.pago_fecha, concepto.pago_estatus, concepto.pago_descripcion) || concepto.pago_estatus === 3}
                            >
                              <FaTimes className="text-sm" />
                              <span className="hidden sm:inline">Cancelar</span>
                              <span className="sm:hidden">Cancelar</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
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
                    const dateString = formatLocalDate(date)
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

      {/* Modal de Cancelación de Orden Completa */}
      {showCancelOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all">
            {/* Header del modal con advertencia */}
            <div className="relative p-6 border-b border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center shadow-lg">
                  <FaExclamationTriangle className="text-red-600 text-2xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-700">⚠️ ADVERTENCIA CRÍTICA</h2>
                  <p className="text-red-600 font-medium">Cancelación de Orden Completa</p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelOrderModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors"
              >
                <FaTimes className="text-red-600 text-sm" />
              </button>
            </div>

            {/* Contenido del modal con información detallada */}
            <div className="p-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-red-500 text-xl mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-800 font-bold text-lg mb-3">
                      ¿Estás completamente seguro de que deseas cancelar TODA la orden?
                    </p>
                    <p className="text-red-700 text-sm mb-4">
                      Esta acción eliminará permanentemente todos los servicios de la orden y <strong>NO SE PUEDE DESHACER</strong>.
                    </p>
                    
                    {/* Resumen de la orden */}
                    <div className="bg-white rounded-lg p-4 border border-red-100">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-purple-600">📋</span>
                        Resumen de la Orden a Cancelar
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total de servicios:</span>
                          <span className="font-semibold text-red-600">{conceptosPagados.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Valor total:</span>
                          <span className="font-semibold text-red-600">
                            ${conceptosPagados.reduce((sum, item) => sum + (item.pago_costo * item.pago_cantidad), 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Orden:</span>
                          <span className="font-semibold text-purple-600">
                            {conceptosPagados[0]?.pago_orden || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de servicios que se cancelarán */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-orange-600">🍽️</span>
                  Servicios que se eliminarán:
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {conceptosPagados.map((concepto) => (
                    <div key={concepto.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-lg">{getProductEmoji(concepto.pago_descripcion)}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">{concepto.pago_descripcion}</p>
                        <p className="text-xs text-gray-600">
                          {concepto.pago_fecha ? `Fecha: ${concepto.pago_fecha}` : 'Sin fecha asignada'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600 text-sm">
                          ${(concepto.pago_costo * concepto.pago_cantidad).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">x{concepto.pago_cantidad}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelOrderModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FaTimes className="text-sm" />
                  NO, Mantener Orden
                </button>
                <button
                  onClick={executeCancelOrder}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <FaTrash className="text-sm" />
                  SÍ, Cancelar TODA la Orden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-green-600 mb-4">¡Operación Exitosa!</h3>
              <p className="text-gray-800 text-sm mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Restricción de Tiempo */}
      {showRestrictionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-red-600 mb-4">Restricción de Tiempo</h3>
              <p className="text-gray-800 text-sm mb-6">{restrictionMessage}</p>
              <button
                onClick={() => setShowRestrictionModal(false)}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Restricción de Tiempo para Asignación de Fecha */}
      {showTimeRestrictionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 text-2xl">⏰</span>
              </div>
              <h3 className="text-lg font-bold text-orange-600 mb-4">Restricción de Tiempo</h3>
              <p className="text-gray-800 text-sm mb-6">{timeRestrictionMessage}</p>
              <button
                onClick={() => setShowTimeRestrictionModal(false)}
                className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Modificación de Servicio */}
      {showModifyModal && selectedConcepto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">✏️</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Modificar Servicio</h2>
                    <p className="text-gray-600 text-sm">Cambiar &quot;{selectedConcepto.pago_descripcion}&quot; por otro servicio</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModifyModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaTimes className="text-gray-600 text-sm" />
                </button>
              </div>

              {/* Información del servicio actual */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-2 text-lg">Servicio Actual:</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProductEmoji(selectedConcepto.pago_descripcion)}</span>
                    <div>
                      <p className="font-medium text-blue-800 text-lg">{selectedConcepto.pago_descripcion}</p>
                      <p className="text-blue-600">Precio: ${selectedConcepto.pago_costo.toFixed(2)} MXN</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600">Fecha: {selectedConcepto.pago_fecha || 'Sin fecha'}</p>
                    <p className="text-blue-600">Estatus: {selectedConcepto.pago_estatus === 1 ? 'Pagado' : 'Reservado'}</p>
                  </div>
                </div>
              </div>

              {/* Búsqueda de servicios */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar servicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-lg"
                  />
                  <FaSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                </div>
              </div>

              {/* Lista de servicios disponibles - Estilo de tarjetitas */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {filteredServices.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">No se encontraron servicios</p>
                  </div>
                ) : (
                  filteredServices.map((service) => {
                    const costDifference = service.costo - selectedConcepto.pago_costo
                    const isMoreExpensive = costDifference > 0
                    const isCheaper = costDifference < 0
                    
                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedNewService(service)}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                          selectedNewService?.id === service.id
                            ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <div className="text-center">
                          {/* Icono del servicio */}
                          <div className="text-4xl mb-3">
                            {getProductEmoji(service.desayuno_nombre)}
                          </div>
                          
                          {/* Nombre del servicio */}
                          <h4 className="font-bold text-gray-800 mb-3 text-sm leading-tight">
                            {service.desayuno_nombre}
                          </h4>
                          
                          {/* Precio */}
                          <p className="text-xl font-bold text-green-600 mb-3">
                            ${service.costo?.toFixed(2)} MXN
                          </p>
                          
                          {/* Diferencia de precio */}
                          {costDifference !== 0 && (
                            <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              isMoreExpensive 
                                ? 'bg-red-100 text-red-700 border border-red-200' 
                                : 'bg-green-100 text-green-700 border border-green-200'
                            }`}>
                              {isMoreExpensive ? '▲' : '▼'} ${Math.abs(costDifference).toFixed(2)} MXN
                            </div>
                          )}
                          
                          {/* Indicador de selección */}
                          {selectedNewService?.id === service.id && (
                            <div className="mt-3 text-blue-600 text-sm font-semibold bg-blue-100 px-2 py-1 rounded-full">
                              ✓ Seleccionado
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowModifyModal(false)}
                  className="px-6 py-3 text-gray-600 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleServiceModification}
                  disabled={!selectedNewService || isModifying}
                  className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
                    selectedNewService && !isModifying
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isModifying ? 'Modificando...' : 'Confirmar Modificación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial */}
      {showHistorialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <FaCheckCircle className="text-green-600 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Historial de Órdenes</h2>
                    <p className="text-gray-600 text-sm">Órdenes pagadas pasadas al día actual</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistorialModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaTimes className="text-gray-600 text-sm" />
                </button>
              </div>

              {/* Contenido del historial */}
              {Object.keys(historialData).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCheckCircle className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay historial disponible</h3>
                  <p className="text-gray-600">Aún no tienes órdenes pagadas en el historial.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(historialData).map(([orderNumber, items]) => {
                    const totalOrder = items.reduce((sum, item) => sum + (item.pago_costo * item.pago_cantidad), 0)
                    const orderDate = items[0]?.pago_fecha || 'Sin fecha'
                    
                    return (
                      <div key={orderNumber} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">Orden: {orderNumber}</h3>
                            <p className="text-gray-600 text-sm">Fecha: {orderDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">${totalOrder.toFixed(2)}</p>
                            <p className="text-gray-600 text-sm">{items.length} servicio(s)</p>
                          </div>
                        </div>
                        <button
                          onClick={() => openOrderDetailModal(orderNumber)}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm"
                        >
                          Ver Detalle de la Orden
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Orden */}
      {showOrderDetailModal && selectedOrderForDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[95] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📋</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Detalle de la Orden</h2>
                    <p className="text-gray-600 text-sm">{selectedOrderForDetail}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOrderDetailModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaTimes className="text-gray-600 text-sm" />
                </button>
              </div>

              {/* Lista de servicios */}
              <div className="space-y-3 mb-6">
                {historialData[selectedOrderForDetail]?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-lg">{getProductEmoji(item.pago_descripcion)}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{item.pago_descripcion}</h4>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Cantidad: {item.pago_cantidad}</span>
                        <span>Precio: ${item.pago_costo.toFixed(2)}</span>
                        <span>Fecha: {item.pago_fecha || 'Sin fecha'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">${(item.pago_costo * item.pago_cantidad).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total de la orden */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Total de la Orden:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${historialData[selectedOrderForDetail]?.reduce((sum, item) => sum + (item.pago_costo * item.pago_cantidad), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botón de cierre */}
              <div className="mt-6">
                <button
                  onClick={() => setShowOrderDetailModal(false)}
                  className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
