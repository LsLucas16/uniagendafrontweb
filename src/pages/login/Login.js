import React, { useState } from 'react';
import './Login.scss';
// Ícone de seta para o select e ícones de olho para a senha
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  // Estado para controlar a seleção da instituição (opcional, para controle do formulário)
  const [institution, setInstitution] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Dados do formulário:', { institution, login, password });
    // Adicione sua lógica de autenticação aqui
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <header className="login-header">
          <h1>Acesse sua conta</h1>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Campo Select - Instituição */}
          <div className="form-group">
            <div className="select-wrapper">
              <select 
                id="institution" 
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className={`form-input ${!institution ? 'placeholder' : ''}`} // Classe para cor do placeholder
                required
              >
                <option value="" disabled hidden>Selecione sua instituição</option>
                <option value="inst1">Instituição Federal 1</option>
                <option value="inst2">Universidade Estadual 2</option>
                <option value="inst3">Faculdade Privada 3</option>
              </select>
              <ChevronDown className="select-icon" size={20} />
            </div>
          </div>

          {/* Campo Input - Login */}
          <div className="form-group">
            <label htmlFor="login-input">Login</label>
            <input 
              type="text" 
              id="login-input" 
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Digite seu login" 
              className="form-input"
              required 
            />
          </div>

          {/* Campo Input - Senha */}
          <div className="form-group">
            <label htmlFor="password-input">Senha</label>
            <div className="password-input-wrapper form-input">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha" 
                required 
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Link de Ajuda */}
          <div className="form-help">
            <a href="/recuperar-senha">Problemas com login e/ou senha?</a>
          </div>

          {/* Botão Entrar */}
          <button type="submit" className="btn-login">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;