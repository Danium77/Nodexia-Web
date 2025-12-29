import React from 'react';
export declare const Card: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const CardHeader: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const CardTitle: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const CardDescription: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const CardContent: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const Badge: ({ className, variant, children }: {
    className?: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const Alert: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const AlertDescription: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const Tabs: ({ defaultValue, className, children }: {
    defaultValue?: string;
    className?: string;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const TabsList: ({ className, children, activeTab, setActiveTab }: any) => React.JSX.Element;
export declare const TabsTrigger: ({ value, className, children, activeTab, setActiveTab }: any) => React.JSX.Element;
export declare const TabsContent: ({ value, className, children, activeTab }: any) => React.JSX.Element;
