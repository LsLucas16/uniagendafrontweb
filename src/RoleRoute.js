import { Navigate, Outlet } from "react-router-dom";

export const RoleRoute = ({ allowed }) => {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  if (!usuario?.tipo) return <Navigate to="/" replace />;
  if (allowed.includes(String(usuario.tipo).toLowerCase())) return <Outlet />;
  return <Navigate to="/dashboard" replace />;
};