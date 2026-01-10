import React from "react";
import "./Login.scss";

// Imports das imagens (mantenha os nomes dos seus arquivos webp)
import logo from "../../assets/logo.webp"; 
import agenda from "../../assets/agenda.webp"; 
import sombra from "../../assets/sombra.webp"; 

export const Login = () => {
  return (
    <div className="login-screen">
      {/* Background e Elementos Decorativos (Meias Luas) */}
      <img src={sombra} className="bg-overlay" alt="" />
      <div className="corner-decoration top-left" />
      <div className="corner-decoration top-right" />
      <div className="corner-decoration bottom-left" />

      {/* Logo superior */}
      <header className="brand-header">
        <img src={logo} alt="Uni Logo" className="main-logo" />
      </header>

      <main className="content-wrapper">
        {/* Card de Login */}
        <section className="login-box">
          <h2>Acesse sua conta</h2>
          
          <form className="form-container">
            <div className="input-wrapper">
              <select className="institution-select">
                <option value="">Selecione sua instituição</option>
                <option value="1">Instituição A</option>
                <option value="2">Instituição B</option>
              </select>
            </div>

            <div className="input-group">
              <label>Login</label>
              <input type="text" placeholder="Digite seu login" />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input type="password" placeholder="Digite sua senha" />
            </div>

            <div className="form-footer">
              <a href="#" className="forgot-link">Problemas com login e/ou senha?</a>
            </div>

            <button type="submit" className="btn-login">Entrar</button>
          </form>
        </section>
      </main>

      {/* Ilustração da Agenda e Menina no canto inferior */}
      <div className="illustration-container">
        <img src={agenda} alt="Ilustração Agenda" className="agenda-img" />
      </div>
    </div>
  );
};