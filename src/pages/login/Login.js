import React, { useState } from "react";
import dados from "../../api/dados.json"; // Importando seu JSON
import "./Login.scss";
// ... seus imports de imagem aqui

export const Login = () => {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [instituicao, setInstituicao] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Busca o usuário no JSON
    const userAuth = dados.usuarios.find(
      (u) => u.user === usuario && u.senha === senha && u.faculdadeId === parseInt(instituicao)
    );

    if (userAuth) {
      alert(`Logado com sucesso como ${userAuth.tipo}: ${userAuth.nome}`);
      // Futuro: use o useNavigate() aqui para redirecionar conforme o tipo
    } else {
      alert("Credenciais inválidas ou instituição incorreta.");
    }
  };

  return (
    <div className="login-screen">
      {/* ... meias luas e logo ... */}
      
      <main className="content-wrapper">
        <section className="login-box">
          <h2>Acesse sua conta</h2>
          
          <form className="form-container" onSubmit={handleLogin}>
            <div className="input-wrapper">
              <select 
                className="institution-select" 
                required 
                onChange={(e) => setInstituicao(e.target.value)}
              >
                <option value="">Selecione sua faculdade</option>
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
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input 
                type="password" 
                placeholder="Digite sua senha" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-login">Entrar</button>
          </form>
        </section>
      </main>
      
      {/* ... imagem da agenda ... */}
    </div>
  );
};