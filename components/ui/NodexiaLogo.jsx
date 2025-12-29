// Componente SVG del Logo de Nodexia
export function NodexiaLogo({ className = "h-6 w-6", animated = false }) {
    return (<svg viewBox="0 0 100 100" className={`${className} ${animated ? 'animate-pulse' : ''}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Globo/Red */}
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="3" fill="none" className="text-cyan-400"/>
      
      {/* Líneas de latitud */}
      <ellipse cx="50" cy="50" rx="40" ry="15" stroke="currentColor" strokeWidth="2" fill="none" className="text-cyan-500" opacity="0.6"/>
      <ellipse cx="50" cy="50" rx="40" ry="25" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-cyan-600" opacity="0.4"/>
      
      {/* Líneas de longitud */}
      <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="2" className="text-cyan-500" opacity="0.6"/>
      <path d="M 30 10 Q 30 50 30 90" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-cyan-600" opacity="0.4"/>
      <path d="M 70 10 Q 70 50 70 90" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-cyan-600" opacity="0.4"/>
      
      {/* Nodos de conexión (puntos en la red) */}
      <circle cx="50" cy="20" r="3" fill="currentColor" className="text-blue-400"/>
      <circle cx="25" cy="35" r="3" fill="currentColor" className="text-blue-400"/>
      <circle cx="75" cy="35" r="3" fill="currentColor" className="text-blue-400"/>
      <circle cx="20" cy="60" r="3" fill="currentColor" className="text-cyan-400"/>
      <circle cx="80" cy="60" r="3" fill="currentColor" className="text-cyan-400"/>
      <circle cx="35" cy="75" r="3" fill="currentColor" className="text-blue-500"/>
      <circle cx="65" cy="75" r="3" fill="currentColor" className="text-blue-500"/>
      
      {/* Centro - nodo principal */}
      <circle cx="50" cy="50" r="5" fill="currentColor" className="text-cyan-300"/>
      <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="2" fill="none" className="text-cyan-400"/>
    </svg>);
}
// Logo pequeño para badges y elementos inline
export function NodexiaLogoBadge({ className = "h-4 w-4" }) {
    return (<svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="4" fill="none" className="text-cyan-400"/>
      <circle cx="50" cy="50" r="6" fill="currentColor" className="text-cyan-300"/>
      <circle cx="30" cy="30" r="4" fill="currentColor" className="text-blue-400"/>
      <circle cx="70" cy="30" r="4" fill="currentColor" className="text-blue-400"/>
      <circle cx="30" cy="70" r="4" fill="currentColor" className="text-cyan-400"/>
      <circle cx="70" cy="70" r="4" fill="currentColor" className="text-cyan-400"/>
    </svg>);
}
