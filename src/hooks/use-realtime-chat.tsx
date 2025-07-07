'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'

interface UseRealtimeChatProps {
  roomName: string
  username: string
  avatarUrl?: string
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
const EVENT_DELETE_TYPE = 'delete'

export function useRealtimeChat({ roomName, username, avatarUrl }: UseRealtimeChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const newChannel = supabase.channel(roomName)

    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        setMessages((current) => {
          // Éviter les doublons en vérifiant si le message existe déjà
          const messageExists = current.some(msg => msg.id === payload.payload.id)
          if (messageExists) return current
          return [...current, payload.payload as ChatMessage]
        })
      })
      .on('broadcast', { event: EVENT_DELETE_TYPE }, (payload) => {
        setMessages((current) => current.filter(msg => msg.id !== payload.payload.id))
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
  }, [roomName, username, supabase])

  const sendMessage = useCallback(
    async (content: string, parent_comment_id?: number | null) => {
      if (!channel || !isConnected) return

      // Générer un ID temporaire unique avec timestamp + random
      const tempId = Date.now() + Math.random()
      
      const message: ChatMessage = {
        id: tempId,
        content,
        user: {
          name: username,
          avatarUrl,
        },
        createdAt: new Date().toISOString(),
        parent_comment_id: parent_comment_id ?? null,
      }
      
      // Ajouter le message localement immédiatement (optimistic update)
      setMessages((current) => [...current, message])
      
      // Envoyer via WebSocket
      await channel.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      })
    },
    [channel, isConnected, username, avatarUrl]
  )

  const deleteMessage = useCallback(
    async (messageId: number) => {
      if (!channel || !isConnected) return

      // Supprimer localement immédiatement (optimistic update)
      setMessages((current) => current.filter(msg => msg.id !== messageId))
      
      // Envoyer l'événement de suppression via WebSocket
      await channel.send({
        type: 'broadcast',
        event: EVENT_DELETE_TYPE,
        payload: { id: messageId },
      })
    },
    [channel, isConnected]
  )

  return { messages, sendMessage, deleteMessage, isConnected }
}
