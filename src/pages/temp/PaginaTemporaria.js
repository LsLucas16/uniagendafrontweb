import React from "react";

const PaginaTemporaria = ({ titulo }) => {
  return (
    <div style={{
      padding: "30px",
      fontSize: "22px",
      fontWeight: "600",
      color: "#3e5166"
    }}>
      {titulo}
    </div>
  );
};

export default PaginaTemporaria;
