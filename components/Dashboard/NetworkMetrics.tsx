import React, { useState, useEffect } from 'react';

interface NetworkMetricsProps {
  stats: {
    totalDespachos: number;
    despachosAsignados: number;
    transportesActivos: number;
    eficienciaRed: number;
  };
}

const NetworkMetrics: React.FC<NetworkMetricsProps> = ({ stats }) => {
  const [animatedStats, setAnimatedStats] = useState({
    totalDespachos: 0,
    despachosAsignados: 0,
    transportesActivos: 0,
    eficienciaRed: 0
  });

  // Animar contadores al cargar
  useEffect(() => {
    const duration = 2000; // 2 segundos
    const steps = 60;
    const interval = duration / steps;

    const animate = (target: number, current: number, step: number) => {
      if (step >= steps) return target;
      const progress = step / steps;
      // Easing function para suavizar la animación
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      return Math.round(current + (target - current) * easeOutQuart);
    };

    let step = 0;
    const timer = setInterval(() => {
      step++;
      
      setAnimatedStats({
        totalDespachos: animate(stats.totalDespachos, 0, step),
        despachosAsignados: animate(stats.despachosAsignados, 0, step),
        transportesActivos: animate(stats.transportesActivos, 0, step),
        eficienciaRed: animate(stats.eficienciaRed, 0, step)
      });

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedStats(stats); // Asegurar valores exactos
      }
    }, interval);

    return () => clearInterval(timer);
  }, [stats]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      
      {/* Total Despachos con Progreso */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm font-medium">Total Despachos</p>
            <p className="text-4xl font-bold text-white tracking-tight">
              {animatedStats.totalDespachos}
            </p>
          </div>
          <div className="text-cyan-400 text-5xl opacity-80">📦</div>
        </div>
        
        {/* Barra de progreso */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.min((animatedStats.totalDespachos / Math.max(stats.totalDespachos, 1)) * 100, 100)}%` }}
          ></div>
        </div>
        
        <div className="text-sm">
          <span className="text-green-400 flex items-center">
            <span className="mr-1">↗️</span> +12% vs mes anterior
          </span>
        </div>
      </div>

      {/* Eficiencia con Medidor Circular */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm font-medium">Eficiencia de Red</p>
            <p className="text-4xl font-bold text-white tracking-tight">
              {animatedStats.eficienciaRed}%
            </p>
          </div>
          <div className="relative">
            {/* Círculo de progreso */}
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-600"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-green-400"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={`${animatedStats.eficienciaRed}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-green-400 text-xs font-bold">🎯</span>
            </div>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-green-400">🚀 Optimizado con NODEXIA</span>
        </div>
      </div>

      {/* Transportes Activos con Pulso */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm font-medium">Transportes en Red</p>
            <p className="text-4xl font-bold text-white tracking-tight">
              {animatedStats.transportesActivos}
            </p>
          </div>
          <div className="relative">
            <div className="text-blue-400 text-5xl opacity-80">🚛</div>
            {/* Indicador de actividad */}
            <div className="absolute -top-1 -right-1">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-blue-400">🔗 Conectados en tiempo real</span>
        </div>
      </div>

    </div>
  );
};

export default NetworkMetrics;