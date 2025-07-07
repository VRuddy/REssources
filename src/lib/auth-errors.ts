// Fonction pour traduire les erreurs d'authentification Supabase en français
export function translateAuthError(error: string): string {
  const errorTranslations: Record<string, string> = {
    // Erreurs de connexion
    'Invalid login credentials': 'Identifiants de connexion invalides',
    'Invalid credentials': 'Identifiants invalides',
    'Email not confirmed': 'Email non confirmé',
    'Invalid email or password': 'Email ou mot de passe invalide',
    'Email not found': 'Email introuvable',
    'Password is incorrect': 'Mot de passe incorrect',
    'User not found': 'Utilisateur introuvable',
    
    // Erreurs de bannissement
    'User is banned': 'Utilisateur banni',
    'Account is temporarily banned': 'Compte temporairement banni',
    'Your account has been banned': 'Votre compte a été banni',
    'User account is disabled': 'Compte utilisateur désactivé',
    
    // Erreurs d'inscription
    'User already registered': 'Utilisateur déjà enregistré',
    'Email already exists': 'Email déjà existant',
    'Email already registered': 'Email déjà enregistré',
    'User already exists': 'Utilisateur déjà existant',
    'Signup requires a valid password': 'L\'inscription nécessite un mot de passe valide',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
    'Password is too weak': 'Le mot de passe est trop faible',
    'Invalid email format': 'Format d\'email invalide',
    'Invalid email': 'Email invalide',
    
    // Erreurs de réinitialisation de mot de passe
    'Unable to validate email address: invalid format': 'Impossible de valider l\'adresse email : format invalide',
    'Password reset requires a valid email': 'La réinitialisation du mot de passe nécessite un email valide',
    'Reset password link expired': 'Le lien de réinitialisation du mot de passe a expiré',
    'Invalid reset token': 'Token de réinitialisation invalide',
    
    // Erreurs de session
    'Session expired': 'Session expirée',
    'No session found': 'Aucune session trouvée',
    'Invalid session': 'Session invalide',
    'User session has expired': 'La session utilisateur a expiré',
    'Authentication required': 'Authentification requise',
    'Access token expired': 'Token d\'accès expiré',
    'Refresh token expired': 'Token de rafraîchissement expiré',
    
    // Erreurs de taux limite
    'Too many requests': 'Trop de requêtes',
    'Rate limit exceeded': 'Limite de taux dépassée',
    'Email rate limit exceeded': 'Limite de taux d\'email dépassée',
    'Too many sign up attempts': 'Trop de tentatives d\'inscription',
    'Too many login attempts': 'Trop de tentatives de connexion',
    
    // Erreurs de vérification
    'Email verification required': 'Vérification d\'email requise',
    'Please verify your email': 'Veuillez vérifier votre email',
    'Verification link expired': 'Le lien de vérification a expiré',
    'Invalid verification token': 'Token de vérification invalide',
    'Email already verified': 'Email déjà vérifié',
    
    // Erreurs de réseau
    'Network error': 'Erreur réseau',
    'Unable to connect': 'Impossible de se connecter',
    'Connection timeout': 'Délai de connexion dépassé',
    'Service temporarily unavailable': 'Service temporairement indisponible',
    
    // Erreurs générales
    'An error occurred': 'Une erreur est survenue',
    'Something went wrong': 'Quelque chose s\'est mal passé',
    'Internal server error': 'Erreur interne du serveur',
    'Bad request': 'Requête incorrecte',
    'Unauthorized': 'Non autorisé',
    'Forbidden': 'Interdit',
    'Not found': 'Introuvable',
    'Method not allowed': 'Méthode non autorisée',
    
    // Erreurs spécifiques aux mots de passe
    'New password should be different': 'Le nouveau mot de passe doit être différent',
    'Password must contain at least one uppercase letter': 'Le mot de passe doit contenir au moins une lettre majuscule',
    'Password must contain at least one lowercase letter': 'Le mot de passe doit contenir au moins une lettre minuscule',
    'Password must contain at least one number': 'Le mot de passe doit contenir au moins un chiffre',
    'Password must contain at least one special character': 'Le mot de passe doit contenir au moins un caractère spécial',
    
    // Erreurs de confirmation
    'Confirmation failed': 'Échec de la confirmation',
    'Invalid confirmation token': 'Token de confirmation invalide',
    'Confirmation token expired': 'Token de confirmation expiré',
    
    // Erreurs de permission
    'Insufficient permissions': 'Permissions insuffisantes',
    'Access denied': 'Accès refusé',
    'You do not have permission to perform this action': 'Vous n\'avez pas la permission d\'effectuer cette action',
  }

  // Recherche exacte d'abord
  if (errorTranslations[error]) {
    return errorTranslations[error]
  }

  // Recherche partielle pour les erreurs qui contiennent certains mots-clés
  const errorLower = error.toLowerCase()
  
  if (errorLower.includes('ban')) {
    return 'Votre compte a été banni'
  }
  
  if (errorLower.includes('password') && errorLower.includes('weak')) {
    return 'Le mot de passe est trop faible'
  }
  
  if (errorLower.includes('email') && errorLower.includes('invalid')) {
    return 'Format d\'email invalide'
  }
  
  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return 'Trop de tentatives. Veuillez réessayer plus tard'
  }
  
  if (errorLower.includes('expired')) {
    return 'Élément expiré. Veuillez réessayer'
  }
  
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return 'Problème de connexion. Vérifiez votre connexion internet'
  }

  // Message par défaut si aucune traduction n'est trouvée
  return 'Une erreur est survenue. Veuillez réessayer'
}