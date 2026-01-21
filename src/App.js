import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import dados from "./api/dados.json"; // ajuste o caminho se necessário
import { bootstrapLocalStorage } from "./services/bootstrapLocalStorage"; // ajuste o caminho

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

function App() {
  useEffect(() => {
    bootstrapLocalStorage(dados);
  }, []);

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
              <RoleRoute allowed={["professor", "coordenador", "responsavel"]} />
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

            {/* deixe a rota real aqui */}
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
                  <PaginaTemporaria titulo="Nova Turma (Em desenvolvimento)" />
                </Layout>
              }
            />

            {/* MUDEI o path para não conflitar com /editar-turma real */}
            <Route
              path="/editar-turma-dev"
              element={
                <Layout>
                  <PaginaTemporaria
                    titulo="Editar Turma (Em desenvolvimento)"
                  />
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
