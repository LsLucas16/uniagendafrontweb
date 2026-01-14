import React, { useEffect, useState } from "react";
import "./Header.scss"; // Importe o arquivo scss aqui

export default function Header() {
  const [nome, setNome] = useState("");
  const [dataAtual, setDataAtual] = useState("");
  const [saudacao, setSaudacao] = useState("");

  useEffect(() => {
    // Busca nome do usuário
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (usuario && usuario.nome) {
      const primeiroNome = usuario.nome.split(" ")[0];
      setNome(primeiroNome);
    } else {
      setNome("Ana"); // Fallback para o exemplo da imagem
    }

    // Define saudação
    const hora = new Date().getHours();
    if (hora < 12) setSaudacao("Bom dia");
    else if (hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");

    // Formata a data (Ex: Sexta-feira, 14 de novembro de 2025)
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Capitalizar primeira letra
    const dataComCapital = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    setDataAtual(dataComCapital);
  }, []);

  return (
    <header className="header-container">
      <div className="left-content">
        <span className="text-saudacao">
          {saudacao}, {nome}! <span className="emoji">👋</span>
        </span>
      </div>

      <div className="right-content">
        <span className="data-text">{dataAtual}</span>
      </div>
    </header>
  );
}