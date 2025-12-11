"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type RoleType = "admin" | "subadmin";

interface RoleContextType {
  role: RoleType | null;
  setRole: (role: RoleType) => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => {},
  clearRole: () => {},
});

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRoleState] = useState<RoleType | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role") as RoleType | null;
    if (storedRole) setRoleState(storedRole);
  }, []);

  const setRole = (role: RoleType) => {
    localStorage.setItem("role", role);
    localStorage.setItem("isLoggedIn", "true");
    setRoleState(role);
  };

  const clearRole = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("isLoggedIn");
    setRoleState(null);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
