import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';
import "react-datepicker/dist/react-datepicker.css";
import './CriarEvento.scss';

registerLocale('pt-BR', ptBR);

const CriarEvento = () => {
  const [startDate, setStartDate] = useState(null);
  // Estado para gerenciar as notificações de forma independente
  const [notificacoes, setNotificacoes] = useState({
    calendario: true,
    destaque: false
  });

  const handleCheckbox = (tipo) => {
    setNotificacoes(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  return (
    <div className="painel-evento">
      <div className="card-form">
        <h1 className="titulo-sessao">Criar novo evento</h1>
        
        <div className="formulario">
          <div className="campo">
            <label>Título</label>
            <input type="text" placeholder="Digite o título do evento" className="input-estilizado" />
          </div>

          <div className="campo">
            <label>Descrição</label>
            <textarea rows="4" placeholder="Descreva os detalhes do evento" className="input-estilizado"></textarea>
          </div>

          <div className="campo">
            <label className="label-notificacao">Tipo de notificação</label>
            <div className="opcoes-checkbox">
              <div className="item-check" onClick={() => handleCheckbox('calendario')}>
                <div className={`circular-check ${notificacoes.calendario ? 'active' : ''}`}></div>
                <span>Aviso no calendário</span>
              </div>
              <div className="item-check" onClick={() => handleCheckbox('destaque')}>
                <div className={`circular-check ${notificacoes.destaque ? 'active' : ''}`}></div>
                <span>Aviso em destaque</span>
              </div>
            </div>
          </div>

          <div className="campo">
            <label>Data do evento</label>
            <div className="input-calendario-wrapper">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                locale="pt-BR"
                dateFormat="dd/MM/yyyy"
                minDate={new Date()}
                placeholderText="Escolha uma data"
                className="input-data"
                calendarClassName="calendario-customizado"
                showPopperArrow={false}
              />
            </div>
          </div>

          <div className="container-btn">
            <button className="btn-publicar">Publicar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriarEvento;