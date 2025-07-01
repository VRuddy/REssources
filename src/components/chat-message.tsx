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

  return (
    <div className={cn(
      "group relative border-l-2 border-transparent hover:border-muted-foreground/20 transition-colors",
      level > 0 && "ml-6 border-l-border/50"
    )}>
      {/* Thread line connector for replies */}
      {level > 0 && (
        <div className="absolute -left-2 top-0 w-4 h-6 border-l-2 border-b-2 border-border/50 rounded-bl-lg" />
      )}
      
      <div className={cn(
        "flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors",
        level > 0 && "pl-6"
      )}>
        {/* Avatar placeholder */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0",
          isOwnMessage 
            ? "bg-primary" 
            : "bg-gradient-to-br from-blue-500 to-purple-600"
        )}>
          {message.user.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header with user info and time */}
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
          <div className="text-sm text-foreground leading-relaxed mb-2">
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
