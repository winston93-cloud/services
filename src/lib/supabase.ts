import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos para la tabla usuario
export interface Usuario {
  id?: number
  usuario_username: string
  usuario_password: string
  created_at?: string
  updated_at?: string
}

// Función para login
export async function loginUser(username: string, password: string): Promise<{ success: boolean; error?: string; user?: Usuario }> {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('usuario_username', username)
      .eq('usuario_password', password)
      .single()

    if (error) {
      return { success: false, error: 'Usuario o contraseña incorrectos' }
    }

    if (!data) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Error en login:', error)
    return { success: false, error: 'Error de conexión. Intente nuevamente.' }
  }
}
