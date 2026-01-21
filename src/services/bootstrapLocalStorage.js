import data from "../api/dados.json";

export function bootstrapLocalStorage() {
  if (!localStorage.getItem("@uniagenda:usuarios")) {
    localStorage.setItem("@uniagenda:usuarios", JSON.stringify(data.usuarios));
    localStorage.setItem("@uniagenda:instituicoes", JSON.stringify(data.instituicoes));
    localStorage.setItem("@uniagenda:disciplinas", JSON.stringify(data.disciplinas));
    localStorage.setItem("@uniagenda:eventos", JSON.stringify(data.eventos));
  }
}
