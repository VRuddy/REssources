'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'

interface UseRealtimeChatProps {
  roomName: string
  username: string
  avatarUrl?: string
  userId?: string
  resourceId?: number
  onMessageChange?: (messages: ChatMessage[], tempId?: number) => void
}

export interface ChatMessage {
  id: number
  content: string
  user: {
    name: string
    avatarUrl?: string
  }
  createdAt: string
  parent_comment_id?: number | null
}

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({ roomName, username, avatarUrl, userId, resourceId, onMessageChange }: UseRealtimeChatProps) {
  const supabase = createClient()
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const newChannel = supabase.channel(roomName)

    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        const newMessage = payload.payload as ChatMessage
        if (onMessageChange) {
          onMessageChange([newMessage])
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [roomName, username, supabase, onMessageChange])

  const sendMessage = useCallback(
    async (content: string, parent_comment_id?: number | null) => {
      if (!channel || !isConnected) return

      const tempId = Date.now()
      const message: ChatMessage = {
        id: tempId, // temp id, will be replaced by DB id if needed
        content,
        user: {
          name: username,
          avatarUrl,
        },
        createdAt: new Date().toISOString(),
        parent_comment_id: parent_comment_id ?? null,
      }
      
      // Notifier le composant parent avec le message temporaire
      if (onMessageChange) {
        onMessageChange([message], tempId)
      }
      
      // Envoyer le message via le canal en temps réel
      await channel.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      })

      // Si on a les paramètres nécessaires, insérer en base de données
      if (userId && resourceId) {
        try {
          const { data, error } = await supabase.from('comments').insert({
            author_id: userId,
            resource_id: resourceId,
            content,
            parent_comment_id: parent_comment_id ?? null,
            created_at: new Date().toISOString(),
          }).select('id').single();

          if (error) {
            console.error('Erreur lors de l\'insertion du commentaire:', error);
            // Notifier pour retirer le message en cas d'erreur
            if (onMessageChange) {
              onMessageChange([], tempId) // Signal pour retirer le message avec cet ID temporaire
            }
          } else if (data) {
            // Mettre à jour l'ID temporaire avec l'ID réel de la base de données
            const updatedMessage = { ...message, id: data.id };
            if (onMessageChange) {
              onMessageChange([updatedMessage], tempId) // Notifier avec l'ID mis à jour et l'ID temporaire
            }
          }
        } catch (error) {
          console.error('Erreur lors de l\'insertion du commentaire:', error);
          // Notifier pour retirer le message en cas d'erreur
          if (onMessageChange) {
            onMessageChange([], tempId) // Signal pour retirer le message avec cet ID temporaire
          }
        }
      }
    },
    [channel, isConnected, username, avatarUrl, userId, resourceId, supabase, onMessageChange]
  )

  return { sendMessage, isConnected }
}
