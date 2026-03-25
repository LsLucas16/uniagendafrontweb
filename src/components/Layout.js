import { Outlet, useLocation } from "react-router-dom";
import MenuLateral from "./menuLateral/MenuLateral";
import Header from "./header/Header";
import CalendarioAlunoLateral from "./CalendarioLateralAluno/CalendarioLateralAluno";
import "./Layout.scss";

function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    return null;
  }
}

export default function Layout() {
  const location = useLocation();
  const usuario = getUsuario();

  const tipoUsuario = String(usuario?.tipo || "").toLowerCase();

  const usuarioPodeUsarVisaoAluno =
    tipoUsuario === "aluno" || tipoUsuario === "responsavel";

  const rotaComVisaoAluno =
    location.pathname === "/dashboard" ||
    location.pathname.startsWith("/detalhe-calendario-aluno");

  const usarLayoutAluno = usuarioPodeUsarVisaoAluno && rotaComVisaoAluno;

  return (
    <div className="app-layout">
      <MenuLateral />

      <div className={`app-layout__main ${usarLayoutAluno ? "is-aluno" : ""}`}>
        <div className="app-layout__center">
          <Header isAluno={usarLayoutAluno} />

          <div className="app-layout__body">
            <main key={location.pathname} className="app-layout__content">
              <Outlet />
            </main>
          </div>
        </div>

        {usarLayoutAluno && (
          <aside className="app-layout__right">
            <CalendarioAlunoLateral />
          </aside>
        )}
      </div>
    </div>
  );
}