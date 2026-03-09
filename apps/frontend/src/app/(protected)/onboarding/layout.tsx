const OnboardingLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return ( 
    <div className="relative h-full">
      <main id="careers-page" className="h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Agentflox",
              "url": "https://agentflox.com",
              "logo": "https://agentflox.com/logo.png",
              "description": "Agentflox delivers cutting-edge technology solutions to help businesses thrive in today's digital landscape.",
              "sameAs": [
                "https://twitter.com/agentflox",
                "https://www.linkedin.com/company/agentflox",
                "https://www.facebook.com/agentflox"
              ]
            })
          }}
        />
        {children}
      </main>
    </div>
   );
}
 
export default OnboardingLayout;
