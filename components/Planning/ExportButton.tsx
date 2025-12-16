// components/Planning/ExportButton.tsx
import React, { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Dispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  scheduled_local_date?: string;
  scheduled_local_time?: string;
  prioridad?: string;
  transporte_data?: { nombre: string };
  camion_data?: { patente: string };
  chofer?: { nombre_completo: string };
}

interface ExportButtonProps {
  dispatches: Dispatch[];
  title: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ dispatches, title }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    
    try {
      // Encabezados
      const headers = [
        'Pedido ID',
        'Fecha',
        'Hora',
        'Origen',
        'Destino',
        'Estado',
        'Prioridad',
        'Transporte',
        'Camión',
        'Chofer'
      ];

      // Datos
      const rows = dispatches.map(d => [
        d.pedido_id || '',
        d.scheduled_local_date || '',
        d.scheduled_local_time || '',
        d.origen || '',
        d.destino || '',
        d.estado || '',
        d.prioridad || '',
        d.transporte_data?.nombre || 'Sin asignar',
        d.camion_data?.patente || 'Sin asignar',
        d.chofer?.nombre_completo || 'Sin asignar'
      ]);

      // Crear CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Descargar
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `planificacion_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowMenu(false);
    } catch (error) {
      console.error('Error exportando CSV:', error);
      alert('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    
    try {
      // Crear tabla HTML
      const headers = [
        'Pedido ID',
        'Fecha',
        'Hora',
        'Origen',
        'Destino',
        'Estado',
        'Prioridad',
        'Transporte',
        'Camión',
        'Chofer'
      ];

      let htmlTable = '<table border="1"><thead><tr>';
      headers.forEach(h => {
        htmlTable += `<th style="background-color: #0e7490; color: white; padding: 8px;">${h}</th>`;
      });
      htmlTable += '</tr></thead><tbody>';

      dispatches.forEach(d => {
        htmlTable += '<tr>';
        htmlTable += `<td>${d.pedido_id || ''}</td>`;
        htmlTable += `<td>${d.scheduled_local_date || ''}</td>`;
        htmlTable += `<td>${d.scheduled_local_time || ''}</td>`;
        htmlTable += `<td>${d.origen || ''}</td>`;
        htmlTable += `<td>${d.destino || ''}</td>`;
        htmlTable += `<td>${d.estado || ''}</td>`;
        htmlTable += `<td>${d.prioridad || ''}</td>`;
        htmlTable += `<td>${d.transporte_data?.nombre || 'Sin asignar'}</td>`;
        htmlTable += `<td>${d.camion_data?.patente || 'Sin asignar'}</td>`;
        htmlTable += `<td>${d.chofer?.nombre_completo || 'Sin asignar'}</td>`;
        htmlTable += '</tr>';
      });

      htmlTable += '</tbody></table>';

      // Descargar como Excel
      const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `planificacion_${new Date().toISOString().split('T')[0]}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowMenu(false);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting || dispatches.length === 0}
        className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowDownTrayIcon className="h-3 w-3" />
        {isExporting ? 'Exportando...' : 'Exportar'}
      </button>

      {showMenu && (
        <>
          {/* Overlay para cerrar el menú */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menú desplegable */}
          <div className="absolute right-0 mt-1 w-40 bg-[#1b273b] rounded shadow-xl border border-gray-600 z-20 overflow-hidden">
            <button
              onClick={exportToCSV}
              className="w-full text-left px-2 py-1.5 text-[10px] text-white hover:bg-cyan-600 transition-colors flex items-center gap-1"
            >
              <span>📊</span>
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={exportToExcel}
              className="w-full text-left px-2 py-1.5 text-[10px] text-white hover:bg-cyan-600 transition-colors flex items-center gap-1 border-t border-gray-700"
            >
              <span>📗</span>
              <span>Exportar Excel</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
