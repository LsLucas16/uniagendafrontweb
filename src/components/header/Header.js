import React, { useEffect, useState } from "react";

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
    }

    // Define saudação
    const hora = new Date().getHours();
    if (hora < 12) setSaudacao("Bom dia");
    else if (hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");

    // Formata a data
    const hoje = new Date();
    const opcoes = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };

    const dataFormatada = hoje.toLocaleDateString("pt-BR", opcoes);

    // Capitalizar primeira letra do dia (quinta-feira → Quinta-feira)
    const dataComCapital = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

    setDataAtual(dataComCapital);
  }, []);

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <span style={styles.textSaudacao}>
          {saudacao}, {nome}! <span style={styles.emoji}>👏</span>
        </span>
      </div>

      <div style={styles.right}>
        <span style={styles.data}>{dataAtual}</span>
      </div>
    </header>
  );
}

const styles = {
  header: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 32px",
    borderBottom: "1px solid #f2f2f2",
    background: "#fff",
    boxSizing: "border-box",
  },
  left: {
    display: "flex",
    alignItems: "center",
  },
  textSaudacao: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#2E4A67",
  },
  emoji: {
    marginLeft: "6px",
    fontSize: "20px",
  },
  right: {
    fontSize: "16px",
    fontWeight: "400",
    color: "#6A7B89",
    textTransform: "capitalize",
  },
  data: {
    fontSize: "16px",
  },
};
