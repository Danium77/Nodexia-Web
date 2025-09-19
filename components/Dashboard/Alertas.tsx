import React from 'react';

const Alertas: React.FC = () => {
  // Here we mock a small set of alerts. Replace with real checks later.
  const alerts = [
    { id: 'a1', text: '2 habilitaciones por vencer en 7 días', type: 'warning' },
    { id: 'a2', text: '3 choferes sin asignar', type: 'danger' },
  ];

  if (!alerts.length) return null;

  return (
    <div className="mb-6">
      <div className="bg-amber-800/30 border border-amber-700 text-amber-50 p-3 rounded-md flex items-center justify-between">
        <div>
          <strong>Alertas:</strong>
          <span className="ml-2 text-sm">{alerts.map(a => a.text).join(' — ')}</span>
        </div>
        <div className="text-sm opacity-90">Revisar</div>
      </div>
    </div>
  );
};

export default Alertas;
