import FluidSubconscious from '../sections/FluidSubconscious'
import HeroOverlay from '../sections/HeroOverlay'
import DeepSpaceFold from '../sections/DeepSpaceFold'
import GenerativeCascade from '../sections/GenerativeCascade'
import { footerConfig } from '../config'

export default function Home() {
  const hasFooter =
    !!footerConfig.brandText ||
    footerConfig.taglineLines.length > 0 ||
    footerConfig.navigationLinks.length > 0 ||
    footerConfig.contactLinks.length > 0 ||
    !!footerConfig.copyright

  return (
    <>
      <FluidSubconscious />

      <main>
        <HeroOverlay />
        <GenerativeCascade />
        <DeepSpaceFold />

        {hasFooter && (
          <footer
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              background: '#000000',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: 'clamp(60px, 10vh, 120px) clamp(24px, 6vw, 80px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '48px',
                maxWidth: '1400px',
                margin: '0 auto',
              }}
            >
              <div style={{ maxWidth: '400px' }}>
                {footerConfig.brandText && (
                  <div
                    className="font-serif-display"
                    style={{
                      fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                      fontWeight: 700,
                      color: '#ffffff',
                      marginBottom: '16px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {footerConfig.brandText}
                  </div>
                )}
                {footerConfig.taglineLines.length > 0 && (
                  <div
                    className="font-mono-data"
                    style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.35)',
                      lineHeight: 1.8,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {footerConfig.taglineLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
              </div>

              {(footerConfig.navigationLinks.length > 0 || footerConfig.contactLinks.length > 0) && (
                <div
                  style={{
                    display: 'flex',
                    gap: 'clamp(32px, 6vw, 80px)',
                    flexWrap: 'wrap',
                  }}
                >
                  {footerConfig.navigationLinks.length > 0 && (
                    <div>
                      {footerConfig.navigationHeading && (
                        <div
                          className="font-mono-data"
                          style={{
                            fontSize: '0.6rem',
                            color: 'rgba(255,255,255,0.3)',
                            letterSpacing: '0.2em',
                            marginBottom: '16px',
                          }}
                        >
                          {footerConfig.navigationHeading}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {footerConfig.navigationLinks.map((link) => (
                          <span
                            key={link.label}
                            style={{
                              fontSize: '0.85rem',
                              color: 'rgba(255,255,255,0.55)',
                              letterSpacing: '0.06em',
                              fontWeight: 300,
                            }}
                          >
                            {link.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {footerConfig.contactLinks.length > 0 && (
                    <div>
                      {footerConfig.contactHeading && (
                        <div
                          className="font-mono-data"
                          style={{
                            fontSize: '0.6rem',
                            color: 'rgba(255,255,255,0.3)',
                            letterSpacing: '0.2em',
                            marginBottom: '16px',
                          }}
                        >
                          {footerConfig.contactHeading}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {footerConfig.contactLinks.map((link) => (
                          <span
                            key={link.label}
                            className="font-mono-data"
                            style={{
                              fontSize: '0.75rem',
                              color: 'rgba(255,255,255,0.45)',
                              letterSpacing: '0.06em',
                            }}
                          >
                            {link.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(footerConfig.copyright || footerConfig.creditText) && (
              <div
                style={{
                  marginTop: 'clamp(48px, 8vh, 80px)',
                  paddingTop: '24px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  maxWidth: '1400px',
                  margin: 'clamp(48px, 8vh, 80px) auto 0',
                }}
              >
                {footerConfig.copyright && (
                  <div
                    className="font-mono-data"
                    style={{
                      fontSize: '0.6rem',
                      color: 'rgba(255,255,255,0.2)',
                      letterSpacing: '0.12em',
                    }}
                  >
                    {footerConfig.copyright}
                  </div>
                )}
                {footerConfig.creditText && (
                  <div
                    className="font-mono-data"
                    style={{
                      fontSize: '0.6rem',
                      color: 'rgba(255,255,255,0.15)',
                      letterSpacing: '0.12em',
                    }}
                  >
                    {footerConfig.creditText}
                  </div>
                )}
              </div>
            )}
          </footer>
        )}
      </main>
    </>
  )
}
