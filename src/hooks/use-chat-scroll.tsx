import { useCallback, useRef } from 'react'

export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [])

  const scrollToMessage = useCallback((messageId: number) => {
    if (!containerRef.current) return

    const messageElement = containerRef.current.querySelector(`[data-message-id="${messageId}"]`)
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [])

  return { containerRef, scrollToBottom, scrollToMessage }
}
