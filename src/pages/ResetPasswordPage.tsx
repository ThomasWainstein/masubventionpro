import { useState, useEffect } from "react"
import { Helmet } from "react-helmet-async"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Loader2, Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft, AlertCircle } from "lucide-react"

type SessionState = "loading" | "invalid" | "ready" | "success"

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [sessionState, setSessionState] = useState<SessionState>("loading")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkResetSession()
  }, [])

  const checkResetSession = async () => {
    try {
      // Check for PKCE token (newer Supabase flow)
      const token = searchParams.get("token")
      const code = searchParams.get("code")

      // Check for legacy token flow
      const accessToken = searchParams.get("access_token")
      const refreshToken = searchParams.get("refresh_token")
      const type = searchParams.get("type")

      let sessionEstablished = false

      // Handle PKCE flow with token parameter
      if (token) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "recovery",
        })

        if (verifyError) {
          console.error("PKCE verify error:", verifyError)
          setSessionState("invalid")
          return
        } else if (data.session) {
          sessionEstablished = true
        } else {
          setSessionState("invalid")
          return
        }
      }

      // Handle code exchange (another PKCE variant)
      if (!sessionEstablished && code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error("Code exchange error:", exchangeError)
          setSessionState("invalid")
          return
        } else if (data.session) {
          sessionEstablished = true
        } else {
          setSessionState("invalid")
          return
        }
      }

      // Handle legacy token flow
      if (!sessionEstablished && type === "recovery" && accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (setSessionError) {
          console.error("Set session error:", setSessionError)
          setSessionState("invalid")
          return
        } else {
          sessionEstablished = true
        }
      }

      // Check if we already have a session
      if (!sessionEstablished) {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Session check error:", error)
          setSessionState("invalid")
          return
        }

        if (session) {
          sessionEstablished = true
        } else {
          setSessionState("invalid")
          return
        }
      }

      // Session established, ready for password reset
      setSessionState("ready")

    } catch (error) {
      console.error("Reset session check failed:", error)
      setSessionState("invalid")
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSessionState("success")

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login")
      }, 3000)

    } catch (err: any) {
      console.error("Password update error:", err)

      let errorMessage = "Une erreur est survenue. Veuillez reessayer."

      if (err.message?.includes("weak")) {
        errorMessage = "Le mot de passe est trop faible. Utilisez un mot de passe plus complexe."
      } else if (err.message?.includes("session") || err.message?.includes("expired")) {
        errorMessage = "Le lien a expire. Veuillez demander un nouveau lien de reinitialisation."
        setSessionState("invalid")
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (sessionState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 flex items-center justify-center">
        <Helmet>
          <title>Reinitialisation du mot de passe - MaSubventionPro</title>
        </Helmet>
        <div className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-slate-600">Verification en cours...</p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid/expired link state
  if (sessionState === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 flex items-center justify-center relative">
        <Helmet>
          <title>Lien invalide - MaSubventionPro</title>
        </Helmet>

        <Link
          to="/"
          className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Retour</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/">
              <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                MaSubventionPro
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Lien invalide ou expire
              </h1>
              <p className="text-slate-600 mb-6">
                Ce lien de reinitialisation n'est plus valide. Il a peut-etre expire ou a deja ete utilise.
              </p>

              <div className="space-y-3">
                <Link to="/login">
                  <Button className="w-full">
                    Retour a la connexion
                  </Button>
                </Link>
                <p className="text-sm text-slate-500">
                  Vous pouvez demander un nouveau lien depuis la page de connexion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (sessionState === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 flex items-center justify-center">
        <Helmet>
          <title>Mot de passe modifie - MaSubventionPro</title>
        </Helmet>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/">
              <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                MaSubventionPro
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Mot de passe modifie !
              </h1>
              <p className="text-slate-600 mb-6">
                Votre mot de passe a ete reinitialise avec succes. Vous allez etre redirige vers la page de connexion.
              </p>

              <div className="flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Redirection en cours...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ready state - show password reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 flex items-center justify-center relative">
      <Helmet>
        <title>Nouveau mot de passe - MaSubventionPro</title>
      </Helmet>

      <Link
        to="/"
        className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
              MaSubventionPro
            </div>
          </Link>
        </div>

        {/* Reset Password Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Nouveau mot de passe
            </h1>
            <p className="text-slate-600">
              Choisissez un nouveau mot de passe securise pour votre compte.
            </p>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            {/* New Password */}
            <div>
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez votre nouveau mot de passe"
                  disabled={isLoading}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre nouveau mot de passe"
                  disabled={isLoading}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Exigences du mot de passe :</strong>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    <li>• Minimum 8 caracteres</li>
                    <li>• Melange de lettres et chiffres recommande</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Modification en cours...
                </>
              ) : (
                "Modifier le mot de passe"
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-slate-500 mt-6">
            <Link to="/login" className="text-blue-600 hover:underline">
              Retour a la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
