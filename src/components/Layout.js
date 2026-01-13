import MenuLateral from "./menuLateral/MenuLateral";
import Header from "./header/Header";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <MenuLateral />
      <div style={{ flex: 1 }}>
        <Header />
        <div style={{ padding: "20px", height: "calc(100% - 70px)", overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
