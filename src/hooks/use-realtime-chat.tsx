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
const EVENT_DELETE_TYPE = 'delete_message'

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
      .on('broadcast', { event: EVENT_DELETE_TYPE }, (payload) => {
        const { messageId } = payload.payload as { messageId: number }
        if (onMessageChange) {
          onMessageChange([], messageId) // Signal pour supprimer le message
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

  const deleteMessage = useCallback(
    async (messageId: number) => {
      if (!channel || !isConnected) return

      // Récupérer tous les IDs des messages enfants (réponses) à supprimer en cascade
      let messagesToDelete: number[] = [messageId];
      
      try {
        // Récupérer tous les messages enfants récursivement
        const getChildMessageIds = async (parentId: number): Promise<number[]> => {
          const { data: children } = await supabase
            .from('comments')
            .select('id')
            .eq('parent_comment_id', parentId);
          
          if (!children || children.length === 0) {
            return [];
          }
          
          const childIds = children.map(child => child.id);
          const grandChildIds = await Promise.all(
            childIds.map(childId => getChildMessageIds(childId))
          );
          
          return [...childIds, ...grandChildIds.flat()];
        };
        
        const childIds = await getChildMessageIds(messageId);
        messagesToDelete = [messageId, ...childIds];
        
        // Envoyer les événements de suppression pour tous les messages
        for (const msgId of messagesToDelete) {
          await channel.send({
            type: 'broadcast',
            event: EVENT_DELETE_TYPE,
            payload: { messageId: msgId },
          });
        }

        // Supprimer de la base de données en cascade
        if (userId && resourceId) {
          // Supprimer d'abord les enfants (pour respecter les contraintes de clés étrangères)
          const { error: deleteError } = await supabase
            .from('comments')
            .delete()
            .in('id', messagesToDelete);
            
          if (deleteError) {
            console.error('Erreur lors de la suppression en cascade:', deleteError);
            throw deleteError;
          }
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du commentaire:', error);
        throw error;
      }
    },
    [channel, isConnected, userId, resourceId, supabase]
  )

  return { sendMessage, deleteMessage, isConnected }
}
