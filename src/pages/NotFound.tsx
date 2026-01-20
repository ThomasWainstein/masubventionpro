import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-extrabold text-white/10">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4 -mt-8">
          Page non trouvee
        </h2>
        <p className="text-slate-400 mb-8">
          La page que vous recherchez n'existe pas ou a ete deplacee.
        </p>
        <Link to="/">
          <Button>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour a l'accueil
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default NotFound
