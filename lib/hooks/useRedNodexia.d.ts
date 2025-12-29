import { ViajeRedNodexia, ViajeRedCompleto, OfertaRedNodexia, OfertaRedCompleta, CrearViajeRedDTO, CrearOfertaDTO, FiltrosViajesRed, EstadisticasRedNodexia } from '@/types/red-nodexia';
export declare function useRedNodexia(): {
    loading: boolean;
    error: string;
    obtenerViajesAbiertos: (filtros?: FiltrosViajesRed) => Promise<ViajeRedCompleto[]>;
    obtenerMisViajesPublicados: (empresaId: string) => Promise<ViajeRedCompleto[]>;
    obtenerMisViajesAsignados: (empresaId: string) => Promise<ViajeRedCompleto[]>;
    publicarViajeEnRed: (dto: CrearViajeRedDTO, empresaId: string, usuarioId: string) => Promise<ViajeRedNodexia>;
    cancelarViajeRed: (viajeRedId: string) => Promise<void>;
    crearOferta: (dto: CrearOfertaDTO, transporteId: string, usuarioId: string) => Promise<OfertaRedNodexia>;
    obtenerOfertasViaje: (viajeRedId: string) => Promise<OfertaRedCompleta[]>;
    aceptarOferta: (ofertaId: string, viajeRedId: string, transporteId: string, usuarioId: string) => Promise<void>;
    rechazarOferta: (ofertaId: string) => Promise<void>;
    retirarOferta: (ofertaId: string) => Promise<void>;
    obtenerEstadisticas: () => Promise<EstadisticasRedNodexia>;
};
