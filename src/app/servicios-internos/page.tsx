'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FaSearch, FaShoppingCart, FaArrowLeft, FaPlus, FaMinus, FaTrash, FaTimes, FaDownload, FaPrint, FaCalendarAlt } from 'react-icons/fa'
import { useAuth } from '@/contexts/AuthContext'
import { getConceptosDesayunos, savePagoDesayunos, PagoDesayuno } from '@/lib/supabase'
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
  } | null>(null)
  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [selectedItemForDate, setSelectedItemForDate] = useState<CartItem | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    loadProductos()
  }, [])

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
        return [...prevCart, { ...producto, quantity: 1, fecha_pedido: new Date().toISOString().split('T')[0] }]
      }
    })
    setSearchTerm('')
    setFilteredProductos([])
  }

  const openDateModal = (item: CartItem) => {
    setSelectedItemForDate(item)
    setShowDateModal(true)
  }

  const updateItemDate = (newDate: string) => {
    if (selectedItemForDate) {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === selectedItemForDate.id
            ? { ...item, fecha_pedido: newDate }
            : item
        )
      )
      setShowDateModal(false)
      setSelectedItemForDate(null)
    }
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

    setIsProcessingOrder(true)
    
    try {
      // Preparar datos para guardar en la base de datos
      const itemsToSave: PagoDesayuno[] = cart.map(item => ({
        pago_ref: user.alumno_ref, // Número de control del alumno
        pago_descripcion: item.desayuno_nombre,
        pago_costo: item.costo,
        pago_fecha: new Date().toISOString().split('T')[0], // Solo la fecha
        pago_cantidad: item.quantity,
        pago_orden: '', // Se asignará en la función savePagoDesayunos
        pago_estatus: 2 // 2 = en proceso
      }))

      // Guardar en la base de datos
      const result = await savePagoDesayunos(itemsToSave, user.alumno_ref)

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
          })
        }

        setOrderData(orderInfo)
        setShowTicketModal(true)
        setCart([]) // Limpiar carrito después de procesar
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
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800 text-sm">{item.desayuno_nombre}</h4>
                          <p className="text-green-600 font-bold">${item.costo.toFixed(2)} c/u</p>
                          <p className="text-blue-600 font-semibold text-xs">Total: ${(item.costo * item.quantity).toFixed(2)}</p>
                          <p className="text-purple-600 font-medium text-xs">Fecha: {item.fecha_pedido || new Date().toISOString().split('T')[0]}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-300">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <FaMinus className="text-xs" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-800 text-lg">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600"
                          >
                            <FaPlus className="text-xs" />
                          </button>
                          <button
                            onClick={() => openDateModal(item)}
                            className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center hover:bg-purple-600 ml-2"
                          >
                            <FaCalendarAlt className="text-xs" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center hover:bg-gray-600"
                          >
                            <FaTrash className="text-xs" />
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
                        disabled={isProcessingOrder}
                        className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isProcessingOrder ? (
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Procesando...</span>
                          </div>
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
                <p className="text-red-600 font-semibold text-sm">Favor de pagar en caja en las Instalaciones del Colegio</p>
                <p className="text-gray-500 text-xs">Conserve este ticket como comprobante</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calendario */}
      {showDateModal && selectedItemForDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Seleccionar Fecha</h2>
              <button
                onClick={() => setShowDateModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">{selectedItemForDate.desayuno_nombre}</h3>
                <p className="text-gray-600 text-sm">Selecciona la fecha para este servicio:</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de servicio:
                </label>
                <input
                  type="date"
                  value={selectedItemForDate.fecha_pedido || new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateItemDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDateModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDateModal(false)
                    setSelectedItemForDate(null)
                  }}
                  className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
