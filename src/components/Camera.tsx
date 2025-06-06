'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Camera as CameraIcon, RotateCw } from 'lucide-react'

interface CameraProps {
  onBack: () => void
}

export default function CameraComponent({ onBack }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isCapacitor, setIsCapacitor] = useState(false)
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  // Détecter Capacitor
  useEffect(() => {
    const checkCapacitor = async () => {
      try {
        if (typeof window !== 'undefined' && (window as Window & { Capacitor?: unknown }).Capacitor) {
          setIsCapacitor(true)
          setCanSwitchCamera(true) // Capacitor permet toujours le changement
        }
      } catch {
        setIsCapacitor(false)
      }
    }
    
    checkCapacitor()
  }, [])

  // Pour Capacitor - Prendre une photo
  const takeCapacitorPhoto = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Import dynamique de Capacitor
      const { Camera } = await import('@capacitor/camera')
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: (await import('@capacitor/camera')).CameraResultType.DataUrl,
        source: (await import('@capacitor/camera')).CameraSource.Camera,
        direction: facingMode === 'user' 
          ? (await import('@capacitor/camera')).CameraDirection.Front 
          : (await import('@capacitor/camera')).CameraDirection.Rear,
        saveToGallery: false
      })

      setCapturedImage(image.dataUrl || '')
      setIsLoading(false)
    } catch (err: unknown) {
      console.error('Erreur Capacitor Camera:', err)
      setError('Impossible d&apos;accéder à la caméra native.')
      setIsLoading(false)
    }
  }

  // Pour le web - getUserMedia
  const startWebCamera = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setStream(mediaStream)
      setIsLoading(false)
    } catch (err: unknown) {
      console.error('Erreur Web Camera:', err)
      
      let errorMessage = 'Impossible d&apos;accéder à la caméra.'
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Permission caméra refusée. Vérifiez les paramètres de votre navigateur.'
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra trouvée sur cet appareil.'
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Caméra en cours d&apos;utilisation par une autre application.'
        }
      }
      
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  // Vérifier les caméras disponibles pour le web
  useEffect(() => {
    if (!isCapacitor) {
      const checkWebCameras = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          setCanSwitchCamera(videoDevices.length > 1)
        } catch (err) {
          console.log('Impossible de lister les caméras:', err)
        }
      }
      checkWebCameras()
    }
  }, [isCapacitor])

  // Initialiser la caméra selon l'environnement
  useEffect(() => {
    if (isCapacitor) {
      // Pour Capacitor, on ne démarre pas automatiquement
      setIsLoading(false)
    } else {
      // Pour le web, démarrer getUserMedia
      startWebCamera()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode, isCapacitor])

  const handleBack = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    onBack()
  }

  const switchCamera = () => {
    if (canSwitchCamera) {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
      setCapturedImage(null) // Reset image capturée
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
        <div className="text-center space-y-4">
          <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Erreur caméra</h2>
          <p className="text-muted-foreground text-sm px-4">{error}</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>🔧 Environnement: {isCapacitor ? 'Capacitor (Native)' : 'Web'}</p>
            {!isCapacitor && (
              <>
                <p>• Autoriser l&apos;accès caméra dans les paramètres</p>
                <p>• Recharger la page si nécessaire</p>
              </>
            )}
          </div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background/10 backdrop-blur-sm">
        <Button onClick={handleBack} variant="ghost" size="default" className="text-white hover:bg-white/20">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        
        <div className="text-center">
          <h1 className="text-white font-semibold">
            Caméra {isCapacitor ? '📱' : '💻'}
          </h1>
          <p className="text-xs text-white/60">
            {facingMode === 'user' ? 'Avant' : 'Arrière'}
          </p>
        </div>
        
        {canSwitchCamera && (
          <Button 
            onClick={switchCamera} 
            variant="ghost" 
            size="default"
            className="text-white hover:bg-white/20"
            disabled={isLoading}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Zone caméra */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video">
          {/* Image capturée (Capacitor) */}
          {capturedImage && (
            <div className="w-full h-full">
              <img 
                src={capturedImage} 
                alt="Photo capturée"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}

          {/* Caméra web en direct */}
          {!isCapacitor && !capturedImage && (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <CameraIcon className="w-8 h-8 mx-auto animate-pulse" />
                    <p className="text-sm text-muted-foreground">
                      Chargement caméra web...
                    </p>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                onLoadedMetadata={() => setIsLoading(false)}
              />
            </>
          )}

          {/* Placeholder Capacitor */}
          {isCapacitor && !capturedImage && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center space-y-4">
                <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Caméra Native</h3>
                  <p className="text-sm text-muted-foreground">
                    Appuyez pour prendre une photo
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div className="p-6 bg-background/10 backdrop-blur-sm">
        <div className="flex justify-center items-center space-x-6">
          {isCapacitor ? (
            // Contrôles Capacitor
            <>
              {capturedImage ? (
                <Button onClick={retakePhoto} variant="outline" size="lg">
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Reprendre
                </Button>
              ) : (
                <Button 
                  onClick={takeCapacitorPhoto} 
                  variant="default" 
                  size="lg"
                  disabled={isLoading}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  {isLoading ? 'Chargement...' : 'Prendre une photo'}
                </Button>
              )}
            </>
          ) : (
            // Contrôles Web
            <div className="text-center">
              <p className="text-xs text-white/70">
                Caméra web en direct - {facingMode === 'user' ? '🤳 Selfie' : '📷 Normale'}
              </p>
              {canSwitchCamera && (
                <p className="text-xs text-white/50 mt-1">
                  Utilisez ↻ pour changer de caméra
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 