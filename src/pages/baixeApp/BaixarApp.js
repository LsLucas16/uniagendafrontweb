import React from "react";
import "./BaixarApp.scss";

import googlePlay from "../../assets/Google_Play.png";
import appStore from "../../assets/app_store.png";
import logo from "../../assets/logo.webp";

const reviews = [
  {
    nome: "Carlos A.",
    nota: 5,
    texto:
      "Muito prático! Agora consigo ver todos os eventos da faculdade em um só lugar.",
  },
  {
    nome: "Juliana M.",
    nota: 5,
    texto: "Interface simples e rápida, uso todos os dias!",
  },
  {
    nome: "Rafael S.",
    nota: 4,
    texto: "Muito bom, facilitou bastante minha organização.",
  },
];

export default function BaixarApp() {
  return (
    <div className="baixar-app-page">
      <section className="baixar-app-card">
        <div className="baixar-app-top">
          <img src={logo} alt="UniAgenda" className="baixar-app-logo" />

          <h1>Baixe o app UniAgenda</h1>

          <p>
            Tenha acesso rápido ao calendário, eventos, turmas e informações da
            faculdade direto no seu celular.
          </p>
        </div>

        <div className="baixar-app-actions">
          <a
            href="#"
            className="store-button"
            aria-label="Baixar na Google Play"
          >
            <img src={googlePlay} alt="Google Play" />
          </a>

          <a
            href="#"
            className="store-button store-button--appstore"
            aria-label="Baixar na App Store"
          >
            <img src={appStore} alt="App Store" />
          </a>
        </div>

        <div className="reviews">
          <div className="reviews-header">
            <span className="reviews-title">Avaliações</span>
            <div className="reviews-rating">
              <span className="rating-number">4.8</span>
              <span className="stars">★★★★★</span>
              <span className="reviews-count">(2.3k avaliações)</span>
            </div>
          </div>

          <div className="reviews-list">
            {reviews.map((r, i) => (
              <div className="review-card" key={i}>
                <div className="review-top">
                  <span className="review-name">{r.nome}</span>
                  <span className="review-stars">
                    {"★".repeat(r.nota)}
                    {"☆".repeat(5 - r.nota)}
                  </span>
                </div>

                <p className="review-text">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="baixar-app-info">
          <div className="info-item">
            <strong>Agenda acadêmica</strong>
            <span>Veja datas, compromissos e eventos importantes.</span>
          </div>

          <div className="info-item">
            <strong>Acesso prático</strong>
            <span>Abra rapidamente tudo o que precisa em um só lugar.</span>
          </div>

          <div className="info-item">
            <strong>Mais mobilidade</strong>
            <span>Feito para usar melhor no celular, onde você estiver.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
