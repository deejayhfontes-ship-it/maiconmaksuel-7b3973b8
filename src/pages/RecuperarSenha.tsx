import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RecuperarSenha() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to PIN login - password recovery not applicable
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}
