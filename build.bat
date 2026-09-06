@echo off
setlocal
echo ============================================
echo  MotoFlow - Build del motor C++
echo ============================================

rem ---- 1) Test local con g++ (consola) ----
if not exist build mkdir build
echo [1/2] Compilando CLI con g++...
g++ -std=c++17 -DMOTOR_CLI -o build\motor_cli.exe wasm\src\motor.cpp
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo compilar el CLI. Revisa que MinGW/g++ este en el PATH.
) else (
    echo OK: build\motor_cli.exe
)

echo.
rem ---- 2) Build WebAssembly con Emscripten ----
echo [2/2] Compilando WASM con emcc...
where emcc >nul 2>nul
if errorlevel 1 (
    echo [AVISO] emcc no encontrado en el PATH.
    echo Instala Emscripten una vez:  https://emscripten.org/docs/getting_started/downloads.html
    echo (emsdk install latest ^&^& emsdk activate latest ^&^& emsdk_env.bat)
    echo Mientras tanto, la app sigue funcionando con el fallback en JavaScript (modo demo).
    exit /b 0
)

emcc wasm\src\motor.cpp -o wasm\out\motor.js ^
    -s EXPORTED_FUNCTIONS="['_tarifaDinamica','_factorDemanda','_factorClima','_scoreDesgaste','_estadoMantenimiento']" ^
    -s EXPORTED_RUNTIME_METHODS="['cwrap','ccall']" ^
    -s ALLOW_MEMORY_GROWTH=1 -O2

if errorlevel 1 (
    echo [ERROR] Fallo el build WASM.
    exit /b 1
)

echo OK: wasm\out\motor.js + wasm\out\motor.wasm
echo Listo. Recarga la pagina y el motor corre en WebAssembly.
endlocal