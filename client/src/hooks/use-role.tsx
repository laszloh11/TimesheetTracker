import { createContext, useContext, useState, ReactNode } from "react";
import type { UserRole, User } from "@shared/schema";

interface RoleContextType {
  currentRole: UserRole;
  currentUser: User | null;
  setCurrentRole: (role: UserRole) => void;
  setCurrentUser: (user: User | null) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>("employee");
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 1,
    username: "john.doe",
    name: "John Doe",
    role: "employee"
  });

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentUser,
        setCurrentRole,
        setCurrentUser,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
