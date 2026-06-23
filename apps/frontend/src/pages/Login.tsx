import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();

  const handleLogin = () => {
    login();
    navigate('/catalogo');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-4xl mb-2">🌿</div>
        <h1 className="text-2xl font-bold text-arca-dark">A.R.C.A.</h1>
        <p className="text-sm text-gray-500 mb-6">
          Gestión de residuos · Santo Domingo
        </p>

        <button
          onClick={handleLogin}
          className="w-full bg-arca-green hover:bg-arca-dark text-white font-medium py-3 rounded-lg transition-colors"
        >
          Entrar como vecino (dev)
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Login temporal sin autenticación real.
          <br />
          ClaveÚnica + JWT llegará en una fase posterior.
        </p>
      </div>
    </div>
  );
}
