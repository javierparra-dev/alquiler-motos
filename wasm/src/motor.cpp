// ============================================================
//  MotoFlow Optimizer - Motor de calculo (C++)
//
//  Algoritmos: tarifa dinamica (oferta/demanda + clima) y
//  desgaste/mantenimiento de la flota.
//
//  Compilas a WebAssembly (Emscripten) para correr en el navegador:
//      emcc wasm\src\motor.cpp -o wasm\out\motor.js ...
//
//  Modo consola para test local sin Emscripten (GCC):
//      g++ -std=c++17 -DMOTOR_CLI -o build\motor_cli.exe wasm\src\motor.cpp
// ============================================================

// ---------------- Constantes de tarifa ----------------
// Multiplicador de demanda segun motos libres en la zona.
constexpr double DEMANDA_ALTA  = 1.50; //  < 3 motos libres
constexpr double DEMANDA_MEDIA = 1.25; //  3..6 motos libres
constexpr double DEMANDA_BAJA  = 1.00; //  > 6 motos libres

// Horas pico que suman un extra de demanda.
constexpr double HORA_PICO_EXTRA = 0.15;
constexpr int    PICO_MANANA_INI = 7;  // 07:00-09:59
constexpr int    PICO_MANANA_FIN = 10;
constexpr int    PICO_TARDE_INI  = 17; // 17:00-20:59
constexpr int    PICO_TARDE_FIN  = 21;

// Clima: 0 soleado, 1 nublado, 2 lluvia, 3 tormenta.
constexpr int CLIMA_SOLEADO  = 0;
constexpr int CLIMA_NUBLADO  = 1;
constexpr int CLIMA_LLUVIA   = 2;
constexpr int CLIMA_TORMENTA = 3;
constexpr double CLIMA_MULT[] = {1.00, 1.10, 1.30, 1.50};

// ---------------- Constantes de mantenimiento ----------------
// Puntaje de desgaste 0..100 (pesado por km y horas de uso).
constexpr double PESO_KM          = 50.0;  // 30.000 km  -> 50 puntos
constexpr double KM_REFERENCIA    = 30000.0;
constexpr double PESO_HORAS       = 50.0;  // 1.000 horas-> 50 puntos
constexpr double HORAS_REFERENCIA = 1000.0;

constexpr int MANT_OK      = 0;
constexpr int MANT_PROXIMO = 1;
constexpr int MANT_TALLER  = 2;

// ---------------- API compartida (WASM) ----------------
#ifdef __cplusplus
extern "C" {
#endif

// Multiplicador de demanda segun motos libres y hora del dia (0-23).
double factorDemanda(int motosLibres, int hora) {
    double f = DEMANDA_BAJA;
    if (motosLibres < 3)               f = DEMANDA_ALTA;
    else if (motosLibres <= 6)         f = DEMANDA_MEDIA;

    bool pico = (hora >= PICO_MANANA_INI && hora < PICO_MANANA_FIN) ||
                (hora >= PICO_TARDE_INI  && hora < PICO_TARDE_FIN);
    if (pico) f += HORA_PICO_EXTRA;

    return f;
}

// Multiplicador segun el clima (0..3).
double factorClima(int clima) {
    if (clima < 0) clima = 0;
    if (clima > 3) clima = 3;
    return CLIMA_MULT[clima];
}

// Precio final del alquiler de una ruta:
//   (precioBase + precioKm * km) * factorDemanda * factorClima
double tarifaDinamica(double precioBase, double precioKm, double km,
                      int motosLibres, int clima, int hora) {
    double subtotal = precioBase + precioKm * km;
    return subtotal * factorDemanda(motosLibres, hora) * factorClima(clima);
}

// Puntaje de desgaste de una moto (0..100).
double scoreDesgaste(int km, int horasUso) {
    if (km < 0)       km = 0;
    if (horasUso < 0) horasUso = 0;

    double s = PESO_KM * (km / KM_REFERENCIA) +
               PESO_HORAS * (horasUso / HORAS_REFERENCIA);
    if (s > 100.0) s = 100.0;
    return s;
}

// Estado de mantenimiento: 0 OK, 1 proximo, 2 taller.
int estadoMantenimiento(int km, int horasUso) {
    double s = scoreDesgaste(km, horasUso);
    if (s >= 70.0) return MANT_TALLER;
    if (s >= 40.0) return MANT_PROXIMO;
    return MANT_OK;
}

#ifdef __cplusplus
}
#endif

// ---------------- Modo consola (test local con g++) ----------------
#ifdef MOTOR_CLI
#include <cstdio>
#include <cstdlib>

int main(int argc, char** argv) {
    if (argc < 7) {
        std::printf(
            "Uso: motor_cli <base> <precio_km> <km_ruta> <motosLibres>"
            " <clima(0-3)> <hora(0-23)> [km_moto] [horasUso]\n"
            "Ej.: motor_cli 3500 280 12 4 2 10 850 40\n");
        return 1;
    }

    double base     = std::atof(argv[1]);
    double precioKm = std::atof(argv[2]);
    double kmRuta   = std::atof(argv[3]);
    int    libres   = std::atoi(argv[4]);
    int    clima    = std::atoi(argv[5]);
    int    hora     = std::atoi(argv[6]);

    std::printf("factorDemanda(%d, %d)        = %.2f\n",
                libres, hora, factorDemanda(libres, hora));
    std::printf("factorClima(%d)              = %.2f\n",
                clima, factorClima(clima));
    std::printf("tarifaDinamica               = %.2f\n",
                tarifaDinamica(base, precioKm, kmRuta, libres, clima, hora));

    if (argc >= 9) {
        int kmMoto = std::atoi(argv[7]);
        int horas  = std::atoi(argv[8]);
        std::printf("scoreDesgaste(%d, %d)       = %.1f\n",
                    kmMoto, horas, scoreDesgaste(kmMoto, horas));
        std::printf("estadoMantenimiento         = %d\n",
                    estadoMantenimiento(kmMoto, horas));
    }
    return 0;
}
#endif