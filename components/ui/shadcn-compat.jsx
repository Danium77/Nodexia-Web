// Componentes auxiliares simples para compatibilidad con shadcn/ui patterns
// Estos se pueden reemplazar por shadcn/ui completo más adelante
import React from 'react';
export const Card = ({ className = '', children }) => (<div className={`bg-slate-800/60 rounded-lg border border-slate-700 shadow-md ${className}`}>
    {children}
  </div>);
export const CardHeader = ({ className = '', children }) => (<div className={`p-6 ${className}`}>
    {children}
  </div>);
export const CardTitle = ({ className = '', children }) => (<h3 className={`text-lg font-semibold text-white ${className}`}>
    {children}
  </h3>);
export const CardDescription = ({ className = '', children }) => (<p className={`text-sm text-slate-400 mt-1 ${className}`}>
    {children}
  </p>);
export const CardContent = ({ className = '', children }) => (<div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>);
export const Badge = ({ className = '', variant = 'default', children }) => {
    const variants = {
        default: 'bg-blue-600 text-white',
        secondary: 'bg-slate-600 text-white',
        destructive: 'bg-red-600 text-white',
        outline: 'border border-slate-600 text-slate-300'
    };
    return (<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>);
};
export const Alert = ({ className = '', children }) => (<div className={`rounded-lg border p-4 ${className}`}>
    {children}
  </div>);
export const AlertDescription = ({ className = '', children }) => (<div className={`text-sm ${className}`}>
    {children}
  </div>);
export const Tabs = ({ defaultValue, className = '', children }) => {
    const [activeTab, setActiveTab] = React.useState(defaultValue || '');
    return (<div className={className} data-active-tab={activeTab}>
      {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, { activeTab, setActiveTab });
            }
            return child;
        })}
    </div>);
};
export const TabsList = ({ className = '', children, activeTab, setActiveTab }) => (<div className={`inline-flex h-10 items-center justify-center rounded-md bg-slate-700 p-1 text-slate-400 ${className}`}>
    {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { activeTab, setActiveTab });
        }
        return child;
    })}
  </div>);
export const TabsTrigger = ({ value, className = '', children, activeTab, setActiveTab }) => {
    const isActive = activeTab === value;
    return (<button onClick={() => setActiveTab(value)} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-600/50'} ${className}`}>
      {children}
    </button>);
};
export const TabsContent = ({ value, className = '', children, activeTab }) => {
    if (activeTab !== value)
        return null;
    return (<div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}>
      {children}
    </div>);
};
