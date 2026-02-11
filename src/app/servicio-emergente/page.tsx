'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaShoppingCart, FaArrowLeft, FaPlus, FaTrash, FaTimes, FaPrint, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { getConceptosDesayunos, processEmergencyOrder, checkExistingEmergencyOrder } from '@/lib/supabase'
import jsPDF from 'jspdf'

interface ConceptoDesayuno {
  id: number
  desayuno_nombre: string
  desayuno_abreviatura: string
  costo: number
}

interface CartItem extends ConceptoDesayuno {
  cartItemId: string
  fecha_pedido?: string
}

export default function ServicioEmergentePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [orderData, setOrderData] = useState<{
    orderNumber: string
    items: CartItem[]
    total: number
    date: string
    deudaRestante?: number
    isPartialPayment?: boolean
  } | null>(null)
  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  const [hasExistingEmergencyOrder, setHasExistingEmergencyOrder] = useState(false)
  const [existingEmergencyOrderInfo, setExistingEmergencyOrderInfo] = useState<{
    orderNumber: string
    total: number
  } | null>(null)

  const [productos, setProductos] = useState<ConceptoDesayuno[]>([])
  const [isLoadingProductos, setIsLoadingProductos] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    loadProductos()
    checkExistingEmergencyOrderLocal()
  }, [])

  // Verificar órdenes de emergencia cuando el usuario regrese a esta página
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        checkExistingEmergencyOrderLocal()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  // Verificar órdenes de emergencia cuando cambie el usuario
  useEffect(() => {
    if (user) {
      checkExistingEmergencyOrderLocal()
    }
  }, [user])

  const checkExistingEmergencyOrderLocal = async () => {
    if (!user) return
    
    try {
      const result = await checkExistingEmergencyOrder(user.alumno_ref)
      if (result.success) {
        setHasExistingEmergencyOrder(result.hasEmergencyOrder)
        if (result.hasEmergencyOrder && result.emergencyOrderNumber && result.emergencyOrderTotal) {
          setExistingEmergencyOrderInfo({
            orderNumber: result.emergencyOrderNumber,
            total: result.emergencyOrderTotal
          })
        }
      } else {
        console.error('Error verificando órdenes de emergencia:', result.error)
      }
    } catch (error) {
      console.error('Error verificando órdenes de emergencia:', error)
    }
  }

  const loadProductos = async () => {
    try {
      setIsLoadingProductos(true)
      const result = await getConceptosDesayunos()
      if (result.success && result.data) {
        // Filtrar para excluir Est. Mes 5 y Est. Mes 7
        const productosFiltrados = result.data.filter(producto => 
          !producto.desayuno_nombre.includes('Est. Mes')
        )
        setProductos(productosFiltrados)
      } else {
        console.error('Error cargando productos:', result.error)
      }
    } catch (error) {
      console.error('Error cargando productos:', error)
    } finally {
      setIsLoadingProductos(false)
    }
  }

  const addToCart = (producto: ConceptoDesayuno) => {
    // Validación 0: Verificar si ya tiene una orden de emergencia pendiente
    if (hasExistingEmergencyOrder) {
      alert('🚨 Ya tienes una orden de emergencia pendiente de pago. No puedes agregar más productos hasta que pagues la existente.')
      return
    }

    // Validación 1: Solo puede tener 1 producto POR CONCEPTO válido
    // (No es 1 producto total, sino 1 de cada tipo según las limitantes)

    // Validación 2: No puede seleccionar el mismo producto
    if (cart.some(item => item.id === producto.id)) {
      alert('🚨 Este producto ya está en el carrito')
      return
    }

    // Asignar fecha actual
    const fechaActual = new Date().toISOString().split('T')[0]

    // Validación 3: Exclusividad entre desayunos
    if (producto.desayuno_nombre.includes('Desayuno')) {
      if (cart.some(item => item.desayuno_nombre.includes('Desayuno'))) {
        alert('🚨 Solo puede seleccionar 1 tipo de desayuno (chico o grande)')
        return
      }
    }

    // Validación 4: Horario para desayunos, comida y estancia (solo hasta 2:00 PM)
    if (producto.desayuno_nombre.includes('Desayuno')) {
      const now = new Date()
      const currentHour = now.getHours()
      if (currentHour >= 14) {
        alert('🚨 Los desayunos solo se pueden reservar hasta las 2:00 PM')
        return
      }
    }
    
    if (producto.desayuno_nombre === 'Comida' || 
        (producto.desayuno_nombre.includes('Estancia') && !producto.desayuno_nombre.includes('Est. Mes'))) {
      const now = new Date()
      const currentHour = now.getHours()
      if (currentHour >= 14) {
        const servicio = producto.desayuno_nombre === 'Comida' ? 'comida' : 'estancia'
        alert(`🚨 La ${servicio} solo se puede reservar hasta las 2:00 PM`)
        return
      }
    }

    // Validación 5: Si ya tiene Estancia (que incluye comida y tareas), no puede seleccionar Comida o Tareas por separado
    if (producto.desayuno_nombre === 'Comida' || producto.desayuno_nombre.includes('Tareas')) {
      if (cart.some(item => item.desayuno_nombre.includes('Estancia') && !item.desayuno_nombre.includes('Est. Mes'))) {
        alert('🚨 La Estancia ya incluye comida y tareas, no puede seleccionar estos servicios por separado')
        return
      }
    }

    // Validación 6: Si ya tiene Comida o Tareas por separado, no puede seleccionar Estancia (que ya las incluye)
    if (producto.desayuno_nombre.includes('Estancia') && !producto.desayuno_nombre.includes('Est. Mes')) {
      if (cart.some(item => item.desayuno_nombre === 'Comida' || item.desayuno_nombre.includes('Tareas'))) {
        alert('🚨 Ya tiene comida o tareas seleccionadas, no puede seleccionar Estancia que ya las incluye')
        return
      }
    }

    // Validación 7: Si ya tiene MEDIA (que incluye estancia y tareas), no puede seleccionar Estancia o Tareas por separado
    if (producto.desayuno_nombre.includes('Estancia') || producto.desayuno_nombre.includes('Tareas')) {
      if (cart.some(item => item.desayuno_nombre.includes('MEDIA'))) {
        alert('🚨 MEDIA ya incluye estancia y tareas, no puede seleccionar estos servicios por separado')
        return
      }
    }

    // Validación 8: Si ya tiene Estancia o Tareas por separado, no puede seleccionar MEDIA (que ya las incluye)
    if (producto.desayuno_nombre.includes('MEDIA')) {
      if (cart.some(item => item.desayuno_nombre.includes('Estancia') || item.desayuno_nombre.includes('Tareas'))) {
        alert('🚨 Ya tiene estancia o tareas seleccionadas, no puede seleccionar MEDIA que ya las incluye')
        return
      }
    }

    // Validación 7: Si ya tiene Comida, no puede seleccionar Tareas 5 o 7 (son complementarias)
    if (producto.desayuno_nombre.includes('Tareas')) {
      if (cart.some(item => item.desayuno_nombre === 'Comida')) {
        alert('🚨 Ya tiene comida seleccionada, no puede seleccionar tareas por separado')
        return
      }
    }

    // Validación 8: Si ya tiene Tareas 5 o 7, no puede seleccionar Comida (son complementarias)
    if (producto.desayuno_nombre === 'Comida') {
      if (cart.some(item => item.desayuno_nombre.includes('Tareas'))) {
        alert('🚨 Ya tiene tareas seleccionadas, no puede seleccionar comida por separado')
        return
      }
    }

    const newCartItem: CartItem = {
      ...producto,
      cartItemId: `${producto.id}-${Date.now()}-${Math.random()}`,
      fecha_pedido: fechaActual
    }
    setCart(prev => [...prev, newCartItem])
  }

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId))
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.costo, 0)
  }

  const handleProcessOrder = async () => {
    if (cart.length === 0) return

    // Verificar si ya existe una orden de emergencia
    if (hasExistingEmergencyOrder) {
      alert('🚨 Ya tienes una orden de emergencia pendiente de pago. No puedes generar otra orden hasta que pagues la existente.')
      return
    }

    setIsProcessingOrder(true)
    try {
      const total = calculateTotal()
      
      // Procesar orden de emergencia (NO usa saldo del alumno)
      const result = await processEmergencyOrder(user!.alumno_ref, cart, total)
      
      if (result.success) {
        const orderData = {
          orderNumber: result.orderNumber || `EMG-${Date.now()}`,
          items: cart,
          total: total,
          date: new Date().toISOString().split('T')[0],
          deudaRestante: result.deudaRestante || 0,
          isPartialPayment: result.isPartialPayment || false
        }
        
        setOrderData(orderData)
        setShowTicketModal(true)
        setCart([]) // Limpiar carrito
        
        // Verificar nuevamente si hay órdenes de emergencia después de procesar
        await checkExistingEmergencyOrderLocal()
      } else {
        alert(`Error al procesar la orden: ${result.error}`)
      }
    } catch (error) {
      console.error('Error procesando orden:', error)
      alert('Error al procesar la orden')
    } finally {
      setIsProcessingOrder(false)
    }
  }

  const generatePDF = () => {
    if (!orderData) return

    const doc = new jsPDF()
    
    // Título
    doc.setFontSize(20)
    doc.text('🚨 TICKET DE EMERGENCIA', 105, 20, { align: 'center' })
    
    // Información del instituto
    doc.setFontSize(14)
    doc.text('Instituto Winston Churchill', 105, 35, { align: 'center' })
    doc.text('Sistema Integral de Servicios', 105, 42, { align: 'center' })
    
    // Línea separadora
    doc.line(20, 50, 190, 50)
    
    // Información de la orden
    doc.setFontSize(12)
    doc.text(`Orden: ${orderData.orderNumber}`, 20, 65)
    doc.text(`Pago Orden: ${orderData.orderNumber}`, 20, 75)
    doc.text(`Fecha: ${orderData.date}`, 20, 85)
    doc.text(`Alumno: ${user!.alumno_nombre_completo}`, 20, 95)
    doc.text(`Num. Control: ${user!.alumno_ref}`, 20, 105)
    
    // Línea separadora
    doc.line(20, 115, 190, 115)
    
    // Tabla de productos
    doc.setFontSize(14)
    doc.text('Productos:', 20, 130)
    
    let yPosition = 140
    orderData.items.forEach((item, index) => {
      doc.setFontSize(12)
      doc.text(`${index + 1}`, 25, yPosition)
      doc.text(item.desayuno_nombre, 40, yPosition)
      doc.text(`$${item.costo.toFixed(2)}`, 150, yPosition)
      doc.text(`$${item.costo.toFixed(2)}`, 170, yPosition)
      yPosition += 10
    })
    
    // Línea separadora
    doc.line(20, yPosition + 5, 190, yPosition + 5)
    
    // Total
    doc.setFontSize(16)
    doc.text(`Total: $${orderData.total.toFixed(2)}`, 20, yPosition + 20)
    
    // Línea separadora
    doc.line(20, yPosition + 30, 190, yPosition + 30)
    
    // Información de emergencia
    doc.setFontSize(12)
    doc.text('🚨 SERVICIO DE EMERGENCIA', 105, yPosition + 45, { align: 'center' })
    doc.text('Puede ser entregado al alumno sin pago inmediato', 105, yPosition + 55, { align: 'center' })
    doc.text(`Total a pagar en caja: $${orderData.total.toFixed(2)}`, 105, yPosition + 65, { align: 'center' })
    doc.text('Estatus: Emergencia (pago diferido)', 105, yPosition + 75, { align: 'center' })
    doc.text('Conserve este ticket como comprobante', 105, yPosition + 85, { align: 'center' })
    
    // Abrir PDF en nueva ventana
    const pdfOutput = doc.output('bloburl')
    window.open(pdfOutput, '_blank')
  }

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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/services')}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors"
          >
            <FaArrowLeft />
            Volver
          </button>
          <h1 className="text-2xl font-bold">🚨 Servicio Emergente</h1>
          <div className="text-right">
            <p className="font-semibold">Alumno: {user.alumno_nombre_completo}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Mensaje de orden de emergencia existente */}
        {hasExistingEmergencyOrder && existingEmergencyOrderInfo && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="text-white text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 mb-2">🚨 Orden de Emergencia Pendiente de Pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-red-700"><strong>Número de Orden:</strong> {existingEmergencyOrderInfo.orderNumber}</p>
                    <p className="text-red-700"><strong>Total a Pagar:</strong> ${existingEmergencyOrderInfo.total.toFixed(2)} MXN</p>
                  </div>
                  <div>
                    <p className="text-red-700"><strong>Estatus:</strong> Emergencia (pago diferido)</p>
                    <p className="text-red-700"><strong>Acción Requerida:</strong> Pagar en caja</p>
                  </div>
                </div>
                <p className="text-red-800 font-semibold mt-2">
                  ⚠️ No puedes generar otra orden de emergencia hasta que pagues esta.
                </p>
                <div className="mt-3 p-3 bg-white rounded-lg border border-red-200">
                  <p className="text-red-700 text-sm">
                    <strong>📋 Próximos pasos:</strong> Ve a caja para pagar ${existingEmergencyOrderInfo.total.toFixed(2)} MXN 
                    de la orden {existingEmergencyOrderInfo.orderNumber}. Una vez pagada, podrás generar nuevas órdenes de emergencia.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Two frames at the same height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Frame 1 - Limitantes */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 shadow-md">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-blue-600 text-xl mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 text-lg mb-4">⚠️ Servicio de Emergencia - Limitantes</h3>
                
                <ul className="text-blue-800 text-sm space-y-2 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">1 producto por concepto:</strong> Puede seleccionar múltiples productos de diferentes tipos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Sin duplicados:</strong> No puede seleccionar el mismo producto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Exclusividad desayunos:</strong> Solo 1 tipo de desayuno (chico o grande)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Exclusividad estancia:</strong> Estancia incluye comida y tareas (no se pueden seleccionar por separado)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Exclusividad MEDIA:</strong> MEDIA incluye estancia y tareas (no se pueden seleccionar por separado)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Exclusividad comida/tareas:</strong> Comida y Tareas son complementarias (no se pueden seleccionar juntas)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Horario restringido:</strong> Desayunos solo hasta las 2:00 PM, Comida y Estancia hasta las 2:00 PM</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Fecha automática:</strong> Se asigna el día actual</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-lg">•</span>
                    <span><strong className="text-blue-900">Límite de emergencia:</strong> Solo 1 orden de emergencia pendiente por alumno</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Frame 2 - Carrito */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <FaShoppingCart className="text-2xl text-blue-600" />
              <h3 className="font-semibold text-gray-800">🛒 Carrito</h3>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Vacío</p>
              </div>
            ) : (
              <div>
                {/* Cart Items */}
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.cartItemId} className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📦</span>
                        <div>
                          <h4 className="font-semibold text-gray-800 text-sm">{item.desayuno_nombre}</h4>
                          <p className="text-gray-600 text-xs">${item.costo.toFixed(2)}</p>
                          <p className="text-blue-600 text-xs">📅 {item.fecha_pedido}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total and Process Button */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-800">Total:</span>
                    <span className="text-lg font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                  
                  <button
                    onClick={handleProcessOrder}
                    disabled={isProcessingOrder || hasExistingEmergencyOrder}
                    className={`w-full font-bold py-2 px-4 rounded-lg shadow-lg transition-all duration-300 text-sm ${
                      hasExistingEmergencyOrder
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white hover:shadow-xl transform hover:scale-105 active:scale-95'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isProcessingOrder ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Procesando...</span>
                      </div>
                    ) : hasExistingEmergencyOrder ? (
                      <div className="flex items-center justify-center gap-2">
                        <FaExclamationTriangle className="text-sm" />
                        <span>🚨 Orden de Emergencia Pendiente</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FaExclamationTriangle className="text-sm" />
                        <span>🚨 Procesar Orden</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🚨 Productos de Emergencia</h2>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {isLoadingProductos ? (
                <div className="col-span-full text-center py-8">
                  <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Cargando productos...</p>
                </div>
              ) : productos.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <FaExclamationTriangle className="text-4xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No se encontraron productos</p>
                </div>
              ) : (
                productos.map((producto) => {
                  // Determinar si el producto está disponible según las restricciones
                  const isDisabled = 
                    hasExistingEmergencyOrder || // Ya tiene una orden de emergencia pendiente
                    cart.some(item => item.id === producto.id) || // Ya está en el carrito
                    (producto.desayuno_nombre.includes('Desayuno') && cart.some(item => item.desayuno_nombre.includes('Desayuno'))) || // Ya tiene un desayuno
                                         (producto.desayuno_nombre.includes('Desayuno') && new Date().getHours() >= 14) || // Pasó de las 2:00 PM
                     (producto.desayuno_nombre === 'Comida' && new Date().getHours() >= 14) || // Pasó de las 2:00 PM
                     (producto.desayuno_nombre.includes('Estancia') && !producto.desayuno_nombre.includes('Est. Mes') && new Date().getHours() >= 14) || // Pasó de las 2:00 PM
                    // Si ya tiene Estancia (que incluye comida y tareas), no puede seleccionar Comida o Tareas por separado
                    ((producto.desayuno_nombre === 'Comida' || producto.desayuno_nombre.includes('Tareas')) && 
                     cart.some(item => item.desayuno_nombre.includes('Estancia') && !item.desayuno_nombre.includes('Est. Mes'))) ||
                    // Si ya tiene Comida o Tareas por separado, no puede seleccionar Estancia (que ya las incluye)
                    (producto.desayuno_nombre.includes('Estancia') && !producto.desayuno_nombre.includes('Est. Mes') &&
                     cart.some(item => item.desayuno_nombre === 'Comida' || item.desayuno_nombre.includes('Tareas'))) ||
                    // Si ya tiene MEDIA (que incluye estancia y tareas), no puede seleccionar Estancia o Tareas por separado
                    ((producto.desayuno_nombre.includes('Estancia') || producto.desayuno_nombre.includes('Tareas')) &&
                     cart.some(item => item.desayuno_nombre.includes('MEDIA'))) ||
                    // Si ya tiene Estancia o Tareas por separado, no puede seleccionar MEDIA (que ya las incluye)
                    (producto.desayuno_nombre.includes('MEDIA') &&
                     cart.some(item => item.desayuno_nombre.includes('Estancia') || item.desayuno_nombre.includes('Tareas'))) ||
                    // Si ya tiene Comida, no puede seleccionar Tareas 5 o 7 (son complementarias)
                    (producto.desayuno_nombre.includes('Tareas') && cart.some(item => item.desayuno_nombre === 'Comida')) ||
                    // Si ya tiene Tareas 5 o 7, no puede seleccionar Comida (son complementarias)
                    (producto.desayuno_nombre === 'Comida' && cart.some(item => item.desayuno_nombre.includes('Tareas')))

                  // Asignar emoji y color basado en el tipo de producto
                  const getProductEmoji = (nombre: string) => {
                    if (nombre.includes('Desayuno')) return '🍳'
                    if (nombre.includes('Comida')) return '🍽️'
                    if (nombre.includes('Estancia')) return '🏫'
                    if (nombre.includes('Tareas')) return '📚'
                    if (nombre.includes('MEDIA')) return '⏰'
                    return '📦'
                  }

                  const getProductColor = (nombre: string) => {
                    if (nombre.includes('Desayuno')) return 'bg-green-100'
                    if (nombre.includes('Comida')) return 'bg-blue-100'
                    if (nombre.includes('Estancia') || nombre.includes('Est. Mes')) return 'bg-purple-100'
                    if (nombre.includes('Tareas')) return 'bg-orange-100'
                    if (nombre.includes('MEDIA')) return 'bg-yellow-100'
                    return 'bg-gray-100'
                  }

                  return (
                    <div
                      key={producto.id}
                      className={`${getProductColor(producto.desayuno_nombre)} rounded-lg p-3 border-2 transition-all duration-300 ${
                        isDisabled 
                          ? 'border-gray-300 opacity-50 cursor-not-allowed' 
                          : 'border-gray-200 hover:border-red-400 cursor-pointer hover:shadow-lg'
                      }`}
                      onClick={() => !isDisabled && addToCart(producto)}
                    >
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                          isDisabled ? 'bg-gray-400' : 'bg-red-500'
                        }`}>
                          <span className="text-2xl">{getProductEmoji(producto.desayuno_nombre)}</span>
                        </div>
                        <h3 className={`font-bold text-sm mb-1 ${
                          isDisabled ? 'text-gray-500' : 'text-gray-800'
                        }`}>{producto.desayuno_nombre}</h3>
                        <p className={`text-xs mb-1 ${
                          isDisabled ? 'text-gray-400' : 'text-gray-600'
                        }`}>{producto.desayuno_abreviatura}</p>
                        <div className={`font-bold text-lg ${
                          isDisabled ? 'text-gray-400' : 'text-green-600'
                        }`}>${producto.costo.toFixed(2)}</div>
                        <button className={`mt-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isDisabled 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-500 hover:bg-green-600 cursor-pointer'
                        }`}>
                          <FaPlus className="text-xs" />
                        </button>
                        {isDisabled && (
                          <div className="mt-1 text-xs text-red-500 font-semibold">
                            {hasExistingEmergencyOrder ? 'Orden de emergencia pendiente' :
                             cart.some(item => item.id === producto.id) ? 'Ya seleccionado' :
                             producto.desayuno_nombre.includes('Desayuno') && cart.some(item => item.desayuno_nombre.includes('Desayuno')) ? 'Ya tiene desayuno' :
                             producto.desayuno_nombre.includes('Desayuno') && new Date().getHours() >= 14 ? 'Solo hasta 2:00 PM' :
                             producto.desayuno_nombre === 'Comida' && new Date().getHours() >= 14 ? 'Solo hasta 2:00 PM' :
                             producto.desayuno_nombre.includes('Estancia') && !producto.desayuno_nombre.includes('Est. Mes') && new Date().getHours() >= 14 ? 'Solo hasta 2:00 PM' :
                             (producto.desayuno_nombre === 'Comida' || producto.desayuno_nombre.includes('Tareas')) && 
                             cart.some(item => item.desayuno_nombre.includes('Estancia') && !item.desayuno_nombre.includes('Est. Mes')) ? 'Estancia ya incluye esto' :
                             producto.desayuno_nombre.includes('Estancia') && !producto.desayuno_nombre.includes('Est. Mes') &&
                             cart.some(item => item.desayuno_nombre === 'Comida' || item.desayuno_nombre.includes('Tareas')) ? 'Ya tiene comida/tareas' :
                             (producto.desayuno_nombre.includes('Estancia') || producto.desayuno_nombre.includes('Tareas')) &&
                             cart.some(item => item.desayuno_nombre.includes('MEDIA')) ? 'MEDIA ya incluye esto' :
                             producto.desayuno_nombre.includes('MEDIA') &&
                             cart.some(item => item.desayuno_nombre.includes('Estancia') || item.desayuno_nombre.includes('Tareas')) ? 'Ya tiene estancia/tareas' :
                             producto.desayuno_nombre.includes('Tareas') && cart.some(item => item.desayuno_nombre === 'Comida') ? 'Ya tiene comida' :
                             producto.desayuno_nombre === 'Comida' && cart.some(item => item.desayuno_nombre.includes('Tareas')) ? 'Ya tiene tareas' : 'No disponible'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>


      </main>

      {/* Ticket Modal */}
      {showTicketModal && orderData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-white text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">🚨 Ticket de Emergencia</h2>
              <p className="text-gray-600">Orden procesada exitosamente</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Detalles de la Orden:</h3>
                <div className="mb-3 pb-2 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Número de Orden:</span>
                    <span className="font-bold text-blue-600">{orderData.orderNumber}</span>
                  </div>
                </div>
                {orderData.items.map((item) => (
                  <div key={item.cartItemId} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <span className="text-gray-700">{item.desayuno_nombre}</span>
                    <span className="font-semibold text-gray-800">${item.costo.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-green-600">${orderData.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-2">🚨 SERVICIO DE EMERGENCIA</h3>
                <p className="text-red-700 text-sm">
                  <strong>Importante:</strong> Este servicio puede ser entregado al alumno sin pago inmediato.
                </p>
                <p className="text-red-700 text-sm mt-2">
                  <strong>Total a pagar en caja:</strong> <span className="font-bold">${orderData.total.toFixed(2)}</span>
                </p>
                <p className="text-red-700 text-xs mt-2 italic">
                  Estatus: Emergencia (pago diferido)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTicketModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={generatePDF}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <FaPrint className="inline mr-2" />
                → Ver PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
