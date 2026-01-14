import React from 'react';
import './MenuLateral.scss';
import data from '../../api/dados.json';
import { SquarePen, ClipboardList, Settings } from 'lucide-react';

const MenuLateral = ({ currentUserId = 201 }) => {
  // Busca o usuário logado
  const user = data.usuarios.find(u => u.id === currentUserId);
  
  // Busca a instituição usando o faculdadeId do usuário
  const instituicao = data.instituicoes.find(i => i.id === user?.faculdadeId);

  if (!user) return null;

  // Pega apenas a primeira letra do nome
  const primeiraLetra = user.nome.trim().charAt(0).toUpperCase();

  return (
    <aside className="menuLateral">
      {/* Avatar e Slogan */}
      <header className="menuLateral__header">
        <div className="menuLateral__avatar">{primeiraLetra}</div>
        <p className="menuLateral__brand">
          <strong>UniAgenda</strong> - Sua rotina acadêmica sob controle!
        </p>
      </header>

      {/* Card da Instituição com Logo dinâmico */}
      <div className="menuLateral__uni-card">
        <div className="menuLateral__uni-logo">
          <img src={instituicao?.logo} alt="Logo Instituição" />
        </div>
        <div className="menuLateral__uni-info">
          <span className="menuLateral__uni-label">Universidade de Brasília</span>
          <strong className="menuLateral__uni-name">UNB</strong>
        </div>
      </div>

      <hr className="menuLateral__divider" />

      {/* Navegação */}
      <nav className="menuLateral__menu">
        <div className="menuLateral__group">
          <label className="menuLateral__label">Turma atual</label>
          <select className="menuLateral__select">
            {user.disciplinas.map((disc, index) => (
              <option key={index} value={disc}>{disc}</option>
            ))}
          </select>
        </div>

        <hr className="menuLateral__divider" />

        <div className="menuLateral__actions">
          <button className="menuLateral__btn menuLateral__btn--primary">
            <SquarePen size={20} strokeWidth={2.5} />
            <span>Criar evento</span>
          </button>
          
          <button className="menuLateral__btn">
            <ClipboardList size={20} />
            <span>Eventos Publicados</span>
          </button>
          
          <button className="menuLateral__btn">
            <Settings size={20} />
            <span>Editar turma</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default MenuLateral;