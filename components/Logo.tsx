import Image from 'next/image';

interface LogoProps {
  variant?: 'sidebar' | 'header';
}

export function Logo({ variant = 'sidebar' }: LogoProps) {
  const isSidebar = variant === 'sidebar';

  return (
    <div className={`logo-root logo-root--${variant}`}>
      <div className="logo-text">
        <span className="logo-chifa">CHIFA</span>
        <span className="logo-suki">SUKI</span>
      </div>

      <div className={`logo-dragon logo-dragon--${variant}`}>
        <Image
          src="/logo.png"
          alt=""
          aria-hidden
          loading="eager"
          fetchPriority="high"
          width={isSidebar ? 52 : 34}
          height={isSidebar ? 52 : 34}
          style={{ objectFit: 'contain', mixBlendMode: 'multiply', width: 'auto' }}
        />
      </div>
    </div>
  );
}
