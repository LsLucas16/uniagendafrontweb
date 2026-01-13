import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';
import "react-datepicker/dist/react-datepicker.css";
import './CriarEvento.scss';

registerLocale('pt-BR', ptBR);

const CriarEvento = () => {
  const [startDate, setStartDate] = useState(null);

  return (
    <div className="painel-evento">
      <div className="card-form">
        <h1 className="titulo-sessao">Criar novo evento</h1>
        
        <div className="formulario">
          <div className="campo">
            <label>Título</label>
            <input type="text" placeholder="Digite o título do evento" />
          </div>

          <div className="campo">
            <label>Descrição</label>
            <textarea rows="5" placeholder="Descreva os detalhes do evento"></textarea>
          </div>

          <div className="campo">
            <label>Tipo de notificação</label>
            <div className="opcoes-radio">
              <label className="radio-item">
                <input type="radio" name="notificacao" defaultChecked />
                <span>Aviso no calendário</span>
              </label>
              <label className="radio-item">
                <input type="radio" name="notificacao" />
                <span>Aviso em destaque</span>
              </label>
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
                minDate={new Date()} // Bloqueia datas anteriores a hoje
                placeholderText="Escolha uma data"
                className="input-data"
                calendarClassName="calendario-customizado"
                showPopperArrow={false}
              />
              <i className="icone-calendario"></i> 
            </div>
          </div>

          <button className="btn-publicar">Publicar</button>
        </div>
      </div>
    </div>
  );
};

export default CriarEvento;