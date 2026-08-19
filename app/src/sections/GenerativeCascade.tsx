import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { trpc } from '@/providers/trpc'
import type { Post, User } from '@contracts/types'
import { excerptOf, timeAgo } from '@/lib/blog'
import { PenLine, MessageSquare } from 'lucide-react'
import { POST_CATEGORIES } from '@contracts/covers'

gsap.registerPlugin(ScrollTrigger)

export type FeedPost = Post & { author: User; commentCount: number }

function distributeCards(posts: FeedPost[]) {
  const cols: FeedPost[][] = [[], [], [], []]
  posts.forEach((card, i) => {
    cols[i % 4].push(card)
  })
  return cols
}

export default function GenerativeCascade() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: posts, error, isLoading } = trpc.post.list.useQuery(
    { limit: 60 },
    { retry: false },
  )
  const hasPosts = !!posts && posts.length > 0
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'))
  const visiblePosts = useMemo(
    () => posts?.filter((post) => !selectedCategory || post.category === selectedCategory) ?? [],
    [posts, selectedCategory],
  )

  const chooseCategory = (category: string | null) => {
    setSelectedCategory(category)
    if (category) setSearchParams({ category }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  const stats = useMemo(() => {
    if (!posts) return null
    const authors = new Set(posts.map((p) => p.authorId)).size
    const comments = posts.reduce((sum, p) => sum + p.commentCount, 0)
    return { posts: posts.length, comments, authors }
  }, [posts])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasPosts) return
    let disposed = false
    let animFrameId = 0

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const geometry = new THREE.PlaneGeometry(0.6, 0.8)
    const material = new THREE.MeshBasicMaterial({ color: 0x1c4a96, side: THREE.DoubleSide, wireframe: true })
    const count = 400
    const mesh = new THREE.InstancedMesh(geometry, material, count)

    const dummy = new THREE.Object3D()
    const speeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      dummy.position.x = (Math.random() - 0.5) * 18
      dummy.position.y = (Math.random() - 0.5) * 18
      dummy.position.z = (Math.random() - 0.5) * 12
      dummy.rotation.set(0, 0, Math.random() * Math.PI)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      speeds[i] = (Math.random() * 0.015) + 0.005
    }
    scene.add(mesh)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    const dummyPos = new THREE.Vector3()
    const dummyQuat = new THREE.Quaternion()
    const dummyScale = new THREE.Vector3()

    const animate = () => {
      if (disposed) return
      animFrameId = requestAnimationFrame(animate)

      for (let i = 0; i < count; i++) {
        mesh.getMatrixAt(i, dummy.matrix)
        dummy.matrix.decompose(dummyPos, dummyQuat, dummyScale)
        dummy.position.copy(dummyPos)
        dummy.quaternion.copy(dummyQuat)
        dummy.scale.copy(dummyScale)
        dummy.position.y += speeds[i]
        dummy.rotation.y += 0.008
        if (dummy.position.y > 9) {
          dummy.position.y = -9
        }
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [hasPosts])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !hasPosts) return

    const trackConfigs = [
      { selector: '#track-1', yPercent: -4, scrub: 1 },
      { selector: '#track-2', yPercent: -10, scrub: 1.1 },
      { selector: '#track-3', yPercent: -6, scrub: 0.9 },
      { selector: '#track-4', yPercent: -12, scrub: 1.2 },
    ]

    const tweens: gsap.core.Tween[] = []
    trackConfigs.forEach((cfg) => {
      const el = section.querySelector(cfg.selector)
      if (!el) return
      const tw = gsap.to(el, {
        yPercent: cfg.yPercent,
        ease: 'none',
        scrollTrigger: {
          trigger: '#engine-showcase',
          start: 'top top',
          end: 'bottom bottom',
          scrub: cfg.scrub,
        },
      })
      tweens.push(tw)
    })

    return () => {
      tweens.forEach((tw) => tw.kill())
      ScrollTrigger.getAll().forEach((st) => {
        if (st.vars.trigger === '#engine-showcase') st.kill()
      })
    }
  }, [hasPosts, posts?.length])

  return (
    <section
      id="engine-showcase"
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        background: '#ffffff',
        zIndex: 2,
        overflow: 'hidden',
        minHeight: '60vh',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.12,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          width: '100%',
          borderLeft: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            width: 'clamp(160px, 18vw, 260px)',
            flexShrink: 0,
            borderRight: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            height: '100vh',
            padding: '32px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.92)',
          }}
        >
          <div>
            <div
              className="font-mono-data"
              style={{
                fontSize: '0.65rem',
                color: '#000',
                letterSpacing: '0.15em',
                marginBottom: '24px',
                opacity: 0.5,
              }}
            >
              НИЙТЛЭЛҮҮД
            </div>
            <div
              className="font-geist-mono"
              style={{
                fontSize: '1.8rem',
                fontWeight: 500,
                color: '#000',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                marginBottom: '20px',
              }}
            >
              Сүүлийн
              <br />
              нийтлэлүүд
            </div>
            {stats && (
              <div
                className="font-mono-data"
                style={{
                  fontSize: '0.65rem',
                  color: 'rgba(0,0,0,0.4)',
                  lineHeight: 1.8,
                  letterSpacing: '0.05em',
                  marginBottom: '28px',
                }}
              >
                <div>нийтлэл: {stats.posts}</div>
                <div>сэтгэгдэл: {stats.comments}</div>
                <div>бичигч: {stats.authors}</div>
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <div className="font-mono-data" style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.42)', letterSpacing: '0.12em', marginBottom: 10 }}>
                АНГИЛЛААР ШҮҮХ
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <button
                  type="button"
                  onClick={() => chooseCategory(null)}
                  style={{ textAlign: 'left', border: 0, borderLeft: `3px solid ${selectedCategory === null ? '#000' : 'transparent'}`, background: 'transparent', color: '#000', padding: '5px 8px', fontFamily: '"Space Mono", monospace', fontSize: '0.62rem', cursor: 'pointer' }}
                >
                  БҮГД ({posts?.length ?? 0})
                </button>
                {POST_CATEGORIES.map((category) => {
                  const count = posts?.filter((post) => post.category === category).length ?? 0
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => chooseCategory(category)}
                      style={{ textAlign: 'left', border: 0, borderLeft: `3px solid ${selectedCategory === category ? '#000' : 'transparent'}`, background: 'transparent', color: '#000', padding: '5px 8px', fontFamily: '"Space Mono", monospace', fontSize: '0.62rem', cursor: 'pointer', opacity: count ? 1 : 0.4 }}
                    >
                      {category} ({count})
                    </button>
                  )
                })}
              </div>
            </div>
            <Link
              to="/write"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#000',
                color: '#fff',
                textDecoration: 'none',
                padding: '10px 16px',
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.68rem',
                letterSpacing: '0.12em',
              }}
            >
              <PenLine size={12} /> ШИНЭ НИЙТЛЭЛ
            </Link>
          </div>
          <div
            className="font-mono-data"
            style={{
              fontSize: '0.6rem',
              color: 'rgba(0,0,0,0.25)',
              letterSpacing: '0.1em',
            }}
          >
            БЛОГСОР / НИЙТЛЭЛҮҮД
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            padding: '80px 0',
          }}
          className="cascade-grid"
        >
          {isLoading && (
            <div
              className="font-mono-data"
              style={{ gridColumn: '1 / -1', padding: 40, fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)', letterSpacing: '0.15em' }}
            >
              УНШИЖ БАЙНА…
            </div>
          )}
          {!isLoading && !hasPosts && (
            <div style={{ gridColumn: '1 / -1', padding: 40 }}>
              <div className="font-geist-mono" style={{ fontSize: '1.3rem', color: '#000', marginBottom: 12 }}>
                {error ? 'Өгөгдлийн сан холбогдоогүй байна.' : 'Анхны нийтлэлийг та бичээрэй.'}
              </div>
              <div className="font-mono-data" style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.45)', letterSpacing: '0.08em' }}>
                {error ? 'MONGODB_URI-Г APP/.ENV ФАЙЛД ТОХИРУУЛНА УУ' : 'НЭВТЭРЧ ОРЖ "ШИНЭ НИЙТЛЭЛ" ДАРААРАЙ'}
              </div>
            </div>
          )}
          {hasPosts && visiblePosts.length === 0 && (
            <div className="font-mono-data" style={{ gridColumn: '1 / -1', padding: 40, color: 'rgba(0,0,0,0.45)', fontSize: '0.75rem' }}>
              ЭНЭ АНГИЛАЛД НИЙТЛЭЛ АЛГА.
            </div>
          )}
          {hasPosts && visiblePosts.length > 0 &&
            distributeCards(visiblePosts).map((col, colIdx) => (
              <div
                key={colIdx}
                style={{
                  borderRight: colIdx < 3 ? '1px solid var(--border-color)' : 'none',
                }}
              >
                <div id={`track-${colIdx + 1}`}>
                  {col.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .cascade-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #track-3, #track-4 {
            display: none;
          }
        }
      `}</style>
    </section>
  )
}

function PostCard({ post }: { post: FeedPost }) {
  return (
    <article
      style={{
        display: 'block',
        border: '1px solid #000',
        margin: '-1px 0 0 0',
        padding: '20px 16px',
        background: '#ffffff',
        color: '#000000',
        textDecoration: 'none',
        transition: 'background 0.15s ease, color 0.15s ease',
        cursor: 'none',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.background = '#000000'
        el.style.color = '#ffffff'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = '#ffffff'
        el.style.color = '#000000'
      }}
    >
      <div
        className="font-mono-data"
        style={{
          fontSize: '0.6rem',
          opacity: 0.4,
          marginBottom: '10px',
          letterSpacing: '0.1em',
        }}
      >
        №{post.id} //{' '}
        <Link to={`/?category=${encodeURIComponent(post.category)}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {post.category}
        </Link>
      </div>
      <Link to={`/post/${post.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        <div style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '0.03em', marginBottom: '12px', lineHeight: 1.2 }}>
          {post.title}
        </div>
      <div
        style={{
          width: '100%',
          height: '160px',
          border: '1px solid currentColor',
          marginBottom: '12px',
          overflow: 'hidden',
          position: 'relative',
          contentVisibility: 'auto',
          containIntrinsicSize: '100% 160px',
          background: 'rgba(0,0,0,0.04)',
        }}
      >
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={post.title}
            loading="lazy"
            decoding="async"
            width={480}
            height={320}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: 'contrast(0.95) saturate(0.9)',
            }}
          />
        ) : (
          <div
            className="font-mono-data"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              opacity: 0.4,
              padding: '0 12px',
              textAlign: 'center',
            }}
          >
            {excerptOf(post.content, 60)}
          </div>
        )}
      </div>
      </Link>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          className="font-mono-data"
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.08em',
            opacity: 0.6,
          }}
        >
          {post.author?.name ?? 'Хэрэглэгч'} · {timeAgo(post.createdAt)}
        </span>
        <span
          className="font-mono-data"
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <MessageSquare size={12} /> {post.commentCount}
        </span>
      </div>
    </article>
  )
}
