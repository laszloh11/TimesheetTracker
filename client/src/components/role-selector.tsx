import { useRole } from "@/hooks/use-role";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@shared/schema";

export function RoleSelector() {
  const { currentRole, setCurrentRole, setCurrentUser } = useRole();

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    
    // Mock user switching based on role
    if (role === "employee") {
      setCurrentUser({
        id: 1,
        username: "john.doe",
        name: "John Doe",
        role: "employee"
      });
    } else if (role === "manager") {
      setCurrentUser({
        id: 2,
        username: "jane.smith",
        name: "Jane Smith",
        role: "manager"
      });
    } else if (role === "admin") {
      setCurrentUser({
        id: 3,
        username: "admin",
        name: "Admin User",
        role: "admin"
      });
    }
  };

  return (
    <Select value={currentRole} onValueChange={handleRoleChange}>
      <SelectTrigger className="w-40 bg-blue-700 border-blue-300 text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="employee">Employee</SelectItem>
        <SelectItem value="manager">Project Manager</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
