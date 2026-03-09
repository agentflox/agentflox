'use client'

import Script from 'next/script'

export function GoogleAnalyticsProvider() {
  return (
    <>
      <Script 
        strategy="afterInteractive" 
        src="https://www.googletagmanager.com/gtag/js?id=G-9VCKN3KBJJ"
      />
      <Script 
        id="google-analytics" 
        strategy="afterInteractive"
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-9VCKN3KBJJ');
        `}
      </Script>
    </>
  )
}
