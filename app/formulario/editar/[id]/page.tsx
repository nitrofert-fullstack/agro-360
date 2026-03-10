"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CharacterizationFormComplete } from "@/components/characterization-form-complete"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, AlertTriangle } from "lucide-react"

export default function EditarFormularioPage() {
    const params = useParams()
    const router = useRouter()
    const { id } = params as { id: string }
    const { isAuthenticated, loading: authLoading } = useAuth()

    const [initialData, setInitialData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!isAuthenticated) {
            router.push("/auth/login")
            return
        }

        const loadData = async () => {
            try {
                const res = await fetch(`/api/caracterizacion/${encodeURIComponent(id)}`)
                if (!res.ok) {
                    throw new Error("No se pudo cargar el formulario")
                }

                const serverData = await res.json()

                // Mapear de ServerData a FormData (el formato usado por el componente)
                const mappedData = {
                    visita: {
                        fechaVisita: serverData.visita?.fecha_visita || "",
                        nombreTecnico: serverData.visita?.nombre_tecnico || "",
                        codigoFormulario: serverData.visita?.radicado_local || "",
                        versionFormulario: "1.0",
                        fechaEmisionFormulario: new Date().toISOString().split("T")[0],
                    },
                    beneficiario: {
                        nombres: serverData.beneficiario?.nombres || "",
                        apellidos: serverData.beneficiario?.apellidos || "",
                        tipoDocumento: serverData.beneficiario?.tipo_documento || "CC",
                        numeroDocumento: serverData.beneficiario?.numero_documento || "",
                        fechaNacimiento: serverData.beneficiario?.fecha_nacimiento || "",
                        edad: serverData.beneficiario?.edad ?? null,
                        genero: serverData.beneficiario?.genero || "",
                        personasACargo: serverData.beneficiario?.personas_a_cargo ?? null,
                        telefono: serverData.beneficiario?.telefono || "",
                        correo: serverData.beneficiario?.correo || "",
                        ocupacionPrincipal: serverData.beneficiario?.ocupacion_principal || "",
                    },
                    contactoSecundario: {
                        nombre: serverData.beneficiario?.nombre_contacto_secundario || "",
                        telefono: serverData.beneficiario?.telefono_secundario || "",
                        parentesco: serverData.beneficiario?.parentesco_contacto_secundario || "",
                    },
                    predio: {
                        nombrePredio: serverData.predio?.nombre_predio || "",
                        departamento: serverData.predio?.departamento || "Santander",
                        municipio: serverData.predio?.municipio || "",
                        vereda: serverData.predio?.vereda || "",
                        direccion: serverData.predio?.direccion || "",
                        codigoCatastral: serverData.predio?.codigo_catastral || "",
                        documentoTenencia: serverData.predio?.documento_tenencia || "",
                        tipoTenencia: serverData.predio?.tipo_tenencia || "",
                        tipoTenenciaOtro: serverData.predio?.tipo_tenencia_otro || "",
                        coordenadaX: serverData.predio?.coordenada_x || "",
                        coordenadaY: serverData.predio?.coordenada_y || "",
                        latitud: serverData.predio?.latitud ?? 7.1254,
                        longitud: serverData.predio?.longitud ?? -73.1198,
                        poligono: (() => { try { return typeof serverData.predio?.poligono === 'string' ? JSON.parse(serverData.predio.poligono) : serverData.predio?.poligono } catch { return undefined } })(),
                        tipoUbicacion: (() => {
                            const pol = serverData.predio?.poligono
                            if (pol && (Array.isArray(pol) ? pol.length > 0 : pol !== '[]' && pol !== 'null')) return 'poligono' as const
                            if (serverData.predio?.latitud != null && serverData.predio?.longitud != null) return 'punto' as const
                            return undefined
                        })(),
                        altitudMsnm: serverData.predio?.altitud_msnm ?? null,
                        viveEnPredio: serverData.predio?.vive_en_predio || "",
                        tieneVivienda: serverData.predio?.tiene_vivienda ?? false,
                        areaTotalHectareas: serverData.predio?.area_total_hectareas ?? null,
                        areaProductivaHectareas: serverData.predio?.area_productiva_hectareas ?? null,
                        cultivosExistentes: serverData.predio?.cultivos_existentes || "",
                    },
                    caracterizacion: {
                        rutaAcceso: serverData.caracterizacionPredio?.ruta_acceso || "",
                        distanciaKm: serverData.caracterizacionPredio?.distancia_km ?? null,
                        tiempoAcceso: serverData.caracterizacionPredio?.tiempo_acceso || "",
                        temperaturaCelsius: serverData.caracterizacionPredio?.temperatura_celsius ?? null,
                        mesesLluvia: serverData.caracterizacionPredio?.meses_lluvia || "",
                        topografia: serverData.caracterizacionPredio?.topografia || "",
                        coberturaBosque: serverData.caracterizacionPredio?.cobertura_bosque ?? false,
                        coberturaCultivos: serverData.caracterizacionPredio?.cobertura_cultivos ?? false,
                        coberturaPastos: serverData.caracterizacionPredio?.cobertura_pastos ?? false,
                        coberturaRastrojo: serverData.caracterizacionPredio?.cobertura_rastrojo ?? false,
                    },
                    abastecimientoAgua: {
                        nacimientoManantial: serverData.abastecimientoAgua?.nacimiento_manantial ?? false,
                        rioQuebrada: serverData.abastecimientoAgua?.rio_quebrada ?? false,
                        pozo: serverData.abastecimientoAgua?.pozo ?? false,
                        acueductoRural: serverData.abastecimientoAgua?.acueducto_rural ?? false,
                        canalDistritoRiego: serverData.abastecimientoAgua?.canal_distrito_riego ?? false,
                        jagueyReservorio: serverData.abastecimientoAgua?.jaguey_reservorio ?? false,
                        aguaLluvia: serverData.abastecimientoAgua?.agua_lluvia ?? false,
                        otraFuente: serverData.abastecimientoAgua?.otra_fuente || "",
                    },
                    riesgos: {
                        inundacion: serverData.riesgosPredio?.inundacion ?? false,
                        sequia: serverData.riesgosPredio?.sequia ?? false,
                        viento: serverData.riesgosPredio?.viento ?? false,
                        helada: serverData.riesgosPredio?.helada ?? false,
                        otrosRiesgos: serverData.riesgosPredio?.otros_riesgos || "",
                    },
                    areaProductiva: {
                        sistemaProductivo: serverData.areaProductiva?.sistema_productivo || "",
                        caracterizacionCultivo: serverData.areaProductiva?.caracterizacion_cultivo || "",
                        cantidadProduccion: serverData.areaProductiva?.cantidad_produccion || "",
                        estadoCultivo: serverData.areaProductiva?.estado_cultivo || "",
                        tieneInfraestructuraProcesamiento: serverData.areaProductiva?.tiene_infraestructura_procesamiento ?? false,
                        estructuras: serverData.areaProductiva?.estructuras || "",
                        interesadoPrograma: serverData.areaProductiva?.interesado_programa ?? false,
                        dondeComercializa: serverData.areaProductiva?.donde_comercializa || "",
                        ingresoMensualVentas: serverData.areaProductiva?.ingreso_mensual_ventas ?? null,
                    },
                    infoFinanciera: {
                        ingresosMensualesAgropecuaria: serverData.infoFinanciera?.ingresos_mensuales_agropecuaria ?? null,
                        ingresosMensualesOtros: serverData.infoFinanciera?.ingresos_mensuales_otros ?? null,
                        egresosMensuales: serverData.infoFinanciera?.egresos_mensuales ?? null,
                        activosTotales: serverData.infoFinanciera?.activos_totales ?? null,
                        activosAgropecuaria: serverData.infoFinanciera?.activos_agropecuaria ?? null,
                        pasivosTotales: serverData.infoFinanciera?.pasivos_totales ?? null,
                    },
                    archivos: {
                        fotoBeneficiario: serverData.caracterizacion?.foto_beneficiario_url || "",
                        foto1Url: serverData.caracterizacion?.foto_1_url || "",
                        foto2Url: serverData.caracterizacion?.foto_2_url || "",
                        firmaProductorUrl: serverData.caracterizacion?.firma_productor_url || "",
                        fotoDocFrontalUrl: serverData.caracterizacion?.foto_doc_frontal_url || "",
                        fotoDocTraseraUrl: serverData.caracterizacion?.foto_doc_trasera_url || "",
                    },
                    autorizaciones: {
                        autorizacionDatosPersonales: true,
                        autorizacionConsultaCrediticia: true,
                    },
                    observaciones: serverData.caracterizacion?.observaciones || "",
                }

                setInitialData(mappedData)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido")
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [id, authLoading, isAuthenticated, router])

    if (authLoading || isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando formulario para edición...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <h2 className="text-lg font-semibold">Error al cargar</h2>
                <p className="text-muted-foreground">{error}</p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="text-primary hover:underline"
                >
                    Volver al Dashboard
                </button>
            </div>
        )
    }

    return (
        <CharacterizationFormComplete
            initialData={initialData}
            isEdit={true}
            visitaId={id}
        />
    )
}
