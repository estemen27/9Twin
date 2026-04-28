# 🛡️ Manual de Calidad y Automatización (Prof. Yosimar)

Este repositorio no es solo un lugar para guardar código; es un entorno de desarrollo profesional con **Integración Continua (CI)**. Como su **Líder Técnico**, he configurado un "Robot de Calidad" que validará cada una de sus entregas de manera automática.

## 🤖 ¿Qué es el Robot de Calidad?
Es un flujo automatizado (**GitHub Actions**) que se activa cada vez que ustedes abren un **Pull Request (PR)**. El robot revisará de forma autónoma:
1. Que el código compile correctamente sin errores fatales.
2. Que todas las pruebas unitarias pasen (estén en verde).
3. Que no existan errores de dependencias o librerías faltantes.

## 🚦 Reglas de Oro para la Entrega
* **❌ Roja = Tarea no recibida:** Si el robot marca una X roja, significa que algo falló técnicamente. Deben entrar al log del robot, leer el error y corregirlo. **No se realizará revisión manual de código que no pase el Gate de Calidad.**
* **✅ Verde = Listo para Revisión:** Solo cuando el robot esté en verde, procederemos con la revisión técnica y de negocio (Scrum Master).
* **📋 Checklist de PR:** Al abrir un PR, verán una plantilla. Es obligatorio marcar todos los puntos para asegurar que probaron su código localmente antes de subirlo.

## 🛠️ Requisitos Técnicos por Lenguaje
Para que el robot reconozca sus proyectos, deben incluir los archivos estándar en sus respectivas carpetas:

### 🐍 Python
* **Archivo obligatorio:** `requirements.txt` (donde listan sus librerías).
* **Comando local:** `pytest`
* **Carpeta de tests sugerida:** `/tests`

### 📦 Frontend (React / JS / TS)
* **Archivo obligatorio:** `package.json`
* **Comando local:** `npm test`
* **Nota:** Asegúrense de que sus tests no se queden en modo "watch" infinito.

### ☕ Java
* **Archivo obligatorio:** `pom.xml` (Maven) o `build.gradle` (Gradle).
* **Comando local:** `./mvnw test` o `./gradlew test`

## 🚀 Pasos para una entrega exitosa
1.  **Rama Propia:** Creen una rama (*branch*) con su nombre o funcionalidad (ej: `feat/validacion-datos-yosimar`).
2.  **Pruebas Locales:** Desarrollen y corran las pruebas en su máquina local antes de hacer `push`.
3.  **Pull Request:** Abran el PR hacia la rama `main`.
4.  **Seguimiento:** Llenen la plantilla y esperen el veredicto del robot. Si falla, ¡corrijan y vuelvan a subir al mismo PR!

---
> *"En este equipo, el software no termina cuando el código está escrito, sino cuando las pruebas lo validan."*
