'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import {
  type ChatMessage,
  useRealtimeChat,
} from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RealtimeChatProps {
  roomName: string;
  username: string;
  userId: string;
  resourceId: number;
  onMessage?: (messages: ChatMessage[]) => void;
  messages?: ChatMessage[];
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
  onMessage,
  messages: initialMessages = [],
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()

  const {
    messages: realtimeMessages,
    sendMessage,
    isConnected,
  } = useRealtimeChat({
    roomName,
    username,
  })
  const [newMessage, setNewMessage] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)

  // Merge realtime messages with initial messages
  const allMessages = useMemo(() => {
    const mergedMessages = [...initialMessages, ...realtimeMessages]
    // Remove duplicates based on message id
    const uniqueMessages = mergedMessages.filter(
      (message, index, self) => index === self.findIndex((m) => m.id === message.id)
    )
    // Sort by creation date
    const sortedMessages = uniqueMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return sortedMessages
  }, [initialMessages, realtimeMessages])

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages)
    }
  }, [allMessages, onMessage])

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom()
  }, [allMessages, scrollToBottom])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !isConnected) return;

      sendMessage(newMessage, replyTo);
      // Enregistre le message dans Supabase
      const supabase = createClient();
      await supabase.from('comments').insert({
        author_id: userId,
        resource_id: resourceId,
        content: newMessage,
        parent_comment_id: replyTo ?? null,
      });
      setNewMessage('');
      setReplyTo(null);
    },
    [newMessage, isConnected, sendMessage, userId, resourceId, replyTo]
  )

  // Define a threaded message type
  interface ThreadedMessage extends ChatMessage {
    replies: ThreadedMessage[];
  }

  // Fonction pour organiser les messages en threads
  const buildThread = useCallback((messages: ChatMessage[], parent_comment_id: number | null = null): ThreadedMessage[] => {
    return messages
      .filter((msg) => (msg.parent_comment_id ?? null) === parent_comment_id)
      .map((msg) => ({
        ...msg,
        replies: buildThread(messages, msg.id),
      }))
  }, []);

  const threadedMessages = useMemo(() => buildThread(allMessages), [allMessages, buildThread])

  // Trouver le message parent pour l'affichage de la réponse
  function findMessageById(messages: ChatMessage[], id: number | null): ChatMessage | undefined {
    return messages.find((msg) => msg.id === id)
  }

  // Nouveau composant récursif pour afficher les threads
  function Thread({ messages }: { messages: ThreadedMessage[] }) {
    return (
      <div className="space-y-2">
        {messages.map((message) => {
          const parent = findMessageById(allMessages, message.parent_comment_id ?? null)
          return (
            <div key={message.id} className="ml-0">
              {parent && (
                <div className="ml-2 mb-1 border-l-2 border-muted pl-2 text-xs text-muted-foreground italic bg-muted/40 rounded">
                  En réponse à : <span className="font-semibold">{parent.user.name}</span> : {parent.content.slice(0, 80)}{parent.content.length > 80 ? '…' : ''}
                </div>
              )}
              <ChatMessageItem
                message={message}
                isOwnMessage={message.user.name === username}
                showHeader={true}
              />
              <div className="flex gap-2 mt-1 mb-2">
                <Button size="sm" variant="ghost" onClick={() => setReplyTo(message.id as number)}>
                  Répondre
                </Button>
              </div>
              {message.replies && message.replies.length > 0 && (
                <div className="ml-6 border-l pl-4 border-border">
                  <Thread messages={message.replies} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
        {allMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : null}
        <Thread messages={threadedMessages} />
      </div>

      <form onSubmit={handleSendMessage} className="flex w-full gap-2 border-t border-border p-4">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs mb-2">
            <span>En réponse à un commentaire</span>
            <Button size="sm" variant="outline" onClick={() => setReplyTo(null)} type="button">
              Annuler
            </Button>
          </div>
        )}
        <Input
          className={cn(
            'rounded-full bg-background text-sm transition-all duration-300',
            isConnected && newMessage.trim() ? 'w-[calc(100%-36px)]' : 'w-full'
          )}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={userId ? "Type a message..." : "Connectez-vous pour commenter"}
          disabled={!isConnected || !userId}
        />
        {isConnected && newMessage.trim() && userId && (
          <Button
            className="aspect-square rounded-full animate-in fade-in slide-in-from-right-4 duration-300"
            type="submit"
            disabled={!isConnected || !userId}
          >
            <Send className="size-4" />
          </Button>
        )}
      </form>
    </div>
  )
}
