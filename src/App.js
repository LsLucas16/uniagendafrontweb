import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./pages/login/Login";
import { PrivateRoute } from "./PrivateRoute";
import { RoleRoute } from "./RoleRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/dashboard/Dashboard";
import CriarEvento from "./pages/criarEvento/CriarEvento";
import PaginaTemporaria from "./pages/temp/PaginaTemporaria";
import EventosPublicados from "./pages/eventosPublicados/EventosPublicados";
import EditarEvento from "./pages/editarEvento/EditarEvento";

function App() {
  return (
    <Router>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Login />} />

        {/* Privado */}
        <Route element={<PrivateRoute />}>
          {/* Todos autenticados */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />

          {/* professor, coordenador, responsável */}
          <Route
            element={
              <RoleRoute
                allowed={["professor", "coordenador", "responsavel"]}
              />
            }
          >
            <Route
              path="/criar-evento"
              element={
                <Layout>
                  <CriarEvento />
                </Layout>
              }
            />

            {/* ✅ ROTA ÚNICA PARA EVENTOS PUBLICADOS */}
            <Route
              path="/eventos"
              element={
                <Layout>
                  <EventosPublicados />
                </Layout>
              }
            />

            <Route
              path="/eventos/:id/editar"
              element={
                <Layout>
                  <EditarEvento />
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

            {/* ❌ REMOVER ESTA ROTA /eventos daqui
                porque ela conflita com a rota real de eventos publicados */}

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
