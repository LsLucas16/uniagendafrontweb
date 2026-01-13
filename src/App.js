import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./pages/login/Login";
import { PrivateRoute } from "./PrivateRoute";
import { RoleRoute } from "./RoleRoute";
import Header from "./components/header/Header";
import MenuLateral from "./components/menuLateral/MenuLateral";
import Dashboard from "./pages/dashboard/Dashboard";
import CriarEvento from "./pages/criarEvento/CriarEvento";

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota pública */}
        <Route path="/" element={<Login />} />

        {/* Rotas protegidas */}
        <Route element={<PrivateRoute />}>
          {/* Dashboard acessível para todos autenticados */}
          <Route
            path="/dashboard"
            element={
              <div style={{ display: "flex", height: "100vh" }}>
                <MenuLateral />
                <div style={{ flex: 1 }}>
                  <Header />
                  <Dashboard />
                </div>
              </div>
            }
          />

          {/* Rotas com controle de tipo */}
          <Route element={<RoleRoute allowed={["professor", "coordenador", "responsavel"]} />}>
            <Route
              path="/criar-evento"
              element={
                <div style={{ display: "flex", height: "100vh" }}>
                  <MenuLateral />
                  <div style={{ flex: 1 }}>
                    <Header />
                    <CriarEvento />
                  </div>
                </div>
              }
            />
          </Route>

        </Route>
      </Routes>
    </Router>
  );
}

export default App;
