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

export function useRealtimeChat({ roomName, username, avatarUrl }: UseRealtimeChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const newChannel = supabase.channel(roomName)

    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        setMessages((current) => [...current, payload.payload as ChatMessage])
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

      const message: ChatMessage = {
        id: Date.now(), // temp id, will be replaced by DB id if needed
        content,
        user: {
          name: username,
          avatarUrl,
        },
        createdAt: new Date().toISOString(),
        parent_comment_id: parent_comment_id ?? null,
      }
      setMessages((current) => [...current, message])
      await channel.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      })
    },
    [channel, isConnected, username, avatarUrl]
  )

  return { messages, sendMessage, isConnected }
}
