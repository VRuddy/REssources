import { redirect } from "next/navigation";

export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200">
      <div className="bg-white/80 rounded-xl shadow-lg p-10 flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold text-indigo-700">
          Bienvenue sur REssources
        </h1>
        <p className="text-gray-700 text-center max-w-md">
          Connectez-vous ou créez un compte pour accéder à la plateforme.
        </p>
        <div className="flex gap-4 mt-4">
          <button
            className="px-6 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            onClick={() => 
              redirect("/auth/login") // Use redirect to navigate to the login page
            }
          >
            Se connecter
          </button>
          <button
            className="px-6 py-2 rounded bg-white border border-indigo-600 text-indigo-700 font-semibold hover:bg-indigo-50 transition"
            onClick={redirect("/auth/sign-up")}
          >Inscrire
          </button>
        </div>
      </div>
    </div>
  );
}
