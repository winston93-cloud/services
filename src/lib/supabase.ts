import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  pago_fecha: string
  pago_cantidad: number
  pago_orden: string // número de orden generado
  pago_estatus: number // 0 inicial, 2 en proceso
}

// Función para login con número de control
export async function loginAlumno(numeroControl: string): Promise<{ success: boolean; error?: string; user?: Alumno }> {
  try {
    const { data, error } = await supabase
      .from('alumno')
      .select('*')
      .eq('alumno_ref', numeroControl)
      .single()

    if (error) {
      return { success: false, error: 'Número de control no encontrado' }
    }

    if (!data) {
      return { success: false, error: 'Alumno no encontrado' }
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Error en login:', error)
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
      pago_fecha: new Date().toISOString().split('T')[0], // Solo la fecha
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

// Función para actualizar fecha de un concepto pagado
export async function updateConceptoFecha(id: number, nuevaFecha: string): Promise<{ success: boolean; error?: string }> {
  try {
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
