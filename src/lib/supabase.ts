import { getDatabase } from './insforge'

/** Cliente DB InsForge (Desayunos). Mantiene nombre `supabase` por compatibilidad. */
export const supabase = {
  from(table: string) {
    return getDatabase().from(table)
  },
}

// Diagnóstico rápido: catálogo Desayunos + API login Winston Servicios
export async function testAlumnoTable() {
  try {
    const { data, error } = await supabase.from('concepto_desayunos').select('id').limit(1)
    if (error) {
      console.log('❌ InsForge Desayunos no accesible:', error)
      return false
    }
    console.log('✅ InsForge Desayunos OK, conceptos:', data?.length ?? 0)
    return true
  } catch (error) {
    console.error('❌ Error en test de conexión:', error)
    return false
  }
}

// Tipos para la tabla alumno
export interface Alumno {
  id?: number
  alumno_ref: string
  alumno_nombre_completo: string
  created_at?: string
  updated_at?: string
}

// Tipos para la tabla concepto_desayunos
export interface ConceptoDesayuno {
  id: number
  desayuno_nombre: string
  desayuno_abreviatura: string
  costo: number
}

// Tipos para la tabla pago_desayunos
export interface PagoDesayuno {
  id?: number
  pago_ref: string // alumno_ref
  pago_descripcion: string
  pago_costo: number
  pago_fecha: string | null // Permitir NULL para items sin fecha
  pago_cantidad: number
  pago_orden: string // número de orden generado
  pago_estatus: number // 0 inicial, 2 en proceso
}

// Tipos y funciones para notificaciones
export interface Notificacion {
  id: number
  referencia: number // alumno_ref
  asunto: string | null
  mensaje: string | null
  estatus: number // 1 = no leído, 2 = leído
  created_at?: string
}

export async function getUnreadNotificationsCount(alumnoRef: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('referencia', alumnoRef)
      .eq('estatus', 1)

    if (error) {
      console.error('Error obteniendo conteo de notificaciones:', error)
      return { success: false, error: 'Error al obtener conteo' }
    }

    return { success: true, count: count ?? 0 }
  } catch (error) {
    console.error('Error inesperado en getUnreadNotificationsCount:', error)
    return { success: false, error: 'Error inesperado al obtener conteo' }
  }
}

export async function listNotifications(alumnoRef: string): Promise<{ success: boolean; data?: Notificacion[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('referencia', alumnoRef)
      .order('id', { ascending: false })

    if (error) {
      console.error('Error listando notificaciones:', error)
      return { success: false, error: 'Error al listar notificaciones' }
    }

    return { success: true, data: (data as Notificacion[]) || [] }
  } catch (error) {
    console.error('Error inesperado en listNotifications:', error)
    return { success: false, error: 'Error inesperado al listar notificaciones' }
  }
}

export async function markNotificationAsRead(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({ estatus: 2 })
      .eq('id', id)

    if (error) {
      console.error('Error marcando notificación como leída:', error)
      return { success: false, error: 'Error al marcar como leído' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error inesperado en markNotificationAsRead:', error)
    return { success: false, error: 'Error inesperado al actualizar notificación' }
  }
}

// Función para login con número de control (alumno en Winston Servicios vía API)
export async function loginAlumno(numeroControl: string): Promise<{ success: boolean; error?: string; user?: Alumno }> {
  try {
    const res = await fetch('/api/alumno/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numeroControl }),
    })
    const payload = (await res.json()) as { success: boolean; error?: string; user?: Alumno }
    if (!payload.success || !payload.user) {
      return { success: false, error: payload.error ?? 'Número de control no encontrado' }
    }
    return { success: true, user: payload.user }
  } catch (error) {
    console.error('  - ❌ Error en login:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para obtener conceptos de desayunos
export async function getConceptosDesayunos(): Promise<{ success: boolean; error?: string; data?: ConceptoDesayuno[] }> {
  try {
    const { data, error } = await supabase
      .from('concepto_desayunos')
      .select('*')
      .order('desayuno_nombre', { ascending: true })

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al cargar productos' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error en getConceptosDesayunos:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para verificar si un número de orden ya existe
async function checkOrderNumberExists(orderNumber: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('pago_orden')
      .eq('pago_orden', orderNumber)
      .limit(1)

    if (error) {
      console.error('Error verificando número de orden:', error)
      return true // En caso de error, asumimos que existe para generar uno nuevo
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Error en checkOrderNumberExists:', error)
    return true
  }
}

// Función para generar número de orden único globalmente
async function generateUniqueOrderNumber(): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    // Generar número de orden con timestamp más preciso y más caracteres aleatorios
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substr(2, 8).toUpperCase()
    const orderNumber = `ORD-${timestamp}-${randomPart}`

    // Verificar si ya existe en la base de datos
    const exists = await checkOrderNumberExists(orderNumber)
    
    if (!exists) {
      return orderNumber
    }

    attempts++
    // Pequeña pausa para evitar colisiones de timestamp
    await new Promise(resolve => setTimeout(resolve, 1))
  }

  // Si después de varios intentos no se puede generar uno único, usar un UUID simplificado
  const fallbackNumber = `ORD-${Date.now()}-${crypto.randomUUID().substr(0, 8).toUpperCase()}`
  return fallbackNumber
}

// Función para guardar pago de desayunos
export async function savePagoDesayunos(items: PagoDesayuno[], alumnoRef: string): Promise<{ success: boolean; error?: string; orderNumber?: string }> {
  try {
    // Generar número de orden único globalmente
    const orderNumber = await generateUniqueOrderNumber()
    
    // Preparar los datos para insertar
    const dataToInsert = items.map(item => ({
      ...item,
      pago_ref: alumnoRef, // Número de control del alumno
      pago_orden: orderNumber, // Número de orden único globalmente
      pago_fecha: item.pago_fecha, // Usar la fecha personalizada del carrito
      pago_estatus: 2 // 2 = en proceso
    }))

    const { data, error } = await supabase
      .from('pago_desayunos')
      .insert(dataToInsert)
      .select()

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al guardar la orden' }
    }

    return { success: true, orderNumber }
  } catch (error) {
    console.error('Error en savePagoDesayunos:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para obtener conceptos ya pagados por alumno
export async function getConceptosPagados(alumnoRef: string): Promise<{ success: boolean; error?: string; data?: PagoDesayuno[] }> {
  try {
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('*')
      .eq('pago_ref', alumnoRef)
      .eq('pago_estatus', 1) // Solo conceptos pagados
      .order('pago_fecha', { ascending: true })

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al cargar conceptos pagados' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error en getConceptosPagados:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Consulta ligera: ¿hay orden pendiente de pago (estatus 2)?
export async function getOrdenPendiente(alumnoRef: string): Promise<{
  success: boolean
  hasPending: boolean
  orderNumber?: string
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('pago_orden')
      .eq('pago_ref', alumnoRef)
      .eq('pago_estatus', 2)
      .not('pago_orden', 'is', null)
      .limit(1)

    if (error) {
      console.error('Error verificando orden pendiente:', error)
      return { success: false, hasPending: false, error: 'Error al verificar órdenes' }
    }

    const row = data?.[0]
    if (!row?.pago_orden) {
      return { success: true, hasPending: false }
    }

    return {
      success: true,
      hasPending: true,
      orderNumber: String(row.pago_orden),
    }
  } catch (error) {
    console.error('Error en getOrdenPendiente:', error)
    return { success: false, hasPending: false, error: 'Error de conexión' }
  }
}

// Función para obtener todos los pagos (reservados y pagados) que no han pasado de fecha
export async function getAllPagosVigentes(alumnoRef: string): Promise<{ success: boolean; error?: string; data?: PagoDesayuno[] }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalizar a inicio del día
    
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('*')
      .eq('pago_ref', alumnoRef)
      .in('pago_estatus', [1, 2, 3]) // Estatus 1 (pagado), 2 (reservado) y 3 (emergencia)
      .or(`pago_fecha.gte.${today.toISOString().split('T')[0]},pago_fecha.is.null`) // Fechas de hoy en adelante O fechas NULL
      .order('pago_fecha', { ascending: true, nullsFirst: true }) // NULL primero, luego por fecha

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al cargar pagos' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error en getAllPagosVigentes:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para obtener historial completo de órdenes pagadas
export async function getHistorialCompleto(alumnoRef: string): Promise<{ success: boolean; error?: string; data?: PagoDesayuno[] }> {
  try {
    // Consulta más específica para asegurar que obtenga los datos
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('*')
      .eq('pago_ref', alumnoRef)
      .eq('pago_estatus', 1) // Solo órdenes pagadas (estatus 1)
      .not('pago_orden', 'is', null) // Asegurar que tenga número de orden
      .order('pago_fecha', { ascending: false }) // Más recientes primero

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al cargar historial' }
    }

    // Filtrar solo los que tienen número de orden válido
    const validData = (data || []).filter(item => item.pago_orden && item.pago_orden.trim() !== '')
    
    return { success: true, data: validData }
  } catch (error) {
    console.error('Error en getHistorialCompleto:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para actualizar fecha de un concepto pagado
export async function updateConceptoFecha(id: number, nuevaFecha: string, descripcion?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isBreakfastConcept = (text?: string | null) => {
      if (!text) return false
      const lower = text.toLowerCase()
      return lower.includes('desayuno ch') || lower.includes('desayuno gde')
    }
    
    const isLunchConcept = (text?: string | null) => {
      if (!text) return false
      const lower = text.toLowerCase()
      return lower.includes('comida')
    }
    
    // Verificar si la fecha es para hoy y ya pasó de las 9:00 AM
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    const isTodayLocal = nuevaFecha === todayString
    
    if (isTodayLocal) {
      const currentHour = today.getHours()
      const currentMinute = today.getMinutes()
      
      // Restricción 9:00 AM para Desayuno
      if (isBreakfastConcept(descripcion) && (currentHour > 9 || (currentHour === 9 && currentMinute > 0))) {
        return { 
          success: false, 
          error: 'No se puede asignar la fecha de hoy después de las 9:00 AM' 
        }
      }
      
      // Restricción 12:00 PM para Comida
      if (isLunchConcept(descripcion) && (currentHour > 12 || (currentHour === 12 && currentMinute > 0))) {
        return { 
          success: false, 
          error: 'No se puede asignar la fecha de hoy después de las 12:00 PM' 
        }
      }
    }

    const { error } = await supabase
      .from('pago_desayunos')
      .update({ pago_fecha: nuevaFecha })
      .eq('id', id)

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al actualizar fecha' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error en updateConceptoFecha:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para eliminar un concepto pagado (cancelar servicio)
export async function deleteConceptoPagado(id: number, alumnoRef: string): Promise<{ success: boolean; error?: string; montoAbonado?: number }> {
  try {
    console.log(`🔍 Intentando cancelar concepto ID: ${id}, Alumno: ${alumnoRef}`)
    
    // Primero obtener los datos del concepto antes de eliminarlo
    const { data: concepto, error: fetchError } = await supabase
      .from('pago_desayunos')
      .select('pago_costo, pago_cantidad, pago_estatus, pago_fecha, pago_descripcion')
      .eq('id', id)
      .single()

    console.log(`📊 Resultado de consulta:`, { concepto, fetchError })

    if (fetchError) {
      console.error('Error obteniendo datos del concepto:', fetchError)
      console.error('Detalles del error:', {
        code: fetchError.code,
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint
      })
      return { success: false, error: `Error al obtener datos del concepto: ${fetchError.message}` }
    }

    if (!concepto) {
      console.error('❌ Concepto no encontrado en la base de datos')
      return { success: false, error: 'Concepto no encontrado en la base de datos' }
    }

    console.log(`✅ Concepto encontrado:`, concepto)

    // Verificar restricciones de tiempo si es para hoy
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    if (concepto.pago_fecha === todayString) {
      const currentHour = today.getHours()
      const currentMinute = today.getMinutes()
      
      // Restricción 9:00 AM para Desayuno CH/GDE
      if ((concepto.pago_descripcion?.toLowerCase().includes('desayuno ch') || 
           concepto.pago_descripcion?.toLowerCase().includes('desayuno gde')) && 
          (currentHour > 9 || (currentHour === 9 && currentMinute > 0))) {
        return { 
          success: false, 
          error: 'No se puede cancelar después de las 9:00 AM para Desayuno CH/GDE' 
        }
      }
      
      // Restricción 12:00 PM para Comida
      if (concepto.pago_descripcion?.toLowerCase().includes('comida') && 
          (currentHour > 12 || (currentHour === 12 && currentMinute > 0))) {
        return { 
          success: false, 
          error: 'No se puede cancelar después de las 12:00 PM para Comida' 
        }
      }
    }

    // Si es un servicio pagado (estatus 1), calcular monto a abonar
    let montoAAbonar = 0
    if (concepto.pago_estatus === 1) {
      montoAAbonar = calcularMontoAAbonar(concepto.pago_costo, concepto.pago_cantidad)
      
      // Abonar al saldo del alumno
      const saldoResult = await upsertSaldoAlumno(alumnoRef, montoAAbonar)
      if (!saldoResult.success) {
        console.error('Error abonando saldo:', saldoResult.error)
        return { success: false, error: 'Error al abonar saldo' }
      }
    }

    // Ahora eliminar el concepto
    console.log(`🗑️ Eliminando concepto ID: ${id}`)
    const { error: deleteError } = await supabase
      .from('pago_desayunos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error eliminando concepto:', deleteError)
      console.error('Detalles del error de eliminación:', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details
      })
      return { success: false, error: `Error al eliminar concepto: ${deleteError.message}` }
    }

    console.log(`✅ Concepto ${id} cancelado exitosamente. Monto abonado: $${montoAAbonar}`)
    return { success: true, montoAbonado: montoAAbonar }
  } catch (error) {
    console.error('Error en deleteConceptoPagado:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para obtener el total de órdenes pagadas del usuario
export async function getTotalOrdenesPagadas(alumnoRef: string): Promise<{ success: boolean; error?: string; total?: number }> {
  try {
    // Obtener todas las órdenes pagadas del usuario
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('pago_costo, pago_cantidad, pago_estatus, pago_orden')
      .eq('pago_ref', alumnoRef)
      .eq('pago_estatus', 1) // Solo órdenes pagadas (estatus 1)

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al cargar datos financieros' }
    }

    if (!data || data.length === 0) {
      return { success: true, total: 0 }
    }

    // Agrupar por número de orden y calcular el total de cada orden pagada
    const ordenesPagadas: { [key: string]: number } = {}
    
    data.forEach(item => {
      if (item.pago_orden) {
        if (!ordenesPagadas[item.pago_orden]) {
          ordenesPagadas[item.pago_orden] = 0
        }
        ordenesPagadas[item.pago_orden] += item.pago_costo * item.pago_cantidad
      }
    })
    
    // Sumar el total de todas las órdenes pagadas
    const total = Object.values(ordenesPagadas).reduce((sum, totalOrden) => sum + totalOrden, 0)
    
    return { success: true, total: Math.round(total * 100) / 100 }
  } catch (error) {
    console.error('Error en getTotalOrdenesPagadas:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

// Función para obtener los adeudos de la orden actual del usuario
export async function getAdeudosOrdenActual(alumnoRef: string): Promise<{ success: boolean; error?: string; adeudos?: number }> {
  try {
    // Obtener la orden actual (con estatus 2 - reservada pero no pagada, y estatus 3 - emergencia)
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('pago_costo, pago_cantidad, pago_estatus, pago_orden, pago_fecha')
      .eq('pago_ref', alumnoRef)
      .in('pago_estatus', [2, 3]) // Servicios reservados (2) y emergencia (3) - ambos requieren pago
      .not('pago_orden', 'is', null) // Asegurar que tenga número de orden

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al cargar datos financieros' }
    }

    if (!data || data.length === 0) {
      return { success: true, adeudos: 0 }
    }

    // Agrupar por número de orden (puede haber múltiples órdenes con estatus 2 y 3)
    const ordenes: { [key: string]: number } = {}
    
    data.forEach(item => {
      if (item.pago_orden) {
        if (!ordenes[item.pago_orden]) {
          ordenes[item.pago_orden] = 0
        }
        ordenes[item.pago_orden] += item.pago_costo * item.pago_cantidad
      }
    })
    
    // Sumar todos los adeudos de todas las órdenes (estatus 2 y 3)
    const totalAdeudos = Object.values(ordenes).reduce((total, adeudo) => total + adeudo, 0)
    
    return { success: true, adeudos: Math.round(totalAdeudos * 100) / 100 }
  } catch (error) {
    console.error('Error en getAdeudosOrdenActual:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}

export async function getSaldoAlumno(alumnoRef: string): Promise<{ success: boolean; saldo?: number; error?: string }> {
  try {
    console.log(`🔍 DEBUG getSaldoAlumno: Buscando saldo para alumno_ref: ${alumnoRef}`)
    
    // Consulta simple sin campos que no existen
    const { data, error } = await supabase
      .from('desayunos_saldo')
      .select('saldo_monto')
      .eq('saldo_ref', alumnoRef)

    console.log(`🔍 DEBUG getSaldoAlumno: Resultado de consulta:`, { data, error })

    if (error) {
      console.error('Error obteniendo saldo del alumno:', error)
      return { success: false, error: 'Error al obtener el saldo' }
    }

    // Si no hay datos, retornar saldo 0
    if (!data || data.length === 0) {
      console.log(`❌ No se encontró saldo para el alumno: ${alumnoRef}`)
      return { success: true, saldo: 0 }
    }

    // Tomar el registro más reciente (por si acaso hay duplicados)
    const saldo = data[0]?.saldo_monto || 0
    
    console.log(`✅ Saldo encontrado para alumno ${alumnoRef}: $${saldo}`)
    
    // Log para debugging - verificar si hay múltiples registros
    if (data.length > 1) {
      console.warn(`⚠️ ADVERTENCIA: Se encontraron ${data.length} registros de saldo para el alumno ${alumnoRef}. Usando el más reciente.`)
    }

    return { success: true, saldo: Math.round(saldo * 100) / 100 }
  } catch (error) {
    console.error('Error inesperado obteniendo saldo:', error)
    return { success: false, error: 'Error inesperado al obtener el saldo' }
  }
}

// Función para obtener el pago de estancia mensual del alumno
export async function getEstanciaMensual(alumnoRef: string): Promise<{ success: boolean; estanciaMensual?: number; error?: string }> {
  try {
    console.log(`🔍 DEBUG getEstanciaMensual: Buscando estancia mensual para alumno_ref: ${alumnoRef}`)
    
    // Buscar servicios de estancia mensual (Est. Mes 5 o Est. Mes 7) con estatus 1 (pagado)
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('pago_costo, pago_cantidad, pago_descripcion')
      .eq('pago_ref', alumnoRef)
      .eq('pago_estatus', 1) // Solo servicios pagados
      .or('pago_descripcion.ilike.%Est. Mes 5%,pago_descripcion.ilike.%Est. Mes 7%')

    console.log(`🔍 DEBUG getEstanciaMensual: Resultado de consulta:`, { data, error })

    if (error) {
      console.error('Error obteniendo estancia mensual:', error)
      return { success: false, error: 'Error al obtener la estancia mensual' }
    }

    // Si no hay datos, retornar 0
    if (!data || data.length === 0) {
      console.log(`❌ No se encontró estancia mensual para el alumno: ${alumnoRef}`)
      return { success: true, estanciaMensual: 0 }
    }

    // Calcular el total de estancia mensual
    const totalEstanciaMensual = data.reduce((total, item) => {
      return total + (item.pago_costo * item.pago_cantidad)
    }, 0)
    
    console.log(`✅ Estancia mensual encontrada para alumno ${alumnoRef}: $${totalEstanciaMensual}`)
    
    return { success: true, estanciaMensual: Math.round(totalEstanciaMensual * 100) / 100 }
  } catch (error) {
    console.error('Error inesperado obteniendo estancia mensual:', error)
    return { success: false, error: 'Error inesperado al obtener la estancia mensual' }
  }
}

// Función para insertar o actualizar saldo del alumno
export async function upsertSaldoAlumno(alumnoRef: string, montoAAbonar: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Primero verificar si ya existe un registro de saldo para este alumno
    const { data: existingSaldo, error: checkError } = await supabase
      .from('desayunos_saldo')
      .select('id, saldo_monto')
      .eq('saldo_ref', alumnoRef)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error verificando saldo existente:', checkError)
      return { success: false, error: 'Error al verificar saldo existente' }
    }

    if (existingSaldo) {
      // Actualizar saldo existente
      const nuevoSaldo = (existingSaldo.saldo_monto || 0) + montoAAbonar
      const { error: updateError } = await supabase
        .from('desayunos_saldo')
        .update({ 
          saldo_monto: Math.round(nuevoSaldo * 100) / 100
        })
        .eq('id', existingSaldo.id)

      if (updateError) {
        console.error('Error actualizando saldo:', updateError)
        return { success: false, error: 'Error al actualizar saldo' }
      }

      console.log(`✅ Saldo actualizado para alumno ${alumnoRef}: ${existingSaldo.saldo_monto} + ${montoAAbonar} = ${nuevoSaldo}`)
    } else {
      // Insertar nuevo registro de saldo
      const { error: insertError } = await supabase
        .from('desayunos_saldo')
        .insert({
          saldo_ref: alumnoRef,
          saldo_monto: Math.round(montoAAbonar * 100) / 100
        })

      if (insertError) {
        console.error('Error insertando saldo:', insertError)
        return { success: false, error: 'Error al insertar saldo' }
      }

      console.log(`✅ Nuevo saldo creado para alumno ${alumnoRef}: ${montoAAbonar}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error inesperado en upsertSaldoAlumno:', error)
    return { success: false, error: 'Error inesperado al manejar saldo' }
  }
}

// Función para calcular el monto a abonar por un servicio cancelado
export function calcularMontoAAbonar(costo: number, cantidad: number): number {
  return Math.round((costo * cantidad) * 100) / 100
}

// Función para procesar pago automático con saldo (ahora permite pagos parciales)
export async function processOrderWithSaldo(
  items: PagoDesayuno[], 
  alumnoRef: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  orderNumber?: string;
  wasPaidWithSaldo: boolean;
  saldoUsed?: number;
  remainingSaldo?: number;
  deudaRestante?: number;
  isPartialPayment?: boolean;
}> {
  try {
    // 1. Calcular el total de la orden
    const totalOrden = items.reduce((sum, item) => sum + (item.pago_costo * item.pago_cantidad), 0)
    
    // 2. Obtener el saldo actual del alumno
    const saldoResult = await getSaldoAlumno(alumnoRef)
    if (!saldoResult.success) {
      return { success: false, error: 'Error al obtener saldo del alumno', wasPaidWithSaldo: false }
    }
    
    const saldoActual = saldoResult.saldo || 0
    
    // 3. Calcular cuánto saldo se puede usar
    const saldoAUsar = Math.min(saldoActual, totalOrden)
    const deudaRestante = totalOrden - saldoAUsar
    
    // 4. Generar número de orden único
    const orderNumber = await generateUniqueOrderNumber()
    
    // 5. Determinar el estatus de la orden
    let estatusOrden: number
    let isPartialPayment = false
    
    if (saldoAUsar === 0) {
      // Sin saldo disponible
      estatusOrden = 2 // Reservada
      isPartialPayment = false
    } else if (saldoAUsar === totalOrden) {
      // Saldo cubre toda la orden
      estatusOrden = 1 // Pagada
      isPartialPayment = false
    } else {
      // Saldo cubre parcialmente la orden
      estatusOrden = 2 // Reservada (con deuda)
      isPartialPayment = true
    }
    
    // 6. Preparar los datos para insertar
    const dataToInsert = items.map(item => ({
      ...item,
      pago_ref: alumnoRef,
      pago_orden: orderNumber,
      pago_fecha: item.pago_fecha,
      pago_estatus: estatusOrden
    }))
    
    // 7. Insertar la orden en la base de datos
    const { data, error } = await supabase
      .from('pago_desayunos')
      .insert(dataToInsert)
      .select()
    
    if (error) {
      console.error('Error al insertar orden:', error)
      return { success: false, error: 'Error al guardar la orden', wasPaidWithSaldo: false }
    }
    
    // 8. Si se usó saldo (total o parcial), actualizar el saldo del alumno
    if (saldoAUsar > 0) {
      const saldoRestante = saldoActual - saldoAUsar
      const updateResult = await upsertSaldoAlumno(alumnoRef, -saldoAUsar) // Restar el saldo usado
      
      if (!updateResult.success) {
        console.error('Error al actualizar saldo:', updateResult.error)
        return { 
          success: false, 
          error: 'Orden procesada pero error al actualizar saldo. Contacte al administrador.',
          wasPaidWithSaldo: false
        }
      }
      
      return {
        success: true,
        orderNumber,
        wasPaidWithSaldo: true,
        saldoUsed: saldoAUsar,
        remainingSaldo: saldoRestante,
        deudaRestante: deudaRestante,
        isPartialPayment: isPartialPayment
      }
    }
    
    // 9. Si no se usó saldo, la orden queda como reservada
    return {
      success: true,
      orderNumber,
      wasPaidWithSaldo: false,
      deudaRestante: totalOrden,
      isPartialPayment: false
    }
    
  } catch (error) {
    console.error('Error en processOrderWithSaldo:', error)
    return { success: false, error: 'Error inesperado al procesar la orden', wasPaidWithSaldo: false }
  }
}

// Función para actualizar un concepto de servicio por otro
export async function updateConceptoService(
  conceptoId: number,
  nuevoServicioId: number,
  nuevoServicioNombre: string,
  nuevoServicioCosto: number,
  alumnoRef: string
): Promise<{
  success: boolean;
  error?: string;
  montoAbonado?: number;
  montoCobrado?: number;
}> {
  try {
    console.log('🔍 DEBUG updateConceptoService:')
    console.log('  - conceptoId:', conceptoId)
    console.log('  - nuevoServicioId:', nuevoServicioId)
    console.log('  - nuevoServicioNombre:', nuevoServicioNombre)
    console.log('  - nuevoServicioCosto:', nuevoServicioCosto)
    console.log('  - alumnoRef:', alumnoRef)

    // 1. Obtener el concepto actual para calcular diferencias
    const { data: conceptoActual, error: fetchError } = await supabase
      .from('pago_desayunos')
      .select('*')
      .eq('id', conceptoId)
      .single()

    console.log('  - Concepto actual obtenido:', conceptoActual)
    console.log('  - Error al obtener concepto:', fetchError)

    if (fetchError || !conceptoActual) {
      console.log('  - ❌ Error obteniendo concepto actual')
      return { success: false, error: 'No se pudo obtener el concepto actual' }
    }

    // 2. Calcular diferencia de costo
    const costoActual = conceptoActual.pago_costo
    const diferenciaCosto = nuevoServicioCosto - costoActual
    console.log('  - Costo actual:', costoActual)
    console.log('  - Diferencia de costo:', diferenciaCosto)

    // 3. Si el nuevo servicio es más caro, verificar saldo disponible
    if (diferenciaCosto > 0) {
      console.log('  - Servicio más caro, verificando saldo...')
      const saldoResult = await getSaldoAlumno(alumnoRef)
      console.log('  - Resultado de saldo:', saldoResult)
      
      if (!saldoResult.success) {
        console.log('  - ❌ Error verificando saldo')
        return { success: false, error: 'Error al verificar saldo del alumno' }
      }

      const saldoDisponible = saldoResult.saldo || 0
      console.log('  - Saldo disponible:', saldoDisponible)
      
      if (saldoDisponible < diferenciaCosto) {
        console.log('  - ❌ Saldo insuficiente')
        return { 
          success: false, 
          error: `Saldo insuficiente. Necesita $${diferenciaCosto.toFixed(2)} MXN adicionales.` 
        }
      }
    }

    // 4. Actualizar el concepto con el nuevo servicio
    console.log('  - Actualizando concepto en base de datos...')
    const { error: updateError } = await supabase
      .from('pago_desayunos')
      .update({
        pago_descripcion: nuevoServicioNombre,
        pago_costo: nuevoServicioCosto
        // Removido updated_at por ahora para evitar errores de campo inexistente
      })
      .eq('id', conceptoId)

    console.log('  - Error al actualizar:', updateError)

    if (updateError) {
      console.log('  - ❌ Error en actualización de base de datos')
      return { success: false, error: `Error al actualizar el servicio: ${updateError.message}` }
    }

    console.log('  - ✅ Concepto actualizado exitosamente')

    // 5. Manejar diferencias de costo
    if (diferenciaCosto > 0) {
      // Servicio más caro: descontar del saldo
      console.log('  - Descontando diferencia del saldo...')
      const updateSaldoResult = await upsertSaldoAlumno(alumnoRef, -diferenciaCosto)
      console.log('  - Resultado de descuento de saldo:', updateSaldoResult)
      
      if (!updateSaldoResult.success) {
        console.log('  - ❌ Error al descontar del saldo')
        return { 
          success: false, 
          error: 'Servicio actualizado pero error al descontar del saldo' 
        }
      }
      
      console.log('  - ✅ Saldo descontado exitosamente')
      return {
        success: true,
        montoCobrado: diferenciaCosto
      }
    } else if (diferenciaCosto < 0) {
      // Servicio más barato: abonar al saldo
      console.log('  - Abonando diferencia al saldo...')
      const montoAAbonar = Math.abs(diferenciaCosto)
      const updateSaldoResult = await upsertSaldoAlumno(alumnoRef, montoAAbonar)
      console.log('  - Resultado de abono de saldo:', updateSaldoResult)
      
      if (!updateSaldoResult.success) {
        console.log('  - ❌ Error al abonar al saldo')
        return { 
          success: false, 
          error: 'Servicio actualizado pero error al abonar al saldo' 
        }
      }
      
      console.log('  - ✅ Saldo abonado exitosamente')
      return {
        success: true,
        montoAbonado: montoAAbonar
      }
    } else {
      // Mismo precio
      console.log('  - ✅ Mismo precio, no hay cambios en saldo')
      return { success: true }
    }

  } catch (error) {
    console.error('❌ Error en updateConceptoService:', error)
    return { success: false, error: 'Error inesperado al modificar el servicio' }
  }
}

// Función para verificar si el alumno ya tiene una orden de emergencia sin pagar
export async function checkExistingEmergencyOrder(alumnoRef: string): Promise<{ 
  success: boolean; 
  hasEmergencyOrder: boolean; 
  error?: string;
  emergencyOrderNumber?: string;
  emergencyOrderTotal?: number;
}> {
  try {
    console.log('🔍 Verificando si el alumno ya tiene orden de emergencia:', alumnoRef)
    
    // Buscar órdenes de emergencia (estatus 3) para este alumno
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('pago_orden, pago_costo, pago_cantidad')
      .eq('pago_ref', alumnoRef)
      .eq('pago_estatus', 3) // Solo órdenes de emergencia
      .not('pago_orden', 'is', null)

    if (error) {
      console.error('❌ Error verificando órdenes de emergencia:', error)
      return { success: false, hasEmergencyOrder: false, error: 'Error al verificar órdenes de emergencia' }
    }

    if (!data || data.length === 0) {
      console.log('✅ No hay órdenes de emergencia existentes')
      return { success: true, hasEmergencyOrder: false }
    }

    // Agrupar por número de orden y calcular total
    const ordenes: { [key: string]: number } = {}
    data.forEach(item => {
      if (item.pago_orden) {
        if (!ordenes[item.pago_orden]) {
          ordenes[item.pago_orden] = 0
        }
        ordenes[item.pago_orden] += item.pago_costo * item.pago_cantidad
      }
    })

    // Tomar la primera orden de emergencia encontrada
    const emergencyOrderNumber = Object.keys(ordenes)[0]
    const emergencyOrderTotal = ordenes[emergencyOrderNumber] || 0

    console.log(`⚠️ Alumno ya tiene orden de emergencia: ${emergencyOrderNumber} por $${emergencyOrderTotal}`)
    
    return { 
      success: true, 
      hasEmergencyOrder: true, 
      emergencyOrderNumber,
      emergencyOrderTotal
    }
    
  } catch (error) {
    console.error('❌ Error inesperado verificando órdenes de emergencia:', error)
    return { success: false, hasEmergencyOrder: false, error: 'Error inesperado' }
  }
}

// Función para procesar órdenes de emergencia (NO usa saldo del alumno)
export async function processEmergencyOrder(
  alumnoRef: string,
  items: { desayuno_nombre: string; costo: number; fecha_pedido?: string }[],
  total: number
): Promise<{ 
  success: boolean; 
  error?: string; 
  orderNumber?: string;
  deudaRestante?: number;
  isPartialPayment?: boolean;
}> {
  try {
    console.log('🚨 Procesando orden de emergencia para alumno:', alumnoRef)
    console.log('📦 Items:', items)
    console.log('💰 Total:', total)
    
    // 1. Generar número de orden único
    const orderNumber = await generateUniqueOrderNumber()
    console.log('🔢 Número de orden generado:', orderNumber)
    
    // 2. Preparar los datos para insertar en pago_desayunos
    const dataToInsert = items.map(item => ({
      pago_ref: alumnoRef,
      pago_descripcion: item.desayuno_nombre,
      pago_costo: item.costo,
      pago_fecha: item.fecha_pedido || new Date().toISOString().split('T')[0],
      pago_cantidad: 1,
      pago_orden: orderNumber,
      pago_estatus: 3 // 3 = Emergencia (puede ser entregado sin pagar ese día)
    }))
    
    console.log('📝 Datos a insertar:', dataToInsert)
    
    // 3. Insertar la orden en la base de datos
    const { data, error } = await supabase
      .from('pago_desayunos')
      .insert(dataToInsert)
      .select()
    
    if (error) {
      console.error('❌ Error al insertar orden de emergencia:', error)
      return { success: false, error: 'Error al guardar la orden de emergencia' }
    }
    
    console.log('✅ Orden de emergencia guardada exitosamente:', data)
    
    // 4. Retornar éxito (NO se usa saldo, se paga a caja)
    return {
      success: true,
      orderNumber,
      deudaRestante: total, // Deuda total (se paga a caja)
      isPartialPayment: false // No es pago parcial, es pago completo a caja
    }
    
  } catch (error) {
    console.error('❌ Error en processEmergencyOrder:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}
