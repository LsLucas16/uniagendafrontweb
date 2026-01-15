import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';
import Swal from 'sweetalert2'; // Importe o SweetAlert2
import "react-datepicker/dist/react-datepicker.css";
import './CriarEvento.scss';

registerLocale('pt-BR', ptBR);

const CriarEvento = () => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [notificacoes, setNotificacoes] = useState({
    calendario: true,
    destaque: false
  });

  // Configuração Global para alertas sérios
  const Toast = Swal.mixin({
    customClass: {
      confirmButton: 'btn-confirm-swal',
      cancelButton: 'btn-cancel-swal'
    },
    buttonsStyling: false // Permite usar o CSS do seu projeto
  });

  const handleCheckbox = (tipo) => {
    setNotificacoes(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  const handleSalvar = async () => {
    // Validação básica
    if (!titulo || !startDate) {
      Swal.fire({
        title: 'Campos obrigatórios',
        text: 'Por favor, preencha todos os campos.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#2E4A67', // Azul marinho do seu Header
      });
      return;
    }

    try {
      // Simulação de carregamento
      Swal.fire({
        title: 'Publicando evento...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      // Simulação de API
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Sucesso Profissional
      Swal.fire({
        title: 'Sucesso!',
        text: 'O evento foi publicado e já está disponível.',
        icon: 'success',
        confirmButtonText: 'Ótimo',
        confirmButtonColor: '#2E4A67',
      });

    } catch (error) {
      // Erro Profissional
      Swal.fire({
        title: 'Erro ao publicar',
        text: 'Não foi possível salvar o evento. Tente novamente em instantes.',
        icon: 'error',
        confirmButtonText: 'Fechar',
        confirmButtonColor: '#d33',
      });
    }
  };

  return (
    <div className="painel-evento">
      <div className="card-form">
        <h1 className="titulo-sessao">Criar novo evento</h1>
        
        <div className="formulario">
          <div className="campo">
            <label>Título</label>
            <input 
              type="text" 
              placeholder="Digite o título do evento" 
              className="input-estilizado"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label>Descrição</label>
            <textarea 
              rows="10" 
              placeholder="Descreva os detalhes do evento" 
              className="input-estilizado"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            ></textarea>
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
                popperClassName="popper-calendario"
                showPopperArrow={false}
                renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
  <div className="cal-header cal-header--figma">
    <button
      type="button"
      className="cal-nav cal-nav--figma"
      onClick={decreaseMonth}
      aria-label="Mês anterior"
    >
      ‹
    </button>

    <div className="cal-title cal-title--figma">
      {date
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(/^./, (c) => c.toUpperCase())}
    </div>

    <button
      type="button"
      className="cal-nav cal-nav--figma"
      onClick={increaseMonth}
      aria-label="Próximo mês"
    >
      ›
    </button>
  </div>
)}

                formatWeekDay={(nameOfDay) =>
                  nameOfDay
                    .slice(0, 3)
                    .toUpperCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // tira acento
                }
              />

            </div>
          </div>

          <div className="container-btn">
            <button className="btn-publicar" onClick={handleSalvar}>
              Publicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriarEvento;