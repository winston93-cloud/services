import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('🔧 DEBUG Supabase Config:')
console.log('  - supabaseUrl:', supabaseUrl ? '✅ Configurado' : '❌ No configurado')
console.log('  - supabaseKey:', supabaseKey ? '✅ Configurado' : '❌ No configurado')

export const supabase = createClient(supabaseUrl, supabaseKey)

// Test de conexión a Supabase
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.log('❌ Error de conexión a Supabase:', error)
  } else {
    console.log('✅ Conexión a Supabase exitosa')
  }
})

// Función de test para verificar la tabla alumno
export async function testAlumnoTable() {
  try {
    console.log('🧪 TEST: Verificando tabla alumno...')
    
    // Test 1: Verificar que la tabla existe
    const { data: testData, error: testError } = await supabase
      .from('alumno')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('❌ Error accediendo a tabla alumno:', testError)
      return false
    }
    
    console.log('✅ Tabla alumno accesible')
    
    // Test 2: Verificar estructura de la tabla
    console.log('🔍 Test 2: Intentando obtener estructura de la tabla...')
    
    // Test 2a: Probar con select específico
    const { data: structureDataSpecific, error: structureErrorSpecific } = await supabase
      .from('alumno')
      .select('alumno_ref, alumno_nombre')
      .limit(5)
    
    if (structureErrorSpecific) {
      console.log('❌ Error con select específico:', structureErrorSpecific)
    } else {
      console.log('✅ Select específico exitoso:', structureDataSpecific)
    }
    
    // Test 2b: Probar con select count
    const { data: countData, error: countError } = await supabase
      .from('alumno')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log('❌ Error obteniendo count:', countError)
    } else {
      console.log('✅ Count de registros:', countData)
    }
    
    // Test 2c: Probar con select * (original)
    const { data: structureData, error: structureError } = await supabase
      .from('alumno')
      .select('*')
      .limit(5)
    
    if (structureError) {
      console.log('❌ Error obteniendo estructura completa:', structureError)
      console.log('  - Código:', structureError.code)
      console.log('  - Mensaje:', structureError.message)
      console.log('  - Detalles:', structureError.details)
    } else {
      console.log('✅ Estructura completa obtenida:', structureData)
    }
    
    // Test 2.1: Verificar campos específicos
    if (structureData && structureData.length > 0) {
      const firstRecord = structureData[0]
      console.log('🔍 Campos disponibles en el primer registro:')
      console.log('  - Keys:', Object.keys(firstRecord))
      console.log('  - Primer registro completo:', firstRecord)
      
      // Verificar si existe alumno_ref
      if ('alumno_ref' in firstRecord) {
        console.log('✅ Campo alumno_ref encontrado')
      } else {
        console.log('❌ Campo alumno_ref NO encontrado')
        console.log('🔍 Buscando campos similares...')
        const possibleFields = Object.keys(firstRecord).filter(key => 
          key.toLowerCase().includes('ref') || 
          key.toLowerCase().includes('control') || 
          key.toLowerCase().includes('numero') ||
          key.toLowerCase().includes('id')
        )
        console.log('  - Campos posibles:', possibleFields)
      }
    }
    
    // Test 3: Buscar específicamente el número de control 20230
    console.log('🔍 Buscando alumno con número de control 20230...')
    const { data: alumno20230, error: alumnoError } = await supabase
      .from('alumno')
      .select('*')
      .eq('alumno_ref', '20230')
      .single()
    
    if (alumnoError) {
      console.log('❌ Error buscando alumno 20230:', alumnoError)
      console.log('  - Código de error:', alumnoError.code)
      console.log('  - Mensaje:', alumnoError.message)
      console.log('  - Detalles:', alumnoError.details)
    } else if (alumno20230) {
      console.log('✅ Alumno 20230 encontrado:', alumno20230)
    } else {
      console.log('❌ Alumno 20230 NO encontrado')
    }
    
    // Test 3.1: Probar con .maybeSingle() en lugar de .single()
    console.log('🔍 Probando con .maybeSingle() para alumno 20230...')
    const { data: alumno20230Maybe, error: alumno20230MaybeError } = await supabase
      .from('alumno')
      .select('*')
      .eq('alumno_ref', '20230')
      .maybeSingle()
    
    if (alumno20230MaybeError) {
      console.log('❌ Error con .maybeSingle():', alumno20230MaybeError)
    } else if (alumno20230Maybe) {
      console.log('✅ Alumno 20230 encontrado con .maybeSingle():', alumno20230Maybe)
    } else {
      console.log('❌ Alumno 20230 NO encontrado con .maybeSingle()')
    }
    
    // Test 4: Verificar si hay otras tablas relacionadas
    console.log('🔍 Verificando otras tablas posibles...')
    
    // Probar tabla 'alumnos' (plural)
    try {
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('*')
        .limit(1)
      
      if (!alumnosError && alumnosData) {
        console.log('✅ Tabla "alumnos" (plural) encontrada con datos:', alumnosData)
      }
    } catch (e) {
      console.log('❌ Tabla "alumnos" (plural) no existe')
    }
    
    // Probar tabla 'estudiantes'
    try {
      const { data: estudiantesData, error: estudiantesError } = await supabase
        .from('estudiantes')
        .select('*')
        .limit(1)
      
      if (!estudiantesError && estudiantesData) {
        console.log('✅ Tabla "estudiantes" encontrada con datos:', estudiantesData)
      }
    } catch (e) {
      console.log('❌ Tabla "estudiantes" no existe')
    }
    
    // Probar tabla 'usuarios'
    try {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1)
      
      if (!usuariosError && usuariosData) {
        console.log('✅ Tabla "usuarios" encontrada con datos:', usuariosData)
      }
    } catch (e) {
      console.log('❌ Tabla "usuarios" no existe')
    }
    
    // Test 5: Verificar RLS y probar con autenticación
    console.log('🔍 Test 5: Verificando RLS y autenticación...')
    
    // Probar si el problema es de autenticación
    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError) {
      console.log('❌ Error de autenticación:', authError)
    } else {
      console.log('✅ Estado de autenticación:', authData.session ? 'Autenticado' : 'No autenticado')
    }
    
    // Probar con una consulta SQL directa (si es posible)
    console.log('🔍 Test 6: Probando consulta SQL directa...')
    try {
      const { data: sqlData, error: sqlError } = await supabase
        .rpc('get_alumno_count')
      
      if (sqlError) {
        console.log('❌ Error en función RPC:', sqlError)
      } else {
        console.log('✅ Función RPC exitosa:', sqlData)
      }
    } catch (e) {
      console.log('❌ Función RPC no disponible')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error en test de tabla alumno:', error)
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

// Función para login con número de control
export async function loginAlumno(numeroControl: string): Promise<{ success: boolean; error?: string; user?: Alumno }> {
  try {
    console.log('🔍 DEBUG loginAlumno:')
    console.log('  - numeroControl:', numeroControl)
    
    const { data, error } = await supabase
      .from('alumno')
      .select('*')
      .eq('alumno_ref', numeroControl)
      .single()

    console.log('  - Supabase response:')
    console.log('    - data:', data)
    console.log('    - error:', error)

    if (error) {
      console.log('  - ❌ Error de Supabase:', error)
      return { success: false, error: 'Número de control no encontrado' }
    }

    if (!data) {
      console.log('  - ❌ No se encontraron datos')
      return { success: false, error: 'Alumno no encontrado' }
    }

    console.log('  - ✅ Login exitoso, usuario encontrado:', data)
    return { success: true, user: data }
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

// Función para obtener todos los pagos (reservados y pagados) que no han pasado de fecha
export async function getAllPagosVigentes(alumnoRef: string): Promise<{ success: boolean; error?: string; data?: PagoDesayuno[] }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalizar a inicio del día
    
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('*')
      .eq('pago_ref', alumnoRef)
      .in('pago_estatus', [1, 2]) // Estatus 1 (pagado) y 2 (reservado)
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
    // Primero obtener los datos del concepto antes de eliminarlo
    const { data: concepto, error: fetchError } = await supabase
      .from('pago_desayunos')
      .select('pago_costo, pago_cantidad, pago_estatus, pago_fecha, pago_descripcion')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error obteniendo datos del concepto:', fetchError)
      return { success: false, error: 'Error al obtener datos del concepto' }
    }

    if (!concepto) {
      return { success: false, error: 'Concepto no encontrado' }
    }

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
    const { error: deleteError } = await supabase
      .from('pago_desayunos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error en Supabase:', deleteError)
      return { success: false, error: 'Error al eliminar concepto' }
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
    // Obtener la orden actual (con estatus 2 - reservada pero no pagada)
    const { data, error } = await supabase
      .from('pago_desayunos')
      .select('pago_costo, pago_cantidad, pago_estatus, pago_orden, pago_fecha')
      .eq('pago_ref', alumnoRef)
      .eq('pago_estatus', 2) // Solo servicios reservados pero no pagados
      .not('pago_orden', 'is', null) // Asegurar que tenga número de orden

    if (error) {
      console.error('Error en Supabase:', error)
      return { success: false, error: 'Error al cargar datos financieros' }
    }

    if (!data || data.length === 0) {
      return { success: true, adeudos: 0 }
    }

    // Agrupar por número de orden (debería ser solo una orden)
    const ordenes: { [key: string]: number } = {}
    
    data.forEach(item => {
      if (item.pago_orden) {
        if (!ordenes[item.pago_orden]) {
          ordenes[item.pago_orden] = 0
        }
        ordenes[item.pago_orden] += item.pago_costo * item.pago_cantidad
      }
    })
    
    // Tomar la primera orden (debería ser solo una)
    const numeroOrden = Object.keys(ordenes)[0]
    const adeudos = ordenes[numeroOrden] || 0
    
    return { success: true, adeudos: Math.round(adeudos * 100) / 100 }
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

// Función para procesar pago automático con saldo
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
    
    // 3. Verificar si el saldo cubre toda la orden
    const saldoSuficiente = saldoActual >= totalOrden
    
    // 4. Generar número de orden único
    const orderNumber = await generateUniqueOrderNumber()
    
    // 5. Determinar el estatus de la orden
    const estatusOrden = saldoSuficiente ? 1 : 2 // 1 = pagada, 2 = reservada
    
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
    
    // 8. Si se pagó con saldo, actualizar el saldo del alumno
    if (saldoSuficiente) {
      const saldoRestante = saldoActual - totalOrden
      const updateResult = await upsertSaldoAlumno(alumnoRef, -totalOrden) // Restar el total usado
      
      if (!updateResult.success) {
        console.error('Error al actualizar saldo:', updateResult.error)
        // La orden se guardó pero no se actualizó el saldo - esto es un problema
        // Podríamos considerar hacer rollback de la orden
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
        saldoUsed: totalOrden,
        remainingSaldo: saldoRestante
      }
    }
    
    // 9. Si no se pagó con saldo, la orden queda como reservada
    return {
      success: true,
      orderNumber,
      wasPaidWithSaldo: false
    }
    
  } catch (error) {
    console.error('Error en processOrderWithSaldo:', error)
    return { success: false, error: 'Error inesperado al procesar la orden', wasPaidWithSaldo: false }
  }
}
