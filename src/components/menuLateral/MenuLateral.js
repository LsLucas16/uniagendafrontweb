import React from 'react';
import './MenuLateral.scss';
import data from '../../api/dados.json' 

const MenuLateral = ({ currentUserId = 202 }) => {
  // 1. Busca o usuário logado
  const user = data.usuarios.find(u => u.id === currentUserId);
  
  // 2. Busca a instituição desse usuário
  const instituicao = data.instituicoes.find(i => i.id === user.faculdadeId);

  if (!user) return null;

  return (
    <aside className="menuLateral">
      {/* Header fixo */}
      <header className="menuLateral__header">
        <div className="menuLateral__avatar">{user.nome.charAt(0)}</div>
        <p className="menuLateral__brand">
          <strong>UniAgenda</strong> - Sua rotina acadêmica sob controle!
        </p>
      </header>

      {/* Nome da Faculdade vindo do dados.js */}
      <div className="menuLateral__uni-card">
        <div className="menuLateral__uni-info">
          <span>{instituicao?.nome}</span>
          <strong>{instituicao?.nome.split(' ').pop().replace('(', '').replace(')', '')}</strong>
        </div>
      </div>

      <hr className="menuLateral__divider" />

      {/* CONTEÚDO PARA PROFESSOR / COORDENADOR */}
      {(user.tipo === 'professor' || user.tipo === 'coordenador') && (
        <nav className="menuLateral__menu">
          <label className="menuLateral__label">Turma atual</label>
          <select className="menuLateral__select">
            {user.disciplinas.map((disc, index) => (
              <option key={index} value={disc}>{disc}</option>
            ))}
          </select>

          <button className="menuLateral__btn menuLateral__btn--primary">Criar evento</button>
          <button className="menuLateral__btn">Eventos Publicados</button>
          <button className="menuLateral__btn">Editar turma</button>
        </nav>
      )}

      {/* CONTEÚDO PARA ALUNO / RESPONSÁVEL */}
      {(user.tipo === 'aluno' || user.tipo === 'responsavel') && (
        <nav className="menuLateral__menu">
          <div className="menuLateral__list">
            {user.disciplinas.map((disc, index) => (
              <div key={index} className="menuLateral__item">
                <div className="menuLateral__item-left">
                  <span className={`dot dot--${index % 4}`}></span>
                  <span className="menuLateral__item-name">{disc.split(' - ')[0]}</span>
                </div>
                <span className="menuLateral__plus">+</span>
              </div>
            ))}
          </div>
          
          <p className="menuLateral__label-small">Extensões acadêmicas</p>
          <div className="menuLateral__item menuLateral__item--extensao">
             <span className="dot dot--purple"></span> Monitoria
          </div>
        </nav>
      )}
    </aside>
  );
};

export default MenuLateral;