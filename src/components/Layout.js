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
  const isAluno = String(usuario?.tipo || "").toLowerCase() === "aluno";

  return (
    <div className="app-layout">
      <MenuLateral />

      <div className={`app-layout__main ${isAluno ? "is-aluno" : ""}`}>
        <div className="app-layout__center">
          <Header isAluno={isAluno} />

          <div className="app-layout__body">
            <main key={location.pathname} className="app-layout__content">
              <Outlet />
            </main>
          </div>
        </div>

        {isAluno && (
          <aside className="app-layout__right">
            <CalendarioAlunoLateral />
          </aside>
        )}
      </div>
    </div>
  );
}