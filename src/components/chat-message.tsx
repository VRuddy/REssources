import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { MessageCircle, ChevronDown, ChevronRight, Reply } from 'lucide-react'

interface ChatMessageItemProps {
  message: ChatMessage & { replies?: ChatMessage[] }
  isOwnMessage: boolean
  onReply?: (messageId: number) => void
  level?: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  hasReplies?: boolean
  replyCount?: number
  parentMessage?: ChatMessage
}

export const ChatMessageItem = ({ 
  message, 
  isOwnMessage, 
  onReply,
  level = 0,
  isCollapsed = false,
  onToggleCollapse,
  hasReplies = false,
  replyCount = 0,
  parentMessage
}: ChatMessageItemProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "maintenant"
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}j`
  }

  // Couleurs progressives pour les niveaux de threads
  const getThreadColor = (level: number) => {
    const colors = [
      'border-blue-200 dark:border-blue-700',
      'border-green-200 dark:border-green-700', 
      'border-purple-200 dark:border-purple-700',
      'border-orange-200 dark:border-orange-700',
      'border-pink-200 dark:border-pink-700'
    ]
    return colors[level % colors.length] || 'border-gray-200 dark:border-gray-700'
  }

  return (
    <div className={cn(
      "group relative transition-colors",
      level > 0 && "ml-4",
      level > 0 && `border-l-2 ${getThreadColor(level - 1)} pl-4`
    )}>
      {/* Thread line connector amélioré pour les réponses */}
      {level > 0 && (
        <div className={cn(
          "absolute -left-0 top-0 w-4 h-8 border-l-2 border-b-2 rounded-bl-lg",
          getThreadColor(level - 1)
        )} />
      )}
      
      <div className={cn(
        "flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors relative",
        level > 0 && "bg-muted/10"
      )}>
        {/* Avatar placeholder */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0",
          isOwnMessage 
            ? "bg-primary" 
            : level === 0 
              ? "bg-gradient-to-br from-blue-500 to-purple-600"
              : level === 1
                ? "bg-gradient-to-br from-green-500 to-blue-500"
                : level === 2
                  ? "bg-gradient-to-br from-purple-500 to-pink-500"
                  : "bg-gradient-to-br from-orange-500 to-red-500"
        )}>
          {message.user.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* En réponse à... */}
          {parentMessage && (
            <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
              <Reply className="w-3 h-3" />
              <span>En réponse à</span>
              <span className="font-medium text-foreground">{parentMessage.user.name}</span>
                             <span className="italic text-muted-foreground/70 truncate max-w-[200px]">
                 &ldquo;{parentMessage.content.slice(0, 40)}{parentMessage.content.length > 40 ? '...' : ''}&rdquo;
               </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">
              {message.user.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            {isOwnMessage && (
              <span className="text-xs text-primary font-medium">vous</span>
            )}
          </div>

          {/* Message content */}
          <div className={cn(
            "text-sm leading-relaxed mb-2",
            level === 0 ? "text-foreground" : "text-foreground/90",
            level > 2 && "text-sm text-foreground/80"
          )}>
            {message.content}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 text-muted-foreground">
            {/* Désactiver répondre si on est déjà dans une réponse (level > 0) */}
            {level === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 hover:text-primary transition-colors"
                onClick={() => onReply?.(message.id as number)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                <span className="text-xs">Répondre</span>
              </Button>
            )}

            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 hover:text-primary transition-colors"
                onClick={onToggleCollapse}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 mr-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs">
                  {replyCount} {replyCount === 1 ? 'réponse' : 'réponses'}
                  {isCollapsed ? ' - Afficher' : ' - Masquer'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
