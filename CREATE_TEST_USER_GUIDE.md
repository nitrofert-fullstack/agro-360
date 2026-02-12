# Guía: Crear Usuario Asesor de Prueba

## Problema
La tabla `profiles` está vacía. Cuando intentas hacer login, el sistema no encuentra el perfil del usuario en la BD.

## Solución: 4 Pasos Simples

### **PASO 1: Crear Usuario en Supabase Auth**

1. Ve a **supabase.com** → Tu proyecto
2. Ve a **Authentication** → **Users**
3. Haz clic en **"Invite"** (arriba a la derecha)
4. Ingresa:
   - **Email**: `asesor@agro360.com` (o cualquier email)
   - **Password**: `Asesor123!` (o una contraseña segura)
5. Haz clic en **"Send Invite"**
6. **Copia el UUID del usuario** (está en la primera columna)
   - Ejemplo: `550e8400-e29b-41d4-a716-446655440000`

### **PASO 2: Obtener el UUID**

1. En la lista de usuarios, verás una fila con tu usuario
2. El primer valor es el UUID
3. Cópialo (es un formato como: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### **PASO 3: Ejecutar SQL en Supabase**

1. Ve a **SQL Editor** (lado izquierdo)
2. Haz clic en **"New Query"**
3. Copia este SQL:

```sql
INSERT INTO public.profiles (
  id,
  email,
  nombre_completo,
  rol,
  telefono,
  estado
) VALUES (
  'AQUI_PEGA_TU_UUID',
  'asesor@agro360.com',
  'Juan Asesor',
  'asesor',
  '+573001234567',
  'activo'
);
```

4. **Reemplaza `AQUI_PEGA_TU_UUID`** con el UUID que copiaste en PASO 2
5. Haz clic en **"Run"**

**Ejemplo correcto:**
```sql
INSERT INTO public.profiles (
  id,
  email,
  nombre_completo,
  rol,
  telefono,
  estado
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'asesor@agro360.com',
  'Juan Asesor',
  'asesor',
  '+573001234567',
  'activo'
);
```

### **PASO 4: Hacer Login en la App**

1. En la app, ve a **Login** (o Register)
2. Ingresa:
   - **Email**: `asesor@agro360.com`
   - **Password**: `Asesor123!`
3. Haz clic en **Ingresar**
4. Deberías entrar al Dashboard

---

## ¿Si no funciona?

### Error: "Could not find the table 'public.profiles' in the schema cache"
- **Solución**: Espera 2-3 segundos y recarga la página (F5)
- Supabase a veces tarda en actualizar el cache

### Error: "duplicate key value violates unique constraint"
- **Solución**: Ya existe un usuario con ese UUID
- Copia el UUID nuevamente y asegúrate que sea correcto

### Error: "invalid input syntax for type uuid"
- **Solución**: El UUID que pegaste no es válido
- Cópialo nuevamente del panel de usuarios

---

## Múltiples Usuarios (Opcional)

Si quieres crear más usuarios asesores:

```sql
INSERT INTO public.profiles (id, email, nombre_completo, rol, telefono, estado) 
VALUES ('UUID_AQUI', 'asesor2@agro360.com', 'María Asesor', 'asesor', '+573009876543', 'activo');
```

---

## Verificar que Funcionó

1. Login exitoso → Dashboard muestra
2. En Dashboard, verás un badge de **"Conectado"** (verde)
3. Puedes crear caracterizaciones

¡Listo! Ya tienes un usuario asesor funcionando.
