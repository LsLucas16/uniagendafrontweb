import React, { useState } from 'react';
import './MenuLateral.scss';
import data from '../../api/dados.json';
import { SquarePen, ClipboardList, Settings, LogOut } from 'lucide-react';

const MenuLateral = ({ currentUserId = 201 }) => {
  const [perfilAberto, setPerfilAberto] = useState(false);
  
  const user = data.usuarios.find(u => u.id === currentUserId);
  const instituicao = data.instituicoes.find(i => i.id === user?.faculdadeId);

  if (!user) return null;

  const primeiraLetra = user.nome.trim().charAt(0).toUpperCase();

  return (
    <aside className="menuLateral">
      {/* Header clicável para abrir o perfil */}
      <header 
        className={`menuLateral__header ${perfilAberto ? 'active' : ''}`} 
        onClick={() => setPerfilAberto(!perfilAberto)}
      >
        <div className="menuLateral__avatar">{primeiraLetra}</div>
        {!perfilAberto ? (
          <p className="menuLateral__brand">
            <strong>UniAgenda</strong> - Sua rotina acadêmica sob controle!
          </p>
        ) : (
          <div className="menuLateral__user-details">
            <strong>{user.nome}</strong>
            <span>{user.contato}</span>
            <button className="btn-sair">
              <LogOut size={16} color="#ff7b7b" /> 
              <span>Sair</span>
            </button>
          </div>
        )}
      </header>

      {/* Card da Instituição */}
      <div className="menuLateral__uni-card">
        <div className="menuLateral__uni-logo">
          <img src={instituicao?.logo} alt="Logo" />
        </div>
        <div className="menuLateral__uni-info">
          <span className="menuLateral__uni-label">Universidade de Brasília</span>
          <strong className="menuLateral__uni-name">UNB</strong>
        </div>
      </div>

      <hr className="menuLateral__divider" />

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
          {/* Botão Primário (Azul) */}
          <button className="menuLateral__btn menuLateral__btn--primary">
            <SquarePen size={20} strokeWidth={2.5} />
            <span>Criar evento</span>
          </button>
          
          {/* Botões Secundários (Hover azul claro conforme imagem) */}
          <button className="menuLateral__btn menuLateral__btn--secondary">
            <ClipboardList size={20} />
            <span>Eventos Publicados</span>
          </button>
          
          <button className="menuLateral__btn menuLateral__btn--secondary">
            <Settings size={20} />
            <span>Editar turma</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default MenuLateral;