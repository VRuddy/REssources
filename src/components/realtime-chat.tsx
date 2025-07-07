'use client'

import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import {
  type ChatMessage,
  useRealtimeChat,
} from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, X, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RealtimeChatProps {
  roomName: string;
  username: string;
  userId: string;
  resourceId: number;
  avatarUrl?: string;
  onMessage?: (messages: ChatMessage[]) => void;
  messages?: ChatMessage[];
  isModerator?: boolean;
}

// Define a threaded message type
interface ThreadedMessage extends ChatMessage {
  replies: ThreadedMessage[];
}

/**
 * Realtime chat component
 * @param roomName - The name of the room to join. Each room is a unique chat.
 * @param username - The username of the user
 * @param onMessage - The callback function to handle the messages. Useful if you want to store the messages in a database.
 * @param messages - The messages to display in the chat. Useful if you want to display messages from a database.
 * @returns The chat component
 */
export const RealtimeChat = ({
  roomName,
  username,
  userId,
  resourceId,
  avatarUrl,
  onMessage,
  messages: initialMessages = [],
  isModerator = false,
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()

  // State unifié pour tous les messages
  const [allMessages, setAllMessages] = useState<ChatMessage[]>(initialMessages);

  // Callback pour gérer les changements de messages du hook realtime
  const handleRealtimeMessageChange = useCallback((newMessages: ChatMessage[], tempId?: number) => {
    setAllMessages(prevMessages => {
      if (newMessages.length === 0 && tempId) {
        // Cas spécial : signal pour retirer le message avec l'ID temporaire spécifique (erreur d'insertion)
        return prevMessages.filter(msg => msg.id !== tempId);
      }
      
      const mergedMessages = [...prevMessages];
      
      newMessages.forEach(newMsg => {
        if (tempId) {
          // C'est une mise à jour d'un message temporaire, on remplace l'ancien
          const existingIndex = mergedMessages.findIndex(msg => msg.id === tempId);
          if (existingIndex >= 0) {
            mergedMessages[existingIndex] = newMsg;
          } else {
            // Si on ne trouve pas l'ID temporaire, on ajoute comme nouveau message
            mergedMessages.push(newMsg);
          }
        } else {
          // Vérifier s'il existe déjà un message avec cet ID
          const existingIndex = mergedMessages.findIndex(msg => msg.id === newMsg.id);
          if (existingIndex >= 0) {
            // Mettre à jour le message existant
            mergedMessages[existingIndex] = newMsg;
          } else {
            // Ajouter le nouveau message
            mergedMessages.push(newMsg);
          }
        }
      });

      // Trier par date de création
      return mergedMessages.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });
    });
  }, []);

  const {
    sendMessage,
    isConnected,
  } = useRealtimeChat({
    roomName,
    username,
    avatarUrl,
    userId,
    resourceId,
    onMessageChange: handleRealtimeMessageChange,
  })
  
  const [newMessage, setNewMessage] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set())
  const previousMessageCount = useRef(0)
  const shouldScrollToBottom = useRef(true)

  // Synchroniser avec les messages initiaux
  useEffect(() => {
    setAllMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages)
    }
  }, [allMessages, onMessage])

  useEffect(() => {
    // Scroll to bottom seulement si de nouveaux messages sont ajoutés ET si shouldScrollToBottom est true
    if (allMessages.length > previousMessageCount.current && shouldScrollToBottom.current) {
      scrollToBottom()
    }
    previousMessageCount.current = allMessages.length
  }, [allMessages, scrollToBottom])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !isConnected) return;

      // Activer le scroll automatique lors de l'envoi d'un message
      shouldScrollToBottom.current = true;

      // Envoyer le message (le hook gère maintenant l'insertion en base de données)
      sendMessage(newMessage, replyTo);
      
      setNewMessage('');
      setReplyTo(null);
    },
    [newMessage, isConnected, sendMessage, replyTo]
  )

  // Fonction pour organiser les messages en threads (limitée à 1 niveau)
  const buildThread = useCallback((messages: ChatMessage[], parent_comment_id: number | null = null): ThreadedMessage[] => {
    return messages
      .filter((msg) => (msg.parent_comment_id ?? null) === parent_comment_id)
      .map((msg) => ({
        ...msg,
        // Limiter à 1 niveau de profondeur : les réponses n'ont pas de sous-réponses
        replies: parent_comment_id === null ? buildThread(messages, msg.id) : [],
      }))
  }, []);

  const threadedMessages = useMemo(() => buildThread(allMessages), [allMessages, buildThread])

  // Trouver le message parent pour l'affichage de la réponse
  function findMessageById(messages: ChatMessage[], id: number | null): ChatMessage | undefined {
    return messages.find((msg) => msg.id === id)
  }

  // Fonction pour basculer l'état collapsed d'un thread
  const toggleThreadCollapse = useCallback((messageId: number) => {
    // Désactiver le scroll automatique lors du collapse/expand
    shouldScrollToBottom.current = false;
    
    setCollapsedThreads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }, [])

  // Fonction pour répondre à un message
  const handleReplyToMessage = useCallback((messageId: number) => {
    // Désactiver le scroll automatique lors de la réponse
    shouldScrollToBottom.current = false;
    setReplyTo(messageId);
  }, [])

  // Fonction pour supprimer un commentaire
  const handleDeleteMessage = useCallback(
    async (messageId: number) => {
      // Optimistic update: retire le message du state unifié
      setAllMessages((msgs) => msgs.filter((msg) => msg.id !== messageId));
      
      // Suppression en base (et on attend la réponse)
      const supabase = createClient();
      const { error } = await supabase.from('comments').delete().eq('id', messageId);
      if (error) {
        console.error("Erreur lors de la suppression du commentaire:", error);
        alert("Erreur lors de la suppression du commentaire.");
        // Optionnel : recharger les messages depuis la base de données
      }
    },
    []
  )

  // Composant récursif pour afficher les threads (limité à 1 niveau)
  function Thread({ messages, level = 0 }: { messages: ThreadedMessage[], level?: number }) {
    return (
      <div className="space-y-1">
        {messages.map((message) => {
          const isCollapsed = collapsedThreads.has(message.id as number)
          const hasReplies = message.replies && message.replies.length > 0
          const replyCount = message.replies ? message.replies.length : 0
          const parentMessage = message.parent_comment_id ? findMessageById(allMessages, message.parent_comment_id) : undefined
          
          return (
            <div key={message.id} data-message-id={message.id}>
              <ChatMessageItem
                message={message}
                isOwnMessage={message.user.name === username}
                onReply={handleReplyToMessage}
                level={level}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => toggleThreadCollapse(message.id as number)}
                hasReplies={hasReplies}
                replyCount={replyCount}
                parentMessage={parentMessage}
              />
              {isModerator && (
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100 text-destructive p-1 ml-1 mt-1"
                  title="Supprimer le commentaire"
                  onClick={() => handleDeleteMessage(message.id as number)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {/* Afficher les réponses seulement si on est au niveau 0 et qu'elles existent */}
              {hasReplies && !isCollapsed && level === 0 && (
                <Thread messages={message.replies} level={1} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const replyToMessage = findMessageById(allMessages, replyTo)

  return (
    <div className="flex flex-col h-full w-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <h3 className="font-semibold text-foreground">Discussions</h3>
        <p className="text-sm text-muted-foreground">
          {isConnected ? 'Connecté' : 'Déconnecté'} • {allMessages.length} {allMessages.length === 1 ? 'message' : 'messages'}
        </p>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto max-h-96">
        {allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Aucun message pour le moment</p>
              <p className="text-xs text-muted-foreground">Lancez la conversation !</p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            <Thread messages={threadedMessages} />
          </div>
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && replyToMessage && (
        <div className="border-t border-border px-4 py-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Répondre à</span>
              <span className="font-medium text-foreground">{replyToMessage.user.name}</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-muted-foreground italic truncate max-w-xs">
                {replyToMessage.content.slice(0, 50)}{replyToMessage.content.length > 50 ? '...' : ''}
              </span>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setReplyTo(null);
                shouldScrollToBottom.current = true; // Réactiver le scroll quand on annule
              }}
              className="h-auto p-1 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSendMessage} className="border-t border-border p-4 bg-background">
        <div className="flex gap-2">
          <Input
            className="flex-1 bg-muted/50 border-border focus:bg-background transition-colors"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={userId ? "Écrire un message..." : "Connectez-vous pour commenter"}
            disabled={!isConnected || !userId}
          />
          <Button
            type="submit"
            disabled={!isConnected || !userId || !newMessage.trim()}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
