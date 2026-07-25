# Plan de Implementación: Usuarios, Autenticación y Roles

Este plan detalla los pasos para migrar del usuario hardcodeado actual a un sistema multiusuario robusto con dos niveles de rol (**Administrador** y **Operador**) utilizando **Supabase Auth** y disparadores relacionales.

---

## 1. Diseño de la Base de Datos (SQL)

Debido a que Supabase maneja los usuarios autenticados en su esquema interno (`auth.users`), la práctica recomendada es crear una tabla espejo de perfiles (`public.profiles`) vinculada por clave foránea.

Ejecuta el siguiente bloque SQL en tu consola de Supabase:

```sql
-- ========================================================
-- 1. CREACIÓN DE LA TABLA DE PERFILES
-- ========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'Operador', -- Roles admisibles: 'Administrador' o 'Operador'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
CREATE POLICY "Permitir a usuarios leer todos los perfiles" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Permitir a usuarios modificar su propio perfil" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ========================================================
-- 2. DISPARADOR AUTOMÁTICO AL REGISTRAR UN USUARIO
-- ========================================================
-- Esta función se ejecuta en el esquema 'auth' y duplica el usuario en 'public.profiles'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, rol)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Nuevo Operador'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'rol', 'Operador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado tras INSERT en auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 2. Configuración en React (Front-end)

### A. Pantalla de Login (`LoginScreen.jsx`)
Crea un componente para autenticar a los operadores. El código del formulario interactúa directamente con el cliente de Supabase:

```javascript
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, Mail, Loader2 } from 'lucide-react';

export default function LoginScreen({ showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showToast(error.message, true);
    } else {
      showToast('Bienvenido al sistema');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-foreground text-center">Acceso al Sistema</h2>
        {/* Inputs de Email y Password */}
        <button type="submit" disabled={loading} className="w-full bg-accent text-white py-2 rounded-xl">
          {loading ? <Loader2 className="animate-spin mx-auto w-4 h-4" /> : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
```

### B. Escucha de Sesión en `App.jsx`
En tu archivo principal, reemplaza el estado hardcodeado de `userProfile` por una escucha de sesión activa:

```javascript
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoadingAuth(false);
    });

    // 2. Suscribirse a cambios de estado de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setUserProfile(data);
    }
    setLoadingAuth(false);
  };
```

---

## 3. Seguridad a Nivel de Fila (RLS) en Producción

Una vez que tengas perfiles con roles, puedes securizar tus tablas en Supabase. 

Por ejemplo, si deseas que **solamente los Administradores** puedan modificar la tabla de `torres` (crear, editar o eliminar posiciones físicas de almacenamiento):

```sql
-- Eliminar las políticas abiertas de desarrollo
DROP POLICY "Permitir todo a torres" ON torres;

-- Crear políticas restrictivas basadas en el rol del usuario autenticado
CREATE POLICY "Permitir leer torres a todos"
  ON torres FOR SELECT USING (true);

CREATE POLICY "Permitir escribir torres solo a Administradores"
  ON torres FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.rol = 'Administrador'
    )
  );
```

Este esquema asegura que un operador con acceso al teléfono no pueda realizar modificaciones destructivas accidentales en la base de datos central de almacenamiento de la planta.
