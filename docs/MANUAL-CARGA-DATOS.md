# Manual de Carga de Datos — Laboratorio InmunoXXI

Guia paso a paso para cargar los reportes mensuales de tiempos de entrega y verificar los resultados en Metabase.

## Paso 1: Iniciar sesion en el Portal

1. Abrir el navegador e ir a la direccion del portal (ej: `https://lab.boheforge.dev`)
2. Ingresar tu **usuario** y **contraseña**
3. Hacer clic en **"Ingresar"**

> Si no recuerdas tu contraseña, contactar al administrador.

---

## Paso 2: Seleccionar la automatizacion correcta

Al iniciar sesion veras una pantalla con tarjetas de automatizaciones disponibles. Cada tarjeta tiene un nombre y descripcion.

**Elegir segun el tipo de archivo exportado:**

| Tipo de archivo | Automatizacion a usar |
|---|---|
| Un archivo `.xls` con TODAS las secciones juntas | **Tiempos Global** |
| Varios archivos `.xls` (uno por cada seccion) | **Tiempos por Seccion** |
| Un archivo `.xls` con multiples hojas (una hoja por seccion) | **Tiempos Unificado** |

Hacer clic en el boton **"Subir"** de la tarjeta correspondiente.

---

## Paso 3: Cargar el archivo

1. En la pantalla de carga puedes:
   - **Arrastrar** el archivo desde tu computador al recuadro punteado, o
   - **Hacer clic** en el recuadro para abrir el explorador de archivos y seleccionarlo

2. El archivo aparecera en la lista con estado **"Pendiente"**
   - Si seleccionaste el archivo equivocado, haz clic en el icono de papelera para eliminarlo

3. Hacer clic en el boton azul **"Procesar 1 archivo"** (o "Procesar N archivos" si son varios)

4. Esperar a que termine:
   - Veras **"Procesando..."** con un icono girando
   - Cuando termine, cada archivo mostrara:
     - **"Procesado"** (verde) = carga exitosa
     - **"Error"** (rojo) = hubo un problema (leer el mensaje de error)

5. Si todo salio bien veras un mensaje verde: **"Todos los archivos fueron procesados exitosamente"**

> **Importante:** Si un archivo muestra error, verificar que:
> - El archivo sea `.xls` (no PDF ni otro formato)
> - El archivo corresponda al tipo de automatizacion seleccionada
> - El periodo de fechas sea correcto en el reporte

---

## Paso 4: Verificar en Metabase

1. Abrir Metabase en el navegador (ej: `https://lab-dashboard.boheforge.dev`)
2. Iniciar sesion con tu usuario de Metabase
3. Ir al dashboard de **Tiempos de Entrega**

### Que verificar

- **Reporte mensual:** Buscar el mes recien cargado y confirmar que aparecen todas las secciones con sus dias y eficacia
- **Eficacia:** Cada seccion debe mostrar CUMPLE, ALERTA o NO CUMPLE (no debe decir "SIN META")
- **Portafolio:** Verificar el % de pruebas fuera de meta por seccion
- **Promedio acumulado:** Confirmar que el promedio del año se actualizo con el nuevo mes

### Filtros utiles en Metabase

- **Tipo:** Filtrar por `INMUNOXXI` (secciones propias) o `REFERIDO` (secciones referidas)
- **Año / Mes:** Filtrar por periodo especifico
- **Seccion:** Ver detalle de una seccion en particular

---

## Resumen rapido

```
Enterprise (exportar .xls)
    ↓
Portal (subir archivo)
    ↓
Metabase (verificar resultados)
```

---

## Problemas comunes

| Problema | Solucion |
|---|---|
| No veo automatizaciones al entrar | Contactar al administrador para que te asigne los permisos |
| El archivo da error al procesarlo | Verificar que sea `.xls` y que corresponda a la automatizacion elegida |
| En Metabase no aparece el mes nuevo | Esperar 1 minuto y refrescar. Si persiste, verificar que el archivo se proceso sin errores |
| La eficacia dice "SIN META" | La seccion no tiene meta configurada. Contactar al administrador |
| Los numeros no coinciden con Enterprise | Verificar que el rango de fechas del reporte sea el correcto (mes completo) |
