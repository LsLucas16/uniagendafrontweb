import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './MenuLateral.scss';
import data from '../../api/dados.json';
import { SquarePen, ClipboardList, Settings, LogOut } from 'lucide-react';

const MenuLateral = ({ currentUserId = 201 }) => {
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [saudacao, setSaudacao] = useState('');
  const navigate = useNavigate();
  
  const user = data.usuarios.find(u => u.id === currentUserId);
  const instituicao = data.instituicoes.find(i => i.id === user?.faculdadeId);


  if (!user) return null;

  const primeiraLetra = user.nome.trim().charAt(0).toUpperCase();
  const primeiroNome = user.nome.split(' ')[0];

  const handleLogout = (e) => {
    e.stopPropagation(); 
    localStorage.removeItem('token'); 
    navigate('/'); 
  };

  return (
    <aside className="menuLateral">
      <header 
        className={`menuLateral__header ${perfilAberto ? 'active' : ''}`} 
        onClick={() => setPerfilAberto(!perfilAberto)}
      >
        <div className="menuLateral__avatar">{primeiraLetra}</div>
        
        {!perfilAberto ? (
          <p className="menuLateral__brand">
            <span>UniAgenda - Sua rotina acadêmica sob controle!</span>
          </p>
        ) : (
          <div className="menuLateral__user-details">
            <strong>{user.nome}</strong>
            <span className="menuLateral__user-login">{user.user}</span>
            <button className="btn-sair" onClick={handleLogout}>
              <LogOut size={16} /> 
              <span>Sair</span>
            </button>
          </div>
        )}
      </header>

      {!perfilAberto && (
        <div className="menuLateral__uni-card">
          <div className="menuLateral__uni-logo">
            <img src={instituicao?.logo} alt="Logo" />
          </div>
          <div className="menuLateral__uni-info">
            <span className="menuLateral__uni-label">{instituicao?.nome}</span>
            <strong className="menuLateral__uni-name">{instituicao?.sigla}</strong>
          </div>
        </div>
      )}

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
          <button className="menuLateral__btn menuLateral__btn--primary">
            <SquarePen size={20} strokeWidth={2.5} />
            <span>Criar evento</span>
          </button>
          
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