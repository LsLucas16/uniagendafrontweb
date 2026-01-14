import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import './MenuLateral.scss';
import data from '../../api/dados.json';
import { 
  SquarePen, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Plus, 
  Calendar 
} from 'lucide-react';

const MenuLateral = ({ currentUserId = 301 }) => { // Alterei o ID padrão para testar como coordenador
  const [perfilAberto, setPerfilAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  
  const user = data.usuarios.find(u => u.id === currentUserId);
  const instituicao = data.instituicoes.find(i => i.id === user?.faculdadeId);

  if (!user) return null;

  const primeiraLetra = user.nome.trim().charAt(0).toUpperCase();
  const isCoordenador = user.tipo === 'coordenador';

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
          <div className="menuLateral__brand">
            <span>UniAgenda - Sua rotina acadêmica sob controle!</span>
          </div>
        ) : (
          <div className="menuLateral__user-details">
            <strong>{user.nome}</strong>
            <span className="menuLateral__user-name">{user.user}</span>
            <span className="menuLateral__user-login">{user.login}</span>
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
        <div className="menuLateral__actions">
          {isCoordenador ? (
            /* --- LAYOUT COORDENADOR --- */
              <>
                <button
                  className={`menuLateral__btn ${isActive('/criar-evento') ? 'active' : ''}`}
                  onClick={() => navigate('/criar-evento')}
                >
                  <SquarePen size={20} />
                  <span>Criar Eventos</span>
                </button>

                <button
                  className={`menuLateral__btn ${isActive('/nova-turma') ? 'active' : ''}`}
                  onClick={() => navigate('/nova-turma')}
                >
                  <Plus size={20} />
                  <span>Novas Turmas</span>
                </button>

                <button
                  className={`menuLateral__btn ${isActive('/editar-turma') ? 'active' : ''}`}
                  onClick={() => navigate('/editar-turma')}
                >
                  <Settings size={20} />
                  <span>Editar Turmas</span>
                </button>

                <button
                  className={`menuLateral__btn ${isActive('/eventos') ? 'active' : ''}`}
                  onClick={() => navigate('/eventos')}
                >
                  <ClipboardList size={20} />
                  <span>Eventos Publicados</span>
                </button>

                <button
                  className={`menuLateral__btn ${isActive('/calendario') ? 'active' : ''}`}
                  onClick={() => navigate('/calendario')}
                >
                  <Calendar size={20} />
                  <span>Ver Calendário</span>
                </button>

                <div className="menuLateral__group menuLateral__group--bottom">
                  <select className="menuLateral__select">
                    {user.disciplinas.map((disc, index) => (
                      <option key={index} value={disc}>{disc}</option>
                    ))}
                  </select>
                </div>
              </>
          ) : (
            /* --- LAYOUT PROFESSOR / RESPONSÁVEL --- */
            <>
              <div className="menuLateral__group">
                <label className="menuLateral__label">Turma atual</label>
                <select className="menuLateral__select">
                  {user.disciplinas.map((disc, index) => (
                    <option key={index} value={disc}>{disc}</option>
                  ))}
                </select>
              </div>

              <hr className="menuLateral__divider" />
              
              <button className="menuLateral__btn menuLateral__btn--primary">
                <SquarePen size={20} />
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
            </>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default MenuLateral;