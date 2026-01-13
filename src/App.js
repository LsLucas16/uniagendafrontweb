import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./pages/login/Login";
import { PrivateRoute } from "./PrivateRoute";
import { RoleRoute } from "./RoleRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/dashboard/Dashboard";
import CriarEvento from "./pages/criarEvento/CriarEvento";

function App() {
  return (
    <Router>
      <Routes>

        {/* Público */}
        <Route path="/" element={<Login />} />

        {/* Privado (todos autenticados) */}
        <Route element={<PrivateRoute />}>
          
          {/* Dashboard acessível para todos */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />

          {/* Páginas que exigem permissão */}
          <Route element={<RoleRoute allowed={["professor", "coordenador", "responsavel"]} />}>
            <Route
              path="/criar-evento"
              element={
                <Layout>
                  <CriarEvento />
                </Layout>
              }
            />
          </Route>

        </Route>
      </Routes>
    </Router>
  );
}

export default App;
