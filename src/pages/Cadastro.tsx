import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Cadastro() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to PIN login - cadastro is managed via admin control
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}
