import { useEffect, useRef, useState } from 'react'
import { instantConfig } from '../config'

export default function DeepSpaceFold() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const lines = instantConfig.textLines
  const [line0 = '', line1 = '', line2 = ''] = lines

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (videoRef.current) {
            videoRef.current.play().catch(() => {})
          }
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  if (!line0 && !line1 && !line2 && !instantConfig.videoPath) {
    return null
  }

  const textLines = [
    { text: line0, delay: 0 },
    { text: line1, delay: 600 },
    { text: line2, delay: 1200 },
  ]

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: '600px',
        overflow: 'hidden',
        background: '#000000',
        zIndex: 2,
      }}
    >
      {instantConfig.videoPath && (
        <video
          ref={videoRef}
          src={instantConfig.videoPath}
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.85,
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 clamp(24px, 8vw, 120px)',
        }}
      >
        {textLines.map((item, i) => {
          if (!item.text) return null
          return (
            <div
              key={i}
              style={{
                overflow: 'hidden',
                marginBottom: i === 0 ? '8px' : '16px',
              }}
            >
              <div
                style={{
                  transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
                  opacity: isVisible ? 1 : 0,
                  transition: `transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${item.delay}ms, opacity 0.9s ease ${item.delay}ms`,
                }}
              >
                {i === 0 ? (
                  <span
                    style={{
                      fontSize: 'clamp(3rem, 10vw, 8rem)',
                      fontWeight: 900,
                      color: '#ffffff',
                      lineHeight: 1.1,
                      fontFamily: '"Geist Mono", monospace',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {item.text}
                  </span>
                ) : i === 1 ? (
                  <AssemblyText visible={isVisible} delay={item.delay} text={item.text} />
                ) : (
                  <span
                    className="font-mono-data"
                    style={{
                      fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                      color: 'rgba(255, 255, 255, 0.55)',
                      letterSpacing: '0.12em',
                      display: 'block',
                      marginTop: '24px',
                    }}
                  >
                    {item.text}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {instantConfig.roomLabel && (
        <div
          className="font-mono-data"
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '32px',
            zIndex: 2,
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.15em',
          }}
        >
          {instantConfig.roomLabel}
        </div>
      )}
    </section>
  )
}

function AssemblyText({ visible, delay, text }: { visible: boolean; delay: number; text: string }) {
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setAnimating(true), delay + 400)
      return () => clearTimeout(timer)
    }
  }, [visible, delay])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          overflow: 'hidden',
          width: animating ? 'auto' : '0',
          maxWidth: animating ? '90vw' : '0',
          transition: 'max-width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: 'clamp(1.5rem, 4vw, 3.5rem)',
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: '"Geist Mono", monospace',
            letterSpacing: '0.02em',
            transform: animating ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}
