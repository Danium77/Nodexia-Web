import type { SuperAdminContext, EmpresaAdmin, EstadisticasSistema, PlanSuscripcion, SuscripcionEmpresa, Pago, LogAdmin, CreateEmpresaAdminData, FiltrosEmpresas, FiltrosPagos, FiltrosLogs } from '../../types/superadmin';
export declare function useSuperAdminContext(): {
    context: SuperAdminContext;
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;
};
export declare function useEmpresasAdmin(filtros?: FiltrosEmpresas): {
    empresas: EmpresaAdmin[];
    loading: boolean;
    error: string;
    crearEmpresa: (data: CreateEmpresaAdminData) => Promise<any>;
    actualizarEstadoEmpresa: (empresaId: string, activa: boolean, motivo?: string) => Promise<any>;
    refresh: () => Promise<void>;
};
export declare function useEstadisticasSistema(): {
    estadisticas: EstadisticasSistema;
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;
};
export declare function usePlanesSuscripcion(): {
    planes: PlanSuscripcion[];
    loading: boolean;
    error: string;
    cambiarPlanEmpresa: (empresaId: string, planId: string, periodo: "mensual" | "anual") => Promise<any>;
    refresh: () => Promise<void>;
};
export declare function usePagosAdmin(filtros?: FiltrosPagos): {
    pagos: Pago[];
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;
};
export declare function useLogsAdmin(filtros?: FiltrosLogs): {
    logs: LogAdmin[];
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;
};
export declare function useSuscripcionesAdmin(): {
    suscripciones: SuscripcionEmpresa[];
    loading: boolean;
    error: string;
    cambiarPlanEmpresa: (empresaId: string, planId: string) => Promise<void>;
    refresh: () => Promise<void>;
};
