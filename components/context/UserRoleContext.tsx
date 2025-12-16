import React, { createContext, useState, ReactNode } from 'react';

interface UserRoleContextType {
  userRole: string;
  setUserRoleHandler: (role: string) => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

interface UserRoleProviderProps {
  children: ReactNode;
}

export const UserRoleProvider: React.FC<UserRoleProviderProps> = ({ children }) => {
  const [userRole, setUserRole] = useState<string>('');

  const setUserRoleHandler = (role: string) => {
    setUserRole(role);
  };

  return (
    <UserRoleContext.Provider value={{ userRole, setUserRoleHandler }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = (): UserRoleContextType => {
  const context = React.useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
};

export default UserRoleContext;