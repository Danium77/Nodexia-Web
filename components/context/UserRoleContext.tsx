import React, { createContext, useState } from 'react';

const UserRoleContext = createContext();

export const UserRoleProvider = ({ children }) => {
  const [userRole, setUserRole] = useState('');

  const setUserRoleHandler = (role) => {
    setUserRole(role);
  };

  return (
    <UserRoleContext.Provider value={{ userRole, setUserRoleHandler }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = React.useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
};

export default UserRoleContext;