import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./pages/login/Login";
import { PrivateRoute } from "./PrivateRoute";
import { RoleRoute } from "./RoleRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/dashboard/Dashboard";
import CriarEvento from "./pages/criarEvento/CriarEvento";
import PaginaTemporaria from "./pages/temp/PaginaTemporaria";

function App() {
  return (
    <Router>
      <Routes>

        {/* Público */}
        <Route path="/" element={<Login />} />

        {/* Privado (todos autenticados) */}
        <Route element={<PrivateRoute />}>

          {/* Acessível para todos */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />

          {/* Criar Evento: professor, coordenador, responsável */}
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

          {/* Somente coordenador */}
          <Route element={<RoleRoute allowed={["coordenador"]} />}>
            <Route
              path="/nova-turma"
              element={
                <Layout>
                  <PaginaTemporaria titulo="Nova Turma (Em desenvolvimento)" />
                </Layout>
              }
            />

            <Route
              path="/editar-turma"
              element={
                <Layout>
                  <PaginaTemporaria titulo="Editar Turma (Em desenvolvimento)" />
                </Layout>
              }
            />

            <Route
              path="/eventos"
              element={
                <Layout>
                  <PaginaTemporaria titulo="Eventos Publicados (Em desenvolvimento)" />
                </Layout>
              }
            />

            <Route
              path="/calendario"
              element={
                <Layout>
                  <PaginaTemporaria titulo="Calendário (Em desenvolvimento)" />
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
