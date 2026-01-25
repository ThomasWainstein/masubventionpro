import { useEffect, useState, useRef } from "react"
import { Helmet } from "react-helmet-async"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Loader2, Mail, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react"

const EmailConfirmationPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailAddress = searchParams.get("email") || ""

  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Check if user is already confirmed
  useEffect(() => {
    const checkConfirmation = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        navigate("/app")
      }
    }
    checkConfirmation()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (session?.user?.email_confirmed_at) {
          navigate("/app")
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "Enter" && code.every((digit) => digit)) {
      handleVerify()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim()

    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split("")
      setCode(newCode)
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const codeString = code.join("")

    if (codeString.length !== 6) {
      setError("Veuillez entrer les 6 chiffres du code de verification.")
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: emailAddress,
        token: codeString,
        type: "signup",
      })

      if (verifyError) {
        throw verifyError
      }

      if (data.user) {
        setSuccess("Email confirme ! Redirection...")
        setTimeout(() => {
          navigate("/app")
        }, 1000)
      }
    } catch (err: any) {
      let errorMessage = "Le code est incorrect ou expire. Veuillez reessayer."

      if (err.message?.includes("expired")) {
        errorMessage = "Ce code a expire. Veuillez demander un nouveau code."
      } else if (err.message?.includes("invalid")) {
        errorMessage = "Code invalide. Veuillez verifier et reessayer."
      }

      setError(errorMessage)
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    if (!emailAddress) {
      setError("Adresse email introuvable.")
      return
    }

    setIsResending(true)
    setError(null)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: emailAddress,
      })

      if (resendError) {
        throw resendError
      }

      setSuccess(`Un nouveau code a ete envoye a ${emailAddress}`)
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || "Impossible de renvoyer le code. Reessayez plus tard.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 flex items-center justify-center relative">
      <Helmet>
        <title>Verification email - MaSubventionPro</title>
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

        {/* Verification Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Verifiez votre email
            </h1>
            <p className="text-slate-600">
              Entrez le code a 6 chiffres envoye a
            </p>
            <p className="font-semibold text-slate-900 mt-1">{emailAddress}</p>
          </div>

          {/* 6-digit Code Input */}
          <div className="mb-6">
            <div className="flex justify-center gap-2 mb-4">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold"
                  disabled={isVerifying}
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm mb-4">
                {success}
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={isVerifying || code.some((d) => !d)}
              className="w-full h-12"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verification...
                </>
              ) : (
                "Verifier le code"
              )}
            </Button>
          </div>

          {/* Spam Warning */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Vous ne voyez pas l'email ?</strong>
                <br />
                Verifiez votre dossier spam ou courrier indesirable.
              </div>
            </div>
          </div>

          {/* Resend Button */}
          <Button
            onClick={handleResendCode}
            disabled={isResending}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Renvoyer le code
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500 mt-6">
            Le code expire dans 1 heure.
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmailConfirmationPage
