import React from "react";
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
import EditarTurma from "./pages/editarTurma/EditarTurma";
import EditarTurmaCoordenador from "./pages/editarTurmaCoordenador/EditarTurmaCoordenador";
import ListaAlunos from "./pages/listaAlunos/ListaAlunos";
import CriarTurma from "./pages/criarTurma/CriarTurma";

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

            <Route
              path="/turma/:turmaId/alunos"
              element={
                <Layout>
                  <ListaAlunos />
                </Layout>
              }
            />

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

          {/* Somente professor e responsável */}
          <Route element={<RoleRoute allowed={["professor", "responsavel"]} />}>
            <Route
              path="/editar-turma"
              element={
                <Layout>
                  <EditarTurma />
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
                  <CriarTurma/>
                </Layout>
              }
            />

            <Route
              path="/editar-turma-coordenador"
              element={
                <Layout>
                  <EditarTurmaCoordenador />
                </Layout>
              }
            />

            <Route
              path="/editar-turma/:id"
              element={
                <Layout>
                  <EditarTurma />
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
