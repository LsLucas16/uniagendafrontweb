import { Navigate, Outlet } from "react-router-dom";

export const RoleRoute = ({ allowed = [] }) => {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  const tipo = String(usuario?.tipo || "").toLowerCase();

  if (!tipo) return <Navigate to="/" replace />;
  if (allowed.includes(tipo)) return <Outlet />;

  return <Navigate to="/dashboard" replace />;
};