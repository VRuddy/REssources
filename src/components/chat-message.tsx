import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { MessageCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface ChatMessageItemProps {
  message: ChatMessage & { replies?: ChatMessage[] }
  isOwnMessage: boolean
  onReply?: (messageId: number) => void
  level?: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  hasReplies?: boolean
  replyCount?: number
}

export const ChatMessageItem = ({ 
  message, 
  isOwnMessage, 
  onReply,
  level = 0,
  isCollapsed = false,
  onToggleCollapse,
  hasReplies = false,
  replyCount = 0
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
      'border-blue-200',
      'border-green-200', 
      'border-purple-200',
      'border-orange-200',
      'border-pink-200'
    ]
    return colors[level % colors.length] || 'border-gray-200'
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
        {/* Badge de niveau pour les threads profonds */}
        {level > 0 && (
          <div className={cn(
            "absolute -left-2 top-2 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white text-[10px]",
            level === 1 && "bg-blue-400",
            level === 2 && "bg-green-400", 
            level === 3 && "bg-purple-400",
            level >= 4 && "bg-orange-400"
          )}>
            {level}
          </div>
        )}

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
          {/* Header avec indicateur de niveau */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">
              {message.user.name}
            </span>
            {level > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-medium",
                level === 1 && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                level === 2 && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                level === 3 && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                level >= 4 && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
              )}>
                réponse {level > 1 ? `niv.${level}` : ''}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            {isOwnMessage && (
              <span className="text-xs text-primary font-medium">vous</span>
            )}
          </div>

          {/* Message content avec style différent selon le niveau */}
          <div className={cn(
            "text-sm leading-relaxed mb-2",
            level === 0 ? "text-foreground" : "text-foreground/90",
            level > 2 && "text-sm text-foreground/80"
          )}>
            {message.content}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 hover:text-primary transition-colors"
              onClick={() => onReply?.(message.id as number)}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              <span className="text-xs">Répondre</span>
            </Button>

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
