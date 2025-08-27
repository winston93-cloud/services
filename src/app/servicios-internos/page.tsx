'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaSearch, FaShoppingCart, FaArrowLeft, FaPlus, FaMinus, FaTrash, FaTimes, FaDownload, FaPrint, FaCalendarAlt } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { getConceptosDesayunos, PagoDesayuno, getAllPagosVigentes, processOrderWithSaldo } from '@/lib/supabase'
import jsPDF from 'jspdf'

interface ConceptoDesayuno {
  id: number
  desayuno_nombre: string
  desayuno_abreviatura: string
  costo: number
}

interface CartItem extends ConceptoDesayuno {
  quantity: number
  fecha_pedido?: string // Fecha específica para este item
}

export default function ServiciosInternosPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [productos, setProductos] = useState<ConceptoDesayuno[]>([])
  const [filteredProductos, setFilteredProductos] = useState<ConceptoDesayuno[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoadingProductos, setIsLoadingProductos] = useState(true)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [orderData, setOrderData] = useState<{
    orderNumber: string
    items: CartItem[]
    total: number
    date: string
    wasPaidWithSaldo?: boolean
    saldoUsed?: number
    remainingSaldo?: number
  } | null>(null)
  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarItem, setCalendarItem] = useState<CartItem | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showRestrictionModal, setShowRestrictionModal] = useState(false)
  const [restrictionMessage, setRestrictionMessage] = useState('')
  const [hasPendingOrder, setHasPendingOrder] = useState(false)
  const [isCheckingPendingOrder, setIsCheckingPendingOrder] = useState(true)
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string>('')

  // Helper: formatear fecha local YYYY-MM-DD sin offset de zona horaria
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper: mostrar fecha amigable a partir de YYYY-MM-DD
  const formatDateForDisplay = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const localDate = new Date(y, (m as number) - 1, d)
    return localDate.toLocaleDateString('es-ES')
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    loadProductos()
    checkPendingOrders()
  }, [])

  // Verificar órdenes pendientes cuando el usuario regrese a esta página
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        checkPendingOrders()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  useEffect(() => {
    // Filtrar productos basado en el término de búsqueda
    if (searchTerm.trim() === '') {
      setFilteredProductos([])
    } else {
      const filtered = productos.filter(producto =>
        producto.desayuno_nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProductos(filtered)
    }
  }, [searchTerm, productos])

  const checkPendingOrders = async () => {
    if (!user) return
    
    try {
      setIsCheckingPendingOrder(true)
      const result = await getAllPagosVigentes(user.alumno_ref)
      if (result.success && result.data) {
        // Verificar si hay alguna orden pendiente (estatus 2)
        const hasPending = result.data.some(item => item.pago_estatus === 2)
        setHasPendingOrder(hasPending)
        
        // Si hay orden pendiente, obtener el número de orden del primer servicio pendiente
        if (hasPending) {
          const pendingService = result.data.find(item => item.pago_estatus === 2)
          if (pendingService && pendingService.pago_orden) {
            setPendingOrderNumber(pendingService.pago_orden)
          }
        }
      }
    } catch (error) {
      console.error('Error verificando órdenes pendientes:', error)
    } finally {
      setIsCheckingPendingOrder(false)
    }
  }

  const loadProductos = async () => {
    try {
      setIsLoadingProductos(true)
      const result = await getConceptosDesayunos()
      if (result.success && result.data) {
        setProductos(result.data)
      }
    } catch (error) {
      console.error('Error cargando productos:', error)
    } finally {
      setIsLoadingProductos(false)
    }
  }

  const addToCart = (producto: ConceptoDesayuno) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === producto.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.id === producto.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prevCart, { ...producto, quantity: 1 }] // Sin fecha por defecto
      }
    })
    setSearchTerm('')
    setFilteredProductos([])
  }

  const openCalendar = (item: CartItem) => {
    setCalendarItem(item)
    const parseDateStringToLocal = (dateStr: string): Date => {
      const [y, m, d] = dateStr.split('-').map(Number)
      return new Date(y, (m as number) - 1, d)
    }
    const baseDate = item.fecha_pedido ? parseDateStringToLocal(item.fecha_pedido) : new Date()
    setCurrentMonth(baseDate)
    setShowCalendar(true)
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
    
    // Solo bloquear días anteriores a hoy, no el día actual
    return dateToCheck < today
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

  // Helper: identificar si el concepto tiene restricción de tiempo
  const isTimeRestrictedConcept = (nombre?: string | null) => {
    if (!nombre) return false
    const lower = nombre.toLowerCase()
    return lower.includes('desayuno ch') || lower.includes('desayuno gde') || lower.includes('comida')
  }

  // Manejar selección de día en el calendario
  const handleDayClick = (date: Date) => {
    if (isWeekend(date) || isPastDate(date)) return
    
    // Verificar restricción de hora para el día actual
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (isToday) {
      const currentHour = today.getHours()
      const currentMinute = today.getMinutes()
      
      // Solo aplicar restricciones de tiempo a conceptos específicos
      if (isTimeRestrictedConcept(calendarItem?.desayuno_nombre)) {
        // Restricción 9:00 AM para Desayuno CH/GDE
        if ((calendarItem?.desayuno_nombre?.toLowerCase().includes('desayuno ch') || 
             calendarItem?.desayuno_nombre?.toLowerCase().includes('desayuno gde')) && 
            (currentHour > 9 || (currentHour === 9 && currentMinute > 0))) {
          setRestrictionMessage('No se puede reservar para el día de hoy después de las 09:00 AM. Por favor selecciona otro día.')
          setShowRestrictionModal(true)
          return
        }
        
        // Restricción 12:00 PM para Comida
        if (calendarItem?.desayuno_nombre?.toLowerCase().includes('comida') && 
            (currentHour > 12 || (currentHour === 12 && currentMinute > 0))) {
          setRestrictionMessage('No se puede reservar para el día de hoy después de las 12:00 PM. Por favor selecciona otro día.')
          setShowRestrictionModal(true)
          return
        }
      }
    }
    
    const dateString = formatLocalDate(date)
    
    if (calendarItem) {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === calendarItem.id
            ? { ...item, fecha_pedido: dateString }
            : item
        )
      )
      
      console.log('🔄 Fecha actualizada en calendario:', {
        itemId: calendarItem.id,
        itemName: calendarItem.desayuno_nombre,
        fechaNueva: dateString
      })
      
      setShowCalendar(false)
      setCalendarItem(null)
    }
  }

  // Navegar meses
  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(newMonth.getMonth() + direction)
      return newMonth
    })
  }

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id)
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      )
    }
  }

  const removeFromCart = (id: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id))
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.costo * item.quantity), 0)
  }

  const handleProcessOrder = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío')
      return
    }

    if (!user) {
      alert('Error: Usuario no autenticado')
      return
    }

    // Verificar si ya tiene una orden pendiente de pago
    if (hasPendingOrder) {
      setRestrictionMessage('No puedes crear una nueva orden porque ya tienes una orden pendiente de pago. Debes completar el pago de tu orden actual antes de crear una nueva.')
      setShowRestrictionModal(true)
      return
    }

    setIsProcessingOrder(true)
    
    try {
      // Preparar datos para guardar en la base de datos
      const itemsToSave: PagoDesayuno[] = cart.map(item => ({
        pago_ref: user.alumno_ref, // Número de control del alumno
        pago_descripcion: item.desayuno_nombre,
        pago_costo: item.costo,
        pago_fecha: item.fecha_pedido || null, // Usar fecha asignada o NULL si no hay fecha
        pago_cantidad: item.quantity,
        pago_orden: '', // Se asignará en la función processOrderWithSaldo
        pago_estatus: 2 // 2 = en proceso (tanto con fecha como sin fecha)
      }))

      console.log('📦 Datos que se van a guardar en la BD:', itemsToSave.map(item => ({
        descripcion: item.pago_descripcion,
        fecha: item.pago_fecha,
        cantidad: item.pago_cantidad
      })))
      
      // Log detallado de cada item
      console.log('🔍 LOG DETALLADO - Items del carrito antes de guardar:')
      cart.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          id: item.id,
          nombre: item.desayuno_nombre,
          fecha_pedido: item.fecha_pedido,
          cantidad: item.quantity
        })
      })
      
      console.log('🔍 LOG DETALLADO - Items que se van a guardar:')
      itemsToSave.forEach((item, index) => {
        console.log(`Item ${index + 1} a guardar:`, {
          descripcion: item.pago_descripcion,
          fecha: item.pago_fecha,
          cantidad: item.pago_cantidad
        })
      })

      // Procesar orden con pago automático de saldo
      const result = await processOrderWithSaldo(itemsToSave, user.alumno_ref)

      if (result.success && result.orderNumber) {
        // Preparar datos para el ticket
        const orderInfo = {
          orderNumber: result.orderNumber,
          items: cart,
          total: calculateTotal(),
          date: new Date().toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          wasPaidWithSaldo: result.wasPaidWithSaldo,
          saldoUsed: result.saldoUsed,
          remainingSaldo: result.remainingSaldo
        }

        setOrderData(orderInfo)
        setShowTicketModal(true)
        setCart([]) // Limpiar carrito después de procesar
        
        // Mostrar mensaje informativo sobre el pago
        if (result.wasPaidWithSaldo) {
          console.log(`✅ Orden pagada automáticamente con saldo. Saldo usado: $${result.saldoUsed}, Saldo restante: $${result.remainingSaldo}`)
        } else {
          console.log(`📋 Orden reservada. Saldo insuficiente para pago automático.`)
        }
      } else {
        alert(`Error al procesar la orden: ${result.error}`)
      }
    } catch (error) {
      console.error('Error procesando orden:', error)
      alert('Error inesperado al procesar la orden')
    } finally {
      setIsProcessingOrder(false)
    }
  }

  const generatePDF = () => {
    if (!orderData || !user) return

    const doc = new jsPDF()
    
    // Configuración inicial
    doc.setFontSize(20)
    doc.text('TICKET DE VENTA', 105, 20, { align: 'center' })
    
    // Información de la institución
    doc.setFontSize(14)
    doc.text('Instituto Winston Churchill', 105, 35, { align: 'center' })
    doc.text('Sistema Integral de Servicios', 105, 45, { align: 'center' })
    
    // Línea separadora
    doc.line(20, 55, 190, 55)
    
    // Información de la orden
    doc.setFontSize(12)
    doc.text(`Orden: ${orderData.orderNumber}`, 20, 70)
    doc.text(`Fecha: ${orderData.date}`, 20, 80)
    doc.text(`Alumno: ${user.alumno_nombre_completo}`, 20, 90)
    doc.text(`Num. Control: ${user.alumno_ref}`, 20, 100)
    
    // Línea separadora
    doc.line(20, 110, 190, 110)
    
    // Encabezados de la tabla
    doc.setFontSize(10)
    doc.text('CANT', 20, 120)
    doc.text('DESCRIPCIÓN', 50, 120)
    doc.text('PRECIO', 130, 120)
    doc.text('TOTAL', 165, 120)
    
    // Línea debajo de encabezados
    doc.line(20, 125, 190, 125)
    
    // Productos
    let yPosition = 135
    orderData.items.forEach((item) => {
      doc.text(item.quantity.toString(), 25, yPosition, { align: 'center' })
      doc.text(item.desayuno_nombre, 50, yPosition)
      doc.text(`$${item.costo.toFixed(2)}`, 135, yPosition, { align: 'right' })
      doc.text(`$${(item.costo * item.quantity).toFixed(2)}`, 180, yPosition, { align: 'right' })
      yPosition += 10
    })
    
    // Línea antes del total
    doc.line(20, yPosition + 5, 190, yPosition + 5)
    
    // Total
    doc.setFontSize(14)
    doc.text(`TOTAL: $${orderData.total.toFixed(2)}`, 180, yPosition + 20, { align: 'right' })
    
    // Línea final
    doc.line(20, yPosition + 30, 190, yPosition + 30)
    
    // Mensaje de pie
    doc.setFontSize(10)
    doc.text('¡Gracias por su compra!', 105, yPosition + 45, { align: 'center' })
    doc.text('Conserve este ticket como comprobante', 105, yPosition + 55, { align: 'center' })
    
    // Abrir PDF en nueva ventana
    const pdfOutput = doc.output('bloburl')
    window.open(pdfOutput, '_blank')
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
        {/* Base blanca */}
        <div className="absolute inset-0 bg-white"></div>
        {/* Diagonal 1: Blanco a Azul Marino (top-left to bottom-right) */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-200 via-blue-600 to-blue-900 opacity-90"></div>
        {/* Diagonal 2: Azul Marino a Blanco (bottom-left to top-right) */}
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
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Image
                    src="/leon.jpg"
                    alt="León Winston"
                    width={32}
                    height={32}
                    className="w-6 h-6 sm:w-8 sm:h-8 object-cover rounded-md"
                  />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">Servicios Internos</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <p className="text-xs sm:text-sm text-gray-600 font-bold">Alumno:</p>
              <p className="font-semibold text-gray-800 text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{user.alumno_nombre_completo}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Búsqueda y Productos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Barra de búsqueda */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos</h2>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setSearchTerm('')}
                  onClick={() => setSearchTerm('')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Indicador de verificación de órdenes pendientes */}
            {isCheckingPendingOrder && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-blue-700 text-sm">Verificando órdenes pendientes...</span>
                </div>
              </div>
            )}

            {/* Grid de productos */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {isLoadingProductos ? (
                  // Skeleton loading
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                      <div className="h-16 bg-gray-200 rounded mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))
                ) : searchTerm.trim() !== '' ? (
                  // Mostrar productos filtrados cuando hay búsqueda
                  filteredProductos.map((producto, index) => {
                    // Función para obtener emoji según el nombre del producto
                    const getProductEmoji = (nombre: string) => {
                      const nombreLower = nombre.toLowerCase()
                      if (nombreLower.includes('comida')) return '🍽️'
                      if (nombreLower.includes('desayuno ch')) return '🥞'
                      if (nombreLower.includes('desayuno gde')) return '🍳'
                      if (nombreLower.includes('est. mes')) return '🏫'
                      if (nombreLower.includes('estancia')) return '👨‍🎓'
                      if (nombreLower.includes('media')) return '⏰'
                      if (nombreLower.includes('tareas')) return '📚'
                      if (nombreLower.includes('bebida')) return '🥤'
                      if (nombreLower.includes('almuerzo')) return '🍛'
                      if (nombreLower.includes('sandwich')) return '🥪'
                      if (nombreLower.includes('cafe')) return '☕'
                      if (nombreLower.includes('agua')) return '💧'
                      return '🍽️' // emoji por defecto
                    }

                    // Función para obtener colores según el índice
                    const getCardColors = (index: number) => {
                      const colorSchemes = [
                        'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300',
                        'bg-gradient-to-br from-green-100 to-green-200 border-green-300',
                        'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300',
                        'bg-gradient-to-br from-pink-100 to-pink-200 border-pink-300',
                        'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300',
                        'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300',
                        'bg-gradient-to-br from-red-100 to-red-200 border-red-300',
                        'bg-gradient-to-br from-indigo-100 to-indigo-200 border-indigo-300',
                        'bg-gradient-to-br from-teal-100 to-teal-200 border-teal-300',
                        'bg-gradient-to-br from-cyan-100 to-cyan-200 border-cyan-300'
                      ]
                      return colorSchemes[index % colorSchemes.length]
                    }

                    const cardIndex = index

                    return (
                      <div
                        key={producto.id}
                        className={`${getCardColors(cardIndex)} rounded-lg p-4 cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all duration-200 relative`}
                      >
                        <div className="text-center">
                          <div className={`w-12 h-12 ${getCardColors(cardIndex).includes('blue') ? 'bg-blue-300' : 
                                                       getCardColors(cardIndex).includes('green') ? 'bg-green-300' :
                                                       getCardColors(cardIndex).includes('purple') ? 'bg-purple-300' :
                                                       getCardColors(cardIndex).includes('pink') ? 'bg-pink-300' :
                                                       getCardColors(cardIndex).includes('yellow') ? 'bg-yellow-300' :
                                                       getCardColors(cardIndex).includes('orange') ? 'bg-orange-300' :
                                                       getCardColors(cardIndex).includes('red') ? 'bg-red-300' :
                                                       getCardColors(cardIndex).includes('indigo') ? 'bg-indigo-300' :
                                                       getCardColors(cardIndex).includes('teal') ? 'bg-teal-300' :
                                                       'bg-cyan-300'} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                            <span className="text-2xl">{getProductEmoji(producto.desayuno_nombre)}</span>
                          </div>
                          <h3 className="font-medium text-gray-800 text-sm mb-1">
                            {producto.desayuno_nombre}
                          </h3>
                          <p className="text-lg font-bold text-green-600 mb-2">
                            ${producto.costo.toFixed(2)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(producto)
                            }}
                            className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transform hover:scale-110 transition-all duration-200 mx-auto"
                          >
                            <FaPlus className="text-sm" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  // Mostrar productos por defecto cuando no hay búsqueda
                  productos.slice(0, 8).map((producto, index) => {
                    // Función para obtener emoji según el nombre del producto
                    const getProductEmoji = (nombre: string) => {
                      const nombreLower = nombre.toLowerCase()
                      if (nombreLower.includes('comida')) return '🍽️'
                      if (nombreLower.includes('desayuno ch')) return '🥞'
                      if (nombreLower.includes('desayuno gde')) return '🍳'
                      if (nombreLower.includes('est. mes')) return '🏫'
                      if (nombreLower.includes('estancia')) return '👨‍🎓'
                      if (nombreLower.includes('media')) return '⏰'
                      if (nombreLower.includes('tareas')) return '📚'
                      if (nombreLower.includes('bebida')) return '🥤'
                      if (nombreLower.includes('almuerzo')) return '🍛'
                      if (nombreLower.includes('sandwich')) return '🥪'
                      if (nombreLower.includes('cafe')) return '☕'
                      if (nombreLower.includes('agua')) return '💧'
                      return '🍽️' // emoji por defecto
                    }

                    // Función para obtener colores según el índice
                    const getCardColors = (index: number) => {
                      const colorSchemes = [
                        'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300',
                        'bg-gradient-to-br from-green-100 to-green-200 border-green-300',
                        'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300',
                        'bg-gradient-to-br from-pink-100 to-pink-200 border-pink-300',
                        'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300',
                        'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300',
                        'bg-gradient-to-br from-red-100 to-red-200 border-red-300',
                        'bg-gradient-to-br from-indigo-100 to-indigo-200 border-indigo-300',
                        'bg-gradient-to-br from-teal-100 to-teal-200 border-teal-300',
                        'bg-gradient-to-br from-cyan-100 to-cyan-200 border-cyan-300'
                      ]
                      return colorSchemes[index % colorSchemes.length]
                    }

                    return (
                      <div
                        key={producto.id}
                        className={`${getCardColors(index)} rounded-lg p-4 cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all duration-200 relative`}
                      >
                        <div className="text-center">
                          <div className={`w-12 h-12 ${getCardColors(index).includes('blue') ? 'bg-blue-300' : 
                                                       getCardColors(index).includes('green') ? 'bg-green-300' :
                                                       getCardColors(index).includes('purple') ? 'bg-purple-300' :
                                                       getCardColors(index).includes('pink') ? 'bg-pink-300' :
                                                       getCardColors(index).includes('yellow') ? 'bg-yellow-300' :
                                                       getCardColors(index).includes('orange') ? 'bg-orange-300' :
                                                       getCardColors(index).includes('red') ? 'bg-red-300' :
                                                       getCardColors(index).includes('indigo') ? 'bg-indigo-300' :
                                                       getCardColors(index).includes('teal') ? 'bg-teal-300' :
                                                       'bg-cyan-300'} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                            <span className="text-2xl">{getProductEmoji(producto.desayuno_nombre)}</span>
                          </div>
                          <h3 className="font-medium text-gray-800 text-sm mb-1">
                            {producto.desayuno_nombre}
                          </h3>
                          <p className="text-lg font-bold text-green-600 mb-2">
                            ${producto.costo.toFixed(2)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(producto)
                            }}
                            className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transform hover:scale-110 transition-all duration-200 mx-auto"
                          >
                            <FaPlus className="text-sm" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Carrito */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <FaShoppingCart className="text-blue-500 text-xl" />
                <h2 className="text-xl font-bold text-gray-800">Carrito</h2>
              </div>

              {/* Advertencia de orden pendiente */}
              {hasPendingOrder && (
                <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-lg">⚠️</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-orange-800 text-sm">Orden Pendiente de Pago</h3>
                      <p className="text-orange-700 text-xs">
                        Ya tienes una orden pendiente de pago. Debes completar el pago antes de crear una nueva orden.
                      </p>
                      {pendingOrderNumber && (
                        <p className="text-orange-600 text-xs font-medium mt-1">
                          Número de Orden: {pendingOrderNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/asignar-fechas')}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm"
                  >
                    Checar el Estatus de la Orden
                  </button>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaShoppingCart className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500">Tu carrito está vacío</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{item.desayuno_nombre}</h3>
                            <p className="text-gray-600">${item.costo.toFixed(2)}</p>
                            {/* Indicador de fecha */}
                            <div className="mt-3">
                              {item.fecha_pedido ? (
                                <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                  <FaCalendarAlt className="text-green-600" />
                                  <span className="text-green-700 font-medium">
                                    Fecha: {formatDateForDisplay(item.fecha_pedido)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                  <FaCalendarAlt className="text-red-600" />
                                  <span className="text-red-700 font-medium font-semibold">
                                    ⚠️ Sin fecha asignada
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-800">${(item.costo * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg flex items-center justify-center hover:from-red-600 hover:to-red-700 transform hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Reducir cantidad"
                          >
                            <FaMinus className="text-sm" />
                          </button>
                          <span className="w-10 text-center font-bold text-gray-800 text-lg bg-white px-2 py-1 rounded border">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg flex items-center justify-center hover:from-green-600 hover:to-green-700 transform hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Aumentar cantidad"
                          >
                            <FaPlus className="text-sm" />
                          </button>
                          <button
                            onClick={() => openCalendar(item)}
                            className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg flex items-center justify-center hover:from-purple-600 hover:to-purple-700 transform hover:scale-110 transition-all duration-200 ml-2 shadow-md hover:shadow-lg"
                            title="Asignar fecha al servicio"
                          >
                            <FaCalendarAlt className="text-sm" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg flex items-center justify-center hover:from-red-600 hover:to-red-700 transform hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Eliminar del carrito"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xl font-bold text-gray-800">Total:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={handleProcessOrder}
                        disabled={isProcessingOrder || hasPendingOrder}
                        className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-lg ${
                          hasPendingOrder
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transform hover:scale-105'
                        } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                      >
                        {isProcessingOrder ? (
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Procesando...</span>
                          </div>
                        ) : hasPendingOrder ? (
                          'Orden Pendiente de Pago'
                        ) : (
                          'Procesar Orden'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal del Ticket */}
      {showTicketModal && orderData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Ticket de Venta</h2>
              <button
                onClick={() => setShowTicketModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>

            {/* Contenido del Ticket */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image
                    src="/leon.jpg"
                    alt="León Winston"
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded-full"
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Instituto Winston Churchill</h3>
                <p className="text-gray-600 text-sm">Sistema Integral de Servicios</p>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Orden:</p>
                    <p className="font-semibold text-gray-800">{orderData.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha:</p>
                    <p className="font-semibold text-gray-800">{orderData.date}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Alumno:</p>
                    <p className="font-semibold text-gray-800">{user.alumno_nombre_completo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Num. Control:</p>
                    <p className="font-semibold text-gray-800">{user.alumno_ref}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">Productos:</h4>
                <div className="space-y-2">
                  {orderData.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.desayuno_nombre}</p>
                        <p className="text-gray-600">{item.quantity} x ${item.costo.toFixed(2)}</p>
                      </div>
                      <p className="font-bold text-gray-800">${(item.costo * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Total:</span>
                  <span className="text-2xl font-bold text-green-600">${orderData.total.toFixed(2)}</span>
                </div>
                
                {/* Información del Pago Automático con Saldo */}
                {orderData.wasPaidWithSaldo && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600">✅</span>
                      <span className="text-green-800 font-semibold text-sm">PAGADO AUTOMÁTICAMENTE</span>
                    </div>
                    <div className="text-xs text-green-700 space-y-1">
                      <p>Saldo usado: <span className="font-semibold">${orderData.saldoUsed?.toFixed(2)}</span></p>
                      <p>Saldo restante: <span className="font-semibold">${orderData.remainingSaldo?.toFixed(2)}</span></p>
                    </div>
                  </div>
                )}
                
                {!orderData.wasPaidWithSaldo && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600">📋</span>
                      <span className="text-yellow-800 font-semibold text-sm">ORDEN RESERVADA</span>
                    </div>
                    <div className="text-xs text-yellow-700">
                      <p>Saldo insuficiente para pago automático</p>
                      <p>Favor de pagar en caja para activar la orden</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    generatePDF()
                    setShowTicketModal(false)
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  <FaPrint />
                  <span>Imprimir</span>
                </button>
              </div>

              <div className="text-center mt-4">
                {!orderData.wasPaidWithSaldo ? (
                  <>
                    <p className="text-red-600 font-semibold text-sm">Favor de pagar en caja en las Instalaciones del Colegio</p>
                    <p className="text-gray-500 text-xs">Conserve este ticket como comprobante</p>
                  </>
                ) : (
                  <>
                    <p className="text-green-600 font-semibold text-sm">✅ Orden pagada exitosamente con saldo</p>
                    <p className="text-gray-500 text-xs">Conserve este ticket como comprobante de pago</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendario Moderno y Elegante */}
      {showCalendar && calendarItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100">
            {/* Header con gradiente y efectos */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 via-blue-600/90 to-indigo-600/90"></div>
              <div className="relative flex items-center justify-between p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                    <FaCalendarAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Seleccionar Fecha</h2>
                    <p className="text-purple-100 font-medium">{calendarItem.desayuno_nombre}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCalendar(false)
                    setCalendarItem(null)
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-200 border border-white/30 hover:scale-110 shadow-lg"
                >
                  <FaTimes className="text-white text-lg" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Navegación de meses mejorada */}
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="group w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="text-xl text-gray-600 group-hover:text-gray-800 transition-colors">‹</span>
                </button>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-800 capitalize mb-1">
                    {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto"></div>
                </div>
                <button
                  onClick={() => navigateMonth(1)}
                  className="group w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="text-xl text-gray-600 group-hover:text-gray-800 transition-colors">›</span>
                </button>
              </div>

              {/* Días de la semana con estilo */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                  <div key={index} className="text-center py-3">
                    <span className="text-sm font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                      {day}
                    </span>
                  </div>
                ))}
              </div>

              {/* Días del calendario con diseño moderno */}
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                  const isToday = date.toDateString() === new Date().toDateString()
                  const dateString = formatLocalDate(date)
                  const isSelected = calendarItem.fecha_pedido === dateString
                  const isPast = isPastDate(date)
                  const isWeekendDay = isWeekend(date)
                  const isDisabled = isPast || isWeekendDay

                  return (
                    <button
                      key={index}
                      onClick={() => handleDayClick(date)}
                      disabled={isDisabled}
                      className={`
                        relative h-12 w-full text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105
                        ${!isCurrentMonth 
                          ? 'text-gray-300 cursor-not-allowed opacity-40' 
                          : isDisabled
                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-50'
                            : isSelected
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50 scale-110'
                              : isToday
                                ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg shadow-blue-500/50 font-bold'
                                : 'text-gray-700 bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-600 border border-gray-200 hover:border-purple-300'
                        }
                      `}
                    >
                      {date.getDate()}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Leyenda mejorada */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">Leyenda del Calendario</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-sm"></div>
                    <span className="text-sm font-medium text-purple-700">Fecha seleccionada</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full shadow-sm"></div>
                    <span className="text-sm font-medium text-blue-700">Hoy</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="w-4 h-4 bg-gray-300 rounded-full shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-600">Días no disponibles (pasados, fines de semana)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Modal de Restricción de Fecha */}
      {showRestrictionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-red-600 mb-4">Restricción de Fecha</h3>
              <p className="text-gray-800 text-sm mb-4">{restrictionMessage}</p>
              <button
                onClick={() => setShowRestrictionModal(false)}
                className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
