import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { Login } from "./pages/login/Login";
import { PrivateRoute } from "./PrivateRoute";
import { RoleRoute } from "./RoleRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/dashboard/Dashboard";
import DashboardAluno from "./pages/dashboardAluno/DashboardAluno";
import CriarEvento from "./pages/criarEvento/CriarEvento";
import EventosPublicados from "./pages/eventosPublicados/EventosPublicados";
import EditarEvento from "./pages/editarEvento/EditarEvento";
import EditarTurma from "./pages/editarTurma/EditarTurma";
import EditarTurmaCoordenador from "./pages/editarTurmaCoordenador/EditarTurmaCoordenador";
import ListaAlunos from "./pages/listaAlunos/ListaAlunos";
import CriarTurma from "./pages/criarTurma/CriarTurma";
import VerCalendario from "./pages/verCalendario/VerCalendario";
import DetalheCalendario from "./pages/detalheCalendario/DetalheCalendario";
import DetalheCalendarioAluno from "./pages/detalheCalendarioAluno/DetalheCalendarioAluno";

function DashboardPage() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  const tipo = String(usuario?.tipo || "").toLowerCase();

  if (tipo === "aluno" || tipo === "responsavel") {
    return <DashboardAluno />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route element={<RoleRoute allowed={["aluno", "responsavel"]} />}>
              <Route
                path="/detalhe-calendario-aluno/:data"
                element={<DetalheCalendarioAluno />}
              />
            </Route>

            <Route element={<RoleRoute allowed={["professor", "coordenador", "responsavel"]} />}>
              <Route path="/criar-evento" element={<CriarEvento />} />
              <Route path="/turma/:turmaId/alunos" element={<ListaAlunos />} />
              <Route path="/eventos" element={<EventosPublicados />} />
              <Route path="/eventos/:id/editar" element={<EditarEvento />} />
            </Route>

            <Route element={<RoleRoute allowed={["professor", "responsavel"]} />}>
              <Route path="/editar-turma/:turmaId" element={<EditarTurma />} />
            </Route>

            <Route element={<RoleRoute allowed={["coordenador"]} />}>
              <Route path="/nova-turma" element={<CriarTurma />} />
              <Route
                path="/editar-turma-coordenador"
                element={<EditarTurmaCoordenador />}
              />
              <Route path="/editar-turma/:id" element={<EditarTurma />} />
              <Route path="/ver-calendario" element={<VerCalendario />} />
              <Route path="/detalhe-calendario/:date" element={<DetalheCalendario />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;