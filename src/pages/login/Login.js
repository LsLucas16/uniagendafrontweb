import React, { useState } from "react";
import "./Login.scss";
import dados from "../../api/dados.json"; 

import logo from "../../assets/logo.webp"; 
import agenda from "../../assets/agenda.webp"; 
import sombra from "../../assets/sombra.webp"; 

export const Login = () => {
  // Estados para capturar os inputs
  const [loginDigitado, setLoginDigitado] = useState("");
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [idInstSelecionada, setIdInstSelecionada] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Lógica de busca: usuário + senha + vínculo com a instituição
    const usuarioAuth = dados.usuarios.find((u) => {
      return (
        u.user === loginDigitado && 
        u.senha === senhaDigitada && 
        u.faculdadeId === parseInt(idInstSelecionada)
      );
    });

    if (usuarioAuth) {
      alert(`Bem-vindo, ${usuarioAuth.nome}! Acesso nível: ${usuarioAuth.tipo}`);
      // Aqui você usaria o useNavigate para mudar de página
    } else {
      alert("Credenciais inválidas ou instituição incorreta.");
    }
  };

  return (
    <div className="login-screen">
      <img src={sombra} className="bg-overlay" alt="" />
      <div className="corner-decoration top-left" />
      <div className="corner-decoration top-right" />
      <div className="corner-decoration bottom-left" />

      <header className="brand-header">
        <img src={logo} alt="Uni Logo" className="main-logo" />
      </header>

      <main className="content-wrapper">
        <section className="login-box">
          <h2>Acesse sua conta</h2>
          
          <form className="form-container" onSubmit={handleLogin}>
            <div className="input-wrapper">
              <select 
                className="institution-select"
                required
                onChange={(e) => setIdInstSelecionada(e.target.value)}
              >
                <option value="">Selecione sua instituição</option>
                {dados.instituicoes.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Login</label>
              <input 
                type="text" 
                placeholder="Digite seu login" 
                required
                value={loginDigitado}
                onChange={(e) => setLoginDigitado(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input 
                type="password" 
                placeholder="Digite sua senha" 
                required
                value={senhaDigitada}
                onChange={(e) => setSenhaDigitada(e.target.value)}
              />
            </div>

            <div className="form-footer">
              <a href="#" className="forgot-link">Problemas com login e/ou senha?</a>
            </div>

            <button type="submit" className="btn-login">Entrar</button>
            <div className="bottom-lines"></div>
          </form>
        </section>
      </main>

      <div className="illustration-container">
        <img src={agenda} alt="Ilustração Agenda" className="agenda-img" />
      </div>
    </div>
  );
};