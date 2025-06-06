'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Camera as CameraIcon, RotateCw, Settings, AlertTriangle } from 'lucide-react'

interface CameraProps {
  onBack: () => void
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown'

export default function CameraComponent({ onBack }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isCapacitor, setIsCapacitor] = useState(false)
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')
  const [showPermissionHelp, setShowPermissionHelp] = useState(false)

  // Détecter Capacitor
  useEffect(() => {
    const checkCapacitor = async () => {
      try {
        if (typeof window !== 'undefined' && (window as Window & { Capacitor?: unknown }).Capacitor) {
          setIsCapacitor(true)
          setCanSwitchCamera(true)
          await checkCameraPermissions()
        } else {
          setIsCapacitor(false)
          await checkWebPermissions()
        }
      } catch {
        setIsCapacitor(false)
        await checkWebPermissions()
      }
    }
    
    checkCapacitor()
  }, [])

  // Vérifier permissions Capacitor
  const checkCameraPermissions = async () => {
    try {
      const { Camera } = await import('@capacitor/camera')
      
      // Vérifier les permissions actuelles
      const permissions = await Camera.checkPermissions()
      
      if (permissions.camera === 'granted') {
        setPermissionState('granted')
        setIsLoading(false)
      } else if (permissions.camera === 'denied') {
        setPermissionState('denied')
        setError('Permission caméra refusée. Vous devez autoriser l&apos;accès dans les paramètres.')
        setShowPermissionHelp(true)
        setIsLoading(false)
      } else {
        // Permission pas encore demandée
        await requestCameraPermissions()
      }
    } catch (err) {
      console.error('Erreur vérification permissions:', err)
      setError('Impossible de vérifier les permissions caméra.')
      setIsLoading(false)
    }
  }

  // Demander permissions Capacitor
  const requestCameraPermissions = async () => {
    try {
      const { Camera } = await import('@capacitor/camera')
      
      const permissions = await Camera.requestPermissions()
      
      if (permissions.camera === 'granted') {
        setPermissionState('granted')
        setError(null)
        setShowPermissionHelp(false)
        setIsLoading(false)
      } else {
        setPermissionState('denied')
        setError('Permission caméra refusée. L&apos;accès à la caméra est nécessaire pour cette fonctionnalité.')
        setShowPermissionHelp(true)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Erreur demande permissions:', err)
      setError('Impossible de demander les permissions caméra.')
      setIsLoading(false)
    }
  }

  // Vérifier permissions Web
  const checkWebPermissions = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({name: 'camera' as PermissionName})
      
      setPermissionState(permissionStatus.state as PermissionState)
      
      if (permissionStatus.state === 'granted') {
        setIsLoading(false)
        // Démarrer la caméra web automatiquement si permission accordée
        await startWebCamera()
      } else if (permissionStatus.state === 'denied') {
        setError('Permission caméra refusée dans le navigateur.')
        setShowPermissionHelp(true)
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
      
      // Écouter les changements de permission
      permissionStatus.onchange = () => {
        setPermissionState(permissionStatus.state as PermissionState)
        if (permissionStatus.state === 'granted') {
          setError(null)
          setShowPermissionHelp(false)
          startWebCamera()
        }
      }
    } catch (err) {
      console.error('Erreur permissions web:', err)
      setIsLoading(false)
    }
  }

  // Ouvrir les paramètres système (Capacitor)
  const openAppSettings = async () => {
    try {
      if (isCapacitor) {
        const { App } = await import('@capacitor/app')
        await App.openSettingsApp()
      }
    } catch (err) {
      console.error('Impossible d&apos;ouvrir les paramètres:', err)
    }
  }

  // Pour Capacitor - Prendre une photo
  const takeCapacitorPhoto = async () => {
    if (permissionState !== 'granted') {
      await requestCameraPermissions()
      return
    }

    try {
      setIsLoading(true)
      setError(null)

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
      
      if (err instanceof Error && err.message.includes('permission')) {
        await checkCameraPermissions()
      } else {
        setError('Impossible d&apos;accéder à la caméra native.')
      }
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
      setPermissionState('granted')
      setError(null)
      setShowPermissionHelp(false)
      setIsLoading(false)
    } catch (err: unknown) {
      console.error('Erreur Web Camera:', err)
      
      let errorMessage = 'Impossible d&apos;accéder à la caméra.'
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Permission caméra refusée. Cliquez sur l&apos;icône caméra dans la barre d&apos;adresse.'
          setPermissionState('denied')
          setShowPermissionHelp(true)
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
    if (!isCapacitor && permissionState === 'granted') {
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
  }, [isCapacitor, permissionState])

  // Initialiser la caméra selon l'environnement
  useEffect(() => {
    if (!isCapacitor && permissionState === 'granted') {
      startWebCamera()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode, isCapacitor, permissionState])

  const handleBack = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    onBack()
  }

  const switchCamera = () => {
    if (canSwitchCamera && permissionState === 'granted') {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
      setCapturedImage(null)
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  // Affichage aide permissions
  const PermissionHelp = () => (
    <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mt-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
        <div className="space-y-2">
          <h4 className="font-semibold text-orange-800 dark:text-orange-200">
            Comment autoriser la caméra :
          </h4>
          
          {isCapacitor ? (
            <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <p><strong>📱 Sur mobile :</strong></p>
              <p>1. Appuyez sur &apos;Ouvrir paramètres&apos; ci-dessous</p>
              <p>2. Trouvez cette application dans la liste</p>
              <p>3. Activez l&apos;autorisation &apos;Appareil photo&apos;</p>
              <p>4. Revenez dans l&apos;application</p>
              
              <Button 
                onClick={openAppSettings} 
                variant="outline" 
                size="sm" 
                className="mt-2 bg-orange-100 hover:bg-orange-200 border-orange-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Ouvrir paramètres
              </Button>
            </div>
          ) : (
            <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <p><strong>💻 Sur navigateur :</strong></p>
              <p>1. Cliquez sur l&apos;icône 🔒 ou 📷 dans la barre d&apos;adresse</p>
              <p>2. Sélectionnez &apos;Autoriser&apos; pour la caméra</p>
              <p>3. Rechargez la page si nécessaire</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
        <div className="text-center space-y-4 max-w-md">
          <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Caméra non disponible</h2>
          <p className="text-muted-foreground text-sm px-4">{error}</p>
          
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
            <p>🔧 Environnement: {isCapacitor ? 'Capacitor (Native)' : 'Web'}</p>
            <p>📋 Permission: {permissionState}</p>
          </div>

          {showPermissionHelp && <PermissionHelp />}

          <div className="flex gap-2 justify-center">
            {permissionState === 'denied' && !isCapacitor && (
              <Button onClick={() => startWebCamera()} variant="outline">
                <CameraIcon className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            )}
            
            {permissionState === 'denied' && isCapacitor && (
              <Button onClick={() => checkCameraPermissions()} variant="outline">
                <CameraIcon className="w-4 h-4 mr-2" />
                Vérifier permissions
              </Button>
            )}

            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
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
            {facingMode === 'user' ? 'Avant' : 'Arrière'} • {permissionState}
          </p>
        </div>
        
        {canSwitchCamera && permissionState === 'granted' && (
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
          {!isCapacitor && !capturedImage && permissionState === 'granted' && (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <CameraIcon className="w-8 h-8 mx-auto animate-pulse" />
                    <p className="text-sm text-muted-foreground">
                      Initialisation caméra...
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
          {isCapacitor && !capturedImage && !isLoading && permissionState === 'granted' && (
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

          {/* Attente permissions */}
          {permissionState !== 'granted' && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center space-y-4">
                <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground animate-pulse" />
                <div>
                  <h3 className="text-lg font-semibold">Permission requise</h3>
                  <p className="text-sm text-muted-foreground">
                    {isCapacitor ? 'Autorisation caméra nécessaire' : 'Cliquez pour autoriser la caméra'}
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
                  disabled={isLoading || permissionState !== 'granted'}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  {permissionState !== 'granted' ? 'Autoriser caméra' : 
                   isLoading ? 'Chargement...' : 'Prendre une photo'}
                </Button>
              )}
            </>
          ) : (
            // Contrôles Web
            <>
              {permissionState !== 'granted' ? (
                <Button 
                  onClick={startWebCamera} 
                  variant="default" 
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Autoriser caméra
                </Button>
              ) : (
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
            </>
          )}
        </div>
      </div>
    </div>
  )
} 