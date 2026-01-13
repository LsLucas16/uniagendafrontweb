import { Navigate, Outlet } from "react-router-dom";

export const RoleRoute = ({ allowed }) => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  // se não existir usuário ou não possuir tipo
  if (!usuario || !usuario.tipo) {
    return <Navigate to="/" />;
  }

  // se o tipo for permitido → libera acesso
  if (allowed.includes(usuario.tipo.toLowerCase())) {
    return <Outlet />;
  }

  // caso contrário, redireciona o aluno ao dashboard
  return <Navigate to="/dashboard" />;
};
